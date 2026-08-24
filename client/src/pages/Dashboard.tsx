import React from "react";
import { Link } from "wouter";
import { useLang, pick, fmtNum, fmtPct, pctColor } from "@/lib/i18n";
import { api, type Overview, type NewsItem, type MarketStock } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState, Spark, ChangeChip, Stat, CandleStickChart, Hint, useWatchlist } from "@/components/ui";
import { Landmark, IndianRupee, TrendingUp, Coins, LineChart as LineIcon, Newspaper, Gauge, Star, ArrowUpRight, ArrowDownRight, Repeat, Layers } from "lucide-react";

const ALLOC_COLORS: Record<string, string> = {
  "money-market": "#34d399",
  gold: "#d4af37",
  egx: "#60a5fa",
};

function AllocBar({ o }: { o: Overview["decision"]["allocation"][number] }) {
  const { lang } = useLang();
  const color = ALLOC_COLORS[o.id] ?? "#94a3b8";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{pick(o.label, lang)}</span>
        <span className="font-mono font-bold text-slate-100">{o.pct}%</span>
      </div>
      <div className="h-2 bg-base-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${o.pct}%`, background: color }} />
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{pick(o.rationale, lang)}</p>
    </div>
  );
}

type RiskProfile = "conservative" | "balanced" | "aggressive";

type RealValueData = {
  inflation: { inflationPct: number | null; year: string | null };
  bars: Array<{ key: string; labelEn: string; labelAr: string; pct: number }>;
};

function RealValueSection() {
  const { t, lang } = useLang();
  const [data, setData] = React.useState<RealValueData | null>(null);

  React.useEffect(() => {
    fetch("/api/realvalue")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.bars.length === 0) return null;
  const cpi = data.inflation.inflationPct;

  return (
    <Card>
      <SectionTitle>{t("rv_title")}</SectionTitle>
      <p className="text-xs text-slate-400 mb-4">{t("rv_sub")}</p>
      <div className="space-y-2.5">
        {data.bars.map((b) => {
          const beats = cpi == null ? true : b.pct >= cpi;
          const width = Math.max(0, Math.min(100, (b.pct / 30) * 100));
          const cpiWidth = cpi != null ? Math.max(0, Math.min(100, (cpi / 30) * 100)) : null;
          return (
            <div key={b.key} className="relative">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">{lang === "ar" ? b.labelAr : b.labelEn}</span>
                <span className="font-mono font-bold text-slate-100">
                  {fmtPct(b.pct)}{" "}
                  <span className={beats ? "text-emerald-400" : "text-red-400"}>
                    · {beats ? t("rv_beats") : t("rv_lags")}
                  </span>
                </span>
              </div>
              <div className="h-3.5 bg-base-700 rounded-full overflow-hidden relative">
                {cpiWidth != null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10"
                    style={{ insetInlineStart: `${cpiWidth}%` }}
                    title={`CPI ${fmtNum(cpi, 1)}%`}
                  />
                )}
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${width}%`,
                    background: b.key === "cpi" ? "#f87171" : beats ? "#34d399" : "#94a3b8",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { t, lang } = useLang();
  const [risk, setRisk] = React.useState<RiskProfile>("balanced");
  const [data, setData] = React.useState<Overview | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [market, setMarket] = React.useState<MarketStock[]>([]);
  const { list: watchlist, locked: wlLocked } = useWatchlist();

  // FX converter state
  const [usdAmount, setUsdAmount] = React.useState("100");

  React.useEffect(() => {
    setData(null);
    api.overview(risk).then(setData).catch(() => setErr("Could not load market overview."));
    api.news().then((n) => setNews(n.news ?? [])).catch(() => {});
    api.market().then((m) => setMarket(m.stocks ?? [])).catch(() => {});
  }, [risk]);

  if (err) return <ErrorState message={err} />;
  if (!data) return <LoadState />;

  // Prefer items in the selected language; fall back to everything.
  const inLang = news.filter((n) => (n.lang ?? "en") === lang);
  const topNews = (inLang.length >= 3 ? inLang : news).slice(0, 5);

  const { gold, fx, fxCrosses, commodities, index, inflation, decision, egxMomentum3m, regime } = data;
  const goldUsdColor = gold.usdChange6mPct != null && gold.usdChange6mPct >= 0 ? "#34d399" : "#f87171";
  const fxColor = fx.change6mPct != null && fx.change6mPct >= 0 ? "#f87171" : "#34d399";

  // Top movers
  const withChg = market.filter((s) => s.changePct != null);
  const gainers = [...withChg].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0)).slice(0, 4);
  const losers = [...withChg].sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0)).slice(0, 4);

  // Watchlist quotes
  const watchQuotes = market.filter((s) => watchlist.includes(s.symbol));

  const usdRate = fx.usdEgp;
  const converted = usdRate != null ? (parseFloat(usdAmount) || 0) * usdRate : null;

  const regimeCls =
    regime?.id === "risk-on"
      ? "bg-emerald-500/10 border-emerald-500/40"
      : regime?.id === "risk-off"
      ? "bg-red-500/10 border-red-500/40"
      : "bg-amber-500/10 border-amber-500/40";

  const riskBtn = (id: RiskProfile) => (
    <button
      key={id}
      onClick={() => setRisk(id)}
      className={`px-3 py-1 rounded-md text-[11px] font-mono border transition-colors ${
        risk === id
          ? "bg-gold-500/20 text-gold-300 border-gold-500/50"
          : "bg-base-700 text-slate-400 border-transparent hover:text-slate-200"
      }`}
    >
      {t(`risk_${id}` as any)}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Market regime banner */}
      {regime && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${regimeCls}`}>
          <Gauge className="w-6 h-6 shrink-0 text-slate-200" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono tracking-wide text-slate-100">{t("regime_title")}:</span>
              <span className="text-sm font-bold text-slate-100">{pick(regime.headline, lang)}</span>
            </div>
            <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">{pick(regime.context, lang)}</p>
          </div>
        </div>
      )}

      {/* Decision hero */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 end-0 w-72 h-72 bg-gold-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-gold-300" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">{t("decision_title")}</div>
              <div className="text-xs text-slate-400 font-mono">{t("decision_sub")}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {riskBtn("conservative")}
            {riskBtn("balanced")}
            {riskBtn("aggressive")}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-base-700/60 border border-base-600 mb-4">
          <p className="text-base leading-relaxed text-slate-100">{pick(decision.headline, lang)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {decision.allocation.map((o) => (
            <AllocBar key={o.id} o={o} />
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-base-600 text-xs text-slate-400 font-mono leading-relaxed">
          {t("decision_context")}: {pick(decision.context, lang)}
        </div>
        <div className="mt-2 text-[10px] text-slate-500 font-mono">{pick(decision.disclaimer, lang)}</div>
      </Card>

      {/* Watchlist strip */}
      {wlLocked ? (
        <Card className="border-gold-500/30 bg-gradient-to-br from-gold-500/5 to-base-800">
          <div className="text-center space-y-3 py-6 px-4">
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-gold-400" />
              <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("watchlist_title")}</h3>
            </div>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">{t("watchlist_lock_sub")}</p>
            <Link
              href="/portfolio"
              className="inline-block mt-1 bg-gold-500 text-base-900 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gold-400 transition-colors"
            >
              {t("pf_signin")}
            </Link>
          </div>
        </Card>
      ) : (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gold-400" />
            <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("watchlist_title")}</h3>
          </div>
          <a href="/market" className="text-xs text-gold-300 hover:underline font-mono">{lang === "ar" ? "السوق ←" : "MARKET →"}</a>
        </div>
        {watchQuotes.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">{t("watchlist_empty")}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {watchQuotes.map((s) => (
              <a key={s.symbol} href={`/analyze?t=${encodeURIComponent(s.symbol)}`} className="p-3 rounded-lg bg-base-700/60 border border-base-600 hover:border-gold-500/40 transition-colors">
                <div className="font-mono text-xs font-bold text-gold-300 truncate">{s.symbol.replace(".CA", "")}</div>
                <div className="font-mono text-sm text-slate-100 mt-1">{fmtNum(s.price, 2)}</div>
                <ChangeChip value={s.changePct} />
              </a>
            ))}
          </div>
        )}
      </Card>
      )}

      {/* Top movers + converter row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle>{t("movers_title")}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-mono text-emerald-400"><ArrowUpRight className="w-3.5 h-3.5" />{t("gainers")}</div>
              <div className="space-y-1.5">
                {gainers.map((s) => (
                  <a key={s.symbol} href={`/analyze?t=${encodeURIComponent(s.symbol)}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-700/50 hover:bg-base-700 transition-colors">
                    <span className="font-mono text-xs text-slate-200">{s.symbol.replace(".CA", "")}</span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">{fmtNum(s.price, 2)}</span>
                      <span className={pctColor(s.changePct)}>{fmtPct(s.changePct)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-mono text-red-400"><ArrowDownRight className="w-3.5 h-3.5" />{t("losers")}</div>
              <div className="space-y-1.5">
                {losers.map((s) => (
                  <a key={s.symbol} href={`/analyze?t=${encodeURIComponent(s.symbol)}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-700/50 hover:bg-base-700 transition-colors">
                    <span className="font-mono text-xs text-slate-200">{s.symbol.replace(".CA", "")}</span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">{fmtNum(s.price, 2)}</span>
                      <span className={pctColor(s.changePct)}>{fmtPct(s.changePct)}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Currency converter */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("converter_title")}</h3>
          </div>
          <input
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full px-3 py-2 bg-base-700 border border-base-600 rounded-lg font-mono text-slate-100 focus:outline-none focus:border-gold-500"
            placeholder="USD"
          />
          <div className="my-2 text-center text-slate-500">↓</div>
          <div className="w-full px-3 py-2 bg-base-800 border border-gold-500/30 rounded-lg font-mono text-lg text-gold-300">
            {converted != null ? `${fmtNum(converted, 0)} EGP` : "—"}
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2">1 USD = {usdRate != null ? fmtNum(usdRate, 2) : "—"} EGP</p>
        </Card>
      </div>

      {/* Gold with candlestick */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-gold-300" />
            <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("gold_title")}</h3>
          </div>
          <ChangeChip value={gold.usdChange1dPct} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label={t("gold_per_gram")} value={`${fmtNum(gold.gram24k, 0)} ${lang === "ar" ? "ج.م" : "EGP"}`} valueClass="text-gold-300" sub={t("gold_24k")} />
          <Stat label={t("gold_21k")} value={`${fmtNum(gold.gram21k, 0)} ${lang === "ar" ? "ج.م" : "EGP"}`} />
          <Stat label={t("gold_usd")} value={`$${fmtNum(gold.usdPerOz, 0)}`} sub={fmtPct(gold.usdChange6mPct)} />
          <Stat label={t("gold_egp")} value={gold.egpPerOz != null ? `${fmtNum(gold.egpPerOz, 0)} ${lang === "ar" ? "ج.م" : "EGP"}` : "—"} sub={gold.egp6mPct != null ? `6m ${fmtPct(gold.egp6mPct)}` : undefined} />
        </div>
        <CandleStickChart ohlc={gold.usdOhlc} color={goldUsdColor} height={200} />
        <p className="text-[10px] text-slate-500 font-mono mt-2 leading-relaxed">{gold.note}</p>
      </Card>

      {/* Global commodities (silver, Brent, WTI) */}
      {commodities?.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{lang === "ar" ? "السلع العالمية" : "COMMODITIES"}</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {commodities.map((c: any) => (
              <a
                key={c.symbol}
                href={`/analyze?t=${encodeURIComponent(c.symbol)}`}
                className="p-3 rounded-lg bg-base-700/60 border border-base-600 hover:border-gold-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-gold-300">{c.name}</span>
                  <ChangeChip value={c.change1dPct} />
                </div>
                <div className="font-mono text-lg text-slate-100 mt-1">
                  {c.price != null ? fmtNum(c.price, 2) : "—"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{c.unit}</div>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-3">
            {lang === "ar"
              ? "أسعار عالمية بالدولار: فضة وخام برنت وغرب تكساس. اضغط للتحليل."
              : "Global USD prices — silver, Brent & WTI crude. Click for analysis."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FX with candlestick */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("fx_title")}</h3>
            </div>
            <ChangeChip value={fx.change1dPct} />
          </div>
          <Stat label={t("fx_sub")} value={fx.usdEgp != null ? fmtNum(fx.usdEgp, 2) : "—"} sub={fmtPct(fx.change6mPct)} />
          <div className="mt-4">
            <CandleStickChart ohlc={fx.ohlc} color={fxColor} height={180} />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-2">{t("fx_note")}</p>
          {fxCrosses?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-base-600">
              {fxCrosses.map((x: any) => (
                <a
                  key={x.id}
                  href={`/analyze?t=${encodeURIComponent(x.id)}`}
                  className="text-center hover:underline"
                  title={x.name}
                >
                  <div className="text-[10px] text-slate-400 font-mono">{x.id}</div>
                  <div className="font-mono text-sm text-slate-100">{x.rate != null ? fmtNum(x.rate, 3) : "—"}</div>
                  <div className={`text-[10px] font-mono ${x.change1dPct != null && x.change1dPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtPct(x.change1dPct)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* EGX30 + inflation */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("index_title")}</h3>
            </div>
            <ChangeChip value={index.changePct} />
          </div>
          <Stat label="EGX30" value={fmtNum(index.level, 0)} sub={egxMomentum3m != null ? `3m ${fmtPct(egxMomentum3m)}` : undefined} />
          <p className="text-[10px] text-slate-500 font-mono mt-2">{t("index_note")}</p>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-base-600">
            <div>
              <div className="label mb-1.5 flex items-center">{t("inflation_title")}<Hint k="hint_inflation" /></div>
              <div className="font-mono text-2xl font-bold text-amber-300">{inflation.inflationPct != null ? `${fmtNum(inflation.inflationPct, 1)}%` : "—"}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">{inflation.year ?? ""}</div>
            </div>
            <div>
              <div className="label mb-1.5 flex items-center">{t("mm_yield_title")}<Hint k="hint_real_yield" /></div>
              <div className="font-mono text-2xl font-bold text-emerald-300">{decision.inputs?.moneyMarketYield != null ? `${fmtNum(decision.inputs.moneyMarketYield, 1)}%` : "—"}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">{inflation.source}</div>
            </div>
            <div>
              <div className="label mb-1.5">{t("policy_title")}</div>
              <div className="font-mono text-2xl font-bold text-slate-100">{decision.inputs?.policyRate != null ? `${fmtNum(decision.inputs.policyRate, 2)}%` : "—"}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">CBE</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 font-mono">
            <LineIcon className="w-3.5 h-3.5 text-gold-300" />
            EGX momentum (3m): <span className={pctColor(egxMomentum3m)}>{fmtPct(egxMomentum3m)}</span>
          </div>
        </Card>
      </div>

      {/* Beat-inflation comparison */}
      <RealValueSection />

      {/* Quick News */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("news_title")}</h3>
          </div>
          <a href="/news" className="text-xs text-gold-300 hover:underline font-mono">{lang === "ar" ? "الكل ←" : "VIEW ALL →"}</a>
        </div>
        <div className="space-y-2.5">
          {topNews.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">{t("news_empty")}</p>
          )}
          {topNews.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 group"
            >
              <span className="w-1 h-1 mt-2 rounded-full bg-gold-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-slate-200 group-hover:text-gold-300 transition-colors leading-snug line-clamp-1">
                  {n.title}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {n.source} · {new Date(n.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                </p>
              </div>
            </a>
          ))}
        </div>
      </Card>

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}