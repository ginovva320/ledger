/* ============================================================
   app.jsx — Ledger v2 mortgage calculator (shadcn + Recharts)
   ============================================================ */
const M = window.Mortgage;
const {
  Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
  Input, Label, Slider, Tabs, TabsList, TabsTrigger, TabsContent,
  Separator, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, cn
} = window;
const { AmortChart, SensitivityChart, BreakdownDonut, chartColor } = window;

/* ---------- helpers ---------- */
const money = M.money;
const grp = (n) => Math.round(n).toLocaleString('en-US');
const parseNum = (s) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };
const COMP_TOKEN = { pi: '--chart-1', tax: '--chart-2', ins: '--chart-3', pmi: '--chart-4', hoa: '--chart-5' };

function useCountUp(value, duration = 450) {
  const [disp, setDisp] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const from = ref.current, to = value, start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisp(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick); else ref.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return disp;
}

/* ---------- URL state ---------- */
function readInitial() {
  const p = new URLSearchParams(location.search);
  const num = (k, d) => { const v = parseFloat(p.get(k)); return isFinite(v) ? v : d; };
  const price = num('price', 450000);
  const dp = Math.min(price, num('dp', 67500));
  return {
    mode: p.get('mode') === 'budget' ? 'budget' : 'price',
    price, dp, term: num('term', 30), rate: num('rate', 6.5),
    tax: num('tax', 5400), ins: num('ins', 1800), hoa: num('hoa', 0), pmi: num('pmi', 0.5),
    target: num('target', 2800), dpPct: num('dpPct', price > 0 ? Math.round(dp / price * 100) : 20),
  };
}
function buildQuery(s) {
  const p = new URLSearchParams();
  p.set('mode', s.mode);
  ['price', 'dp', 'term', 'rate', 'tax', 'ins', 'hoa', 'pmi', 'target', 'dpPct'].forEach(k =>
    p.set(k, String(Math.round(s[k] * 1000) / 1000)));
  return p.toString();
}

/* ---------- small UI pieces ---------- */
function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("inline-flex h-7 flex-1 items-center justify-center rounded-md px-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === o.value ? "bg-background text-foreground shadow" : "hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({ id, label, unit, value, onChange, min, max, step, prefix = "$", suffix, slider = true, fmtVal }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  const commit = (raw) => {
    const next = Math.min(max ?? Infinity, Math.max(min ?? 0, parseNum(raw)));
    onChange(next);
    setDraft(String(next));
  };
  const display = focused ? draft : (fmtVal ? fmtVal(value) : grp(value));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{label}{unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}</Label>
      </div>
      <div className="flex items-center rounded-md border border-input bg-transparent shadow-sm transition focus-within:ring-2 focus-within:ring-ring">
        {prefix && <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>}
        <input id={id} inputMode="decimal" value={display}
          onFocus={() => setFocused(true)}
          onBlur={(e) => { commit(e.target.value); setFocused(false); }}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/[0-9]/.test(e.target.value)) onChange(Math.min(max ?? Infinity, Math.max(0, parseNum(e.target.value))));
          }}
          className="h-9 w-full bg-transparent px-2 text-right text-sm font-medium tabular-nums text-foreground outline-none" />
        {suffix && <span className="pr-3 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {slider && <Slider value={Math.min(max, value)} min={min} max={max} step={step} onValueChange={onChange} ariaLabel={label} />}
    </div>
  );
}

function Row({ children }) { return <div className="space-y-2.5">{children}</div>; }

/* ---------- main app ---------- */
function LedgerApp() {
  const [s, setS] = useState(readInitial);
  const [sensVar, setSensVar] = useState('rate');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedView, setSchedView] = useState('year');
  const [copied, setCopied] = useState(false);

  // persist to URL
  useEffect(() => {
    history.replaceState(null, '', location.pathname + '?' + buildQuery(s));
  }, [s]);

  const set = (patch) => setS(prev => ({ ...prev, ...patch }));

  // derive effective scenario + model
  const { effective, m, aff } = (() => {
    if (s.mode === 'budget') {
      const aff = M.affordability({ target: s.target, dpPct: s.dpPct, rate: s.rate, term: s.term, tax: s.tax, ins: s.ins, hoa: s.hoa, pmi: s.pmi });
      const effective = { price: aff.price, dp: aff.dp, term: s.term, rate: s.rate, tax: s.tax, ins: s.ins, hoa: s.hoa, pmi: s.pmi };
      return { effective, m: M.compute(effective), aff };
    }
    const effective = { price: s.price, dp: s.dp, term: s.term, rate: s.rate, tax: s.tax, ins: s.ins, hoa: s.hoa, pmi: s.pmi };
    return { effective, m: M.compute(effective), aff: null };
  })();

  const fixedCosts = s.tax / 12 + s.ins / 12 + s.hoa;
  const infeasible = s.mode === 'budget' && (!aff.feasible || aff.price <= 0);

  // hero count-up
  const heroValue = s.mode === 'budget' ? (infeasible ? 0 : effective.price) : m.total;
  const heroDisp = useCountUp(heroValue);

  // breakdown segments
  const segs = m.components.map(c => ({ key: c.key, label: c.label, value: c.value, color: chartColor(COMP_TOKEN[c.key]) }));

  // amortization data
  const sched = M.schedule(effective);
  const amortData = sched.years.map(y => ({ year: y.i / 12, balance: Math.round(y.balance), interestPaid: Math.round(y.interestPaid) }));
  // per-year table rows
  const tableRows = (() => {
    const rows = [];
    const src = sched.years;
    for (let i = 1; i < src.length; i++) {
      const prev = src[i - 1], cur = src[i];
      rows.push({
        period: i,
        principal: cur.principalPaid - prev.principalPaid,
        interest: cur.interestPaid - prev.interestPaid,
        balance: cur.balance,
      });
    }
    return rows;
  })();
  const monthlyRows = schedView === 'month' ? sched.months.slice(1).map(mo => {
    const prev = sched.months[mo.i - 1];
    return { period: mo.i, principal: mo.principalPaid - prev.principalPaid, interest: mo.interestPaid - prev.interestPaid, balance: mo.balance };
  }) : [];

  // sensitivity
  const sens = M.sensitivity(Object.assign({}, effective, { dpPct: m.dpPct }), sensVar);
  const sensData = sens.points.map(p => ({ x: p.x, y: p.y, dp: p.dp }));
  const compactMoney = (v) => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v);
  const xFmt = (v) => sensVar === 'dp' ? (Math.round(v * 10) / 10) + '% · ' + compactMoney(effective.price * v / 100)
    : sens.fmt === 'usd0' ? compactMoney(v)
    : sens.fmt === 'pct' ? (Math.round(v * 10) / 10) + '%'
      : sens.fmt === 'yr' ? Math.round(v) + 'y' : Math.round(v);
  const tooltipLabelFmt = (point) => sensVar === 'dp'
    ? (Math.round(point.x * 10) / 10) + '% down · ' + money(point.dp)
    : xFmt(point.x);
  const yFmt = (v) => v >= 1000 ? '$' + (Math.round(v / 100) / 10) + 'k' : '$' + Math.round(v);

  const payoff = m.payoff.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const copyLink = async () => {
    const url = location.origin + location.pathname + '?' + buildQuery(s);
    try { await navigator.clipboard.writeText(url); } catch (e) {
      const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1900);
  };

  // down payment handlers (price mode)
  const setPrice = (p) => { const pct = s.price > 0 ? s.dp / s.price : 0; set({ price: p, dp: Math.round(p * pct) }); };
  const setDpAmt = (v) => set({ dp: Math.min(s.price, v) });
  const setDpPctPrice = (v) => set({ dp: Math.round(s.price * Math.min(100, Math.max(0, v)) / 100) });
  const dpPctNow = s.price > 0 ? s.dp / s.price * 100 : 0;

  const sensVars = [{ value: 'rate', label: 'Rate' }, { value: 'term', label: 'Term' }, { value: 'dp', label: 'Down' }, { value: 'price', label: 'Price' }];
  const names = { rate: 'interest rate', term: 'loan term', dp: 'down payment', price: 'home price' };
  const curLabel = sensVar === 'rate' ? s.rate + '%' : sensVar === 'term' ? s.term + ' years'
    : sensVar === 'dp' ? m.dpPct.toFixed(m.dpPct % 1 ? 1 : 0) + '%' : money(effective.price);

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Ledger</div>
              <div className="text-xs text-muted-foreground">Mortgage Calculator</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={copyLink} className={copied ? "bg-primary" : ""}>
              {copied
                ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-7 lg:grid-cols-[400px_1fr]">
        {/* ---------------- inputs ---------------- */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your loan details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs value={s.mode} onValueChange={(v) => set({ mode: v })}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="price">By home price</TabsTrigger>
                  <TabsTrigger value="budget">By monthly budget</TabsTrigger>
                </TabsList>
              </Tabs>

              {s.mode === 'price' ? (
                <Row>
                  <NumberField id="price" label="Home price" value={s.price} onChange={setPrice} min={50000} max={2000000} step={5000} />
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <Label htmlFor="dp">Down payment</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 items-center rounded-md border border-input"><span className="pl-2 text-xs text-muted-foreground">$</span>
                          <input id="dp" inputMode="numeric" value={grp(s.dp)} onChange={(e) => setDpAmt(parseNum(e.target.value))}
                            className="h-8 w-20 bg-transparent px-1.5 text-right text-sm font-medium tabular-nums outline-none" /></div>
                        <div className="flex h-8 items-center rounded-md border border-input">
                          <input inputMode="decimal" value={(Math.round(dpPctNow * 10) / 10)} onChange={(e) => setDpPctPrice(parseNum(e.target.value))}
                            className="h-8 w-11 bg-transparent pl-2 text-right text-sm font-medium tabular-nums outline-none" /><span className="pr-2 text-xs text-muted-foreground">%</span></div>
                      </div>
                    </div>
                    <Slider value={Math.min(50, dpPctNow)} min={0} max={50} step={0.5} onValueChange={setDpPctPrice} ariaLabel="Down payment percent" />
                  </div>
                </Row>
              ) : (
                <Row>
                  <NumberField id="target" label="Monthly budget" unit="all-in / mo" value={s.target} onChange={(v) => set({ target: v })} min={500} max={20000} step={50} />
                  <NumberField id="dpPct" label="Down payment" value={s.dpPct} onChange={(v) => set({ dpPct: Math.min(50, v) })} min={0} max={50} step={0.5} prefix={null} suffix="%" fmtVal={(v) => (Math.round(v * 10) / 10)} />
                </Row>
              )}

              <Separator />
              <div className="space-y-2">
                <Label>Loan term</Label>
                <Segmented value={s.term} onChange={(v) => set({ term: v })}
                  options={[{ value: 10, label: '10 yr' }, { value: 15, label: '15 yr' }, { value: 20, label: '20 yr' }, { value: 30, label: '30 yr' }]} />
              </div>
              <NumberField id="rate" label="Interest rate" value={s.rate} onChange={(v) => set({ rate: v })} min={0} max={12} step={0.05} prefix={null} suffix="%" fmtVal={(v) => (Math.round(v * 100) / 100)} />

              <Separator />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recurring costs</p>
              <NumberField id="tax" label="Property tax" unit="/ yr" value={s.tax} onChange={(v) => set({ tax: v })} min={0} max={30000} step={100} />
              <NumberField id="ins" label="Home insurance" unit="/ yr" value={s.ins} onChange={(v) => set({ ins: v })} min={0} max={10000} step={50} />
              <NumberField id="hoa" label="HOA dues" unit="/ mo" value={s.hoa} onChange={(v) => set({ hoa: v })} min={0} max={2000} step={10} />
              <NumberField id="pmi" label="PMI rate" unit="/ yr of loan" value={s.pmi} onChange={(v) => set({ pmi: v })} min={0} max={2} step={0.05} prefix={null} suffix="%" fmtVal={(v) => (Math.round(v * 100) / 100)} />
              <p className="text-xs text-muted-foreground">
                {m.pmiActive
                  ? <>PMI applies while the down payment is under 20% — <span className="font-medium text-foreground">{money(m.monthlyPmi)}/mo</span>.</>
                  : <>No PMI — the down payment is 20% or more.</>}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ---------------- results ---------------- */}
        <div className="space-y-6">
          {/* hero */}
          <Card>
            <CardContent className="!p-6">
              {infeasible ? (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Home price you can afford</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">Budget too low</div>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">Your monthly budget of {money(s.target)} doesn't cover the fixed costs (taxes, insurance & HOA = <span className="font-medium text-foreground">{money(fixedCosts)}/mo</span>). Raise the budget or lower those costs to afford a loan.</p>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{s.mode === 'budget' ? 'Home price you can afford' : 'Estimated monthly payment'}</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-5xl font-bold tracking-tight tabular-nums text-foreground sm:text-6xl">{money(heroDisp)}</span>
                    <span className="mb-2 text-lg font-medium text-muted-foreground">{s.mode === 'budget' ? '' : '/mo'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    {s.mode === 'budget'
                      ? <>
                        <span>Monthly budget <span className="font-semibold tabular-nums text-foreground">{money(s.target)}</span></span>
                        <span>Loan amount <span className="font-semibold tabular-nums text-foreground">{money(m.loan)}</span></span>
                        <span>Down payment <span className="font-semibold tabular-nums text-foreground">{money(m.dp)} · {s.dpPct}%</span></span>
                      </>
                      : <>
                        <span>Loan amount <span className="font-semibold tabular-nums text-foreground">{money(m.loan)}</span></span>
                        <span>Down payment <span className="font-semibold tabular-nums text-foreground">{money(m.dp)} · {m.dpPct.toFixed(m.dpPct % 1 ? 1 : 0)}%</span></span>
                        <span>Loan-to-value <span className="font-semibold tabular-nums text-foreground">{(m.ltv * 100).toFixed(0)}%</span></span>
                      </>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly payment breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                <BreakdownDonut data={segs} total={m.total} money={money} />
                <div className="w-full flex-1">
                  {segs.map(c => (
                    <div key={c.key} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
                      <span className="flex items-center gap-2.5 text-sm"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} />{c.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{money(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: 'Total interest', v: money(m.totalInterest), x: 'over ' + s.term + ' years' },
              { k: 'Total of payments', v: money(m.totalPaid), x: 'principal + interest' },
              { k: 'Payoff date', v: payoff, x: s.term + '-year term' },
              { k: 'Monthly P&I', v: money(m.pi), x: 'before escrow' },
            ].map((st, i) => (
              <Card key={i}><CardContent className="!p-4">
                <div className="text-xs font-medium text-muted-foreground">{st.k}</div>
                <div className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{st.v}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{st.x}</div>
              </CardContent></Card>
            ))}
          </div>

          {/* amortization */}
          <Card>
            <CardHeader className="pb-2">
              <div className="space-y-1"><CardTitle className="text-base">Loan balance and interest over time</CardTitle>
                <CardDescription>Remaining principal and cumulative interest paid across the life of the loan.</CardDescription></div>
            </CardHeader>
            <CardContent>
              <AmortChart data={amortData} money={money} />
              <div className="mt-4 flex justify-end border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => setShowSchedule(v => !v)}>
                  {showSchedule ? 'Hide schedule' : 'Show amortization schedule'}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showSchedule ? 'rotate(180deg)' : 'none', transition: '.2s' }}><path d="m6 9 6 6 6-6" /></svg>
                </Button>
              </div>
              {showSchedule && (
                <div className="mt-4 rounded-lg border">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-medium">Amortization schedule</span>
                    <Tabs value={schedView} onValueChange={setSchedView}>
                      <TabsList className="h-8"><TabsTrigger value="year" className="text-xs">Annual</TabsTrigger><TabsTrigger value="month" className="text-xs">Monthly</TabsTrigger></TabsList>
                    </Tabs>
                  </div>
                  <div className={cn("overflow-auto", schedView === 'month' ? 'max-h-80' : '')}>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{schedView === 'year' ? 'Year' : 'Month'}</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(schedView === 'year' ? tableRows : monthlyRows).map(r => (
                          <TableRow key={r.period}>
                            <TableCell className="font-medium">{r.period}</TableCell>
                            <TableCell className="text-right">{money(r.principal)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{money(r.interest)}</TableCell>
                            <TableCell className="text-right">{money(r.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* sensitivity */}
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1"><CardTitle className="text-base">Payment sensitivity</CardTitle>
                <CardDescription>How the monthly payment moves with one variable.</CardDescription></div>
              <Tabs value={sensVar} onValueChange={setSensVar}>
                <TabsList>{sensVars.map(v => <TabsTrigger key={v.value} value={v.value}>{v.label}</TabsTrigger>)}</TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <SensitivityChart data={sensData} currentX={sens.current.x} currentY={sens.current.y} xFmt={xFmt} tooltipLabelFmt={tooltipLabelFmt} yFmt={yFmt} money={money} discrete={sens.discrete} />
              <p className="mt-3 text-sm text-muted-foreground">
                At a {names[sensVar]} of <span className="font-semibold text-foreground tabular-nums">{curLabel}</span>, the all-in monthly payment is <span className="font-semibold text-primary tabular-nums">{money(sens.current.y)}</span>. The curve covers principal, interest, taxes, insurance, PMI and HOA.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-2 text-xs text-muted-foreground">
        Estimates for planning only. Actual rates, taxes, insurance and PMI vary by lender and location.
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<LedgerApp />);
