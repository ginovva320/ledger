# AGENTS.md

## Project Overview

Ledger is a static mortgage-calculator SPA. It intentionally has no package
manager, bundler, or generated build output. Serve the repository directory
directly with a local HTTP server.

## Development

Run:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

Runtime dependencies are loaded from CDNs in `index.html`. Browser verification
therefore requires internet access.

## File Boundaries

- `index.html`: CDN scripts, Tailwind theme configuration, and global CSS.
- `app.jsx`: React state, URL synchronization, layout, and user interactions.
- `lib/mortgage.js`: Pure calculations. Keep this DOM-free and testable from
  Node by stubbing `window`.
- `ui/components.jsx`: Shared shadcn-style primitives.
- `ui/charts.jsx`: Recharts wrappers, chart legends, and tooltip content.

## Implementation Rules

- Preserve live URL synchronization for all scenario inputs.
- Keep the calculation engine independent from the UI.
- Use existing UI primitives before adding one-off markup.
- Use Recharts wrappers in `ui/charts.jsx` for chart changes.
- Keep query parameters backward compatible when adding fields.
- Do not commit `.playwright-cli/`; it contains local browser-test artifacts.
- Avoid introducing a build tool unless the task explicitly calls for a
  production packaging migration.

## Verification

For UI changes:

1. Start the static server.
2. Load the default scenario and confirm the estimated payment is `$3,177/mo`.
3. Exercise the affected interaction in a browser.
4. Check that URL parameters update when scenario inputs change.

For calculation changes, run a Node smoke test against `lib/mortgage.js` and
cover the altered edge case.

