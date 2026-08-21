// Featured EGX instruments. Names are fallbacks — the server prefers the live
// Yahoo short/long name at runtime. Edit freely (add any .CA symbol, or any
// Yahoo symbol for ETFs).
export const EGX_STOCKS = [
  { symbol: "COMI.CA",   en: "Commercial International Bank (CIB)", ar: "البنك التجاري الدولي (CIB)" },
  { symbol: "TMGH.CA",   en: "Talaat Moustafa Group (TMG)",         ar: "طلعت مصطفى القابضة" },
  { symbol: "JUFO.CA",   en: "Juhayna Food Industries",             ar: "جهينة للصناعات الغذائية" },
  { symbol: "SWDY.CA",   en: "El Sewedy Electric",                  ar: "السويدي إليكتريك" },
  { symbol: "ETEL.CA",   en: "Telecom Egypt",                       ar: "المصرية للاتصالات" },
  { symbol: "EAST.CA",   en: "Eastern Company",                     ar: "الشرقية للدخان" },
  { symbol: "ADIB.CA",   en: "Abu Dhabi Islamic Bank",              ar: "مصرف أبو ظبي الإسلامي" },
  { symbol: "ABUK.CA",   en: "Abu Qir Fertilizers",                 ar: "أبو قير للأسمدة" },
  { symbol: "MFPC.CA",   en: "MOPCO (Misr Fertilizers)",            ar: "مصر للأسمدة (موبكو)" },
  { symbol: "SKPC.CA",   en: "Sidi Kerir Petrochemicals",           ar: "سيدي كرير للبتروكيماويات" },
  { symbol: "HRHO.CA",   en: "EFG Hermes Holding",                  ar: "إي إف چي هيرميس القابضة" },
  { symbol: "HELI.CA",   en: "Heliopolis Housing",                  ar: "مصر الجديدة للإسكان" },
  { symbol: "ISMA.CA",   en: "Ismailia National Housing",           ar: "الإسماعيلية مصر للإسكان" },
  { symbol: "CIRA.CA",   en: "CIRA Education",                      ar: "سيرا للتعليم" },
  { symbol: "PHDC.CA",   en: "Palm Hills Developments",             ar: "بالم هيلز للتعمير" },
  { symbol: "SAUD.CA",   en: "Saudi Egyptian Construction",         ar: "المقاولات العربيه السعوديه" },
];

// Egypt-exposure funds. The EGX itself lists almost no ETFs — local investors
// use mutual funds (see Funds tab). Internationally, VanEck's EGPT (NYSE) is
// the main tradable Egypt fund; WIEGY tracks the FTSE Egypt index.
export const EGX_ETFS = [
  { symbol: "EGPT",      en: "VanEck Egypt Index ETF (NYSE)",  ar: "صندوق فان إيك مصر (بورصة نيويورك)", currencyHint: "USD" },
  { symbol: "WIEGY.FGI", en: "FTSE Egypt Index (WisdomTree)",  ar: "مؤشر فوتسي مصر (ويزدوم تري)",       currencyHint: "USD" },
];

// EGX indices — only symbols Yahoo actually serves (verified live).
// EGX33 is not published on Yahoo at all; EGX70/EGX100 use the EWI variants.
export const EGX_INDICES = [
  { symbol: "^CASE30",         en: "EGX30",        ar: "إيجي إكس 30",              aliases: ["EGX30", "CASE30"] },
  { symbol: "^EGX30CAPPED.CA", en: "EGX30 Capped", ar: "إيجي إكس 30 المحدود",       aliases: ["EGX30CAPPED", "CAPPED"] },
  { symbol: "^EGX35-LV.CA",    en: "EGX35-LV",     ar: "إيجي إكس 35 محدود السيولة", aliases: ["EGX35", "CASE35"] },
  { symbol: "^EGX70EWI.CA",    en: "EGX70 EWI",    ar: "إيجي إكس 70 متساوي الأوزان", aliases: ["EGX70", "CASE70"] },
  { symbol: "^EGX100EWI.CA",   en: "EGX100 EWI",   ar: "إيجي إكس 100 متساوي الأوزان", aliases: ["EGX100", "CASE100"] },
];

export const EGX30_INDEX = { symbol: "^CASE30", en: "EGX30", ar: "إيجي إكس 30" };

// Gold reference symbol (COMEX gold futures, USD/oz).
export const GOLD_SYMBOL = "GC=F";
// USD/EGP spot.
export const FX_SYMBOL = "EGP=X";