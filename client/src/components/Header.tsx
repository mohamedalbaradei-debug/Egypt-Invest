import React from "react";
import { Link } from "wouter";
import { LayoutDashboard, BarChart3, Search as SearchIcon, Landmark, Languages, Newspaper, Wallet, CalendarDays } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", icon: LayoutDashboard, key: "nav_dashboard" },
  { href: "/market", icon: BarChart3, key: "nav_market" },
  { href: "/portfolio", icon: Wallet, key: "nav_portfolio" },
  { href: "/analyze", icon: SearchIcon, key: "nav_analyze" },
  { href: "/funds", icon: Landmark, key: "nav_funds" },
  { href: "/news", icon: Newspaper, key: "nav_news" },
  { href: "/calendar", icon: CalendarDays, key: "nav_calendar" },
] as const;

export function Header() {
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-base/80 border-b border-base-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setPath("/")}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            <Landmark className="w-5 h-5 text-base-800" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-slate-100 text-lg">{t("appName")}</div>
            <div className="text-[10px] text-slate-400 font-mono">{t("appTag")}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => {
            const active = (path === "/" && n.href === "/") || (n.href !== "/" && path.startsWith(n.href));
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setPath(n.href)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-base-700 text-gold-300" : "text-slate-400 hover:text-slate-100 hover:bg-base-700/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-gold-400/20 to-gold-500/10 border border-gold-500/40 text-[10px] font-bold tracking-wider text-gold-300">
              ★ PREMIUM
            </span>
          )}
          {!user && (
            <Link
              href="/portfolio"
              onClick={() => setPath("/portfolio")}
              className="px-3 py-2 rounded-lg bg-gold-500 text-base-900 text-sm font-bold hover:bg-gold-400 transition-colors"
            >
              {t("nav_signin")}
            </Link>
          )}
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-base-600 text-sm font-bold text-slate-200 hover:border-gold-500/50 hover:text-gold-300 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {t("lang_toggle")}
          </button>
        </div>
      </div>
      {/* Mobile nav */}
      <nav className="md:hidden flex items-center justify-around border-t border-base-600 px-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = (path === "/" && n.href === "/") || (n.href !== "/" && path.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setPath(n.href)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-4 text-[10px] font-medium ${
                active ? "text-gold-300" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t(n.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}