/* ============================================================
   charts.jsx — shadcn-style charts on Recharts.
   Mirrors shadcn's <ChartContainer> + <ChartTooltipContent>.
   ============================================================ */
const {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
  ReferenceLine, ReferenceDot
} = window.Recharts;

// Resolve a CSS chart token (e.g. "--chart-1" -> "hsl(152 52% 39%)")
function chartColor(varName) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `hsl(${v})` : '#888';
}
function tokenColor(varName) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `hsl(${v})` : '#888';
}

/* shadcn-style tooltip card */
function ChartTooltip({ active, payload, label, labelText, fmt }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      {labelText != null && <div className="mb-1 font-medium text-foreground">{labelText}</div>}
      <div className="grid gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: p.color || p.fill }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">{fmt ? fmt(p.value) : p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ChartContainer = ({ height = 220, children }) => (
  <div className="w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70" style={{ height }}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
);

/* ---------------- Amortization (balance over time) ---------------- */
function AmortChart({ data, money, height = 210 }) {
  const balance = chartColor('--chart-1');
  const interest = chartColor('--chart-4');
  const grid = tokenColor('--border');
  const muted = tokenColor('--muted-foreground');
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: balance }} />Remaining balance</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: interest }} />Interest paid</span>
      </div>
      <ChartContainer height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="amortFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={balance} stopOpacity={0.25} />
              <stop offset="100%" stopColor={balance} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grid} strokeOpacity={0.7} />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8}
            tick={{ fontSize: 11.5, fill: muted }} tickFormatter={(v) => v === 0 ? '0' : v + 'y'} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={46} tick={{ fontSize: 11.5, fill: muted }}
            tickFormatter={(v) => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v} />
          <Tooltip cursor={{ stroke: grid }} content={({ active, payload, label }) =>
            <ChartTooltip active={active} payload={payload} labelText={label === 0 ? 'Today' : 'Year ' + label} fmt={money} />} />
          <Area type="monotone" dataKey="balance" name="Remaining balance" stroke={balance} strokeWidth={2}
            fill="url(#amortFill)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="interestPaid" name="Interest paid" stroke={interest} strokeWidth={2}
            dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

/* ---------------- Sensitivity (payment vs one variable) ---------------- */
function SensitivityChart({ data, currentX, currentY, xFmt, tooltipLabelFmt, yFmt, money, discrete, height = 230 }) {
  const c = chartColor('--chart-1');
  const grid = tokenColor('--border');
  const muted = tokenColor('--muted-foreground');
  const accentInk = chartColor('--primary');
  return (
    <ChartContainer height={height}>
      <LineChart data={data} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="sensFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.16} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={grid} strokeOpacity={0.7} />
        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={false}
          tickMargin={8} tick={{ fontSize: 11.5, fill: muted }} tickFormatter={xFmt}
          ticks={discrete ? data.map(d => d.x) : undefined} />
        <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11.5, fill: muted }}
          domain={['auto', 'auto']} tickFormatter={yFmt} />
        <Tooltip cursor={{ stroke: grid }} content={({ active, payload }) =>
          <ChartTooltip active={active} payload={payload}
            labelText={payload && payload[0] ? (tooltipLabelFmt ? tooltipLabelFmt(payload[0].payload) : xFmt(payload[0].payload.x)) : ''} fmt={money} />} />
        <ReferenceLine x={currentX} stroke={accentInk} strokeDasharray="3 3" strokeOpacity={0.6} />
        <Line type="monotone" dataKey="y" name="Monthly payment" stroke={c} strokeWidth={2.5}
          dot={discrete ? { r: 3, fill: c, strokeWidth: 0 } : false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={true} />
        <ReferenceDot x={currentX} y={currentY} r={5.5} fill={accentInk} stroke="#fff" strokeWidth={2} />
      </LineChart>
    </ChartContainer>
  );
}

/* ---------------- Breakdown donut ---------------- */
function BreakdownDonut({ data, total, money, size = 188 }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            innerRadius={size * 0.34} outerRadius={size * 0.49} paddingAngle={1.5} stroke="none" isAnimationActive={true}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={({ active, payload }) =>
            <ChartTooltip active={active} payload={payload && payload.map(p => ({ name: p.name, value: p.value, color: p.payload.color }))} fmt={money} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Per month</span>
        <span className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{money(total)}</span>
      </div>
    </div>
  );
}

Object.assign(window, { ChartContainer, ChartTooltip, AmortChart, SensitivityChart, BreakdownDonut, chartColor });
