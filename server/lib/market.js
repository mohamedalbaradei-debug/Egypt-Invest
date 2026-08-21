import { yahooFinance, chartSafe } from "./yahoo.js";
import { EGX_STOCKS, EGX_ETFS, EGX30_INDEX, EGX_INDICES, GOLD_SYMBOL, FX_SYMBOL } from "../data/egx.js";
import { WB_CPI_INDICATOR } from "../data/econ.js";

const OZ_TO_GRAM = 31.1034768;

// ── Tiny TTL cache so auto-refreshing clients don't hammer Yahoo ────────────
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}
const TTL = 5 * 60 * 1000;

// Yahoo shortNames for some EGX names embed mutual-fund ids like
// "TMGH.CA,0P0000EONG,2912080". Strip the noise.
export function cleanName(name) {
  if (!name) return null;
  const cleaned = String(name).split(",")[0].trim();
  return cleaned || null;
}

async function quote(symbol) {
  return cached(`q:${symbol}`, TTL, async () => {
    try {
      const [q] = await yahooFinance.quote([symbol]);
      if (q && q.regularMarketPrice != null) return q;
      // Yahoo's quote endpoint can return empty on datacenter IPs while the
      // chart endpoint still works — synthesize spot fields from chart closes.
      const series = await closes(symbol, 10);
      if (!series.length) return q ?? null;
      const last = series[series.length - 1].close;
      const prev = series.length > 1 ? series[series.length - 2].close : null;
      return {
        ...(q ?? {}),
        symbol,
        regularMarketPrice: last,
        regularMarketChangePercent: prev ? ((last - prev) / prev) * 100 : undefined,
      };
    } catch {
      return null;
    }
  });
}
export { quote as quoteSmart };

// Daily closes (oldest→newest) for the last `days`. Returns [] on failure.
async function closes(symbol, days = 400) {
  return cached(`c:${symbol}:${days}`, TTL, async () => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const result = await chartSafe(symbol, { period1: since, interval: "1d" });
      return (result.quotes ?? [])
        .filter((q) => q.close != null)
        .map((q) => ({ date: q.date, close: q.close }));
    } catch {
      return [];
    }
  });
}

// OHLC data for candlestick charts
async function ohlc(symbol, days = 365) {
  return cached(`o:${symbol}:${days}`, TTL, async () => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const result = await chartSafe(symbol, { period1: since, interval: "1d" });
      return (result.quotes ?? [])
        .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
        .map((q) => ({
          date: q.date,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume ?? 0,
        }));
    } catch {
      return [];
    }
  });
}

function pctChange(closesArr, lookback) {
  if (closesArr.length < lookback + 1) return null;
  const start = closesArr[closesArr.length - 1 - lookback].close;
  const end = closesArr[closesArr.length - 1].close;
  if (!start) return null;
  return ((end - start) / start) * 100;
}

// ── EGX basket proxy (real 1y price action built from featured stocks) ──────
// Yahoo publishes no daily history for EGX indices (quote-only). We build an
// equal-weight, base-1000 basket from the featured large caps instead, so
// users still see genuine Egyptian-market price action over time.
export async function getBasketHistory(days = 365) {
  return cached(`basket:${days}`, TTL, async () => {
    const perStock = await Promise.all(EGX_STOCKS.map((s) => closes(s.symbol, days)));
    // date -> { sym: close }
    const byDate = new Map();
    perStock.forEach((rows, i) => {
      const sym = EGX_STOCKS[i].symbol;
      rows.forEach((r) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        if (!byDate.has(d)) byDate.set(d, {});
        byDate.get(d)[sym] = r.close;
      });
    });
    const dates = [...byDate.keys()].sort();
    if (dates.length < 30) return [];

    // Normalize each stock to 1000 at its first available date, then average.
    const base = new Map();
    const out = [];
    for (const d of dates) {
      const row = byDate.get(d);
      let sum = 0;
      let n = 0;
      for (const s of EGX_STOCKS) {
        const px = row[s.symbol];
        if (px == null) continue;
        if (!base.has(s.symbol)) base.set(s.symbol, px);
        sum += (px / base.get(s.symbol)) * 1000;
        n += 1;
      }
      if (n >= Math.ceil(EGX_STOCKS.length * 0.6)) out.push({ date: d, close: sum / n });
    }
    return out;
  });
}

// Convert a close-only series into candle-friendly OHLC (open = prev close).
export function closesToOhlc(series) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const c = series[i].close;
    const o = i > 0 ? series[i - 1].close : c;
    out.push({
      date: series[i].date,
      open: o,
      high: Math.max(o, c),
      low: Math.min(o, c),
      close: c,
      volume: 0,
    });
  }
  return out;
}

// ── Gold ────────────────────────────────────────────────────────────────────
export async function getGoldData() {
  const [goldQ, fxQ, goldSeries, fxSeries, goldOhlc] = await Promise.all([
    quote(GOLD_SYMBOL),
    quote(FX_SYMBOL),
    closes(GOLD_SYMBOL, 400),
    closes(FX_SYMBOL, 400),
    ohlc(GOLD_SYMBOL, 365),
  ]);

  // Spot fallback: Yahoo's quote endpoint can return empty on some datacenter
  // IPs while the chart endpoint still works — derive spot from last close.
  const usdPerOz = goldQ?.regularMarketPrice ?? (goldSeries.length ? goldSeries[goldSeries.length - 1].close : null);
  const usdEgpLive = fxQ?.regularMarketPrice ?? null;
  const usdEgp = usdEgpLive ?? (fxSeries.length ? fxSeries[fxSeries.length - 1].close : null);
  const fxRate = usdEgp ?? 50; // fallback if FX quote fails

  const egpPerOz = usdPerOz != null ? usdPerOz * fxRate : null;

  const usd6m = pctChange(goldSeries, 126);
  const fx6m = pctChange(fxSeries, 126);
  // Gold return expressed in EGP: combine USD gold move with the pound's move.
  const egp6mPct =
    usd6m != null && fx6m != null ? (1 + usd6m / 100) * (1 + fx6m / 100) * 100 - 100 : null;

  return {
    symbol: GOLD_SYMBOL,
    usdPerOz,
    usdChange1dPct: goldQ?.regularMarketChangePercent != null ? goldQ.regularMarketChangePercent : pctChange(goldSeries, 1),
    usdChange1mPct: pctChange(goldSeries, 21),
    usdChange6mPct: usd6m,
    egp6mPct,
    usdSeries: goldSeries.slice(-260).map((p) => ({ date: p.date, value: p.close })),
    usdOhlc: goldOhlc.slice(-260),
    egpPerOz,
    gram24k: egpPerOz != null ? egpPerOz / OZ_TO_GRAM : null,
    gram21k: egpPerOz != null ? (egpPerOz / OZ_TO_GRAM) * (21 / 24) : null,
    fxUsed: usdEgp,
    note: "International gold price (COMEX) converted to EGP at the market USD/EGP rate. Local Egyptian retail gold trades at a premium to this international reference.",
  };
}

// ── FX: USD/EGP ─────────────────────────────────────────────────────────────
export async function getFxData() {
  const [fxQ, fxSeries, fxOhlc] = await Promise.all([quote(FX_SYMBOL), closes(FX_SYMBOL, 400), ohlc(FX_SYMBOL, 365)]);
  const rate = fxQ?.regularMarketPrice ?? (fxSeries.length ? fxSeries[fxSeries.length - 1].close : null);
  return {
    symbol: FX_SYMBOL,
    usdEgp: rate,
    change1dPct: fxQ?.regularMarketChangePercent != null ? fxQ.regularMarketChangePercent : pctChange(fxSeries, 1),
    change1mPct: pctChange(fxSeries, 21),
    change6mPct: pctChange(fxSeries, 126),
    series: fxSeries.slice(-260).map((p) => ({ date: p.date, value: p.close })),
    ohlc: fxOhlc.slice(-260),
    interpretation:
      rate == null
        ? null
        : "EGP per 1 USD. A rising line means the EGP is weakening (each dollar costs more pounds).",
  };
}

// ── EGX30 index (live quote + basket-proxy history) ─────────────────────────
export async function getIndexData() {
  const [q, basket] = await Promise.all([quote(EGX30_INDEX.symbol), getBasketHistory(365)]);
  const lastBasket = basket.length ? basket[basket.length - 1].close : null;
  const prevBasket = basket.length > 1 ? basket[basket.length - 2].close : null;
  return {
    symbol: EGX30_INDEX.symbol,
    level: q?.regularMarketPrice ?? lastBasket,
    changePct:
      q?.regularMarketChangePercent != null
        ? q.regularMarketChangePercent
        : lastBasket != null && prevBasket
          ? ((lastBasket - prevBasket) / prevBasket) * 100
          : null,
    series: basket.map((p) => ({ date: p.date, value: p.close })),
    ohlc: closesToOhlc(basket),
    proxy: true,
    note: "Live level from Yahoo. History is an equal-weight basket of featured EGX large caps (base 1000) because Yahoo publishes no daily EGX index history.",
  };
}

// ── Featured EGX market snapshot ─────────────────────────────────────────────
export async function getEgxMarket() {
  const stocks = await Promise.all(
    EGX_STOCKS.map(async (s) => {
      const [q, series, ohlcData] = await Promise.all([quote(s.symbol), closes(s.symbol, 400), ohlc(s.symbol, 365)]);
      const last = series.length ? series[series.length - 1].close : null;
      return {
        symbol: s.symbol,
        en: s.en,
        ar: s.ar,
        name: cleanName(q?.longName) ?? s.en,
        price: q?.regularMarketPrice ?? last,
        currency: q?.currency ?? "EGP",
        changePct: q?.regularMarketChangePercent != null ? q.regularMarketChangePercent : pctChange(series, 1),
        change1wPct: pctChange(series, 5),
        change1mPct: pctChange(series, 21),
        change3mPct: pctChange(series, 63),
        rsi: calcRSI(series.map((p) => p.close)),
        series: series.slice(-260).map((p) => ({ date: p.date, value: p.close })),
        ohlc: ohlcData.slice(-260),
      };
    })
  );

  const etfs = await Promise.all(
    EGX_ETFS.map(async (e) => {
      const [q, series, ohlcData] = await Promise.all([quote(e.symbol), closes(e.symbol, 400), ohlc(e.symbol, 365)]);
      return {
        symbol: e.symbol,
        en: e.en,
        ar: e.ar,
        name: cleanName(q?.longName) ?? e.en,
        price: q?.regularMarketPrice ?? null,
        currency: q?.currency ?? e.currencyHint ?? "USD",
        changePct: q?.regularMarketChangePercent != null ? q.regularMarketChangePercent : pctChange(series, 1),
        series: series.slice(-260).map((p) => ({ date: p.date, value: p.close })),
        ohlc: ohlcData.slice(-260),
      };
    })
  );

  const basket = await getBasketHistory(365);
  const basketOhlc = closesToOhlc(basket);

  const indices = await Promise.all(
    EGX_INDICES.map(async (idx) => {
      const q = await quote(idx.symbol);
      // Yahoo has no daily history for any EGX index — attach the basket
      // proxy so charts and analysis still work (flagged clearly).
      const useProxy = basket.length > 30;
      return {
        symbol: idx.symbol,
        en: idx.en,
        ar: idx.ar,
        name: cleanName(q?.longName) ?? idx.en,
        level: q?.regularMarketPrice ?? null,
        currency: q?.currency ?? "EGP",
        changePct: q?.regularMarketChangePercent != null ? q.regularMarketChangePercent : null,
        series: useProxy ? basket.map((p) => ({ date: p.date, value: p.close })) : [],
        ohlc: useProxy ? basketOhlc : [],
        proxy: useProxy,
      };
    })
  );

  return { stocks, etfs, indices, updatedAt: new Date().toISOString() };
}

function calcRSI(closesArr, period = 14) {
  if (!closesArr || closesArr.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closesArr[i] - closesArr[i - 1];
    if (ch >= 0) gains += ch;
    else losses -= ch;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closesArr.length; i++) {
    const ch = closesArr[i] - closesArr[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, ch)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -ch)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── Inflation (World Bank, keyless, annual %) ───────────────────────────────
export async function getInflation() {
  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/EGY/indicator/${WB_CPI_INDICATOR}?format=json&per_page=1&date=2024:2026`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) return { inflationPct: null, year: null, source: "World Bank", error: "request failed" };
    const json = await res.json();
    const rows = (json[1] ?? []).filter((r) => r.value != null);
    if (rows.length === 0) return { inflationPct: null, year: null, source: "World Bank", error: "no data" };
    const latest = rows[rows.length - 1];
    return {
      inflationPct: latest.value,
      year: latest.date,
      source: "World Bank (annual CPI, %)",
      error: null,
    };
  } catch {
    return { inflationPct: null, year: null, source: "World Bank", error: "unavailable" };
  }
}