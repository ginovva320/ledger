#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${LEDGER_STACK_NAME:-LedgerSiteStack}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" \
    --output text
}

require_command aws

npm run build:site

BUCKET_NAME="$(stack_output BucketName)"
DISTRIBUTION_ID="$(stack_output DistributionId)"

if [[ -z "$BUCKET_NAME" || "$BUCKET_NAME" == "None" ]]; then
  echo "Could not find BucketName output for stack: $STACK_NAME" >&2
  exit 1
fi

if [[ -z "$DISTRIBUTION_ID" || "$DISTRIBUTION_ID" == "None" ]]; then
  echo "Could not find DistributionId output for stack: $STACK_NAME" >&2
  exit 1
fi

echo "Syncing .site-dist/ to s3://$BUCKET_NAME"
aws s3 sync .site-dist/ "s3://$BUCKET_NAME" --delete

echo "Invalidating CloudFront distribution: $DISTRIBUTION_ID"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths '/*'
