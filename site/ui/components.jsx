/* ============================================================
   components.jsx — shadcn/ui-style primitives (React + Tailwind)
   Mirrors shadcn's markup & class vocabulary; themed via the
   CSS variables defined in the host page. Exported to window.
   ============================================================ */
const { useState, useEffect, useRef, useContext, createContext, useCallback } = React;

function cn(...a) { return a.filter(Boolean).join(' '); }

/* ---------------- Button ---------------- */
const BTN_BASE = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";
const BTN_VARIANT = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};
const BTN_SIZE = { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", lg: "h-10 rounded-md px-6", icon: "h-9 w-9" };
function Button({ variant = "default", size = "default", className, ...props }) {
  return <button className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...props} />;
}

/* ---------------- Card ---------------- */
const Card = ({ className, ...p }) => <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...p} />;
const CardHeader = ({ className, ...p }) => <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...p} />;
const CardTitle = ({ className, ...p }) => <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...p} />;
const CardDescription = ({ className, ...p }) => <p className={cn("text-sm text-muted-foreground", className)} {...p} />;
const CardContent = ({ className, ...p }) => <div className={cn("p-5 pt-0", className)} {...p} />;
const CardFooter = ({ className, ...p }) => <div className={cn("flex items-center p-5 pt-0", className)} {...p} />;

/* ---------------- Input ---------------- */
const Input = ({ className, ...p }) => (
  <input className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...p} />
);

/* ---------------- Label ---------------- */
const Label = ({ className, ...p }) => <label className={cn("text-sm font-medium leading-none text-foreground", className)} {...p} />;

/* ---------------- Slider (shadcn-styled native range) ---------------- */
function Slider({ value, min = 0, max = 100, step = 1, onValueChange, className, ariaLabel }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const bg = `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--secondary)) ${pct}%)`;
  return (
    <input
      type="range" min={min} max={max} step={step} value={value} aria-label={ariaLabel}
      onChange={(e) => onValueChange && onValueChange(parseFloat(e.target.value))}
      style={{ background: bg }}
      className={cn(
        "ledger-slider h-1.5 w-full appearance-none cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    />
  );
}

/* ---------------- Tabs ---------------- */
const TabsCtx = createContext(null);
function Tabs({ value, onValueChange, className, children }) {
  return <TabsCtx.Provider value={{ value, onValueChange }}><div className={className}>{children}</div></TabsCtx.Provider>;
}
const TabsList = ({ className, ...p }) => <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...p} />;
function TabsTrigger({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.onValueChange(value)}
      data-state={active ? "active" : "inactive"}
      className={cn("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground", className)}>
      {children}
    </button>
  );
}
function TabsContent({ value, className, children }) {
  const ctx = useContext(TabsCtx);
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}

/* ---------------- Separator ---------------- */
const Separator = ({ className, orientation = "horizontal", ...p }) =>
  <div role="separator" className={cn("shrink-0 bg-border", orientation === "vertical" ? "h-full w-px" : "h-px w-full", className)} {...p} />;

/* ---------------- Badge ---------------- */
const BADGE_VARIANT = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground",
  soft: "border-transparent bg-primary/10 text-primary",
};
const Badge = ({ variant = "default", className, ...p }) =>
  <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors", BADGE_VARIANT[variant], className)} {...p} />;

/* ---------------- Table ---------------- */
const Table = ({ className, ...p }) => <div className="relative w-full overflow-auto"><table className={cn("w-full caption-bottom text-sm", className)} {...p} /></div>;
const TableHeader = ({ className, ...p }) => <thead className={cn("[&_tr]:border-b", className)} {...p} />;
const TableBody = ({ className, ...p }) => <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />;
const TableRow = ({ className, ...p }) => <tr className={cn("border-b border-border/60 transition-colors hover:bg-muted/50", className)} {...p} />;
const TableHead = ({ className, ...p }) => <th className={cn("h-9 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground", className)} {...p} />;
const TableCell = ({ className, ...p }) => <td className={cn("px-3 py-2 align-middle tabular-nums", className)} {...p} />;

/* ---------------- Switch ---------------- */
function Switch({ checked, onCheckedChange, ariaLabel }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-input")}>
      <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

Object.assign(window, {
  cn, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Input, Label, Slider, Tabs, TabsList, TabsTrigger, TabsContent, Separator, Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Switch,
});
