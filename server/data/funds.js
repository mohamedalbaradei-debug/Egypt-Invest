// Curated Egyptian money-market and fixed-income funds.
// These are indicative figures compiled from fund managers / FRA publications.
// They are NOT live: refresh the yields by editing this file. The `asOf` and
// `source` fields are shown in the UI so the user knows the data is dated.
export const EGYPT_FUNDS = [
  // ── Money market funds ──────────────────────────────────────────────────
  { id: "mm-beltone",       type: "money-market", en: "Beltone Money Market Fund",           ar: "صندوق بلتون لسوق النقد",                    manager: "Beltone Asset Management", yieldPct: 25.0, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-hc",            type: "money-market", en: "HC Money Market Fund",                ar: "صندوق إتش سي لسوق النقد",                   manager: "HC Securities",                 yieldPct: 24.8, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-azimut",        type: "money-market", en: "Azimut Money Market Fund",            ar: "صندوق أزيموت لسوق النقد",                   manager: "Azimut Egypt",                  yieldPct: 24.9, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-ci",            type: "money-market", en: "CI Money Market Fund",                ar: "صندوق سي آي لسوق النقد",                    manager: "CI Capital",                    yieldPct: 25.1, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-efgh1",         type: "money-market", en: "EFG Hermes One Money Market Fund",    ar: "صندوق إي إف چي هيرميس وان لسوق النقد",       manager: "EFG Hermes One",                yieldPct: 25.2, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-alahly",        type: "money-market", en: "Al Ahly Money Market Fund",           ar: "صندوق الأهلي لسوق النقد",                   manager: "Al Ahly Capital",               yieldPct: 24.7, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-nile",          type: "money-market", en: "Nile Money Market Fund",              ar: "صندوق النيل لسوق النقد",                    manager: "Nile Capital",                  yieldPct: 24.6, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-qnb",           type: "money-market", en: "QNB Money Market Fund",               ar: "صندوق QNB لسوق النقد",                      manager: "QNB ALAHLI",                    yieldPct: 24.9, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-osool",         type: "money-market", en: "Osool Money Market Fund",             ar: "صندوق أصول لسوق النقد",                     manager: "Osool ETC",                     yieldPct: 24.5, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  { id: "mm-prime",         type: "money-market", en: "Prime Money Market Fund",             ar: "صندوق برايم لسوق النقد",                     manager: "Prime Capital",                 yieldPct: 24.8, asOf: "2026-08", source: "Fund website — verify", risk: "low" },
  // ── Fixed income funds ──────────────────────────────────────────────────
  { id: "fi-beltone",       type: "fixed-income", en: "Beltone Government Bond Fund",        ar: "صندوق بلتون للسندات الحكومية",               manager: "Beltone Asset Management", yieldPct: 26.0, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
  { id: "fi-hc",            type: "fixed-income", en: "HC Fixed Income Fund",                ar: "صندوق إتش سي للدخل الثابت",                  manager: "HC Securities",                 yieldPct: 25.8, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
  { id: "fi-azimut",        type: "fixed-income", en: "Azimut Fixed Income Fund",            ar: "صندوق أزيموت للدخل الثابت",                  manager: "Azimut Egypt",                  yieldPct: 25.9, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
  { id: "fi-efgh1",         type: "fixed-income", en: "EFG Hermes One Fixed Income Fund",    ar: "صندوق إي إف چي هيرميس وان للدخل الثابت",     manager: "EFG Hermes One",                yieldPct: 26.1, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
  { id: "fi-alahly",        type: "fixed-income", en: "Al Ahly Fixed Income Fund",           ar: "صندوق الأهلي للدخل الثابت",                  manager: "Al Ahly Capital",               yieldPct: 25.7, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
  { id: "fi-qnb",           type: "fixed-income", en: "QNB Fixed Income Fund",               ar: "صندوق QNB للدخل الثابت",                     manager: "QNB ALAHLI",                    yieldPct: 25.9, asOf: "2026-08", source: "Fund website — verify", risk: "medium" },
];

// Derived benchmark used by the decision engine: average money-market yield.
export function moneyMarketYield() {
  const mm = EGYPT_FUNDS.filter((f) => f.type === "money-market");
  if (mm.length === 0) return 24;
  return mm.reduce((s, f) => s + f.yieldPct, 0) / mm.length;
}