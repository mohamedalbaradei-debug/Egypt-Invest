import React from "react";
import { useLang, pick } from "@/lib/i18n";
import { api, type NewsItem } from "@/lib/api";
import { Card, LoadState, ErrorState } from "@/components/ui";
import { CalendarDays, Newspaper, Globe, ExternalLink, Clock, AlertTriangle } from "lucide-react";

interface MacroEvent {
  date: string;
  category: "egypt-rates" | "us-fed" | "oil-opec" | "egypt-cpi" | "us-cpi" | "us-jobs";
  impact: "High" | "Medium" | "Low";
  title: { en: string; ar: string };
}

const CATEGORY_LABEL: Record<MacroEvent["category"], { en: string; ar: string }> = {
  "egypt-rates": { en: "Egypt Rates", ar: "السياسة النقدية المصرية" },
  "us-fed": { en: "US Fed", ar: "الاحتياطي الفيدرالي" },
  "oil-opec": { en: "Oil / OPEC+", ar: "النفط / أوبك+" },
  "egypt-cpi": { en: "Egypt CPI", ar: "التضخم المصري" },
  "us-cpi": { en: "US CPI", ar: "التضخم الأمريكي" },
  "us-jobs": { en: "US Jobs", ar: "الوظائف الأمريكية" },
};

const CATEGORY_COLOR: Record<MacroEvent["category"], string> = {
  "egypt-rates": "bg-gold-500/15 text-gold-300 border-gold-500/40",
  "us-fed": "bg-sky-500/15 text-sky-300 border-sky-500/40",
  "oil-opec": "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  "egypt-cpi": "bg-rose-500/15 text-rose-300 border-rose-500/40",
  "us-cpi": "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  "us-jobs": "bg-teal-500/15 text-teal-300 border-teal-500/40",
};

function formatDate(dateStr: string, lang: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function groupByDay<T extends { date: string }>(items: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const day = it.date.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(it);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default function Calendar() {
  const { t, lang } = useLang();
  const [tab, setTab] = React.useState<"news" | "macro">("news");
  const [news, setNews] = React.useState<NewsItem[] | null>(null);
  const [macro, setMacro] = React.useState<MacroEvent[] | null>(null);
  const [macroNote, setMacroNote] = React.useState<string | null>(null);
  const [cat, setCat] = React.useState<MacroEvent["category"] | "all">("all");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all([
      api.news().catch(() => null),
      fetch("/api/calendar")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([n, m]) => {
      if (!alive) return;
      if (n) setNews(n.news);
      if (m) {
        setMacro(m.events ?? []);
        setMacroNote(m.note ?? null);
      }
      if (!n && !m) setErr("Could not load calendar data.");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (err) return <ErrorState message={err} />;
  if (!news || !macro) return <LoadState />;

  const newsGroups = groupByDay(news);
  const macroEvents = cat === "all" ? macro : macro.filter((e) => e.category === cat);
  const macroGroups = groupByDay(macroEvents);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-6 h-6 text-gold-300" />
        <div>
          <h1 className="text-2xl font-mono font-bold text-slate-100">{t("nav_calendar")}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "ar"
              ? "أخبار السوق ومواعيد الأحداث الكلية المؤثرة على المستثمر المصري"
              : "Market news & macro events that matter to the Egyptian investor"}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("news")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "news" ? "bg-base-700 text-gold-300" : "text-slate-400 hover:text-slate-100 hover:bg-base-700/60"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          {lang === "ar" ? "أخبار السوق" : "Market News"}
        </button>
        <button
          onClick={() => setTab("macro")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "macro" ? "bg-base-700 text-gold-300" : "text-slate-400 hover:text-slate-100 hover:bg-base-700/60"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {lang === "ar" ? "المفكرة الكلية" : "Macro Watch"}
        </button>
      </div>

      {tab === "news" && (
        <div className="space-y-6">
          {newsGroups.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(day, lang)}
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="space-y-0">
                  {items.map((item, i) => (
                    <article
                      key={item.link + i}
                      className={`flex items-start justify-between gap-3 p-4 border-b border-base-600 hover:bg-base-700/50 transition-colors ${
                        i === items.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-mono font-bold text-slate-100 text-sm leading-snug mb-1 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{item.description ?? ""}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                          <span className="px-1.5 py-0.5 bg-base-700 rounded border border-base-600">{item.source}</span>
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {item.lang === "ar" ? "عربي" : "EN"}
                          </span>
                        </div>
                      </div>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gold-500/10 border border-gold-500/30 rounded-lg hover:bg-gold-500/20 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 text-gold-300" />
                      </a>
                    </article>
                  ))}
                </div>
              </Card>
            </div>
          ))}
          {newsGroups.length === 0 && (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Newspaper className="w-10 h-10 text-slate-600" />
                <p className="font-mono">{lang === "ar" ? "لا توجد أخبار متاحة" : "No news available"}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "macro" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCat("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                cat === "all" ? "bg-base-700 text-gold-300 border-gold-500/40" : "text-slate-400 border-base-600 hover:text-slate-100"
              }`}
            >
              {lang === "ar" ? "الكل" : "All"}
            </button>
            {(Object.keys(CATEGORY_LABEL) as MacroEvent["category"][]).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  cat === c ? CATEGORY_COLOR[c] : "text-slate-400 border-base-600 hover:text-slate-100"
                }`}
              >
                {pick(CATEGORY_LABEL[c], lang)}
              </button>
            ))}
          </div>

          {macroGroups.length === 0 && (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <CalendarDays className="w-10 h-10 text-slate-600" />
                <p className="font-mono">{lang === "ar" ? "لا توجد أحداث" : "No events"}</p>
              </div>
            </Card>
          )}

          {macroGroups.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(day, lang)}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((e, i) => (
                  <Card key={e.category + i} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-100 text-sm leading-snug">{pick(e.title, lang)}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${CATEGORY_COLOR[e.category]}`}>
                          {pick(CATEGORY_LABEL[e.category], lang)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                            e.impact === "High"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                              : "bg-slate-500/15 text-slate-300 border-slate-500/40"
                          }`}
                        >
                          {e.impact}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {macroNote && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              {macroNote}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-slate-500 font-mono text-center">{t("disclaimer")}</div>
    </div>
  );
}
