# Ledger

Ledger is a single-page mortgage calculator for exploring home-price and
monthly-budget scenarios. Inputs recalculate immediately and are serialized
into the URL so a scenario can be shared with the **Copy link** button.

## Run Locally

No install or build step is required for local frontend development. Start a
static server from this directory:

```bash
npm run serve
```

Then open [http://localhost:4173](http://localhost:4173).

The browser needs internet access while loading because React, Babel, Tailwind
CSS, Recharts, and the Hanken Grotesk font are loaded from CDNs.

## Features

- Calculate an all-in monthly payment from a home price.
- Solve for an affordable home price from a monthly budget.
- Adjust down payment, term, interest rate, property tax, insurance, HOA,
  and PMI.
- Share the current scenario through URL query parameters.
- Review monthly-payment composition, loan balance, cumulative interest,
  and an annual or monthly amortization schedule.
- Explore payment sensitivity by rate, term, down payment, or home price.

## Structure

```text
site/index.html           Entry page, theme variables, and CDN dependencies
site/app.jsx              Application state and UI composition
site/lib/mortgage.js      Pure mortgage math and URL-state helpers
site/ui/components.jsx    Lightweight shadcn-style UI primitives
site/ui/charts.jsx        Recharts wrappers and tooltip rendering
infra/bin/ledger.ts       CDK app entry point and environment configuration
infra/lib/                CDK stack for S3, CloudFront, ACM, and Route 53
```

## Deploy to AWS

The CDK stack deploys `site/` to a private S3 bucket behind CloudFront. It also
creates an ACM certificate and Route 53 `A` and `AAAA` alias records for a
subdomain in an existing hosted zone.

Install dependencies:

```bash
npm install
```

Create a local configuration file:

```bash
cp .env.example .env
```

Set these values in `.env`:

```dotenv
LEDGER_HOSTED_ZONE_ID=Z0123456789EXAMPLE
LEDGER_HOSTED_ZONE_NAME=example.com
LEDGER_SUBDOMAIN=mortgage
```

The example deploys to `https://mortgage.example.com`. `.env` is ignored by
Git so public repositories do not expose domain or hosted-zone values.

Bootstrap the target environment once, then deploy:

```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
npm run deploy
```

CloudFront viewer certificates must be created in `us-east-1`, so the CDK stack
deploys there. The generated S3 bucket is retained if the stack is destroyed to
avoid deleting site content unexpectedly.

`npm run deploy` renders `.site-dist/` with the configured public URL for Open
Graph metadata, then runs `cdk deploy`. CDK synthesizes automatically. Use
`npm run synth` separately only when you want to inspect the generated
CloudFormation template before deploying.

For content-only updates after the stack exists, use the faster AWS CLI path:

```bash
npm run deploy:site
```

This script reads the bucket name and CloudFront distribution ID from the
deployed CloudFormation stack, renders `.site-dist/`, syncs it to S3 with
deleted files pruned, and creates a `/*` CloudFront invalidation. Set
`LEDGER_STACK_NAME` if the stack was deployed with a non-default name.

## Smoke Test

The calculation engine can be checked without a browser:

```bash
node - <<'NODE'
global.window = {
  location: { search: '', pathname: '/index.html', origin: 'http://localhost' },
  history: { replaceState() {} }
};
require('./site/lib/mortgage.js');
const M = window.Mortgage;
const result = M.compute({ ...M.DEFAULTS });
console.log(M.money(result.total));
NODE
```

The default scenario should print `$3,177`.
