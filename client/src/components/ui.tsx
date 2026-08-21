import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useLang, fmtNum, fmtCompact, pctColor, fmtPct } from "@/lib/i18n";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card card-hover p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      <span className="w-1 h-4 bg-gold-500 rounded-full" />
      <h2 className="text-sm font-bold tracking-widest text-slate-200 uppercase font-mono">{children}</h2>
    </div>
  );
}

export function Stat({ label, value, sub, valueClass = "text-slate-100" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; valueClass?: string }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className={`font-mono text-2xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

export function LoadState({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin text-gold-500" />
      <div className="font-mono text-xs">{text ?? "LOADING..."}</div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 font-mono text-sm">{message}</div>
  );
}

// Mini sparkline (area) used on small cards.
export function Spark({ data, color = "#d4af37", height = 56 }: { data: Array<{ date: string; value: number }>; color?: string; height?: number }) {
  if (!data || data.length === 0) return <div className="h-12" />;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipBoxStyle = { backgroundColor: "#101623", border: "1px solid #1f2c3f", borderRadius: "8px", fontSize: "12px" };

function dateTick(lang: string) {
  return (d: string) => {
    try {
      const dt = new Date(d.length === 10 ? d + "T00:00:00Z" : d);
      return dt.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", timeZone: "UTC" });
    } catch {
      return d;
    }
  };
}

export interface OHLCPoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number;
}

// Custom tooltip showing OHLC values.
function OhlcTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p?.open && p?.open !== 0) return null;
  const up = p.close >= p.open;
  return (
    <div style={tooltipBoxStyle} className="px-3 py-2">
      <div className="font-mono text-[10px] text-slate-400 mb-1">{String(p.date).slice(0, 10)}</div>
      <div className={`font-mono text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
        O {fmtNum(p.open)} · H {fmtNum(p.high)} · L {fmtNum(p.low)} · C {fmtNum(p.close)}
      </div>
    </div>
  );
}

// Candlestick via stacked bars: [low spacer][colored body][upper-wick spacer].
// The body shape draws the wicks itself using the pixel-per-unit ratio.
function CandleBodyShape(props: any) {
  const { x, y, width, height, payload } = props;
  if (!payload || x == null || y == null) return null;
  const { open, close, high, low, segBody } = payload;
  if ([open, close, high, low, segBody].some((v: number | null) => v == null)) return null;

  const up = close >= open;
  const color = up ? "#34d399" : "#f87171";
  const fill = up ? "rgba(52,211,153,0.9)" : "rgba(248,113,113,0.9)";

  const bodyH = Math.max(1, height);
  const pxPerUnit = bodyH / Math.max(segBody, 1e-9);

  const cx = x + width / 2;
  const wickAbovePx = (high - Math.max(open, close)) * pxPerUnit;
  const wickBelowPx = (Math.min(open, close) - low) * pxPerUnit;

  const bodyW = Math.max(1.5, Math.min(width * 0.72, 18));

  return (
    <g>
      {/* wick */}
      <line
        x1={cx}
        x2={cx}
        y1={y - wickAbovePx}
        y2={y + bodyH + wickBelowPx}
        stroke={color}
        strokeWidth={1.2}
      />
      {/* body */}
      <rect
        x={cx - bodyW / 2}
        y={y}
        width={bodyW}
        height={bodyH}
        fill={fill}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
}

// Combined chart with candle/line toggle + support/resistance overlays.
export function CandleStickChart({
  ohlc,
  color = "#34d399",
  height = 300,
  support,
  resistance,
}: {
  ohlc: OHLCPoint[];
  color?: string;
  height?: number;
  support?: number | null;
  resistance?: number | null;
}) {
  const { lang, t } = useLang();
  const [mode, setMode] = React.useState<"candle" | "line">("candle");

  const clean = React.useMemo(
    () =>
      (ohlc ?? []).filter(
        (d) => d.open != null && d.high != null && d.low != null && d.close != null
      ) as Array<{ date: string; open: number; high: number; low: number; close: number }>,
    [ohlc]
  );

  const chartData = React.useMemo(() => {
    if (clean.length === 0) return [];
    let minLow = Infinity;
    let maxHigh = -Infinity;
    for (const d of clean) {
      if (d.low < minLow) minLow = d.low;
      if (d.high > maxHigh) maxHigh = d.high;
    }
    const eps = (maxHigh - minLow) * 0.0008 || 0.01;
    return clean.map((d) => ({
      ...d,
      // Stack layout: [0→min(o,c)] transparent · [min→max] body · [max→high]
      // transparent. The lower wick (low→min) is drawn inside the body shape.
      segLow: Math.min(d.open, d.close),
      segBody: Math.max(Math.abs(d.close - d.open), eps),
      segWickTop: d.high - Math.max(d.open, d.close),
    }));
  }, [clean]);

  if (!clean.length) return <div className="h-12" />;

  const domainMin = Math.min(...chartData.map((d) => d.low));
  const domainMax = Math.max(...chartData.map((d) => d.high));
  const pad = (domainMax - domainMin) * 0.04 || 1;

  const lineData = clean.map((d) => ({ date: d.date, value: d.close }));
  const tickFmt = dateTick(lang);

  const toggle = (m: "candle" | "line") => (
    <button
      key={m}
      onClick={() => setMode(m)}
      className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${
        mode === m
          ? "bg-gold-500/20 text-gold-300 border border-gold-500/40"
          : "bg-base-700 text-slate-400 hover:text-slate-200 border border-transparent"
      }`}
    >
      {m === "candle" ? t("chart_candle") : t("chart_line")}
    </button>
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          {support != null && <span><span className="text-emerald-400">━</span> S {fmtNum(support)}</span>}
          {resistance != null && <span><span className="text-red-400">━</span> R {fmtNum(resistance)}</span>}
        </div>
        <div className="flex items-center gap-1">{[toggle("candle"), toggle("line")]}</div>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "candle" ? (
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="12%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2c3f" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tickFormatter={tickFmt}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[domainMin - pad, domainMax + pad]}
                tickFormatter={(v: number) => fmtNum(v, v > 1000 ? 0 : 2)}
              />
              <Tooltip content={<OhlcTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
              <Bar dataKey="segLow" stackId="c" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="segBody" stackId="c" shape={<CandleBodyShape />} isAnimationActive={false} />
              <Bar dataKey="segWickTop" stackId="c" fill="transparent" isAnimationActive={false} />
              {support != null && (
                <ReferenceLine y={support} stroke="#34d399" strokeDasharray="4 4" strokeWidth={1.2} />
              )}
              {resistance != null && (
                <ReferenceLine y={resistance} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.2} />
              )}
            </BarChart>
          ) : (
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2c3f" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
                tickFormatter={tickFmt}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => fmtNum(v, v > 1000 ? 0 : 2)}
              />
              <Tooltip
                contentStyle={tooltipBoxStyle}
                labelStyle={{ fontSize: "11px", color: "#94a3b8" }}
                formatter={(v: any) => [fmtNum(Number(v)), ""]}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              {support != null && (
                <ReferenceLine y={support} stroke="#34d399" strokeDasharray="4 4" strokeWidth={1.2} />
              )}
              {resistance != null && (
                <ReferenceLine y={resistance} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1.2} />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Larger line chart with tooltip.
export function TrendChart({ data, color = "#34d399" }: { data: Array<{ date: string; value: number }>; color?: string }) {
  const { lang } = useLang();
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2c3f" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tickFormatter={dateTick(lang)}
          />
          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={tooltipBoxStyle}
            labelStyle={{ fontSize: "11px", color: "#94a3b8" }}
            formatter={(v: any) => [fmtNum(Number(v)), ""]}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Small inline change chip
export function ChangeChip({ value, digits = 1 }: { value: number | null | undefined; digits?: number }) {
  return (
    <span className={`font-mono text-sm font-bold ${pctColor(value)}`}>{fmtPct(value, digits)}</span>
  );
}

// Beginner-friendly tooltip: a small "?" that reveals a plain-language
// explanation of the metric. Bilingual via the i18n dictionary.
export function Hint({ k }: { k: string }) {
  const { t } = useLang();
  const [open, setOpen] = React.useState(false);
  const text = t(k as any);
  if (!text || text === k) return null;
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-3.5 h-3.5 rounded-full bg-base-700 border border-slate-500 text-slate-400 text-[9px] font-mono leading-none hover:border-gold-500 hover:text-gold-300 transition-colors"
        aria-label="explanation"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-30 top-5 start-0 w-56 p-2 rounded-lg bg-base-700 border border-gold-500/40 text-[11px] text-slate-200 leading-relaxed shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

// Watchlist hook backed by localStorage.
export function useWatchlist() {
  const [list, setList] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ei_watchlist") ?? "[]");
    } catch {
      return [];
    }
  });
  const toggle = React.useCallback((sym: string) => {
    setList((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      localStorage.setItem("ei_watchlist", JSON.stringify(next));
      return next;
    });
  }, []);
  return { list, toggle };
}

export function StarButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-lg leading-none transition-colors ${active ? "text-gold-400" : "text-slate-600 hover:text-gold-300"}`}
      aria-label={active ? "remove from watchlist" : "add to watchlist"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

export { fmtNum, fmtCompact, fmtPct, pctColor };