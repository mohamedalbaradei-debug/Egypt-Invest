import YahooFinanceClass from "yahoo-finance2";

// yahoo-finance2 v4: default export is a class; instantiate and suppress the survey notice.
// Some EGX index symbols return null currency which fails strict schema validation —
// log but don't throw so we still get the data.
export const yahooFinance = new YahooFinanceClass({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false, logOptionsErrors: false },
});

// Chart helper that tolerates schema-validation failures by retrying with
// per-request validation disabled. Hard timeout so a hung Yahoo connection
// can't block a request forever (callers fall back to last-good data).
export async function chartSafe(symbol, query, timeoutMs = 15000) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await yahooFinance.chart(symbol, query, { fetchOptions: { signal } });
  } catch (err) {
    const msg = String(err?.message ?? "");
    if (msg.toLowerCase().includes("validation")) {
      return await yahooFinance.chart(symbol, query, { validateResult: false, fetchOptions: { signal } });
    }
    throw err;
  }
}

// Quote helper with the same hard timeout.
export async function quoteSafe(symbols, timeoutMs = 12000) {
  const signal = AbortSignal.timeout(timeoutMs);
  return yahooFinance.quote(symbols, {}, { fetchOptions: { signal } });
}
