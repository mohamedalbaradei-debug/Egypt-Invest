import { yahooFinance, chartSafe } from "./yahoo.js";
import { getInflation, getFxData, getBasketHistory, closesToOhlc, quoteSmart } from "./market.js";
import { CBE_POLICY } from "../data/econ.js";
import { EGX_INDICES } from "../data/egx.js";

const bi = (en, ar) => ({ en, ar });

function calcRSI(closes, period = 14) {
  if (!closes?.length || closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gains += ch; else losses -= ch;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, ch)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -ch)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcMACD(closes, fast = 12, slow = 26, signalP = 9) {
  const ema = (period) => {
    const k = 2 / (period + 1);
    const out = [closes[0]];
    for (let i = 1; i < closes.length; i++) out.push(closes[i] * k + out[i - 1] * (1 - k));
    return out;
  };
  if (closes.length < slow + signalP) return null;
  const eFast = ema(fast), eSlow = ema(slow);
  const macd = closes.map((_, i) => eFast[i] - eSlow[i]);
  const sig = [];
  const k = 2 / (signalP + 1);
  sig.push(macd[slow - 1]);
  for (let i = slow; i < macd.length; i++) sig.push(macd[i] * k + sig[sig.length - 1] * (1 - k));
  const hist = macd.map((m, i) => m - (sig[i - (slow - 1)] ?? m));
  return {
    macd: macd[macd.length - 1],
    signal: sig[sig.length - 1],
    histogram: hist[hist.length - 1],
  };
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function calcATR(highs, lows, closes, period = 14) {
  if (!highs?.length || !lows?.length || !closes?.length || highs.length < period + 1) return null;
  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    const tr = Math.max(hl, hc, lc);
    trSum += tr;
  }
  let avgTR = trSum / period;
  for (let i = period + 1; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    const tr = Math.max(hl, hc, lc);
    avgTR = (avgTR * (period - 1) + tr) / period;
  }
  return avgTR;
}

function calcBollingerBands(closes, period = 20, stdDev = 2) {
  if (closes.length < period) return null;
  const sma = calcSMA(closes, period);
  if (sma == null) return null;
  const lastCloses = closes.slice(-period);
  const mean = lastCloses.reduce((s, v) => s + v, 0) / period;
  const variance = lastCloses.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
  const sd = Math.sqrt(variance);
  return {
    middle: sma,
    upper: sma + stdDev * sd,
    lower: sma - stdDev * sd,
  };
}

function pct(a, b) {
  return a != null && b ? ((a - b) / b) * 100 : null;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Technical scoring + notes ────────────────────────────────────────────────
function extractTechNotes(rsi, macd, sma50, sma200, chg3m, fromHigh, currentPrice, support, resistance) {
  let tech = 50;
  const techNotes = [];

  if (rsi != null) {
    if (rsi > 70) { tech -= 15; techNotes.push(bi(`RSI ${rsi.toFixed(1)} — overbought, pullback risk.`, `مؤشر القوة النسبية ${rsi.toFixed(1)} — منطقة تشبع شرائي، خطر تراجع.`)); }
    else if (rsi < 30) { tech += 15; techNotes.push(bi(`RSI ${rsi.toFixed(1)} — oversold, bounce potential.`, `مؤشر القوة النسبية ${rsi.toFixed(1)} — منطقة تشبع بيعي، احتمالية ارتداد.`)); }
    else techNotes.push(bi(`RSI ${rsi.toFixed(1)} — neutral momentum.`, `مؤشر القوة النسبية ${rsi.toFixed(1)} — زخم محايد.`));
  }
  if (sma50 != null && sma200 != null) {
    if (sma50 > sma200) { tech += 10; techNotes.push(bi("Golden cross — SMA50 above SMA200, uptrend intact.", "تقاطع ذهبي — المتوسط 50 أعلى من المتوسط 200، الاتجاه الصاعد قائم.")); }
    else { tech -= 10; techNotes.push(bi("Death cross — SMA50 below SMA200, downtrend risk.", "تقاطع موت — المتوسط 50 أقل من المتوسط 200، خطر اتجاه هابط.")); }
  }
  if (macd) {
    if (macd.histogram > 0) { tech += 8; techNotes.push(bi("MACD bullish cross — positive histogram.", "MACD تقاطع صاعد — هيستوجرام موجب.")); }
    else { tech -= 8; techNotes.push(bi("MACD bearish cross — negative histogram.", "MACD تقاطع هابط — هيستوجرام سالب.")); }
  }
  if (chg3m != null) {
    if (chg3m > 10) { tech += 8; techNotes.push(bi(`+${chg3m.toFixed(1)}% in 3 months — strong momentum.`, `+${chg3m.toFixed(1)}% خلال 3 أشهر — زخم قوي.`)); }
    else if (chg3m < -10) { tech -= 8; techNotes.push(bi(`${chg3m.toFixed(1)}% in 3 months — weak momentum.`, `${chg3m.toFixed(1)}% خلال 3 أشهر — زخم ضعيف.`)); }
  }
  if (fromHigh != null) {
    if (fromHigh > -5) { tech -= 5; techNotes.push(bi("Trading near 52-week high — extended.", "يتداول قرب أعلى مستوى في 52 أسبوع — ممدود.")); }
    else if (fromHigh > -25) { tech += 5; techNotes.push(bi("Healthy distance below 52-week high.", "مسافة صحية دون أعلى مستوى 52 أسبوع.")); }
  }
  if (currentPrice != null && support != null && resistance != null && resistance > support) {
    const pos = (currentPrice - support) / (resistance - support);
    if (pos < 0.2) techNotes.push(bi("Near support — potential bounce zone.", "قرب مستوى الدعم — منطقة ارتداد محتملة."));
    else if (pos > 0.8) techNotes.push(bi("Near resistance — potential rejection zone.", "قرب مستوى المقاومة — منطقة رفض محتملة."));
  }

  return { tech, techNotes };
}

// ── Fundamental scoring + notes ──────────────────────────────────────────────
function extractFundNotes(pe, divYield, eps, pb, target, currentPrice) {
  let fund = 50;
  const fundNotes = [];

  if (pe != null) {
    if (pe > 0 && pe < 15) { fund += 10; fundNotes.push(bi(`P/E ${pe.toFixed(1)} — cheap valuation.`, `مضاعف الربحية ${pe.toFixed(1)} — تقييم منخفض.`)); }
    else if (pe < 25) { fund += 5; fundNotes.push(bi(`P/E ${pe.toFixed(1)} — reasonable valuation.`, `مضاعف الربحية ${pe.toFixed(1)} — تقييم معقول.`)); }
    else { fund -= 6; fundNotes.push(bi(`P/E ${pe.toFixed(1)} — expensive (or losses).`, `مضاعف الربحية ${pe.toFixed(1)} — مرتفع (أو خسائر).`)); }
  }

  if (divYield != null) {
    if (divYield >= 3) { fund += 8; fundNotes.push(bi(`Dividend yield ${divYield.toFixed(1)}% — attractive income.`, `عائد توزيعات ${divYield.toFixed(1)}% — دخل جذاب.`)); }
    else if (divYield > 0) fundNotes.push(bi(`Dividend yield ${divYield.toFixed(1)}%.`, `عائد توزيعات ${divYield.toFixed(1)}%.`));
  }
  if (eps != null && eps > 0) { fund += 5; fundNotes.push(bi("Positive EPS — profitable.", "ربحية السهم موجبة — الشركة مربحة.")); }
  if (pb != null && pb > 0 && pb < 1.5) { fund += 5; fundNotes.push(bi(`P/B ${pb.toFixed(2)} — assets back the price.`, `مضاعف القيمة الدفترية ${pb.toFixed(2)} — الأصول تدعم السعر.`)); }
  if (target != null && currentPrice != null && target > 0) {
    const upside = pct(target, currentPrice);
    if (upside > 15) { fund += 8; fundNotes.push(bi(`Analyst target implies ${upside.toFixed(0)}% upside.`, `السعر المستهدف يوحي بارتفاع ${upside.toFixed(0)}%.`)); }
    else if (upside < -10) { fund -= 8; fundNotes.push(bi(`Analyst target implies ${upside.toFixed(0)}% downside.`, `السعر المستهدف يوحي بانخفاض ${upside.toFixed(0)}%.`)); }
  }

  return { fund, fundNotes };
}

// ── Macro notes (shared context, phrased per horizon) ───────────────────────
function macroNotes(inflationPct, policyRate, fx6mPct) {
  const notes = [];
  const realYield = inflationPct != null ? policyRate - inflationPct : null;
  if (inflationPct != null) {
    notes.push(bi(
      `Egypt inflation runs at ~${inflationPct.toFixed(1)}% — any EGP investment must beat this to grow in real terms.`,
      `التضخم في مصر نحو ${inflationPct.toFixed(1)}% — أي استثمار بالجنيه يجب أن يتجاوز هذا لينمو حقيقيًا.`
    ));
  }
  if (realYield != null) {
    notes.push(bi(
      `CBE deposit rate ${policyRate}% vs inflation gives a ${realYield >= 0 ? "+" : ""}${realYield.toFixed(1)}% real yield — ${realYield > 3 ? "cash-like instruments are rewarded" : "cash barely keeps up"}.`,
      `سعر إيداع المركزي ${policyRate}% مقابل التضخم يعطي عائدًا حقيقيًا ${realYield >= 0 ? "+" : ""}${realYield.toFixed(1)}% — ${realYield > 3 ? "أدوات شبيهة بالنقد مجزية" : "النقد يكفي بالكاد"}.`
    ));
  }
  if (fx6mPct != null && fx6mPct > 3) {
    notes.push(bi(
      `USD/EGP up ${fx6mPct.toFixed(1)}% over 6 months — pound under pressure; hard-asset hedges (gold, USD) matter.`,
      `الدولار/جنيه ارتفع ${fx6mPct.toFixed(1)}% خلال 6 أشهر — ضغط على الجنيه؛ التحوط بأصول صعبة (ذهب، دولار) مهم.`
    ));
  } else if (fx6mPct != null && fx6mPct <= 0) {
    notes.push(bi(
      `USD/EGP stable-to-stronger EGP over 6 months (${fx6mPct.toFixed(1)}%) — currency pressure eased.`,
      `الدولار/جنيه مستقر أو أضعف خلال 6 أشهر (${fx6mPct.toFixed(1)}%) — ضغوط العملة تراجعت.`
    ));
  }
  return notes;
}

// ── Structured reasons per recommendation style ─────────────────────────────
function buildReasons(style, ctx) {
  const { techNotes, fundNotes, macroNts, rsi, macdHist, chg3m, atr, price, support, resistance, pe, divYield, targetUpside, isIndex } = ctx;

  if (style === "trader") {
    const technical = [];
    if (rsi != null) technical.push(bi(`RSI at ${rsi.toFixed(0)} — ${rsi > 70 ? "stretched; wait for pullback or trail stops" : rsi < 30 ? "washed out; watch for reversal entry" : "no extreme; trade the trend"}.`, `القوة النسبية عند ${rsi.toFixed(0)} — ${rsi > 70 ? "ممدود؛ انتظر تصحيحًا أو حرّك وقف الخسارة" : rsi < 30 ? "منهك؛ راقب دخول الانعكاس" : "لا تطرف؛ تداول مع الاتجاه"}.`));
    if (macdHist != null) technical.push(bi(`MACD histogram ${macdHist > 0 ? "positive — momentum favors longs" : "negative — momentum favors staying out or short"}.`, `هيستوجرام MACD ${macdHist > 0 ? "موجب — الزخم يدعم الشراء" : "سالب — الزخم يدعم الابتعاد أو البيع"}.`));
    if (chg3m != null) technical.push(bi(`3-month move ${chg3m >= 0 ? "+" : ""}${chg3m.toFixed(1)}% sets the near-term trend.`, `حركة 3 أشهر ${chg3m >= 0 ? "+" : ""}${chg3m.toFixed(1)}% تحدد الاتجاه القريب.`));
    if (atr != null && price != null) technical.push(bi(`ATR ≈ ${atr.toFixed(2)} — size stops ~${(2 * atr).toFixed(1)} EGP away (2×ATR).`, `متوسط المدى ≈ ${atr.toFixed(2)} — ضع وقف الخسارة على بعد ~(2×ATR) أي ${(2 * atr).toFixed(1)} جنيه.`));
    if (price != null && support != null && resistance != null && resistance > support) technical.push(bi(`Trade map: support ${support.toFixed(1)} / resistance ${resistance.toFixed(1)}.`, `خريطة التداول: دعم ${support.toFixed(1)} / مقاومة ${resistance.toFixed(1)}.`));

    const fundamental = isIndex
      ? [bi("Index-level view: fundamentals apply to constituents, not the index itself.", "رؤية على مستوى المؤشر: الأساسيات تخص الشركات المكونة لا المؤشر نفسه.")]
      : fundNotes.slice(0, 2);

    return { technical, fundamental, macro: macroNts };
  }

  // investor
  const technical = [];
  if (techNotes.length) technical.push(...techNotes.slice(0, 3));
  const fundamental = isIndex
    ? [bi("Index-level view: fundamentals apply to constituents, not the index itself.", "رؤية على مستوى المؤشر: الأساسيات تخص الشركات المكونة لا المؤشر نفسه.")]
    : [];
  if (pe != null) fundamental.push(bi(`Earnings multiple P/E ${pe.toFixed(1)} — ${pe < 15 ? "cheap vs market" : pe < 25 ? "fair" : "rich"}; entry price determines long-run return.`, `مضاعف الأرباح ${pe.toFixed(1)} — ${pe < 15 ? "رخيص نسبيًا" : pe < 25 ? "عادل" : "مرتفع"}؛ سعر الدخول يحدد العائد طويل الأجل.`));
  if (divYield != null && divYield > 0) fundamental.push(bi(`Cash dividend yield ${divYield.toFixed(1)}% compounds while you wait.`, `عائد نقدي ${divYield.toFixed(1)}% يتراكم أثناء الانتظار.`));
  if (targetUpside != null) fundamental.push(bi(`Analyst consensus implies ${targetUpside >= 0 ? "+" : ""}${targetUpside.toFixed(0)}% — aligns ${targetUpside > 0 ? "with" : "against"} accumulation.`, `إجماع المحللين يوحي بـ ${targetUpside >= 0 ? "+" : ""}${targetUpside.toFixed(0)}% — ${targetUpside > 0 ? "يدعم" : "يعارض"} التجميع التدريجي.`));

  return { technical, fundamental, macro: macroNts };
}

// Determine recommendation style: trader (shorter-term momentum) or investor (longer-term value)
function styleRec(overallTech, overallFund, chg3m, divYield, pe, macdHist) {
  const traderScore = Math.round(
    clamp(overallTech * 0.7 + (chg3m != null && Math.abs(chg3m) > 10 ? 15 : 0) + (macdHist != null && macdHist > 0 ? 10 : 0), 0, 100)
  );
  const investorScore = Math.round(
    clamp(overallFund * 0.7 + (divYield != null && divYield >= 3 ? 15 : 0) + (pe != null && pe > 0 && pe < 15 ? 15 : 0), 0, 100)
  );

  const band = (s) =>
    s >= 70 ? bi("STRONG BUY", "شراء قوي") :
    s >= 55 ? bi("BUY", "شراء") :
    s >= 40 ? bi("HOLD", "احتفاظ") :
    s >= 25 ? bi("SELL", "بيع") :
    bi("STRONG SELL", "بيع قوي");

  return {
    traderRec: band(traderScore),
    investorRec: band(investorScore),
    traderScore,
    investorScore,
  };
}

export async function analyzeTicker(symbol) {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const isIndex = EGX_INDICES.some((i) => i.symbol === symbol);

  const [chartRes, quoteRes, inflationRes, fxRes, basketRes] = await Promise.allSettled([
    isIndex ? Promise.resolve(null) : chartSafe(symbol, { period1: since, interval: "1d" }),
    quoteSmart(symbol),
    getInflation(),
    getFxData(),
    isIndex ? getBasketHistory(365) : Promise.resolve(null),
  ]);

  // ── Build the working series (real OHLC for stocks, basket proxy for indices)
  let quotes = [];
  if (isIndex) {
    const basket = basketRes.status === "fulfilled" ? basketRes.value ?? [] : [];
    quotes = closesToOhlc(basket); // close-to-close candles, flagged as proxy
  } else {
    quotes = chartRes.status === "fulfilled" ? (chartRes.value.quotes ?? []) : [];
  }
  quotes = quotes.filter((q) => q.close != null);

  const closes = quotes.map((q) => q.close);
  const dates = quotes.map((q) => q.date);
  const highs = quotes.map((q) => q.high ?? q.close);
  const lows = quotes.map((q) => q.low ?? q.close);
  const volumes = quotes.map((q) => q.volume ?? 0);

  const q = quoteRes.status === "fulfilled" ? quoteRes.value[0] ?? null : null;

  const currentPrice = q?.regularMarketPrice ?? closes[closes.length - 1] ?? null;
  const companyName = q?.longName ?? q?.shortName ?? symbol;

  const isoDay = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : typeof d === "string" ? d.slice(0, 10) : "");
  const historicalData = closes.length
    ? closes.map((c, i) => ({ date: isoDay(dates[i]), value: c }))
    : [];

  // ── Technical indicators (needs ≥ 30 pts; indices use 1y proxy so OK) ────
  const hasEnough = closes.length >= 30;
  const rsi = hasEnough ? calcRSI(closes) : null;
  const macd = hasEnough ? calcMACD(closes) : null;
  const sma50 = hasEnough ? calcSMA(closes, 50) : null;
  const sma200 = hasEnough ? calcSMA(closes, 200) : null;
  const chg1m = pct(closes[closes.length - 1], closes[closes.length - 21]);
  const chg3m = pct(closes[closes.length - 1], closes[closes.length - 63]);
  const chg6m = pct(closes[closes.length - 1], closes[closes.length - 126]);
  const high52w = q?.fiftyTwoWeekHigh ?? (hasEnough ? Math.max(...closes.slice(-250)) : null);
  const low52w = q?.fiftyTwoWeekLow ?? (hasEnough ? Math.min(...closes.slice(-250)) : null);
  const fromHigh = pct(currentPrice, high52w);
  const fromLow = pct(currentPrice, low52w);
  const lookback = Math.min(60, Math.floor(closes.length / 2));
  const last60 = closes.slice(-Math.max(lookback, 5));
  const support = hasEnough ? Math.min(...last60) : null;
  const resistance = hasEnough ? Math.max(...last60) : null;

  const atr = hasEnough ? calcATR(highs, lows, closes) : null;
  const bb = hasEnough ? calcBollingerBands(closes) : null;
  const volumeAvg = volumes.some((v) => v > 0)
    ? volumes.filter((v) => v > 0).reduce((s, v, _, a) => s + v / a.length, 0)
    : null;

  // ── Fundamentals (indices have none) ─────────────────────────────────────
  const pe = isIndex ? null : q?.trailingPE ?? null;
  const eps = isIndex ? null : q?.epsTrailingTwelveMonths ?? null;
  const divRaw = isIndex ? null : q?.dividendYield ?? null;
  // yahoo-finance2 v4 returns dividendYield already in percent for most feeds.
  const divYield = divRaw != null ? (Math.abs(divRaw) <= 1 ? divRaw * 100 : divRaw) : null;
  const marketCap = isIndex ? null : q?.marketCap ?? null;
  const pb = isIndex ? null : q?.priceToBook ?? null;
  const target = isIndex ? null : q?.targetMeanPrice ?? null;
  const targetUpside = target != null && currentPrice ? ((target - currentPrice) / currentPrice) * 100 : null;

  // ── Scores ───────────────────────────────────────────────────────────────
  const { tech, techNotes } = extractTechNotes(
    rsi, macd, sma50, sma200, chg3m, fromHigh, currentPrice, support, resistance
  );

  const { fund, fundNotes } = extractFundNotes(pe, divYield, eps, pb, target, currentPrice);

  const overall = Math.round(tech * 0.55 + fund * 0.45);

  const { traderRec, investorRec, traderScore, investorScore } = styleRec(tech, fund, chg3m, divYield, pe, macd?.histogram ?? null);

  // ── Macro context + structured reasons ───────────────────────────────────
  const inflationPct = inflationRes.status === "fulfilled" ? inflationRes.value?.inflationPct ?? null : null;
  const fx6mPct = fxRes.status === "fulfilled" ? fxRes.value?.change6mPct ?? null : null;
  const policyRate = CBE_POLICY.overnightDeposit.value;
  const macroNts = macroNotes(inflationPct, policyRate, fx6mPct);

  const reasonCtx = {
    techNotes, fundNotes, macroNts,
    rsi, macdHist: macd?.histogram ?? null, chg3m, atr, price: currentPrice,
    support, resistance, pe, divYield, targetUpside, isIndex,
  };

  const summaryEn = `Score ${overall}/100 — Traders: ${traderRec.en}, Investors: ${investorRec.en}.`;
  const summaryAr = `النتيجة ${overall}/100 — للمتداولين: ${traderRec.ar}، للمستثمرين: ${investorRec.ar}.`;

  // ── 1-year OHLC for candlestick chart ───────────────────────────────────
  // NOTE: dates may be Date objects (Yahoo) or ISO strings (basket proxy).
  const iso = (d) => (d instanceof Date ? d.toISOString() : typeof d === "string" ? d : "");
  const ohlc = quotes.slice(-260).map((row) => ({
    date: iso(row.date),
    open: row.open ?? null,
    high: row.high ?? null,
    low: row.low ?? null,
    close: row.close ?? null,
    volume: row.volume ?? 0,
  }));

  return {
    symbol,
    companyName,
    assetType: isIndex ? "index" : "stock",
    historyNote: isIndex
      ? bi(
          "Yahoo publishes no daily EGX index history. The chart uses an equal-weight basket of featured EGX large caps (base 1000) as a market proxy.",
          "لا تنشر ياهو تاريخًا يوميًا لمؤشرات البورصة المصرية. يستخدم الرسم سلة متساوية الأوزان من الأسهم الكبيرة المميزة (أساس 1000) كبديل للسوق."
        )
      : null,
    currency: q?.currency ?? "EGP",
    price: currentPrice,
    changePct: q?.regularMarketChangePercent != null ? q.regularMarketChangePercent : null,
    marketCap,
    pe,
    eps,
    dividendYield: divYield,
    priceToBook: pb,
    targetPrice: target,
    technical: {
      rsi,
      macd,
      sma50,
      sma200,
      support,
      resistance,
      high52w,
      low52w,
      fromHigh,
      fromLow,
      chg1m,
      chg3m,
      chg6m,
      atr,
      bbUpper: bb?.upper ?? null,
      bbLower: bb?.lower ?? null,
      volumeAvg: volumeAvg ?? null,
    },
    fundamental: {
      roe: null,
      roa: null,
      debtToEquity: null,
      currentRatio: null,
      revenueGrowth: null,
      earningsGrowth: null,
      profitMargin: null,
      freeCashFlow: null,
      note: bi(
        "Deep ratios (ROE, ROA, debt…) are not published by free data sources for EGX names.",
        "النسب المتعمقة (العائد على حقوق الملكية وغيرها) غير متاحة من مصادر البيانات المجانية لأسهم البورصة المصرية."
      ),
    },
    macro: {
      inflationPct,
      inflationYear: inflationRes.status === "fulfilled" ? inflationRes.value?.year ?? null : null,
      policyRate,
      policyAsOf: CBE_POLICY.overnightDeposit.asOf,
      fxRegime: bi("Managed float (USD/EGP)", "تعويم مُدار (دولار/جنيه)"),
      countryRisk: bi("Frontier market — FX & liquidity risk", "سوق حدودي — مخاطر عملة وسيولة"),
    },
    scores: { technical: tech, fundamental: fund, overall, trader: traderScore, investor: investorScore },
    recommendation: traderRec,
    traderRec: { ...traderRec, score: traderScore, reasons: buildReasons("trader", reasonCtx) },
    investorRec: { ...investorRec, score: investorScore, reasons: buildReasons("investor", reasonCtx) },
    rationale: [...techNotes, ...fundNotes],
    summary: bi(summaryEn, summaryAr),
    historicalData,
    ohlc,
    disclaimer: bi(
      "Informational only — not financial advice. Data from Yahoo Finance; verify before trading.",
      "لأغراض معلوماتية فقط — وليست نصيحة مالية. البيانات من ياهو فاينانس؛ تحقق قبل التداول."
    ),
  };
}