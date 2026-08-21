import React from "react";
import { useLang } from "@/lib/i18n";
import { api, type MarketData } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState, Spark, ChangeChip, fmtNum, CandleStickChart, StarButton, useWatchlist } from "@/components/ui";
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
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.market().then(setData).catch(() => setErr("Could not load market data."));
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
            <Card key={idx.symbol}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-mono font-bold text-sky-300">{idx.symbol}</div>
                  <div className="text-xs text-slate-400 mt-1">{idx.name}</div>
                </div>
                <ChangeChip value={idx.changePct} />
              </div>
              <div className="font-mono text-xl font-bold text-slate-100">{fmtNum(idx.level, 0)}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">{idx.currency}</div>
            </Card>
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

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}