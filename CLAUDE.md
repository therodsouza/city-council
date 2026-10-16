# CLAUDE.md

City Council service-request portal — a React 19 + Vite SPA (TypeScript, Tailwind
v4, React Router). Users sign in with Google (OAuth implicit flow → Cognito
Identity Pool), submit infrastructure service requests, track them, and admins
view a request map and manage requests (list, detail and status changes at
`/admin/requests`; see `docs/ADMIN_REQUESTS_SPEC.md`). Visitors without an account can also submit by verifying a
Brazilian mobile number by SMS or an email address (chosen by the
`VITE_GUEST_VERIFICATION` flag; Cloudflare Turnstile, then
`/anonymous/service-requests`; see `docs/ANONYMOUS_SUBMISSION_SPEC.md`). UI is
internationalised with i18next (English + Brazilian Portuguese); see
`docs/I18N_SPEC.md`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (http://localhost:5173) |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run deploy` | Build and deploy to S3 + CloudFront (see below) |

## Deployment

Deploys are a single command that builds and publishes the static site to AWS S3
behind CloudFront:

```bash
npm run deploy        # runs scripts/deploy.sh
```

### Prerequisites

- **AWS CLI** installed and authenticated with credentials that can write to the
  target S3 bucket and create CloudFront invalidations (`aws configure`, an
  `AWS_PROFILE`, or exported `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`).
- **Two environment variables** must be set, via `.env` (auto-loaded by the
  script, does not override already-exported vars) or the shell environment:
  - `DEPLOY_S3_BUCKET` — target bucket (`city-council.rodstack.net`;
    present in `.env`).
  - `DEPLOY_CF_DISTRIBUTION_ID` — CloudFront distribution to invalidate
    (present in `.env`).

  The script fails fast with a clear message if either is missing.
- App runtime config (`VITE_*` in `.env`) is baked into the bundle at build time,
  so make sure `.env` is correct **before** deploying. That includes
  `VITE_TURNSTILE_SITE_KEY` (the public Turnstile site key): without it guests
  cannot request a code. `VITE_GUEST_VERIFICATION` (`sms` default, `email`, `off`)
  picks how guests receive that code, so changing it needs a redeploy; the API
  must have the same channel enabled.

### What the deploy does (`scripts/deploy.sh`)

1. Loads `.env` (without overriding already-exported vars).
2. Runs `npm run build`.
3. `aws s3 sync dist/ s3://$DEPLOY_S3_BUCKET --delete` — uploads hashed assets
   with a long-lived immutable cache header and removes stale files.
   `index.html` is excluded from this step.
4. Uploads `index.html` separately with `no-cache,no-store,must-revalidate` so
   browsers always fetch the latest entry point (and thus the latest asset
   hashes).
5. Creates a CloudFront invalidation for `/*` and prints the invalidation ID.
   Propagation across edge locations takes a couple of minutes.

### Notes

- `--delete` means anything in the bucket but not in `dist/` is removed. The
  bucket is treated as a pure mirror of the build output.
- The build emits a chunk-size warning (the bundle includes `aws-sdk`); it is
  expected and does not fail the deploy.
- The deploy builds from the current working tree, not from a committed/tagged
  revision — commit first if you want the deploy to match a known commit.
