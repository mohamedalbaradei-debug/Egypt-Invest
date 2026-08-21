async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const j = await res.json();
      msg = j.error ?? msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export interface Bi {
  en: string;
  ar: string;
}

export interface OHLCPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GoldData {
  usdPerOz: number | null;
  usdChange1dPct: number | null;
  usdChange1mPct: number | null;
  usdChange6mPct: number | null;
  egp6mPct: number | null;
  usdSeries: Array<{ date: string; value: number }>;
  usdOhlc: OHLCPoint[];
  egpPerOz: number | null;
  gram24k: number | null;
  gram21k: number | null;
  fxUsed: number | null;
  note: string;
}

export interface FxData {
  usdEgp: number | null;
  change1dPct: number | null;
  change1mPct: number | null;
  change6mPct: number | null;
  series: Array<{ date: string; value: number }>;
  ohlc: OHLCPoint[];
  interpretation: string;
}

export interface IndexData {
  level: number | null;
  changePct: number | null;
  note: string;
  ohlc: OHLCPoint[];
}

export interface InflationData {
  inflationPct: number | null;
  year: string | null;
  source: string;
}

export interface Regime {
  id: "risk-on" | "risk-off" | "neutral";
  headline: Bi;
  context: Bi;
  signals: {
    realYield: number | null;
    egx3mPct: number | null;
    fx6mPct: number | null;
    inflationPct: number | null;
  };
}

export interface Overview {
  gold: GoldData;
  fx: FxData;
  index: IndexData;
  inflation: InflationData;
  egxMomentum3m: number | null;
  decision: Decision;
  regime?: Regime;
  updatedAt: string;
}

export interface MarketStock {
  symbol: string;
  en: string;
  ar: string;
  name: string;
  price: number | null;
  currency: string;
  changePct: number | null;
  change1wPct: number | null;
  change1mPct: number | null;
  change3mPct: number | null;
  rsi: number | null;
  series: Array<{ date: string; value: number }>;
  ohlc: OHLCPoint[];
}

export interface MarketETF {
  symbol: string;
  en: string;
  ar: string;
  name: string;
  price: number | null;
  currency: string;
  changePct: number | null;
  series: Array<{ date: string; value: number }>;
  ohlc: OHLCPoint[];
}

export interface MarketIndex {
  symbol: string;
  en: string;
  ar: string;
  name: string;
  level: number | null;
  currency: string;
  changePct: number | null;
  series: Array<{ date: string; value: number }>;
  ohlc: OHLCPoint[];
}

export interface MarketData {
  stocks: MarketStock[];
  etfs: MarketETF[];
  indices: MarketIndex[];
  updatedAt: string;
}

export interface Fund {
  id: string;
  type: "money-market" | "fixed-income";
  en: string;
  ar: string;
  manager: string;
  yieldPct: number;
  asOf: string;
  source: string;
  risk: "low" | "medium";
}

export interface FundsData {
  funds: Fund[];
  avgMoneyMarketYield: number;
  note: string;
}

export interface SearchResult {
  symbol: string;
  name: string | null;
  exchange: string | null;
  type: string | null;
  price: number | null;
  currency: string | null;
  local?: boolean;
}

export interface NewsItem {
  title: string;
  link: string;
  date: string;
  description: string | null;
  source: string;
  lang?: "ar" | "en";
}

export interface Analysis {
  symbol: string;
  companyName: string;
  currency: string;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  dividendYield: number | null;
  priceToBook: number | null;
  targetPrice: number | null;
  technical: {
    rsi: number | null;
    macd: { macd: number; signal: number; histogram: number } | null;
    sma50: number | null;
    sma200: number | null;
    support: number | null;
    resistance: number | null;
    high52w: number | null;
    low52w: number | null;
    fromHigh: number | null;
    fromLow: number | null;
    chg1m: number | null;
    chg3m: number | null;
    chg6m: number | null;
    atr: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    volumeAvg: number | null;
  };
  fundamental: {
    roe: number | null;
    roa: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    profitMargin: number | null;
    freeCashFlow: number | null;
    note?: Bi | null;
  };
  fundamentalsAsOf?: string | null;
  macro: {
    inflationPct: number | null;
    policyRate: number | null;
    fxRegime: Bi | null;
    countryRisk: Bi | null;
  };
  scores: { technical: number; fundamental: number; overall: number; trader: number; investor: number };
  recommendation: Bi;
  traderRec: StyledRec;
  investorRec: StyledRec;
  rationale: Bi[];
  summary: Bi;
  historicalData: Array<{ date: string; value: number }>;
  ohlc: OHLCPoint[];
  assetType?: "stock" | "index";
  historyNote?: Bi | null;
  disclaimer: Bi;
}

export interface StyledRec {
  en: string;
  ar: string;
  score?: number;
  reasons?: {
    technical: Bi[];
    fundamental: Bi[];
    macro: Bi[];
  };
}

export interface PlanBucket {
  id: string;
  label: Bi;
  pct: number;
  amountEgp: number;
  annRatePct: number | null;
  projectedEgp: number | null;
  rationale: Bi;
}

export interface InvestmentPlan {
  amountEgp: number;
  horizon: "short" | "mid" | "long";
  horizonYears: number;
  risk: "conservative" | "balanced" | "aggressive";
  buckets: PlanBucket[];
  totalProjectedEgp: number;
  blendedAnnRatePct: number | null;
  realRateAfterInflationPct: number | null;
  suggestions: {
    moneyMarketFunds: Array<{ name: string; nameAr: string | null; yieldPct: number }>;
    equityPicks: Array<{ symbol: string; name: string; chg3mPct: number; rsi: number }>;
    goldGram21k: number | null;
    goldPricePerGram: number | null;
  };
  headline: Bi;
  context: Bi;
  disclaimer: Bi;
  updatedAt: string;
}

export interface DecisionOption {
  id: string;
  label: Bi;
  pct: number;
  rationale: Bi;
}

export interface Decision {
  allocation: DecisionOption[];
  headline: Bi;
  context: Bi;
  disclaimer: Bi;
  inputs?: {
    inflationPct: number | null;
    gold6mEgpPct: number | null;
    fx6mPct: number | null;
    egx3mPct: number | null;
    goldUsd6mPct: number | null;
    moneyMarketYield: number;
    policyRate: number;
  };
}

export const api = {
  overview: (risk: "conservative" | "balanced" | "aggressive" = "balanced") =>
    get<Overview>(`/api/overview?risk=${risk}`),
  market: () => get<MarketData>("/api/market"),
  plan: (amount: number, horizon: "short" | "mid" | "long", risk: "conservative" | "balanced" | "aggressive") =>
    get<InvestmentPlan>(`/api/plan?amount=${amount}&horizon=${horizon}&risk=${risk}`),
  funds: () => get<FundsData>("/api/funds"),
  search: (q: string) => get<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`),
  analyze: (ticker: string) => post<Analysis>("/api/analyze", { ticker }),
  news: () => get<{ news: NewsItem[]; updatedAt: string }>("/api/news"),
};