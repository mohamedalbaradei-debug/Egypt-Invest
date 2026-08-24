import React from "react";
import { Router, Route, useLocation } from "wouter";
import { LangProvider, useLang } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Market from "@/pages/Market";
import Analyze from "@/pages/Analyze";
import Funds from "@/pages/Funds";
import News from "@/pages/News";
import Calendar from "@/pages/Calendar";
import Portfolio from "@/pages/Portfolio";

function AnalyticsBeacon() {
  const [location] = useLocation();
  React.useEffect(() => {
    try {
      const blob = new Blob([JSON.stringify({ path: location })], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
    } catch {
      // analytics must never break the page
    }
  }, [location]);
  return null;
}

function DisclaimerFooter() {
  const { t } = useLang();
  return (
    <footer className="border-t border-base-600 mt-10 py-6 px-4 text-center">
      <p className="text-[11px] text-slate-500 max-w-2xl mx-auto leading-relaxed">{t("disclaimer")}</p>
    </footer>
  );
}

function AppInner() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pb-16">
        <Router>
          <Route path="/" component={Dashboard} />
          <Route path="/market" component={Market} />
          <Route path="/analyze" component={Analyze} />
          <Route path="/funds" component={Funds} />
          <Route path="/news" component={News} />
        <Route path="/calendar" component={Calendar} />
          <Route path="/portfolio" component={Portfolio} />
        </Router>
      </main>
      <DisclaimerFooter />
      <AnalyticsBeacon />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </LangProvider>
  );
}