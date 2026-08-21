// Curated monetary-policy figures (Central Bank of Egypt).
// These are NOT live — refresh by editing. Shown with asOf + source in the UI.
export const CBE_POLICY = {
  overnightDeposit: { value: 24.25, unit: "%", asOf: "2026-08", source: "CBE — verify current rate" },
  overnightLending: { value: 25.25, unit: "%", asOf: "2026-08", source: "CBE — verify current rate" },
  mainOperation:    { value: 24.75, unit: "%", asOf: "2026-08", source: "CBE — verify current rate" },
};

// World Bank indicator IDs (keyless REST API).
export const WB_CPI_INDICATOR = "FP.CPI.TOTL.ZG"; // consumer price inflation, annual %
export const WB_LENDING_INDICATOR = "FR.INR.LEND"; // lending interest rate, annual %