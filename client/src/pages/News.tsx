import React from "react";
import { useLang, pick, fmtNum } from "@/lib/i18n";
import { api, type NewsItem } from "@/lib/api";
import { Card, SectionTitle, LoadState, ErrorState } from "@/components/ui";
import { Newspaper, ExternalLink, Clock, Globe, AlertTriangle } from "lucide-react";

export default function News() {
  const { t, lang } = useLang();
  const [data, setData] = React.useState<{ news: NewsItem[]; updatedAt: string } | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.news().then(setData).catch(() => setErr("Could not load news."));
  }, []);

  if (err) return <ErrorState message={err} />;
  if (!data) return <LoadState />;

  // Prefer items in the selected language; fall back to everything if too few.
  const inLang = data.news.filter((n) => (n.lang ?? "en") === lang);
  const visible = inLang.length >= 5 ? inLang : data.news;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-sky-400" />
            <h1 className="text-2xl font-mono font-bold text-slate-100">{t("news_title") || "Egypt Market News"}</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">{t("news_sub") || "Latest news affecting Egyptian markets — stocks, ETFs, FX, gold, macro"}</p>
        </div>
        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Updated: {new Date(data.updatedAt).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US")}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="space-y-0">
          {visible.map((item, i) => (
            <article
              key={item.link + i}
              className={`flex flex-col md:flex-row gap-4 p-4 border-b border-base-600 hover:bg-base-700/50 transition-colors ${
                i === visible.length - 1 ? "border-b-0" : ""
              }`}
            >
              <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 bg-base-700 rounded-lg flex items-center justify-center">
                <Globe className="w-8 h-8 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-bold text-slate-100 text-base leading-snug mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">{item.description ?? "No description available"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-base-700 rounded text-[9px] font-mono text-slate-400 border border-base-600 whitespace-nowrap">
                      {item.source}
                    </span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gold-500/10 border border-gold-500/30 rounded-lg hover:bg-gold-500/20 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gold-300" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.date)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {visible.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Newspaper className="w-10 h-10 text-slate-600" />
            <p className="font-mono">{t("news_empty") || "No news available at the moment"}</p>
          </div>
        </Card>
      )}

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}