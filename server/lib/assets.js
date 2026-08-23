import { quoteSmart, getGoldData } from "./market.js";
import { EGX_STOCKS, EGX_ETFS, EGX_INDICES } from "../data/egx.js";

/**
 * Alertable assets. Each preset maps to a Yahoo symbol or a derived value.
 * `GOLD_EGP` is derived (COMEX gold × USD/EGP ÷ 31.1035). Any other Yahoo
 * symbol can be used as a custom alert asset (validated below).
 */

export const ALERT_ASSETS = [
  // Currency
  { id: "USDEGP", sym: "EGP=X", grp: "currency", en: "USD / EGP", ar: "الدولار مقابل الجنيه" },
  { id: "EURUSDEGP", derived: "eur_egp", grp: "currency", en: "EUR / EGP", ar: "اليورو مقابل الجنيه" },
  // Gold & crypto
  { id: "GOLD_EGP", derived: "gram24k", grp: "gold", en: "Gold 24k (EGP/gram)", ar: "الذهب عيار 24 (جنيه/جرام)" },
  { id: "GOLD_USD", sym: "GC=F", grp: "gold", en: "Gold ($/oz COMEX)", ar: "الذهب ($ للأوقية)" },
  { id: "BTCUSD", sym: "BTC-USD", grp: "crypto", en: "Bitcoin (USD)", ar: "بيتكوين (دولار)" },
  { id: "ETHUSD", sym: "ETH-USD", grp: "crypto", en: "Ethereum (USD)", ar: "إيثريوم (دولار)" },
  // EGX indices
  ...EGX_INDICES.map((i) => ({
    id: i.symbol,
    sym: i.symbol,
    grp: "indices",
    en: `${i.en} (index level)`,
    ar: `${i.ar} (مستوى المؤشر)`,
  })),
  // Featured EGX stocks
  ...EGX_STOCKS.map((s) => ({
    id: s.symbol,
    sym: s.symbol,
    grp: "stocks",
    en: s.en,
    ar: s.ar,
  })),
];

const BY_ID = new Map(ALERT_ASSETS.map((a) => [a.id, a]));

// Custom symbols must look like Yahoo tickers (e.g. ABUK.CA, MSFT, ^CASE30).
export function isValidAlertAsset(id) {
  const key = String(id ?? "").trim().toUpperCase();
  if (BY_ID.has(key)) return true;
  return /^[\^A-Z0-9=\.\-]{2,15}$/.test(key);
}

export function normalizeAsset(id) {
  const key = String(id ?? "").trim().toUpperCase();
  return BY_ID.has(key) ? key : String(id ?? "").trim().toUpperCase();
}

export function assetLabel(id, lang = "en") {
  const a = BY_ID.get(String(id));
  if (!a) return String(id);
  return lang === "ar" ? a.ar : a.en;
}

export async function resolveAssetPrice(id) {
  const a = BY_ID.get(String(id));
  const sym = a?.sym ?? String(id);
  try {
    if (a?.derived === "gram24k") {
      const g = await getGoldData();
      return g.gram24k;
    }
    if (a?.derived === "eur_egp") {
      const [eur, usd] = await Promise.all([quoteSmart("EURUSD=X"), quoteSmart("EGP=X")]);
      const e = eur?.regularMarketPrice;
      const u = usd?.regularMarketPrice;
      if (e != null && u != null) return e * u;
      return null;
    }
    const q = await quoteSmart(sym);
    return q?.regularMarketPrice ?? q?.chart?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

/** Presets for the portfolio add-form picker (indices + ETFs + stocks). */
export function portfolioPresets() {
  return {
    stocks: EGX_STOCKS.map((s) => ({ symbol: s.symbol, en: s.en, ar: s.ar })),
    etfs: EGX_ETFS.map((e) => ({ symbol: e.symbol, en: e.en, ar: e.ar })),
    indices: EGX_INDICES.map((i) => ({ symbol: i.symbol, en: i.en, ar: i.ar })),
    note:
      "Indices are quoted levels, not tradable shares — track them as a benchmark. EGX33 has no live data source.",
  };
}
