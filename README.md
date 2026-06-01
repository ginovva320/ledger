# Ledger

Ledger is a single-page mortgage calculator for exploring home-price and
monthly-budget scenarios. Inputs recalculate immediately and are serialized
into the URL so a scenario can be shared with the **Copy link** button.

## Run Locally

No install or build step is required. Start a static server from this
directory:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

The browser needs internet access while loading because React, Babel,
Tailwind CSS, Recharts, and the Hanken Grotesk font are loaded from CDNs.

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
index.html           Entry page, theme variables, and CDN dependencies
app.jsx              Application state and UI composition
lib/mortgage.js      Pure mortgage math and URL-state helpers
ui/components.jsx    Lightweight shadcn-style UI primitives
ui/charts.jsx        Recharts wrappers and tooltip rendering
```

## Smoke Test

The calculation engine can be checked without a browser:

```bash
node - <<'NODE'
global.window = {
  location: { search: '', pathname: '/index.html', origin: 'http://localhost' },
  history: { replaceState() {} }
};
require('./lib/mortgage.js');
const M = window.Mortgage;
const result = M.compute({ ...M.DEFAULTS });
console.log(M.money(result.total));
NODE
```

The default scenario should print `$3,177`.

