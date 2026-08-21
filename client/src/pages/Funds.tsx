import React from "react";
import { useLang, pick, fmtNum, fmtPct } from "@/lib/i18n";
import { api, type FundsData, type InvestmentPlan } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState, ChangeChip, Hint } from "@/components/ui";
import { Landmark, TrendingDown, Shield, AlertTriangle, Calculator, RefreshCw, Coins, Building2, Wallet } from "lucide-react";

function RiskIcon({ risk }: { risk: "low" | "medium" }) {
  if (risk === "low") return <Shield className="w-4 h-4 text-emerald-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

type Horizon = "short" | "mid" | "long";
type Risk = "conservative" | "balanced" | "aggressive";

const BUCKET_META: Record<string, { color: string; Icon: any }> = {
  "money-market": { color: "#34d399", Icon: Wallet },
  gold: { color: "#d4af37", Icon: Coins },
  egx: { color: "#60a5fa", Icon: Building2 },
};

export default function Funds() {
  const { t, lang } = useLang();
  const [data, setData] = React.useState<FundsData | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Planner inputs
  const [amount, setAmount] = React.useState("50000");
  const [horizon, setHorizon] = React.useState<Horizon>("mid");
  const [risk, setRisk] = React.useState<Risk>("balanced");
  const [plan, setPlan] = React.useState<InvestmentPlan | null>(null);
  const [planLoading, setPlanLoading] = React.useState(false);

  const fetchPlan = React.useCallback(() => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    setPlanLoading(true);
    api.plan(amt, horizon, risk)
      .then(setPlan)
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, [amount, horizon, risk]);

  React.useEffect(() => {
    api.funds().then(setData).catch(() => setErr("Could not load funds data."));
  }, []);

  // Fetch plan on inputs change + auto-refresh every 5 minutes (live market data).
  React.useEffect(() => {
    fetchPlan();
    const iv = setInterval(fetchPlan, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchPlan]);

  if (err) return <ErrorState message={err} />;
  if (!data) return <LoadState />;

  const mm = data.funds.filter((f) => f.type === "money-market");
  const fi = data.funds.filter((f) => f.type === "fixed-income");

  const seg = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
      active
        ? "bg-gold-500/20 text-gold-300 border-gold-500/50"
        : "bg-base-700 text-slate-400 border-transparent hover:text-slate-200"
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* ── Personalized Investment Planner ── */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <SectionTitle className="mb-0"><span className="inline-flex items-center gap-2"><Calculator className="w-4 h-4 text-gold-300" />{t("calc_title")}</span></SectionTitle>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <RefreshCw className={`w-3 h-3 ${planLoading ? "animate-spin text-gold-400" : ""}`} />
            {plan && lang === "ar" ? "تحديث تلقائي كل ٥ دقائق" : plan ? "Auto-updates every 5 min" : ""}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <div className="label mb-1.5">{t("calc_amount")}</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              className="w-full px-3 py-2 bg-base-700 border border-base-600 rounded-lg font-mono text-slate-100 focus:outline-none focus:border-gold-500"
            />
          </div>
          <div>
            <div className="label mb-1.5">{lang === "ar" ? "الأفق الزمني" : "Time horizon"}</div>
            <div className="flex gap-1.5">
              <button onClick={() => setHorizon("short")} className={seg(horizon === "short")}>{lang === "ar" ? "قصير" : "Short"}</button>
              <button onClick={() => setHorizon("mid")} className={seg(horizon === "mid")}>{lang === "ar" ? "متوسط" : "Mid"}</button>
              <button onClick={() => setHorizon("long")} className={seg(horizon === "long")}>{lang === "ar" ? "طويل" : "Long"}</button>
            </div>
          </div>
          <div>
            <div className="label mb-1.5">{lang === "ar" ? "تحمّل المخاطر" : "Risk tolerance"}</div>
            <div className="flex gap-1.5">
              <button onClick={() => setRisk("conservative")} className={seg(risk === "conservative")}>{t("risk_conservative")}</button>
              <button onClick={() => setRisk("balanced")} className={seg(risk === "balanced")}>{t("risk_balanced")}</button>
              <button onClick={() => setRisk("aggressive")} className={seg(risk === "aggressive")}>{t("risk_aggressive")}</button>
            </div>
          </div>
        </div>

        {/* Plan output */}
        {plan && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-lg bg-base-700/60 border border-base-600">
              <p className="text-sm text-slate-100 leading-relaxed">{pick(plan.headline, lang)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plan.buckets.map((b) => {
                const meta = BUCKET_META[b.id] ?? { color: "#94a3b8", Icon: Wallet };
                return (
                  <div key={b.id} className="p-4 rounded-xl bg-base-700/40 border border-base-600 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-bold text-sm" style={{ color: meta.color }}>
                        <meta.Icon className="w-4 h-4" /> {pick(b.label, lang)}
                      </span>
                      <span className="font-mono font-bold text-slate-200">{b.pct}%</span>
                    </div>
                    <div className="h-2 bg-base-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.pct}%`, background: meta.color }} />
                    </div>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-lg font-bold text-slate-100">{fmtNum(b.amountEgp, 0)} {lang === "ar" ? "ج.م" : "EGP"}</span>
                      {b.projectedEgp != null && (
                        <span className="text-xs text-emerald-300">→ {fmtNum(b.projectedEgp, 0)}</span>
                      )}
                    </div>
                    {b.annRatePct != null && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        ~{fmtNum(b.annRatePct, 1)}% / {lang === "ar" ? "سنة (سيناريو)" : "yr (scenario)"}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 leading-relaxed">{pick(b.rationale, lang)}</p>
                  </div>
                );
              })}
            </div>

            {/* Outcome summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="label mb-1">{t("calc_projected")} · {plan.horizonYears}Y</div>
                <div className="font-mono text-xl font-bold text-emerald-300">{fmtNum(plan.totalProjectedEgp, 0)} {lang === "ar" ? "ج.م" : "EGP"}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30">
                <div className="label mb-1">{lang === "ar" ? "العائد السنوي الممزوج" : "Blended annual rate"}</div>
                <div className="font-mono text-xl font-bold text-sky-300">{plan.blendedAnnRatePct != null ? `${fmtNum(plan.blendedAnnRatePct, 1)}%` : "—"}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="label mb-1 flex items-center">{lang === "ar" ? "بعد التضخم" : "Real rate after inflation"}<Hint k="hint_real_yield" /></div>
                <div className={`font-mono text-xl font-bold ${plan.realRateAfterInflationPct != null && plan.realRateAfterInflationPct >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {plan.realRateAfterInflationPct != null ? `${plan.realRateAfterInflationPct >= 0 ? "+" : ""}${fmtNum(plan.realRateAfterInflationPct, 1)}%` : "—"}
                </div>
              </div>
            </div>

            {/* Concrete suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-base-700/40 border border-base-600">
                <div className="label mb-2">{lang === "ar" ? "أعلى صناديق سوق النقد عائدًا" : "Top money-market funds"}</div>
                <ul className="space-y-1.5">
                  {plan.suggestions.moneyMarketFunds.map((f) => (
                    <li key={f.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate me-2">{lang === "ar" && f.nameAr ? f.nameAr : f.name}</span>
                      <span className="font-mono font-bold text-emerald-300 shrink-0">{fmtNum(f.yieldPct, 1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-base-700/40 border border-base-600">
                <div className="label mb-2">{lang === "ar" ? "أسهم EGX بزخم قوي" : "EGX momentum picks"}</div>
                {plan.suggestions.equityPicks.length === 0 ? (
                  <p className="text-xs text-slate-500">—</p>
                ) : (
                  <ul className="space-y-1.5">
                    {plan.suggestions.equityPicks.map((s) => (
                      <li key={s.symbol} className="flex items-center justify-between text-xs">
                        <a href={`/analyze?t=${encodeURIComponent(s.symbol)}`} className="font-mono text-gold-300 hover:underline truncate me-2">{s.symbol.replace(".CA", "")}</a>
                        <span className="font-mono text-emerald-300 shrink-0">3M +{fmtNum(s.chg3mPct, 0)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 rounded-xl bg-base-700/40 border border-base-600">
                <div className="label mb-2">{lang === "ar" ? "الذهب (عيار 21)" : "Gold (21k)"}</div>
                {plan.suggestions.goldGram21k != null ? (
                  <>
                    <div className="font-mono text-lg font-bold text-gold-300">{fmtNum(plan.suggestions.goldGram21k, 1)} {lang === "ar" ? "جرام" : "grams"}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">@ {fmtNum(plan.suggestions.goldPricePerGram ?? 0, 0)} {lang === "ar" ? "ج.م/جرام" : "EGP/g"}</div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">—</p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">{pick(plan.disclaimer, lang)}</p>
          </div>
        )}
      </Card>

      {/* Decision summary from overview - could fetch separately but let's show the idea */}
      <Card className="bg-gradient-to-b from-gold-500/5 to-transparent border-gold-500/20">
        <SectionTitle className="text-gold-300">{t("decision_title")}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Shield className="w-4 h-4" /> {t("decision_hold_cash")}
            </div>
            <div className="text-3xl font-mono font-bold text-emerald-300">60%</div>
            <p className="text-xs text-slate-400">Avg yield ~{fmtNum(data.avgMoneyMarketYield, 1)}% — positive real yield after inflation</p>
          </div>
          <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-gold-300 font-bold">
              <TrendingDown className="w-4 h-4" /> {t("decision_gold")}
            </div>
            <div className="text-3xl font-mono font-bold text-gold-300">30%</div>
            <p className="text-xs text-slate-400">6m EGP return ~+12% — hedge against FX</p>
          </div>
          <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-sky-300 font-bold">
              <Landmark className="w-4 h-4" /> {t("decision_stocks")}
            </div>
            <div className="text-3xl font-mono font-bold text-sky-300">10%</div>
            <p className="text-xs text-slate-400">Selective EGX — banks & industrials at low P/E</p>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle>{t("funds_type_mm")}</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">{t("funds_sub")}</p>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-base-700/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_manager")}</th>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_yield")}</th>
                  <th className="px-5 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest">{t("funds_asof")}</th>
                  <th className="px-5 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest">{lang === "ar" ? "المخاطر" : "Risk"}</th>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_source")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600">
                {mm.map((f) => (
                  <tr key={f.id} className="hover:bg-base-700/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-200">{pick({ en: f.en, ar: f.ar }, lang)}</div>
                      <div className="text-xs text-slate-400">{f.manager}</div>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-300 text-lg">{fmtNum(f.yieldPct, 1)}%</td>
                    <td className="px-5 py-3 text-center font-mono text-slate-400">{f.asOf}</td>
                    <td className="px-5 py-3 text-center"><RiskIcon risk={f.risk} /></td>
                    <td className="px-5 py-3 text-xs text-slate-500">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>{t("funds_type_fi")}</SectionTitle>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-base-700/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_manager")}</th>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_yield")}</th>
                  <th className="px-5 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest">{t("funds_asof")}</th>
                  <th className="px-5 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest">{lang === "ar" ? "المخاطر" : "Risk"}</th>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("funds_source")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600">
                {fi.map((f) => (
                  <tr key={f.id} className="hover:bg-base-700/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-200">{pick({ en: f.en, ar: f.ar }, lang)}</div>
                      <div className="text-xs text-slate-400">{f.manager}</div>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-emerald-300 text-lg">{fmtNum(f.yieldPct, 1)}%</td>
                    <td className="px-5 py-3 text-center font-mono text-slate-400">{f.asOf}</td>
                    <td className="px-5 py-3 text-center"><RiskIcon risk={f.risk} /></td>
                    <td className="px-5 py-3 text-xs text-slate-500">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}