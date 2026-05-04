#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_DIR="$ROOT_DIR/towercrane-for-uiux-front"

AWS_REGION="${AWS_REGION:-ap-northeast-2}"
S3_BUCKET="${S3_BUCKET:-hibot-docu-front-hyun0316}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E1L7QZR4LQV4LE}"
WAIT_FOR_INVALIDATION="${WAIT_FOR_INVALIDATION:-false}"

cd "$FRONT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Missing $FRONT_DIR/.env.production" >&2
  exit 1
fi

echo "==> Checking AWS identity"
AWS_REGION="$AWS_REGION" aws sts get-caller-identity >/dev/null

echo "==> Installing frontend dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "==> Building frontend"
npm run build

echo "==> Syncing dist/ to s3://$S3_BUCKET"
AWS_REGION="$AWS_REGION" aws s3 sync dist/ "s3://$S3_BUCKET" --delete

echo "==> Creating CloudFront invalidation"
INVALIDATION_ID="$(
  AWS_REGION="$AWS_REGION" aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text
)"

echo "Invalidation: $INVALIDATION_ID"

if [[ "$WAIT_FOR_INVALIDATION" == "true" ]]; then
  echo "==> Waiting for invalidation completion"
  AWS_REGION="$AWS_REGION" aws cloudfront wait invalidation-completed \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID"
fi

echo "Frontend deployed: https://hibot-docu.com"
