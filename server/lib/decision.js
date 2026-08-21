import { moneyMarketYield } from "../data/funds.js";
import { CBE_POLICY } from "../data/econ.js";

const bi = (en, ar) => ({ en, ar });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Combines inflation, money-market yields, gold trend, FX trend and EGX
// momentum into an explicit, explainable allocation for "your EGP now".
export function buildDecision(inputs) {
  const {
    inflationPct = null,
    gold6mEgpPct = null,
    fx6mPct = null, // USD/EGP 6m change (positive = EGP weakening)
    egx3mPct = null, // basket 3m return
    goldUsd6mPct = null,
    riskProfile = "balanced", // conservative | balanced | aggressive
  } = inputs;

  const mmYield = moneyMarketYield();
  const policyRate = CBE_POLICY.overnightDeposit.value;

  const realYield = inflationPct != null ? mmYield - inflationPct : null;
  const egpWeakening = fx6mPct != null && fx6mPct > 0;

  // Risk-profile tilts (applied after signal-based base allocation).
  const tilt = {
    conservative: { mm: +15, gold: +5, stocks: -20 },
    balanced: { mm: 0, gold: 0, stocks: 0 },
    aggressive: { mm: -15, gold: -5, stocks: +20 },
  }[riskProfile] ?? { mm: 0, gold: 0, stocks: 0 };

  // ── Allocation (percentages of liquid EGP) ────────────────────────────────
  let moneyMarket = 40;
  if (realYield != null) {
    moneyMarket += realYield > 8 ? 20 : realYield > 3 ? 10 : realYield > 0 ? 0 : -15;
  }
  moneyMarket = clamp(moneyMarket, 20, 60);

  let gold = 20;
  if (inflationPct != null && inflationPct > 18) gold += 5;
  if (egpWeakening) gold += 10;
  if (gold6mEgpPct != null && gold6mEgpPct > 10) gold += 5;
  gold = clamp(gold, 10, 45);

  let stocks = 100 - moneyMarket - gold;
  if (egx3mPct != null) {
    if (egx3mPct < -10) stocks = Math.max(5, stocks - 10);
    else if (egx3mPct > 15) stocks = Math.min(40, stocks + 10);
  }
  stocks = clamp(stocks, 5, 45);

  moneyMarket = clamp(moneyMarket + tilt.mm, 15, 70);
  gold = clamp(gold + tilt.gold, 5, 50);
  stocks = clamp(stocks + tilt.stocks, 5, 55);
  // Rebalance so the three buckets always sum to 100.
  const spare = 100 - moneyMarket - gold - stocks;
  moneyMarket += spare;

  // ── Headline ──────────────────────────────────────────────────────────────
  let headline;
  if (realYield != null && realYield > 6) {
    headline = bi(
      `Positive real yield (~${realYield.toFixed(0)}% after inflation): money market / fixed income rewards holding EGP today.`,
      `عائد حقيقي موجب (نحو ${realYield.toFixed(0)}% بعد التضخم): سوق النقد والدخل الثابت يكافئان الاحتفاظ بالجنيه اليوم.`
    );
  } else if (inflationPct != null && inflationPct > 15) {
    headline = bi(
      `High inflation (${inflationPct.toFixed(0)}%) and ${egpWeakening ? "a weakening pound" : "currency pressure"}: keep real assets (gold) as a hedge, not idle cash.`,
      `تضخم مرتفع (${inflationPct.toFixed(0)}%)${egpWeakening ? " وجنيه يضعف" : " وضغوط على العملة"}: احتفظ بأصول حقيقية (ذهب) كتحوط، لا نقدًا راكدًا.`
    );
  } else {
    headline = bi(
      `Balanced conditions: a diversified split between cash-like yield, gold and selective EGX exposure is reasonable.`,
      `ظروف متوازنة: توزيع متنوع بين عوائد شبيهة بالنقد والذهب وتعرض انتقائي للبورصة المصرية معقول.`
    );
  }

  const options = [
    {
      id: "money-market",
      label: bi("Money market / fixed income", "سوق النقد / الدخل الثابت"),
      pct: moneyMarket,
      rationale: bi(
        `Earns ~${mmYield.toFixed(0)}% (avg money-market yield). Real return after ${inflationPct != null ? inflationPct.toFixed(0) + "%" : "N/A"} inflation is ${realYield != null ? (realYield > 0 ? "+" : "") + realYield.toFixed(0) + "%" : "unknown"} — ${realYield != null && realYield > 0 ? "it protects purchasing power" : "it may not beat inflation"}.`,
        `يكسب نحو ${mmYield.toFixed(0)}% (متوسط عائد سوق النقد). العائد الحقيقي بعد تضخم ${inflationPct != null ? inflationPct.toFixed(0) + "%" : "غير متاح"} هو ${realYield != null ? (realYield > 0 ? "+" : "") + realYield.toFixed(0) + "%" : "غير معروف"} — ${realYield != null && realYield > 0 ? "يحافظ على القوة الشرائية" : "قد لا يغطي التضخم"}.`
      ),
    },
    {
      id: "gold",
      label: bi("Gold (gram 21k/24k)", "الذهب (جرام 21/24)"),
      pct: gold,
      rationale: bi(
        gold6mEgpPct != null
          ? `Gold in EGP ${gold6mEgpPct >= 0 ? "+" : ""}${gold6mEgpPct.toFixed(0)}% over 6 months. It hedges ${egpWeakening ? "the weakening pound and" : ""} inflation and currency devaluation risk.`
          : `Gold hedges inflation and currency devaluation risk.`,
        gold6mEgpPct != null
          ? `الذهب بالجنيه ${gold6mEgpPct >= 0 ? "+" : ""}${gold6mEgpPct.toFixed(0)}% خلال 6 أشهر. يحوط ${egpWeakening ? "الجنيه الضعيف و" : ""}مخاطر التضخم وانخفاض قيمة العملة.`
          : `الذهب يحوط مخاطر التضخم وانخفاض قيمة العملة.`
      ),
    },
    {
      id: "egx",
      label: bi("EGX equities (selective)", "أسهم البورصة المصرية (انتقائي)"),
      pct: stocks,
      rationale: bi(
        egx3mPct != null
          ? `Featured EGX names are ${egx3mPct > 0 ? "+" : ""}${egx3mPct.toFixed(0)}% over 3 months. Stocks offer growth but carry market and liquidity risk in EGP.`
          : `Stocks offer growth but carry market and liquidity risk in EGP.`,
        egx3mPct != null
          ? `الأسهم المميزة بالبورصة ${egx3mPct > 0 ? "+" : ""}${egx3mPct.toFixed(0)}% خلال 3 أشهر. الأسهم تمنح نموًا لكن تحمل مخاطر سوق وسيولة بالجنيه.`
          : `الأسهم تمنح نموًا لكن تحمل مخاطر سوق وسيولة بالجنيه.`
      ),
    },
  ];

  return {
    allocation: options,
    headline,
    riskProfile,
    inputs: { inflationPct, gold6mEgpPct, fx6mPct, egx3mPct, goldUsd6mPct, moneyMarketYield: mmYield, policyRate },
    context: bi(
      `Egypt inflation ${inflationPct != null ? inflationPct.toFixed(0) + "%" : "n/a"} | money-market avg ${mmYield.toFixed(0)}% | CBE deposit rate ${policyRate}% | USD/EGP ${fx6mPct != null ? (fx6mPct >= 0 ? "+" : "") + fx6mPct.toFixed(1) + "%" : "n/a"} (6m) | gold in EGP ${gold6mEgpPct != null ? (gold6mEgpPct >= 0 ? "+" : "") + gold6mEgpPct.toFixed(0) + "%" : "n/a"} (6m)`,
      `تضخم مصر ${inflationPct != null ? inflationPct.toFixed(0) + "%" : "غير متاح"} | متوسط سوق النقد ${mmYield.toFixed(0)}% | سعر الإيداع لدى المركزي ${policyRate}% | الدولار/جنيه ${fx6mPct != null ? (fx6mPct >= 0 ? "+" : "") + fx6mPct.toFixed(1) + "%" : "غير متاح"} (6 شهور) | الذهب بالجنيه ${gold6mEgpPct != null ? (gold6mEgpPct >= 0 ? "+" : "") + gold6mEgpPct.toFixed(0) + "%" : "غير متاح"} (6 شهور)`
    ),
    disclaimer: bi(
      "Educational allocation model — not financial advice. Based on free market data; money-market yields are indicative and dated.",
      "نموذج توزيع تعليمي — ليس نصيحة مالية. مبني على بيانات سوق مجانية؛ عوائد سوق النقد استرشادية وتاريخية."
    ),
  };
}

// Market regime: a single at-a-glance verdict on the environment, combining
// real rates, EGX momentum and currency pressure. Guides beginners while the
// detailed sections serve experts.
export function buildRegime(inputs) {
  const { inflationPct = null, mmYield = null, egx3mPct = null, fx6mPct = null } = inputs;
  const realYield = inflationPct != null && mmYield != null ? mmYield - inflationPct : null;

  let score = 0; // positive = favorable for risk assets
  if (realYield != null) score += realYield > 5 ? -1 : realYield < -3 ? -1 : realYield < 2 ? -0.5 : 0;
  if (egx3mPct != null) score += egx3mPct > 10 ? 1 : egx3mPct < -8 ? -1 : 0;
  if (fx6mPct != null) score += fx6mPct > 8 ? -1 : fx6mPct < 2 ? 0.5 : 0;

  const id = score >= 1 ? "risk-on" : score <= -1.5 ? "risk-off" : "neutral";

  const meta = {
    "risk-on": {
      en: "RISK-ON — Equities favored",
      ar: "تفاؤل بالسوق — الأسهم مفضلة",
      contextEn: "EGX momentum is positive and conditions favor selective equity exposure. Traders: ride trends with stops; Investors: accumulate quality names gradually.",
      contextAr: "زخم البورصة المصرية إيجابي والظروف تفضل التعرض الانتقائي للأسهم. للمتداولين: اتبع الاتجاه مع وقف خسارة. للمستثمرين: تجميع تدريجي للأسهم القوية.",
    },
    neutral: {
      en: "NEUTRAL — Balanced approach",
      ar: "محايد — نهج متوازن",
      contextEn: "Mixed signals: keep a diversified base (cash-like yield + gold) with measured equity exposure.",
      contextAr: "إشارات متباينة: حافظ على قاعدة متنوعة (عائد نقدي + ذهب) مع تعرض مقاس للأسهم.",
    },
    "risk-off": {
      en: "RISK-OFF — Capital preservation",
      ar: "هروب من المخاطر — الحفاظ على رأس المال",
      contextEn: "Negative momentum and/or currency pressure dominate. Favor money market and gold; avoid chasing falling stocks.",
      contextAr: "الزخم السلبي و/أو ضغوط العملة مسيطرة. فضّل سوق النقد والذهب؛ تجنّب مطاردة الأسهم الهابطة.",
    },
  }[id];

  return {
    id,
    headline: bi(meta.en, meta.ar),
    context: bi(meta.contextEn, meta.contextAr),
    signals: {
      realYield,
      egx3mPct,
      fx6mPct,
      inflationPct,
    },
  };
}