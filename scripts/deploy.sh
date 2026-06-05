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
