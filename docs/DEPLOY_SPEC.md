# Deployment Spec — Vite SPA → AWS S3 + CloudFront

This spec describes the deployment strategy used in `city-council` and can be adopted verbatim in any Vite-based React SPA that deploys to an S3-backed CloudFront distribution.

---

## Overview

The app is a static single-page application built with Vite. The deployment pipeline is:

1. **Build** — `tsc -b && vite build` produces a `dist/` folder.
2. **Sync assets** — All files except `index.html` are uploaded to S3 with a one-year immutable cache header. Vite content-hashes every asset filename, so stale cache hits are impossible.
3. **Upload entry point** — `index.html` is uploaded separately with a `no-cache` header so browsers always fetch the latest shell on every navigation.
4. **Invalidate CDN** — A `/*` CloudFront invalidation flushes the edge cache so the new `index.html` is served immediately.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js + npm | Any version compatible with the repo's `package.json` |
| AWS CLI v2 | Must be authenticated (`aws sts get-caller-identity` should succeed) |
| IAM permissions | `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `cloudfront:CreateInvalidation` |
| S3 bucket | Static website hosting not required — CloudFront serves directly from the bucket |
| CloudFront distribution | Origin pointed at the S3 bucket |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DEPLOY_S3_BUCKET` | S3 bucket name (no `s3://` prefix), e.g. `my-app-prod` |
| `DEPLOY_CF_DISTRIBUTION_ID` | CloudFront distribution ID, e.g. `E1ABCDEF123456` |

Set these in a `.env` file at the repo root (gitignored) or export them in the shell before running the deploy command.

```
DEPLOY_S3_BUCKET=my-app-prod
DEPLOY_CF_DISTRIBUTION_ID=E1ABCDEF123456
```

---

## Deploy Script

Place this at `scripts/deploy.sh` and make it executable (`chmod +x scripts/deploy.sh`).

```bash
#!/usr/bin/env bash
set -euo pipefail

# Load .env if present (won't override already-exported vars)
if [ -f "$(dirname "$0")/../.env" ]; then
  set -o allexport
  source "$(dirname "$0")/../.env"
  set +o allexport
fi

: "${DEPLOY_S3_BUCKET:?Set DEPLOY_S3_BUCKET in .env or environment}"
: "${DEPLOY_CF_DISTRIBUTION_ID:?Set DEPLOY_CF_DISTRIBUTION_ID in .env or environment}"

echo "Building..."
npm run build

echo "Syncing to s3://$DEPLOY_S3_BUCKET..."
aws s3 sync dist/ "s3://$DEPLOY_S3_BUCKET" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# index.html must not be cached so browsers always fetch the latest entry point
aws s3 cp dist/index.html "s3://$DEPLOY_S3_BUCKET/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DEPLOY_CF_DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

echo "Deploy complete."
```

---

## npm Script

Add the following to `package.json` so deploys can be triggered with `npm run deploy`:

```json
"scripts": {
  "build": "tsc -b && vite build",
  "deploy": "bash scripts/deploy.sh"
}
```

---

## Caching Strategy

| Resource | Cache-Control | Rationale |
|---|---|---|
| JS/CSS/images/fonts | `public, max-age=31536000, immutable` | Vite appends a content hash to every filename; the URL changes when content changes, so a 1-year cache is safe. |
| `index.html` | `no-cache, no-store, must-revalidate` | The entry point references hashed asset URLs. It must always be fresh so users load the correct asset versions after a deploy. |

---

## Rollback

There is no automated rollback. To revert:

1. Check out the previous git tag or commit.
2. Run `npm run deploy` again to redeploy the previous build.

CloudFront propagates the new invalidation globally within ~60 seconds.

---

## Security Notes

- The S3 bucket should block all public access; CloudFront uses an **Origin Access Control (OAC)** policy to read from it.
- Store `DEPLOY_S3_BUCKET` and `DEPLOY_CF_DISTRIBUTION_ID` in CI/CD secrets (e.g. GitHub Actions secrets), not in committed files.
- The deploying IAM principal should have only the minimum permissions listed above — no `s3:*` or `cloudfront:*` wildcards.
