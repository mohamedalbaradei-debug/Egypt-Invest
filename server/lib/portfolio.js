import { quoteSmart } from "./market.js";
import { EGYPT_FUNDS } from "../data/funds.js";
import { db } from "./db.js";

/**
 * Portfolio valuation.
 *
 * Holding kinds:
 *  - gold : qty = grams of 24k gold          → grams × gram24k (live COMEX→EGP)
 *  - egx  : ref = symbol (e.g. COMI.CA),
 *           qty = number of shares           → shares × live price
 *  - usd  : qty = USD cash amount            → × live USD/EGP
 *  - fund : ref = EGYPT_FUNDS id,
 *           qty = principal in EGP           → principal × accrued yield since
 *             purchase date (simple-interest estimate from the fund's
 *             annualised yieldPct — clearly labelled as an estimate)
 */

const KINDS = new Set(["gold", "egx", "usd", "fund"]);
void KINDS; // documented set of supported holding kinds

async function fundYieldFor(fundId) {
  const base = EGYPT_FUNDS.find((f) => f.id === fundId) || null;
  let yieldPct = base?.yieldPct ?? null;
  let asOf = base?.asOf ?? null;
  try {
    const overrides = await db.getFundOverrides();
    const o = overrides[fundId];
    if (o) {
      yieldPct = o.yieldPct;
      asOf = o.asOf ?? asOf;
    }
  } catch {
    // overrides unavailable — fall back to static data
  }
  return { yieldPct, asOf };
}

/**
 * @returns {Promise<{rows:Array, totals:{totalEgp,totalUsd,costEgpTotal,totalChangePct}}>}
 */
export async function valuePortfolio(userId, { fxRate, gram24k }) {
  const holdings = await db.listHoldings(userId);

  // Resolve every EGX symbol price in one batch.
  const egxSymbols = [...new Set(holdings.filter((h) => h.kind === "egx").map((h) => h.ref))];
  const priceBySymbol = {};
  await Promise.all(
    egxSymbols.map(async (sym) => {
      try {
        const q = await quoteSmart(sym);
        // quoteSmart returns a flat Yahoo-style quote (or a reconstructed
        // one with regularMarketPrice at top level).
        priceBySymbol[sym] =
          q?.regularMarketPrice ??
          q?.chart?.meta?.regularMarketPrice ??
          null;
      } catch {
        priceBySymbol[sym] = null;
      }
    }),
  );

  const now = Date.now();
  const rows = [];
  for (const h of holdings) {
    const row = { ...h, valueEgp: null, valueUsd: null, changePct: null, estimateNote: null };
    if (h.kind === "gold" && gram24k != null && isFinite(h.qty)) {
      row.valueEgp = h.qty * gram24k;
    } else if (h.kind === "usd" && fxRate != null && isFinite(h.qty)) {
      row.valueEgp = h.qty * fxRate;
    } else if (h.kind === "egx" && priceBySymbol[h.ref] != null && isFinite(h.qty)) {
      row.valueEgp = h.qty * priceBySymbol[h.ref];
    } else if (h.kind === "fund" && isFinite(h.qty)) {
      const { yieldPct } = await fundYieldFor(h.ref);
      if (yieldPct != null) {
        const start = h.createdAt ? Date.parse(h.createdAt) : NaN;
        const years = isFinite(start) ? Math.max(0, (now - start) / 365 / 86400_000) : 0;
        row.valueEgp = h.qty * (1 + (yieldPct / 100) * years);
        row.estimateNote = `${(yieldPct).toFixed(1)}%/yr × ${years.toFixed(2)}y`;
        row.yieldPct = yieldPct;
      } else {
        row.valueEgp = h.qty; // unknown fund — show principal
      }
    }

    if (row.valueEgp != null && fxRate != null) {
      row.valueUsd = row.valueEgp / fxRate;
    }
    if (row.valueEgp != null && h.costEgp != null && h.costEgp > 0) {
      row.changePct = ((row.valueEgp - h.costEgp) / h.costEgp) * 100;
    }
    rows.push(row);
  }

  const totals = {
    totalEgp: rows.reduce((s, r) => s + (r.valueEgp ?? 0), 0),
    costEgpTotal: rows.reduce((s, r) => s + (r.costEgp ?? 0), 0),
  };
  totals.totalUsd = fxRate ? totals.totalEgp / fxRate : null;
  totals.totalChangePct =
    totals.costEgpTotal > 0 ? ((totals.totalEgp - totals.costEgpTotal) / totals.costEgpTotal) * 100 : null;

  // Expected annual income from income-bearing holdings (money-market funds).
  // EGX dividends are not modelled yet — only fund yields count here.
  const incomeBreakdown = rows
    .filter((r) => r.kind === "fund" && r.yieldPct != null)
    .map((r) => ({
      label: r.label || r.ref,
      principalEgp: r.valueEgp,
      yieldPct: r.yieldPct,
      annualIncomeEgp: (r.valueEgp * r.yieldPct) / 100,
    }));
  totals.annualIncomeEgp =
    incomeBreakdown.length > 0
      ? incomeBreakdown.reduce((s, b) => s + b.annualIncomeEgp, 0)
      : null;

  return { rows, totals, prices: priceBySymbol, incomeBreakdown };
}
