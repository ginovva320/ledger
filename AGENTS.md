# AGENTS.md

## Project Overview

Ledger is a static mortgage-calculator SPA with an AWS CDK deployment layer.
The frontend intentionally has no bundler or generated build output. CDK
dependencies are managed with npm.

## Development

Run:

```bash
npm run serve
```

Open `http://localhost:4173`.

Runtime dependencies are loaded from CDNs in `site/index.html`. Browser
verification therefore requires internet access.

## File Boundaries

- `site/index.html`: CDN scripts, Tailwind theme configuration, and global CSS.
- `site/app.jsx`: React state, URL synchronization, layout, and user
  interactions.
- `site/lib/mortgage.js`: Pure calculations. Keep this DOM-free and testable from
  Node by stubbing `window`.
- `site/ui/components.jsx`: Shared shadcn-style primitives.
- `site/ui/charts.jsx`: Recharts wrappers, chart legends, and tooltip content.
- `infra/bin/ledger.ts`: CDK entry point and environment loading.
- `infra/lib/ledger-site-stack.ts`: AWS resources and static-site deployment.

## Implementation Rules

- Preserve live URL synchronization for all scenario inputs.
- Keep the calculation engine independent from the UI.
- Use existing UI primitives before adding one-off markup.
- Use Recharts wrappers in `ui/charts.jsx` for chart changes.
- Keep query parameters backward compatible when adding fields.
- Do not commit `.playwright-cli/`; it contains local browser-test artifacts.
- Do not commit `.env`, `node_modules/`, or `cdk.out/`.
- Keep domain and hosted-zone values configurable through environment
  variables. Do not hardcode private DNS values.
- Deploy only `site/` through `BucketDeployment`.
- Keep the CloudFront certificate stack in `us-east-1`.
- Avoid introducing a frontend build tool unless the task explicitly calls for
  a production packaging migration.

## Verification

For UI changes:

1. Start the static server.
2. Load the default scenario and confirm the estimated payment is `$3,177/mo`.
3. Exercise the affected interaction in a browser.
4. Check that URL parameters update when scenario inputs change.

For calculation changes, run a Node smoke test against `site/lib/mortgage.js`
and cover the altered edge case.

For infrastructure changes:

1. Copy `.env.example` to `.env` and set non-secret local values.
2. Run `npm run typecheck`.
3. Run `npm run synth`.
4. Review the synthesized resources before deploying.
