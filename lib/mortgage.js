/* ============================================================
   mortgage.js — pure calculation + URL-state engine
   No DOM. Shared by all design directions.
   ============================================================ */
(function (global) {
  'use strict';

  // ---- Defaults (US, first-time-homebuyer friendly, 2026-ish) ----
  const DEFAULTS = {
    price: 450000,   // home price ($)
    dp: 67500,       // down payment amount ($)  -> 15%
    term: 30,        // years
    rate: 6.5,       // annual interest %
    tax: 5400,       // property tax ($/yr)
    ins: 1800,       // home insurance ($/yr)
    hoa: 0,          // HOA ($/mo)
    pmi: 0.5         // PMI annual rate (% of loan), applied while LTV > 80%
  };

  const FIELDS = ['price', 'dp', 'term', 'rate', 'tax', 'ins', 'hoa', 'pmi'];

  // ---- Core math ----------------------------------------------------------
  function pmt(principal, annualRatePct, years) {
    const n = years * 12;
    const r = annualRatePct / 100 / 12;
    if (n <= 0) return 0;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Returns the full computed model for a set of inputs.
  function compute(s) {
    const price = Math.max(0, s.price);
    const dp = Math.min(Math.max(0, s.dp), price);
    const loan = Math.max(0, price - dp);
    const ltv = price > 0 ? loan / price : 0;

    const pi = pmt(loan, s.rate, s.term);            // principal + interest
    const monthlyTax = s.tax / 12;
    const monthlyIns = s.ins / 12;
    const monthlyHoa = s.hoa;
    const pmiActive = ltv > 0.80;
    const monthlyPmi = pmiActive ? (s.pmi / 100 * loan) / 12 : 0;

    const total = pi + monthlyTax + monthlyIns + monthlyHoa + monthlyPmi;

    const n = s.term * 12;
    const totalInterest = Math.max(0, pi * n - loan);
    const totalPaid = pi * n;

    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + n);

    return {
      price, dp, loan, ltv,
      dpPct: price > 0 ? (dp / price) * 100 : 0,
      pi, monthlyTax, monthlyIns, monthlyHoa, monthlyPmi, pmiActive,
      total, totalInterest, totalPaid, payoff,
      components: [
        { key: 'pi',  label: 'Principal & interest', value: pi },
        { key: 'tax', label: 'Property tax',         value: monthlyTax },
        { key: 'ins', label: 'Home insurance',       value: monthlyIns },
        { key: 'pmi', label: 'PMI',                   value: monthlyPmi },
        { key: 'hoa', label: 'HOA',                   value: monthlyHoa }
      ].filter(c => c.value > 0 || c.key === 'pi')
    };
  }

  // Amortization schedule (per-year aggregates + monthly balance series).
  function schedule(s) {
    const loan = Math.max(0, Math.min(s.price, s.price - s.dp));
    const r = s.rate / 100 / 12;
    const n = s.term * 12;
    const m = pmt(loan, s.rate, s.term);

    let balance = loan;
    const months = [{ i: 0, balance: loan, principalPaid: 0, interestPaid: 0 }];
    let cumPrincipal = 0, cumInterest = 0;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      let principal = m - interest;
      if (principal > balance) principal = balance;
      balance = Math.max(0, balance - principal);
      cumPrincipal += principal;
      cumInterest += interest;
      months.push({ i, balance, principalPaid: cumPrincipal, interestPaid: cumInterest });
    }
    // Year markers (every 12 months)
    const years = [];
    for (let i = 0; i <= n; i += 12) {
      years.push(months[i]);
    }
    return { months, years, loan };
  }

  // Sensitivity series: total monthly payment as a function of one variable.
  // returns { points:[{x,y}], current:{x,y}, xLabel, format }
  function sensitivity(s, variable) {
    const base = Object.assign({}, s);
    const pts = [];
    let current = null;

    function totalFor(state) { return compute(state).total; }

    if (variable === 'rate') {
      const lo = Math.max(1, s.rate - 3), hi = s.rate + 3;
      for (let v = lo; v <= hi + 1e-9; v += (hi - lo) / 24) {
        pts.push({ x: v, y: totalFor(Object.assign({}, base, { rate: v })) });
      }
      current = { x: s.rate, y: totalFor(s) };
      return { points: pts, current, xLabel: 'Interest rate', fmt: 'pct' };
    }
    if (variable === 'price') {
      const lo = s.price * 0.7, hi = s.price * 1.3;
      for (let v = lo; v <= hi + 1e-9; v += (hi - lo) / 24) {
        // keep down-payment % constant as price moves
        const pct = s.price > 0 ? s.dp / s.price : 0;
        pts.push({ x: v, y: totalFor(Object.assign({}, base, { price: v, dp: v * pct })) });
      }
      const pct = s.price > 0 ? s.dp / s.price : 0;
      current = { x: s.price, y: totalFor(Object.assign({}, base, { price: s.price, dp: s.price * pct })) };
      return { points: pts, current, xLabel: 'Home price', fmt: 'usd0' };
    }
    if (variable === 'dp') {
      const lo = 0, hi = s.price * 0.35;
      for (let v = lo; v <= hi + 1e-9; v += (hi - lo) / 24) {
        pts.push({ x: s.price > 0 ? (v / s.price) * 100 : 0, dp: v, y: totalFor(Object.assign({}, base, { dp: v })) });
      }
      current = { x: s.price > 0 ? (s.dp / s.price) * 100 : 0, dp: s.dp, y: totalFor(s) };
      return { points: pts, current, xLabel: 'Down payment', fmt: 'pct' };
    }
    // term (discrete)
    const terms = [10, 15, 20, 25, 30];
    terms.forEach(t => pts.push({ x: t, y: totalFor(Object.assign({}, base, { term: t })) }));
    current = { x: s.term, y: totalFor(s) };
    return { points: pts, current, xLabel: 'Loan term', fmt: 'yr', discrete: true };
  }

  // ---- Formatting ---------------------------------------------------------
  const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2 });

  function fmt(value, kind) {
    switch (kind) {
      case 'usd0': return usd0.format(Math.round(value));
      case 'usd2': return usd2.format(value);
      case 'pct': return value.toFixed(value % 1 === 0 ? 0 : 2).replace(/\.00$/, '') + '%';
      case 'yr': return Math.round(value) + ' yr';
      default: return String(value);
    }
  }
  function money(v) { return usd0.format(Math.round(v)); }
  function money2(v) { return usd2.format(v); }

  // ---- Affordability (solve home price from a monthly budget) -------------
  // Per-dollar-of-loan monthly P&I factor.
  function pmtFactor(annualRatePct, years) {
    const n = years * 12;
    const r = annualRatePct / 100 / 12;
    if (n <= 0) return 0;
    if (r === 0) return 1 / n;
    return (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  // Given a target monthly payment + down-payment %, solve the max home price.
  // a = { target, dpPct (0-100), rate, term, tax, ins, hoa, pmi }
  // Returns a full state object { price, dp, term, rate, tax, ins, hoa, pmi }
  // plus { feasible, target, dpPct } so the app can compute() the breakdown.
  function affordability(a) {
    const d = Math.min(0.95, Math.max(0, (a.dpPct || 0) / 100));
    const fixed = a.tax / 12 + a.ins / 12 + a.hoa;        // escrow + HOA, price-independent
    const avail = a.target - fixed;                        // left for P&I + PMI
    const k = pmtFactor(a.rate, a.term);
    const pmiF = d < 0.20 ? (a.pmi / 100) / 12 : 0;
    let loan = 0, price = 0, dp = 0, feasible = false;
    if (avail > 0 && (k + pmiF) > 0) {
      loan = avail / (k + pmiF);
      price = loan / (1 - d || 1);
      dp = price * d;
      feasible = true;
    }
    return {
      feasible, target: a.target, dpPct: a.dpPct,
      price: Math.max(0, price), dp: Math.max(0, dp),
      term: a.term, rate: a.rate, tax: a.tax, ins: a.ins, hoa: a.hoa, pmi: a.pmi
    };
  }

  // ---- URL state ----------------------------------------------------------
  function readState() {
    const p = new URLSearchParams(global.location.search);
    const s = {};
    FIELDS.forEach(f => {
      const raw = p.get(f);
      const num = raw == null ? DEFAULTS[f] : parseFloat(raw);
      s[f] = isFinite(num) ? num : DEFAULTS[f];
    });
    // keep dp within price
    if (s.dp > s.price) s.dp = s.price;
    return s;
  }

  function writeState(s, replace) {
    const p = new URLSearchParams();
    FIELDS.forEach(f => {
      // Trim trailing zeros for clean links
      const v = Math.round(s[f] * 1000) / 1000;
      p.set(f, String(v));
    });
    const url = global.location.pathname + '?' + p.toString();
    if (replace !== false) global.history.replaceState(null, '', url);
    return global.location.origin + url;
  }

  function shareURL(s) {
    const p = new URLSearchParams();
    FIELDS.forEach(f => p.set(f, String(Math.round(s[f] * 1000) / 1000)));
    return global.location.origin + global.location.pathname + '?' + p.toString();
  }

  global.Mortgage = {
    DEFAULTS, FIELDS,
    compute, schedule, sensitivity, pmtFactor, affordability,
    fmt, money, money2,
    readState, writeState, shareURL
  };
})(window);
