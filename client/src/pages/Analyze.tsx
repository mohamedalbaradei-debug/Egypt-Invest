import React from "react";
import { useLang, pick, fmtNum, fmtPct, pctColor } from "@/lib/i18n";
import { api, type SearchResult, type Analysis } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState, ChangeChip, CandleStickChart, Stat, Hint } from "@/components/ui";
import { Search, Loader2, AlertCircle, X, TrendingUp, TrendingDown, Target } from "lucide-react";

function RecBadge({ rec, overall, clsOverride }: { rec: string; overall: number; clsOverride?: string }) {
  const cls = clsOverride ||
    (overall >= 63
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
      : overall >= 45
      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
      : "bg-red-500/15 text-red-300 border-red-500/40");
  return (
    <span className={`px-3 py-1 rounded-md text-sm font-mono font-bold border-2 ${cls}`}>{rec}</span>
  );
}

function ScoreBar({ label, value, colorOverride }: { label: string; value: number; colorOverride?: string }) {
  const color = colorOverride || (value >= 63 ? "bg-emerald-500" : value >= 45 ? "bg-amber-400" : "bg-red-500");
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-slate-200 font-bold">{value}/100</span>
      </div>
      <div className="h-1.5 bg-base-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Fact({ label, value, valueClass, hint }: { label: string; value: React.ReactNode; valueClass?: string; hint?: string }) {
  return (
    <div>
      <div className="label mb-1 flex items-center">
        {label}
        {hint && <Hint k={hint} />}
      </div>
      <div className={`font-mono text-lg font-bold ${valueClass ?? "text-slate-100"}`}>{value}</div>
    </div>
  );
}

export default function Analyze() {
  const { t, lang } = useLang();
  const [q, setQ] = React.useState("");
  const [showDrop, setShowDrop] = React.useState(false);
  const [hl, setHl] = React.useState(0);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const initialTicker = params.get("t");

  React.useEffect(() => {
    if (initialTicker) {
      setQ(initialTicker);
      runAnalysis(initialTicker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDrop(false);
      return;
    }
    setSearching(true);
    const tm = setTimeout(async () => {
      try {
        const r = await api.search(q.trim());
        setResults(r.results ?? []);
        setShowDrop(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(tm);
  }, [q]);

  async function runAnalysis(symbol: string) {
    setLoading(true);
    setErr(null);
    setAnalysis(null);
    try {
      const a = await api.analyze(symbol);
      setAnalysis(a);
    } catch (e) {
      setErr((e as Error & { status?: number }).status === 404 ? t("analyze_notfound") : t("analyze_error"));
    } finally {
      setLoading(false);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setShowDrop(false);
    runAnalysis(q.trim().toUpperCase());
  };

  const select = (sym: string) => {
    setQ(sym);
    setShowDrop(false);
    runAnalysis(sym);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDrop || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHl((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHl((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      const hit = results[hl];
      if (hit) {
        e.preventDefault();
        select(hit.symbol);
      }
    } else if (e.key === "Escape") {
      setShowDrop(false);
    }
  };

  const a = analysis;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <form onSubmit={submit} className="relative">
        <div className="relative group">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-gold-300 transition-colors" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHl(0);
              setShowDrop(true);
            }}
            onKeyDown={onKey}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            placeholder={t("analyze_search")}
            autoComplete="off"
            className="w-full bg-base-800 border-2 border-base-600 rounded-xl py-4 ps-12 pe-32 text-base font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-gold-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="absolute end-3 top-1/2 -translate-y-1/2 bg-gold-500 text-base-800 px-5 py-2 rounded-lg font-mono text-sm font-bold disabled:opacity-40 hover:bg-gold-300 transition-colors"
          >
            {t("analyze_btn")}
          </button>
          {searching && <Loader2 className="absolute end-28 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-500" />}
        </div>

        {showDrop && !searching && q.trim().length >= 2 && results.length === 0 && (
          <div className="absolute z-20 top-[calc(100%+6px)] start-0 end-0 bg-base-800 border border-base-600 rounded-xl shadow-2xl px-4 py-3 text-xs text-slate-400">
            {lang === "ar" ? "لا توجد نتائج — جرّب الرمز مثل COMI.CA أو اسم الشركة" : "No matches — try a ticker like COMI.CA or the company name"}
          </div>
        )}

        {showDrop && results.length > 0 && (
          <div className="absolute z-20 top-[calc(100%+6px)] start-0 end-0 bg-base-800 border border-base-600 rounded-xl shadow-2xl overflow-hidden">
            {results.slice(0, 8).map((r, i) => (
              <button
                key={r.symbol}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r.symbol);
                }}
                onMouseEnter={() => setHl(i)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors ${
                  i === hl ? "bg-base-700" : "hover:bg-base-700/50"
                }`}
              >
                <div className="min-w-0">
                  <span className="font-mono font-bold text-sm text-slate-100">{r.symbol}</span>
                  <span className="text-xs text-slate-400 ms-2 truncate">{r.name ?? ""}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-base-600 text-slate-400">
                    {r.exchange ?? r.type ?? ""}
                  </span>
                  {r.price != null && <span className="font-mono text-xs text-slate-300">{fmtNum(r.price, 2)}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {err && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 font-mono text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {err}
          <button onClick={() => setErr(null)} className="ms-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading && <LoadState text={t("analyze_searching")} />}

      {a && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-mono font-bold text-slate-100">{a.symbol}</h1>
                  <span className="px-2 py-1 bg-base-700 rounded text-xs text-slate-400 border border-base-600">{a.companyName}</span>
                  <RecBadge rec={pick(a.recommendation, lang)} overall={a.scores?.overall ?? 50} />
                </div>
                <div className="flex items-baseline gap-4 mt-3">
                  <span className="text-4xl font-mono font-bold text-slate-100">{fmtNum(a.price, 2)}</span>
                  <ChangeChip value={a.changePct} />
                  <span className="text-xs text-slate-500 font-mono">{a.currency}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[260px]">
                <ScoreBar label={t("analyze_technical")} value={a.scores?.technical ?? 0} />
                <ScoreBar label={t("analyze_fundamental")} value={a.scores?.fundamental ?? 0} />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed bg-base-700/50 border border-base-600 rounded-lg p-3">
              {pick(a.summary, lang)}
            </p>
          </Card>

          {/* Dual Recommendations: Trader vs Investor */}
          <Card className="bg-gradient-to-r from-emerald-500/5 to-sky-500/5 border-emerald-500/20">
            <SectionTitle className="text-emerald-300">Dual Recommendation — Trader vs Investor</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[("trader" as const), ("investor" as const)].map((style) => {
                const rec = style === "trader" ? a.traderRec : a.investorRec;
                const score = (style === "trader" ? a.scores?.trader : a.scores?.investor) ?? rec?.score ?? 50;
                const borderCls = style === "trader" ? "border-emerald-500/30" : "border-sky-500/30";
                const titleCls = style === "trader" ? "text-emerald-300" : "text-sky-300";
                const Icon = style === "trader" ? TrendingUp : Target;
                return (
                  <div key={style} className={`p-4 bg-base-700/50 border ${borderCls} rounded-xl`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-slate-300" />
                      <span className={`font-bold ${titleCls}`}>{t(style === "trader" ? "analyze_trader" : "analyze_investor")}</span>
                    </div>
                    <RecBadge
                      rec={pick(rec ?? { en: "—", ar: "—" }, lang)}
                      overall={score}
                      clsOverride={score >= 55 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                        score >= 40 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
                        "bg-red-500/20 text-red-300 border-red-500/40"}
                    />
                    {rec?.reasons && (
                      <div className="mt-3 space-y-2.5">
                        {([["technical", "analyze_technical"], ["fundamental", "analyze_fundamental"], ["macro", null]] as const).map(([key, labelKey]) => {
                          const items = rec.reasons?.[key] ?? [];
                          if (items.length === 0) return null;
                          return (
                            <div key={key}>
                              <div className="label mb-1">{labelKey ? t(labelKey) : "MACRO"}</div>
                              <ul className="space-y-1">
                                {items.map((r, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300 leading-relaxed">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-500 shrink-0" />
                                    <span>{pick(r, lang)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Candlestick Chart */}
          <Card>
            <SectionTitle>Price Chart — 1 Year · Candlesticks / Line</SectionTitle>
            {a.historyNote && (
              <p className="text-[11px] text-amber-300/80 font-mono mb-2 leading-relaxed">⚠ {pick(a.historyNote, lang)}</p>
            )}
            <CandleStickChart
              ohlc={a.ohlc ?? []}
              support={a.technical?.support}
              resistance={a.technical?.resistance}
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Technical */}
            <Card>
              <SectionTitle>{t("analyze_technical")}</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Fact hint="hint_rsi" label={t("analyze_rsi")} value={a.technical?.rsi != null ? fmtNum(a.technical.rsi, 1) : "—"} valueClass={a.technical?.rsi != null ? pctColor(a.technical.rsi > 70 ? -1 : a.technical.rsi < 30 ? 1 : 0) : undefined} />
                <Fact hint="hint_sr" label={t("analyze_support")} value={fmtNum(a.technical?.support, 2)} valueClass="text-emerald-300" />
                <Fact hint="hint_sr" label={t("analyze_resistance")} value={fmtNum(a.technical?.resistance, 2)} valueClass="text-red-300" />
                <Fact hint="hint_atr" label="ATR(14)" value={a.technical?.atr != null ? fmtNum(a.technical.atr, 2) : "—"} />
                <Fact hint="hint_bb" label="BB Upper" value={a.technical?.bbUpper != null ? fmtNum(a.technical.bbUpper, 2) : "—"} valueClass="text-sky-300" />
                <Fact hint="hint_bb" label="BB Lower" value={a.technical?.bbLower != null ? fmtNum(a.technical.bbLower, 2) : "—"} valueClass="text-sky-300" />
                <Fact label="SMA50" value={fmtNum(a.technical?.sma50, 2)} />
                <Fact label="SMA200" value={fmtNum(a.technical?.sma200, 2)} />
                <Fact hint="hint_macd" label="MACD" value={a.technical?.macd ? fmtNum(a.technical.macd.histogram, 2) : "—"} valueClass={a.technical?.macd ? pctColor(a.technical.macd.histogram) : undefined} />
                <Fact label="Avg Volume" value={a.technical?.volumeAvg != null ? fmtNum(a.technical.volumeAvg / 1e6, 1) + "M" : "—"} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-base-600 text-center">
                <div>
                  <div className="label mb-1">{t("analyze_52w")}H</div>
                  <div className="font-mono font-bold text-red-300">{fmtNum(a.technical?.high52w, 2)}</div>
                </div>
                <div>
                  <div className="label mb-1">{lang === "ar" ? "من أعلى" : "From high"}</div>
                  <div className={`font-mono font-bold ${pctColor(a.technical?.fromHigh)}`}>{fmtPct(a.technical.fromHigh)}</div>
                </div>
                <div>
                  <div className="label mb-1">{lang === "ar" ? "من أدنى" : "From low"}</div>
                  <div className={`font-mono font-bold ${pctColor(a.technical?.fromLow)}`}>{fmtPct(a.technical.fromLow)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-2 border-t border-base-600 text-center">
                <div>
                  <div className="label mb-1">1M</div>
                  <div className={`font-mono font-bold ${pctColor(a.technical?.chg1m)}`}>{fmtPct(a.technical.chg1m)}</div>
                </div>
                <div>
                  <div className="label mb-1">3M</div>
                  <div className={`font-mono font-bold ${pctColor(a.technical?.chg3m)}`}>{fmtPct(a.technical.chg3m)}</div>
                </div>
                <div>
                  <div className="label mb-1">6M</div>
                  <div className={`font-mono font-bold ${pctColor(a.technical?.chg6m)}`}>{fmtPct(a.technical.chg6m)}</div>
                </div>
              </div>
            </Card>

            {/* Fundamental */}
            <Card>
              <SectionTitle>{t("analyze_fundamental")}</SectionTitle>
              {a.assetType === "index" ? (
                <div className="p-3.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-slate-300 leading-relaxed space-y-2">
                  <p className="font-bold text-sky-300">
                    {lang === "ar" ? "هذا مؤشر سوق، وليس شركة" : "This is a market index, not a company"}
                  </p>
                  <p>
                    {lang === "ar"
                      ? "المؤشرات لا تملك أساسيات مالية (أرباح، توزيعات، مضاعفات). لتحليل الأساسيات، افتح إحدى الشركات المكونة للمؤشر من تبويب السوق."
                      : "Indices have no financial fundamentals (earnings, dividends, multiples). To analyze fundamentals, open one of the index's constituent companies from the Market tab."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Fact hint="hint_pe" label={t("analyze_pe")} value={a.pe != null ? fmtNum(a.pe, 1) : "—"} />
                    <Fact label={t("analyze_eps")} value={a.eps != null ? fmtNum(a.eps, 2) : "—"} />
                    <Fact label={t("analyze_pb")} value={a.priceToBook != null ? fmtNum(a.priceToBook, 2) : "—"} />
                    <Fact hint="hint_dividend" label={t("analyze_div")} value={a.dividendYield != null ? `${fmtNum(a.dividendYield, 1)}%` : "—"} />
                    <Fact label={t("analyze_mktcap")} value={a.marketCap != null ? `${fmtNum(a.marketCap / 1e9, 1)}B` : "—"} />
                    <Fact label={lang === "ar" ? "السعر المستهدف" : "Target"} value={a.targetPrice != null ? fmtNum(a.targetPrice, 2) : "—"} />
                  </div>
                  {a.fundamentalsAsOf && (
                    <p className="text-[10px] text-amber-500/80 font-mono mt-3">
                      ⏳ {lang === "ar" ? "بيانات الأساسيات من مخزن ياهو المؤقت بتاريخ" : "Fundamentals snapshot dated"} {a.fundamentalsAsOf} {lang === "ar" ? "(مصدر ياهو يقدّم بيانات قديمة مؤقتًا)" : "(Yahoo's cache is currently serving older data)"}
                    </p>
                  )}
                  {a.fundamental?.note && (
                    <p className="text-[10px] text-slate-500 font-mono mt-3 leading-relaxed">{pick(a.fundamental.note, lang)}</p>
                  )}
                  {(() => {
                    const f = a.fundamental;
                    const hasDeep = f && [f.roe, f.roa, f.debtToEquity, f.currentRatio, f.revenueGrowth, f.earningsGrowth, f.profitMargin, f.freeCashFlow].some((v) => v != null);
                    if (!hasDeep) return null;
                    return (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-base-600">
                        <Fact label="ROE" value={f.roe != null ? `${fmtNum(f.roe, 1)}%` : "—"} />
                        <Fact label="ROA" value={f.roa != null ? `${fmtNum(f.roa, 1)}%` : "—"} />
                        <Fact label="Debt/Equity" value={f.debtToEquity != null ? fmtNum(f.debtToEquity, 2) : "—"} />
                        <Fact label="Current Ratio" value={f.currentRatio != null ? fmtNum(f.currentRatio, 2) : "—"} />
                        <Fact label="Revenue Growth" value={f.revenueGrowth != null ? `${fmtNum(f.revenueGrowth, 1)}%` : "—"} />
                        <Fact label="Earnings Growth" value={f.earningsGrowth != null ? `${fmtNum(f.earningsGrowth, 1)}%` : "—"} />
                        <Fact label="Profit Margin" value={f.profitMargin != null ? `${fmtNum(f.profitMargin, 1)}%` : "—"} />
                        <Fact label="Free Cash Flow" value={f.freeCashFlow != null ? `${fmtNum(f.freeCashFlow / 1e9, 2)}B` : "—"} />
                      </div>
                    );
                  })()}
                </>
              )}
            </Card>

            {/* Macro & Rationale */}
            <Card>
              <SectionTitle>Macro Context (Egypt)</SectionTitle>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Fact label="Inflation" value={a.macro?.inflationPct != null ? `${fmtNum(a.macro?.inflationPct, 1)}%` : "—"} />
                <Fact label="CBE Policy Rate" value={a.macro?.policyRate != null ? `${fmtNum(a.macro?.policyRate, 2)}%` : "—"} />
                <Fact label="FX Regime" value={a.macro?.fxRegime ? pick(a.macro.fxRegime, lang) : "—"} />
                <Fact label="Country Risk" value={a.macro?.countryRisk ? pick(a.macro.countryRisk, lang) : "—"} />
              </div>

              <SectionTitle>{t("analyze_rationale")}</SectionTitle>
              <ul className="space-y-3">
                {(a.rationale ?? []).map((r, i) => (
                  <li key={i} className="flex gap-2 items-start text-sm text-slate-300 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-2 shrink-0" />
                    <span>{pick(r, lang)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4">{pick(a.disclaimer, lang)}</div>
        </div>
      )}
    </div>
  );
}