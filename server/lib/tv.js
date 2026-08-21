// TradingView public scanner — free fundamentals source that covers EGX and,
// unlike Yahoo's quote API, works from datacenter IPs. Fresh TTM figures.
const TTL = 5 * 60 * 1000;
const cache = new Map();

function ttlGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  cache.delete(key);
  return null;
}
function ttlSet(key, v) {
  cache.set(key, { t: Date.now(), v });
  return v;
}

// "COMI.CA" → "EGX:COMI". Returns null for non-EGX symbols.
export function tvSymbol(symbol) {
  if (!symbol || !symbol.toUpperCase().endsWith(".CA")) return null;
  return `EGX:${symbol.replace(/\.CA$/i, "").toUpperCase()}`;
}

const COLUMNS = [
  "name",
  "close",
  "market_cap_basic",
  "price_earnings_ttm",
  "earnings_per_share_basic_ttm",
  "dividends_yield_current",
  "price_book_fq",
  "return_on_equity",
  "return_on_assets",
  "total_debt_to_equity",
  "current_ratio",
  "revenue_growth",
  "net_income",
  "total_revenue",
];

/**
 * Fundamentals for an EGX ticker from TradingView's scanner.
 * Returns null for non-EGX symbols or on any failure.
 */
export async function getTVFundamentals(symbol) {
  const tv = tvSymbol(symbol);
  if (!tv) return null;
  const cachedHit = ttlGet(tv);
  if (cachedHit !== null) return cachedHit;

  try {
    const res = await fetch("https://scanner.tradingview.com/egypt/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://www.tradingview.com" },
      body: JSON.stringify({ symbols: { tickers: [tv], query: { types: [] } }, columns: COLUMNS }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`TV ${res.status}`);
    const json = await res.json();
    const row = json?.data?.[0];
    if (!row || row.s !== tv) return ttlSet(tv, null);
    const d = row.d;
    const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    const [name, close, mcap, pe, eps, divYld, pb, roe, roa, de, curRatio, revGrowth, netIncome, revenue] =
      d.map(num);
    const profitMargin = netIncome != null && revenue ? (netIncome / revenue) * 100 : null;
    return ttlSet(tv, {
      name,
      close,
      marketCap: mcap,
      pe,
      eps,
      // TradingView yields are already in percent
      dividendYield: divYld,
      priceToBook: pb,
      roe,
      roa,
      debtToEquity: de,
      currentRatio: curRatio,
      revenueGrowth: revGrowth,
      profitMargin,
    });
  } catch {
    return ttlSet(tv, null);
  }
}
