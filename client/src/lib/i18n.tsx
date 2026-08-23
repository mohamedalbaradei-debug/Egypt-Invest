import React from "react";

export type Lang = "ar" | "en";

const dict = {
  ar: {
    appName: "مصر استثمر",
    appTag: "سوق الأسهم والذهب والدولار في مصر",
    nav_dashboard: "نظرة عامة",
    nav_market: "السوق",
    nav_analyze: "تحليل",
    nav_funds: "صناديق الدخل الثابت",
    lang_toggle: "EN",
    updated: "آخر تحديث",
    disclaimer: "لأغراض تعليمية فقط — ليست نصيحة مالية. تحقق من البيانات قبل التداول.",
    // Overview / dashboard
    gold_title: "الذهب",
    gold_per_gram: "جرام الذهب",
    gold_usd: "أونصة (دولار)",
    gold_egp: "الأونصة بالجنيه",
    gold_24k: "جرام 24",
    gold_21k: "جرام 21",
    fx_title: "الدولار / الجنيه",
    fx_sub: "جنيه لكل دولار",
    fx_note: "ارتفاع الخط يعني ضعف الجنيه",
    index_title: "مؤشر إيجي إكس 30",
    index_note: "البيانات الرقمية فقط من ياهو",
    inflation_title: "التضخم",
    inflation_src: "البنك الدولي (سنوي)",
    policy_title: "سعر الإيداع لدى المركزي",
    mm_yield_title: "متوسط عائد سوق النقد",
    decision_title: "قرارك الآن — أين تضع جنيهك؟",
    decision_sub: "توزيع استرشادي محسوب من التضخم، العوائد، الذهب، والدولار",
    decision_hold_cash: "سوق النقد / الدخل الثابت",
    decision_gold: "الذهب (جرام 21/24)",
    decision_stocks: "أسهم البورصة (انتقائي)",
    decision_context: "مؤشرات السياق",
    market_title: "السوق المصري",
    market_sub: "أسهم البورصة المصرية — أداء اليوم",
    market_symbol: "الرمز",
    market_name: "الشركة",
    market_price: "السعر",
    market_day: "اليوم",
    market_week: "أسبوع",
    market_month: "شهر",
    market_rsi: "RSI",
    etfs_title: "صناديق ETF المصرية",
    // Analyze
    analyze_search: "ابحث عن رمز أو شركة (مثال: COMI.CA، الذهب، سهم TMGH)",
    analyze_btn: "تحليل",
    analyze_searching: "بحث...",
    analyze_result_for: "تحليل",
    analyze_rec: "التوصية",
    analyze_technical: "التحليل الفني",
    analyze_fundamental: "التحليل الأساسي",
    analyze_overall: "الدرجة الكلية",
    analyze_score: "الدرجة",
    analyze_price: "السعر",
    analyze_change: "التغير",
    analyze_pe: "مكرر الربحية",
    analyze_eps: "ربحية السهم",
    analyze_pb: "مكرر القيمة الدفترية",
    analyze_div: "عائد التوزيعات",
    analyze_mktcap: "القيمة السوقية",
    analyze_rsi: "مؤشر القوة النسبية",
    analyze_sma: "متوسطات متحركة",
    analyze_support: "دعم",
    analyze_resistance: "مقاومة",
    analyze_52w: "52 أسبوع",
    analyze_history: "أداء 6 أشهر",
    analyze_rationale: "أسباب التوصية",
    analyze_notfound: "لا توجد بيانات لهذا الرمز. جرّب رمزًا مثل COMI.CA أو TMGH.CA أو EGP=X.",
    analyze_error: "فشل التحليل. تحقق من الرمز وأعد المحاولة.",
    no_results: "لا توجد نتائج",
    // Funds
    funds_title: "صناديق سوق النقد والدخل الثابت",
    funds_sub: "عوائد استرشادية بتاريخ محدد — تحقق قبل الاستثمار",
    funds_type_mm: "سوق النقد",
    funds_type_fi: "الدخل الثابت",
    funds_manager: "المدير",
    funds_yield: "العائد",
    funds_asof: "تاريخ البيانات",
    funds_risk_low: "مخاطر منخفضة",
    funds_risk_medium: "مخاطر متوسطة",
    funds_source: "المصدر",
    // News
    nav_news: "الأخبار",
    news_title: "أخبار السوق المصري",
    news_sub: "آخر الأخبار المؤثرة على الأسواق المصرية — أسهم، صناديق، عملة، ذهب واقتصاد كلي",
    news_empty: "لا توجد أخبار متاحة حاليًا",
    // Portfolio
    nav_portfolio: "محفظتي",
    pf_title: "محفظتي",
    pf_sub: "تتبع ممتلكاتك من الذهب والدولار والأسهم وصناديق النقد — بقيمتها الحقيقية",
    pf_total_egp: "إجمالي المحفظة (ج.م)",
    pf_total_usd: "القيمة بالدولار",
    pf_change: "التغير على التكلفة",
    pf_add_title: "إضافة أصل",
    pf_kind_gold: "ذهب (جرام)",
    pf_kind_usd: "دولار نقدًا",
    pf_kind_egx: "سهم بالبورصة",
    pf_kind_fund: "صندوق نقد",
    pf_qty: "الكمية (جرام / دولار / عدد)",
    pf_ref: "الرمز أو الصندوق",
    pf_cost: "التكلفة بالجنيه (اختياري)",
    pf_label: "وسيلة تعريف (اختياري)",
    pf_add: "أضِف",
    pf_empty: "أضف أول أصل لتبدأ المتابعة — كل شيء محفوظ في حسابك",
    pf_value: "القيمة الآن",
    pf_est: "تقدير تراكم العائد",
    pf_delete: "حذف",
    pf_login_title: "سجّل الدخول لمتابعة محفظتك",
    pf_email: "البريد الإلكتروني",
    pf_password: "كلمة المرور (8 أحرف فأكثر)",
    pf_signin: "دخول",
    pf_signup: "إنشاء حساب مجاني",
    pf_logout: "خروج",
    pf_have_account: "لدي حساب",
    pf_no_account: "ليس لدي حساب",
    pf_note_usd: "القيمة الحقيقية: نعرض ما يعادل ممتلكاتك بالدولار حتى ترى أثر تضخم الجنيه بوضوح.",
    pf_fund_estimate: "قيمة صناديق النقد تقديرية: أصل المبلغ × العائد السنوي منذ تاريخ الشراء.",
    // Alerts
    al_title: "التنبيهات (تيليجرام)",
    al_above: "أعلى من",
    al_below: "أقل من",
    al_rate: "السعر / المستوى",
    al_asset: "الأصل",
    al_custom: "رمز مخصص…",
    al_grp_currency: "العملات",
    al_grp_gold: "الذهب",
    al_grp_crypto: "العملات الرقمية",
    al_grp_indices: "المؤشرات",
    al_grp_stocks: "أسهم البورصة",
    al_add: "أنشئ التنبيه",
    al_chat: "رقم الدردشة من البوت",
    al_connect: "ربط واختبار",
    al_none: "لا تنبيهات بعد",
    al_howto: "راسل @userinfobot على تيليجرام لمعرفة رقم الدردشة، وأنشئ بوتًا من @BotFather ثم ضع التوكن في إعدادات الخادم.",
    // History & goals & income
    hist_title: "قيمة محفظتك عبر الزمن",
    hist_empty: "سيظهر الرسم البياني بعد أول حفظ يومي للقيمة.",
    goal_title: "أهداف الادخار",
    goal_name: "اسم الهدف (سيارة، وديعة…)",
    goal_target: "المبلغ المستهدف بالجنيه",
    goal_add: "أضِف هدفًا",
    goal_progress: "أنجزت",
    income_label: "دخل سنوي متوقع (صناديق)",
    pf_benefits_title: "لماذا حساب؟",
    pf_benefit_1: "محفظتك محفوظة وخاصة وتتبعك على كل جهاز",
    pf_benefit_2: "قيمتك الحقيقية بالدولار مقابل تضخم الجنيه — تتحدث تلقائيًا",
    pf_benefit_3: "تنبيهات تيليجرام فورية للدولار والذهب والعملات الرقمية وأسهم البورصة والمؤشرات",
    pf_benefit_4: "رسم بياني لتطور ثروتك وأهداف ادخار مع نسبة الإنجاز",
    pf_index_note: "المؤشرات تُسجَّل كمستويات للمتابعة وليست أسهمًا قابلة للشراء — استخدمها كمرجع لمقارنة أدائك.",
    // Real value dashboard
    rv_title: "من يتفوق على التضخم؟",
    rv_sub: "عوائد سنوية متحركة (12 شهرًا) مقابل التضخم الرسمي",
    rv_beats: "يتفوق على التضخم",
    rv_lags: "يتخلف عن التضخم",
    // Indices
    indices_title: "مؤشرات البورصة المصرية",
    indices_sub: "مؤشرات البورصة — بيانات اقتباس فقط من ياهو",
    // Analyze extras
    analyze_trader: "متداول (قصير المدى)",
    analyze_investor: "مستثمر (طويل المدى)",
    chart_candle: "شموع",
    chart_line: "خط",
    // Regime / movers / watchlist / converter / calculator
    regime_title: "حالة السوق",
    movers_title: "أكبر التحركات اليوم",
    gainers: "الرابحة",
    losers: "الخاسرة",
    watchlist_title: "قائمتي",
    watchlist_empty: "اضغط النجمة بجانب أي سهم لإضافته إلى قائمتك",
    converter_title: "محول الدولار/جنيه",
    calc_title: "حاسبة الاستثمار",
    calc_amount: "المبلغ (جنيه)",
    calc_months: "المدة (شهور)",
    calc_projected: "القيمة المتوقعة",
    risk_conservative: "متحفظ",
    risk_balanced: "متوازن",
    risk_aggressive: "جريء",
    // Beginner hints
    hint_rsi: "مؤشر الزخم من 0 إلى 100. فوق 70 = السهم قد يكون غاليًا (تشبع شرائي)، تحت 30 = قد يكون رخيصًا (تشبع بيعي).",
    hint_macd: "يقيس قوة الاتجاه. موجب = زخم صاعد، سالب = زخم هابط. التقاطع فوق خط الإشارة إشارة شراء محتملة.",
    hint_pe: "كم تدفع مقابل كل جنيه من الأرباح. أقل = أرخص نسبيًا. قارنه بمتوسط القطاع وبنمو الشركة.",
    hint_dividend: "نسبة الأرباح النقدية السنوية التي توزعها الشركة مقارنة بسعر السهم — دخل منتظم للمستثمر.",
    hint_sr: "الدعم: مستوى سعر يميل إلى التوقف عنده الهبوط. المقاومة: مستوى يميل إلى التوقف عنده الصعود. كسرها يعني حركة قوية محتملة.",
    hint_atr: "متوسط مدى تذبذب السعر اليومي — استخدمه لتحديد وقف الخسارة المناسب (عادة 2×ATR).",
    hint_bb: "نطاق سعري حول المتوسط. لمس الحد العلوي = قد يكون السهم ممتدًا لأعلى، والسفلي = ممتد لأسفل.",
    hint_real_yield: "عائد سوق النقد مطروحًا منه التضخم. موجب = أموالك تنمو قوتًا شرائية، سالب = تخسر قوتها.",
    hint_inflation: "معدل ارتفاع الأسعار سنويًا. أي استثمار عائده أقل منه يخسر قيمته الحقيقية.",
  },
  en: {
    appName: "Egypt Invest",
    appTag: "Egyptian markets — gold, EGX, USD/EGP, fixed income",
    nav_dashboard: "Overview",
    nav_market: "Market",
    nav_analyze: "Analyze",
    nav_funds: "Fixed Income",
    lang_toggle: "ع",
    updated: "Updated",
    disclaimer: "Educational purposes only — not financial advice. Verify data before trading.",
    gold_title: "Gold",
    gold_per_gram: "Gold per gram",
    gold_usd: "Per oz (USD)",
    gold_egp: "Per oz (EGP)",
    gold_24k: "24k gram",
    gold_21k: "21k gram",
    fx_title: "USD / EGP",
    fx_sub: "EGP per USD",
    fx_note: "A rising line means the pound is weakening",
    index_title: "EGX30 Index",
    index_note: "Quote-only data from Yahoo",
    inflation_title: "Inflation",
    inflation_src: "World Bank (annual)",
    policy_title: "CBE deposit rate",
    mm_yield_title: "Avg money-market yield",
    decision_title: "Your decision now — where to put your EGP?",
    decision_sub: "Indicative allocation computed from inflation, yields, gold and FX",
    decision_hold_cash: "Money market / fixed income",
    decision_gold: "Gold (21k/24k)",
    decision_stocks: "EGX equities (selective)",
    decision_context: "Context indicators",
    market_title: "Egyptian Market",
    market_sub: "EGX stocks — today's performance",
    market_symbol: "Symbol",
    market_name: "Company",
    market_price: "Price",
    market_day: "Day",
    market_week: "Week",
    market_month: "Month",
    market_rsi: "RSI",
    etfs_title: "Egypt-focused ETFs",
    analyze_search: "Search a symbol or company (e.g. COMI.CA, GOLD, TMGH)",
    analyze_btn: "Analyze",
    analyze_searching: "Searching...",
    analyze_result_for: "Analysis",
    analyze_rec: "Recommendation",
    analyze_technical: "Technical",
    analyze_fundamental: "Fundamental",
    analyze_overall: "Overall score",
    analyze_score: "Score",
    analyze_price: "Price",
    analyze_change: "Change",
    analyze_pe: "P/E",
    analyze_eps: "EPS",
    analyze_pb: "P/B",
    analyze_div: "Div yield",
    analyze_mktcap: "Market cap",
    analyze_rsi: "RSI",
    analyze_sma: "Moving averages",
    analyze_support: "Support",
    analyze_resistance: "Resistance",
    analyze_52w: "52W",
    analyze_history: "6-month performance",
    analyze_rationale: "Why this rating",
    analyze_notfound: "No data for this symbol. Try something like COMI.CA, TMGH.CA or EGP=X.",
    analyze_error: "Analysis failed. Check the symbol and try again.",
    no_results: "No results",
    funds_title: "Money Market & Fixed Income Funds",
    funds_sub: "Indicative yields with a data date — verify before investing",
    funds_type_mm: "Money market",
    funds_type_fi: "Fixed income",
    funds_manager: "Manager",
    funds_yield: "Yield",
    funds_asof: "Data date",
    funds_risk_low: "Low risk",
    funds_risk_medium: "Medium risk",
    funds_source: "Source",
    // News
    nav_news: "News",
    news_title: "Egypt Market News",
    news_sub: "Latest news affecting Egyptian markets — stocks, ETFs, FX, gold and macro",
    news_empty: "No news available at the moment",
    // Portfolio
    nav_portfolio: "Portfolio",
    pf_title: "My Portfolio",
    pf_sub: "Track your gold, dollars, EGX shares and money-market funds — at their real value",
    pf_total_egp: "Total (EGP)",
    pf_total_usd: "Value in USD",
    pf_change: "Change vs cost",
    pf_add_title: "Add asset",
    pf_kind_gold: "Gold (grams)",
    pf_kind_usd: "USD cash",
    pf_kind_egx: "EGX share",
    pf_kind_fund: "Money-market fund",
    pf_qty: "Quantity (g / $ / shares)",
    pf_ref: "Symbol or fund",
    pf_cost: "Cost in EGP (optional)",
    pf_label: "Label (optional)",
    pf_add: "Add",
    pf_empty: "Add your first asset to start tracking — everything is saved to your account",
    pf_value: "Value now",
    pf_est: "Accrued-yield estimate",
    pf_delete: "Delete",
    pf_login_title: "Sign in to track your portfolio",
    pf_email: "Email",
    pf_password: "Password (8+ characters)",
    pf_signin: "Sign in",
    pf_signup: "Create free account",
    pf_logout: "Log out",
    pf_have_account: "I have an account",
    pf_no_account: "I need an account",
    pf_note_usd: "Real value: we show the USD equivalent so you can see EGP inflation clearly.",
    pf_fund_estimate: "Fund values are estimates: principal × annual yield accrued since purchase.",
    // Alerts
    al_title: "Alerts (Telegram)",
    al_above: "above",
    al_below: "below",
    al_rate: "Price / level",
    al_asset: "Asset",
    al_custom: "Custom symbol…",
    al_grp_currency: "Currencies",
    al_grp_gold: "Gold",
    al_grp_crypto: "Crypto",
    al_grp_indices: "EGX indices",
    al_grp_stocks: "EGX stocks",
    al_add: "Create alert",
    al_chat: "Bot chat id",
    al_connect: "Connect & test",
    al_none: "No alerts yet",
    al_howto: "Message @userinfobot on Telegram for your chat id; create a bot with @BotFather and set its token in server settings.",
    // History & goals & income
    hist_title: "Your portfolio value over time",
    hist_empty: "The chart appears after the first daily value is saved.",
    goal_title: "Savings goals",
    goal_name: "Goal name (car, deposit…)",
    goal_target: "Target amount in EGP",
    goal_add: "Add goal",
    goal_progress: "done",
    income_label: "Expected annual income (funds)",
    pf_benefits_title: "Why an account?",
    pf_benefit_1: "Your portfolio stays private and follows you on every device",
    pf_benefit_2: "Real USD value vs EGP inflation — updated automatically",
    pf_benefit_3: "Instant Telegram alerts for USD, gold, crypto, EGX stocks and indices",
    pf_benefit_4: "Wealth-over-time chart and savings goals with progress tracking",
    pf_index_note: "Indices are tracked as levels, not tradable shares — use them as a benchmark for your performance.",
    // Real value dashboard
    rv_title: "Who beats inflation?",
    rv_sub: "Trailing 12-month returns vs official CPI",
    rv_beats: "Beats inflation",
    rv_lags: "Lags inflation",
    // Indices
    indices_title: "EGX Indices",
    indices_sub: "Egyptian stock market indices — quote-only on Yahoo",
    // Analyze extras
    analyze_trader: "Trader (Short-term)",
    analyze_investor: "Investor (Long-term)",
    chart_candle: "Candles",
    chart_line: "Line",
    // Regime / movers / watchlist / converter / calculator
    regime_title: "Market Regime",
    movers_title: "Top Movers Today",
    gainers: "Gainers",
    losers: "Losers",
    watchlist_title: "My Watchlist",
    watchlist_empty: "Star any stock to add it to your watchlist",
    converter_title: "USD/EGP Converter",
    calc_title: "Investment Calculator",
    calc_amount: "Amount (EGP)",
    calc_months: "Horizon (months)",
    calc_projected: "Projected value",
    risk_conservative: "Conservative",
    risk_balanced: "Balanced",
    risk_aggressive: "Aggressive",
    // Beginner hints
    hint_rsi: "Momentum gauge from 0-100. Above 70 = possibly overbought (expensive), below 30 = possibly oversold (cheap).",
    hint_macd: "Measures trend strength. Positive = upward momentum, negative = downward. Crossing above its signal line can signal a buy.",
    hint_pe: "What you pay per 1 EGP of earnings. Lower = relatively cheaper. Compare to sector peers and growth.",
    hint_dividend: "Annual cash payout as a percentage of the share price — regular income for investors.",
    hint_sr: "Support: a price level where declines tend to pause. Resistance: where rallies tend to stall. Breaking them can trigger strong moves.",
    hint_atr: "Average daily price range — use it to size stop-losses (commonly 2×ATR below entry).",
    hint_bb: "A price band around the average. Touching the upper band = stretched up; lower band = stretched down.",
    hint_real_yield: "Money-market yield minus inflation. Positive = your money grows in purchasing power; negative = it shrinks.",
    hint_inflation: "The annual rate prices rise. Any investment yielding less loses real value.",
  },
};

export type Key = keyof typeof dict.en;

export const LangContext = React.createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "ar",
  setLang: () => {},
  t: (k) => dict.en[k],
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("ar");

  React.useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = lang === "ar" ? "مصر استثمر — Egypt Invest" : "Egypt Invest — مصر استثمر";
  }, [lang]);

  const setLang = React.useCallback((l: Lang) => setLangState(l), []);
  const t = React.useCallback((k: Key) => dict[lang][k] ?? k, [lang]);

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return React.useContext(LangContext);
}

// Bilingual server strings come as { en, ar } objects — pick the active language.
export function pick(obj: { en: string; ar: string } | null | undefined, lang: Lang): string {
  return obj ? obj[lang] ?? obj.en : "";
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function pctColor(v: number | null | undefined): string {
  if (v == null) return "text-slate-400";
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

export function fmtEgp(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${fmtNum(v)} ج.م`;
}

export { fmt }; // keep local formatter reachable