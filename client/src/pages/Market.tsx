import React from "react";
import { useLang } from "@/lib/i18n";
import { api, type MarketData, type GlobalData } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState, Spark, ChangeChip, fmtNum, fmtPct, CandleStickChart, StarButton, useWatchlist } from "@/components/ui";
import { Link } from "wouter";

function rsiColor(rsi: number | null): string {
  if (rsi == null) return "text-slate-400";
  if (rsi > 70) return "text-red-400";
  if (rsi < 30) return "text-emerald-400";
  return "text-slate-300";
}

export default function Market() {
  const { t, lang } = useLang();
  const { list: watchlist, toggle: toggleWatch } = useWatchlist();
  const [data, setData] = React.useState<MarketData | null>(null);
  const [globalData, setGlobalData] = React.useState<GlobalData | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.market().then(setData).catch(() => setErr("Could not load market data."));
    api.global().then(setGlobalData).catch(() => {});
  }, []);

  if (err) return <ErrorState message={err} />;
  if (!data) return <LoadState />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <section>
        <SectionTitle>{t("market_title")}</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">{t("market_sub")}</p>
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-base-700/60 text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("market_symbol")}</th>
                  <th className="px-5 py-3.5 text-start font-mono text-[10px] uppercase tracking-widest">{t("market_name")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest">{t("market_price")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest">{t("market_day")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest">{t("market_week")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest">{t("market_month")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest">{t("market_rsi")}</th>
                  <th className="px-5 py-3.5 text-end font-mono text-[10px] uppercase tracking-widest w-28">{lang === "ar" ? "٣ شهور" : "3M"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-600">
                {(data.stocks ?? []).map((s) => (
                  <tr key={s.symbol} className="hover:bg-base-700/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <StarButton active={watchlist.includes(s.symbol)} onClick={() => toggleWatch(s.symbol)} />
                        <Link href={`/analyze?t=${encodeURIComponent(s.symbol)}`} className="font-mono font-bold text-gold-300 hover:underline">
                          {s.symbol}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{s.name}</td>
                    <td className="px-5 py-3 text-end font-mono font-bold text-slate-100">{fmtNum(s.price, 2)}</td>
                    <td className="px-5 py-3 text-end"><ChangeChip value={s.changePct} /></td>
                    <td className="px-5 py-3 text-end"><ChangeChip value={s.change1wPct} /></td>
                    <td className="px-5 py-3 text-end"><ChangeChip value={s.change1mPct} /></td>
                    <td className={`px-5 py-3 text-end font-mono font-bold ${rsiColor(s.rsi)}`}>{s.rsi != null ? fmtNum(s.rsi, 0) : "—"}</td>
                    <td className="px-5 py-3 w-28">
                      <div className="h-9 w-24 ms-auto">
                        <Spark data={s.series} color={s.change3mPct != null && s.change3mPct >= 0 ? "#34d399" : "#f87171"} height={36} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle>{t("indices_title") || "EGX Indices"}</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">Egyptian stock market indices — quote-only on Yahoo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.indices ?? []).map((idx) => (
            <Link key={idx.symbol} href={`/analyze?t=${encodeURIComponent(idx.symbol)}`} className="block hover:opacity-90 transition-opacity">
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-bold text-sky-300">{idx.symbol}</div>
                    <div className="text-xs text-slate-400 mt-1">{idx.name}</div>
                  </div>
                  <ChangeChip value={idx.changePct} />
                </div>
                <div className="font-mono text-xl font-bold text-slate-100">
                  {idx.level != null ? fmtNum(idx.level, 0) : "n/a"}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  {idx.level != null
                    ? idx.currency
                    : lang === "ar"
                      ? "بديل — غير متاح مباشرة على ياهو"
                      : "Proxy · not live on Yahoo"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>{t("etfs_title")}</SectionTitle>
        <p className="text-xs text-slate-500 font-mono mb-4">
          {lang === "ar"
            ? "البورصة المصرية لا تدرج صناديق ETF تقريبًا — المستثمر المحلي يستخدم صناديق الاستثمار المشتركة (تبويب الدخل الثابت). هذه هي صناديق مصر المتاحة دوليًا."
            : "The EGX lists almost no ETFs — local investors use mutual funds (see Fixed Income tab). These are the Egypt funds available internationally."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.etfs ?? []).map((e) => (
            <Card key={e.symbol}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-mono font-bold text-gold-300">{e.symbol}</div>
                  <div className="text-xs text-slate-400 mt-1">{e.name}</div>
                </div>
                <ChangeChip value={e.changePct} />
              </div>
              <div className="font-mono text-xl font-bold text-slate-100">{fmtNum(e.price, 2)}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1 mb-2">{e.currency}</div>
              {e.series && e.series.length > 1 && (
                <Spark data={e.series} color={e.changePct != null && e.changePct >= 0 ? "#34d399" : "#f87171"} height={40} />
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>{lang === "ar" ? "العملات والسلع العالمية" : "GLOBAL FX & COMMODITIES"}</SectionTitle>
        <p className="text-sm text-slate-400 mb-4">
          {lang === "ar"
            ? "أسعار العملات مقابل الجنيه والسلع العالمية (بالدولار). اضغط لأي رمز للتحليل."
            : "Currency crosses vs the Egyptian Pound and global commodities (USD). Click any item for analysis."}
        </p>
        {globalData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{t("fx_title")}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(globalData.fxCrosses ?? []).map((x) => (
                  <a key={x.id} href={`/analyze?t=${encodeURIComponent(x.id)}`} className="p-3 rounded-lg bg-base-700/60 border border-base-600 hover:border-gold-500/40 transition-colors text-center">
                    <div className="text-[10px] text-slate-400 font-mono">{x.id}</div>
                    <div className="font-mono text-sm text-slate-100 mt-1">{x.rate != null ? fmtNum(x.rate, 3) : "—"}</div>
                    <div className={`text-[10px] font-mono ${x.change1dPct != null && x.change1dPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPct(x.change1dPct)}</div>
                  </a>
                ))}
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-200">{lang === "ar" ? "السلع" : "COMMODITIES"}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(globalData.commodities ?? []).map((c) => (
                  <a key={c.symbol} href={`/analyze?t=${encodeURIComponent(c.symbol)}`} className="p-3 rounded-lg bg-base-700/60 border border-base-600 hover:border-gold-500/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gold-300">{c.name}</span>
                      <ChangeChip value={c.change1dPct} />
                    </div>
                    <div className="font-mono text-lg text-slate-100 mt-1">{c.price != null ? fmtNum(c.price, 2) : "—"}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{c.unit}</div>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        )}
      </section>

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}