import React from "react";
import { Router, Route } from "wouter";
import { LangProvider } from "@/lib/i18n";
import { Header } from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import Market from "@/pages/Market";
import Analyze from "@/pages/Analyze";
import Funds from "@/pages/Funds";
import News from "@/pages/News";

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
        </Router>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}