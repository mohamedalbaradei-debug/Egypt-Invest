import { Router } from "express";
import { yahooFinance } from "./lib/yahoo.js";
import { getGoldData, getFxData, getIndexData, getEgxMarket, getInflation } from "./lib/market.js";
import { analyzeTicker } from "./lib/analysis.js";
import { buildDecision, buildRegime } from "./lib/decision.js";
import { EGYPT_FUNDS, moneyMarketYield } from "./data/funds.js";
import { EGX_STOCKS, EGX_ETFS, EGX_INDICES } from "./data/egx.js";

const router = Router();
const bi = (en, ar) => ({ en, ar });

router.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// Master dashboard payload: gold + FX + index + inflation + EGP decision.
router.get("/overview", async (req, res) => {
  const riskProfile = ["conservative", "balanced", "aggressive"].includes(String(req.query.risk))
    ? String(req.query.risk)
    : "balanced";

  const [gold, fx, index, inflation, market] = await Promise.all([
    getGoldData(),
    getFxData(),
    getIndexData(),
    getInflation(),
    getEgxMarket(),
  ]);

  const egx3mPct = basket3m(market.stocks);
  const decision = buildDecision({
    inflationPct: inflation.inflationPct,
    gold6mEgpPct: gold.egpPerOz != null ? gold.egp6mPct ?? null : null,
    fx6mPct: fx.change6mPct,
    egx3mPct,
    goldUsd6mPct: gold.usdChange6mPct,
    riskProfile,
  });

  const regime = buildRegime({
    inflationPct: inflation.inflationPct,
    mmYield: decision.inputs.moneyMarketYield,
    egx3mPct,
    fx6mPct: fx.change6mPct,
  });

  res.json({
    gold,
    fx,
    index,
    inflation,
    egxMomentum3m: egx3mPct,
    decision,
    regime,
    updatedAt: new Date().toISOString(),
  });
});

// Featured EGX market snapshot (stocks + ETFs + Indices).
router.get("/market", async (_req, res) => {
  const market = await getEgxMarket();
  res.json(market);
});

// Curated money-market & fixed-income funds.
router.get("/funds", (_req, res) => {
  res.json({
    funds: EGYPT_FUNDS,
    avgMoneyMarketYield: moneyMarketYield(),
    note: "Indicative yields from fund managers / FRA — dated, not live. Verify before investing.",
  });
});

// Egyptian market news from multiple sources.
router.get("/news", async (_req, res) => {
  const news = await fetchEgyptNews();
  res.json({ news, updatedAt: new Date().toISOString() });
});

// The EGP allocation decision with current market inputs.
router.get("/decision", async (_req, res) => {
  const [gold, fx, inflation, market] = await Promise.all([
    getGoldData(),
    getFxData(),
    getInflation(),
    getEgxMarket(),
  ]);
  const decision = buildDecision({
    inflationPct: inflation.inflationPct,
    gold6mEgpPct: gold.egp6mPct ?? null,
    fx6mPct: fx.change6mPct,
    egx3mPct: basket3m(market.stocks),
    goldUsd6mPct: gold.usdChange6mPct,
  });
  res.json(decision);
});

// Personalized investment plan: amount + horizon + risk → live allocation,
// expected outcomes and concrete instrument suggestions. Auto-refreshes with
// market data (all underlying fetches are TTL-cached).
router.get("/plan", async (req, res) => {
  const amountEgp = Math.max(0, parseFloat(String(req.query.amount ?? "0")) || 0);
  const horizon = ["short", "mid", "long"].includes(String(req.query.horizon))
    ? String(req.query.horizon)
    : "mid";
  const risk = ["conservative", "balanced", "aggressive"].includes(String(req.query.risk))
    ? String(req.query.risk)
    : "balanced";

  const [gold, fx, inflation, market] = await Promise.all([
    getGoldData(),
    getFxData(),
    getInflation(),
    getEgxMarket(),
  ]);

  const egx3mPct = basket3m(market.stocks);
  const decision = buildDecision({
    inflationPct: inflation.inflationPct,
    gold6mEgpPct: gold.egpPerOz != null ? gold.egp6mPct ?? null : null,
    fx6mPct: fx.change6mPct,
    egx3mPct,
    goldUsd6mPct: gold.usdChange6mPct,
    riskProfile: risk,
  });

  const mmYield = decision.inputs.moneyMarketYield;
  const inflationPct = inflation.inflationPct;

  // Horizon adjusts the equity bucket's assumed annualized scenario and the
  // guidance tone: short = capital-preservation tilt, long = growth tilt.
  const horizonYears = { short: 1, mid: 3, long: 5 }[horizon];
  const egxAnnScenario =
    egx3mPct != null
      ? Math.pow(1 + egx3mPct / 100, 4) - 1 // 3m momentum annualized (illustrative)
      : null;
  const goldAnnScenario =
    gold.egp6mPct != null ? Math.pow(1 + gold.egp6mPct / 100, 2) - 1 : null;

  const buckets = decision.allocation.map((a) => {
    const amount = (a.pct / 100) * amountEgp;
    let annRate = null;
    if (a.id === "money-market") annRate = mmYield;
    else if (a.id === "gold") annRate = goldAnnScenario != null ? goldAnnScenario * 100 : null;
    else if (a.id === "egx") annRate = egxAnnScenario != null ? egxAnnScenario * 100 : null;
    const projected =
      amount > 0 && annRate != null ? amount * Math.pow(1 + annRate / 100, horizonYears) : null;
    return {
      id: a.id,
      label: a.label,
      pct: a.pct,
      amountEgp: Math.round(amount),
      annRatePct: annRate != null ? Number(annRate.toFixed(1)) : null,
      projectedEgp: projected != null ? Math.round(projected) : null,
      rationale: a.rationale,
    };
  });

  const totalProjected = buckets.reduce(
    (s, b) => s + (b.projectedEgp ?? b.amountEgp),
    0
  );
  const blendedRate =
    amountEgp > 0
      ? buckets.reduce((s, b) => s + (b.annRatePct ?? 0) * (b.pct / 100), 0)
      : null;

  // Concrete instrument suggestions per bucket.
  const mmFunds = EGYPT_FUNDS.filter((f) => f.type === "money-market")
    .sort((a, b) => (b.yieldPct ?? 0) - (a.yieldPct ?? 0))
    .slice(0, 3)
    .map((f) => ({ name: f.en, nameAr: f.ar, yieldPct: f.yieldPct }));

  // Equity picks: top 3 by simple momentum+RSI screen from live market data.
  const equityPicks = [...market.stocks]
    .filter((s) => s.price != null && s.change3mPct != null && s.rsi != null && s.rsi < 70)
    .sort((a, b) => (b.change3mPct ?? -99) - (a.change3mPct ?? -99))
    .slice(0, 3)
    .map((s) => ({ symbol: s.symbol, name: s.name, chg3mPct: Number((s.change3mPct ?? 0).toFixed(1)), rsi: Math.round(s.rsi) }));

  const goldGrams = gold.gram21k != null && amountEgp > 0
    ? Number(((buckets.find((b) => b.id === "gold")?.amountEgp ?? 0) / gold.gram21k).toFixed(1))
    : null;

  res.json({
    amountEgp,
    horizon,
    horizonYears,
    risk,
    buckets,
    totalProjectedEgp: Math.round(totalProjected),
    blendedAnnRatePct: blendedRate != null ? Number(blendedRate.toFixed(1)) : null,
    realRateAfterInflationPct:
      blendedRate != null && inflationPct != null ? Number((blendedRate - inflationPct).toFixed(1)) : null,
    suggestions: {
      moneyMarketFunds: mmFunds,
      equityPicks,
      goldGram21k: goldGrams,
      goldPricePerGram: gold.gram21k,
    },
    headline: decision.headline,
    context: decision.context,
    disclaimer: bi(
      `Illustrative plan at today's data — assumes rates/trends hold for ${horizonYears} year(s), pre-tax, not guaranteed. Not financial advice.`,
      `خطة توضيحية ببيانات اليوم — تفترض ثبات العوائد/الاتجاهات لمدة ${horizonYears} سنة، قبل الضريبة، وغير مضمونة. ليست نصيحة مالية.`
    ),
    updatedAt: new Date().toISOString(),
  });
});

// Live symbol search (EGX .CA, LSE, NYSE, Xetra, ...).
// Merges Yahoo results with local EGX matches so Egyptian tickers always surface.
router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) return res.json({ results: [] });
  const ql = q.toLowerCase();

  const local = [...EGX_STOCKS, ...EGX_ETFS, ...EGX_INDICES]
    .filter((s) => {
      const aliases = s.aliases ?? [];
      return (
        s.symbol.toLowerCase().includes(ql) ||
        s.en.toLowerCase().includes(ql) ||
        s.ar.includes(q) ||
        aliases.some((a) => a.toLowerCase() === ql)
      );
    })
    .map((s) => ({
      symbol: s.symbol,
      name: s.en,
      exchange: s.symbol.startsWith("^") || s.symbol.includes("EWI") || s.symbol.includes("CAPPED") ? "INDEX" : s.symbol.endsWith(".CA") ? "EGX" : "NYSE",
      type: s.symbol.startsWith("^") || s.symbol.includes("EWI") || s.symbol.includes("CAPPED") ? "INDEX" : s.symbol.endsWith(".CA") ? "EQUITY" : "ETF",
      price: null,
      currency: s.symbol.endsWith(".CA") && !s.symbol.startsWith("^") ? "EGP" : s.symbol === "EGPT" ? "USD" : "EGP",
      local: true,
    }));

  const seen = new Set(local.map((r) => r.symbol));

  // If the query looks like an EGX index we don't carry (e.g. "EGX33" — not
  // published on Yahoo), surface the closest available Egyptian indices.
  const isIndexQuery = /^egx\s?\d{2,3}$/.test(ql.replace(/\s+/g, "")) && local.length === 0;

  try {
    const s = await yahooFinance.search(q, { quotesCount: 8 });
    const yahoo = (s.quotes ?? [])
      .filter((x) => x?.symbol && !seen.has(x.symbol))
      .map((x) => ({
        symbol: x.symbol,
        name: (x.shortname ?? x.longname ?? null),
        exchange: (x.exchange ?? null),
        type: (x.quoteType ?? null),
        price: (x.regularMarketPrice ?? null),
        currency: (x.currency ?? null),
      }));
    let results = [...local, ...yahoo].slice(0, 10);
    if (results.length === 0 && isIndexQuery) {
      results = EGX_INDICES.map((idx) => ({
        symbol: idx.symbol,
        name: idx.en,
        exchange: "INDEX",
        type: "INDEX",
        price: null,
        currency: "EGP",
        local: true,
      }));
    }
    res.json({ results });
  } catch (err) {
    req.log?.error?.({ err, q }, "search failed");
    res.json({ results: local });
  }
});

// Full bilingual analysis for any ticker (EGX or other).
router.post("/analyze", async (req, res) => {
  const ticker = String(req.body?.ticker ?? "").trim().toUpperCase();
  if (!ticker) return res.status(400).json({ error: "ticker required" });
  try {
    const result = await analyzeTicker(ticker);
    if (!result.historicalData || result.historicalData.length === 0) {
      return res.status(404).json({ error: `No data found for "${ticker}". Try a symbol like COMI.CA, TMGH.CA or EGP=X.` });
    }
    res.json(result);
  } catch (err) {
    req.log?.error?.({ err, ticker }, "analyze failed");
    res.status(500).json({ error: "Analysis failed. Check the symbol and try again." });
  }
});

function basket3m(stocks) {
  const vals = stocks
    .map((s) => s.change3mPct)
    .filter((v) => v != null);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

async function fetchEgyptNews() {
  const sources = [
    // English sources
    { name: "Ahram Online", feed: "https://english.ahram.org.eg/rss.xml", lang: "en" },
    { name: "Egypt Today", feed: "https://www.egypttoday.com/rss", lang: "en" },
    { name: "Enterprise", feed: "https://enterprise.press/feed/", lang: "en" },
    { name: "Daily News Egypt", feed: "https://dailynewsegypt.com/feed/", lang: "en" },
    { name: "Al-Monitor", feed: "https://www.al-monitor.com/rss/egypt", lang: "en" },
    // Arabic sources (verified working RSS)
    { name: "البورصة الأخبار", feed: "https://www.alborsaanews.com/feed", lang: "ar" },
    { name: "هابي جورنال", feed: "https://hapijournal.com/feed", lang: "ar" },
  ];

  const all = [];
  for (const src of sources) {
    try {
      const res = await fetch(src.feed, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRss(xml, src.name, src.lang);
      all.push(...items);
    } catch {
      // skip failed sources
    }
  }
  // Sort by date desc, dedupe by title
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  const seen = new Set();
  return all.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  }).slice(0, 40);
}

function parseRss(xml, source, lang = "en") {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = extract(content, "title");
    const link = extract(content, "link");
    const pubDate = extract(content, "pubDate");
    const description = extract(content, "description")?.replace(/<[^>]+>/g, "").slice(0, 200);
    if (title && link) {
      items.push({
        title,
        link,
        date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        description,
        source,
        lang,
      });
    }
  }
  return items;
}

function extract(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

export default router;