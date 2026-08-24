import { db } from "./db.js";
import { valuePortfolio } from "./portfolio.js";
import { getGoldData, getFxData, getInflation, getIndexData } from "./market.js";
import { tgSend } from "./notify.js";

/**
 * Daily bilingual Telegram digest: market snapshot + personal portfolio
 * change. Sent to every user with a linked chat who hasn't opted out.
 * Premium-gated later — the tier check lives here so flipping the paywall
 * is a one-line change.
 */
const PREMIUM_ONLY = process.env.DIGEST_PREMIUM_ONLY === "true";

function fmt(v, digits = 2) {
  if (v == null || !isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: digits });
}

export async function sendDailyDigests() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  let recipients = await db.allDigestRecipients();
  if (PREMIUM_ONLY) recipients = recipients.filter((r) => r.tier === "premium");
  if (recipients.length === 0) return;

  let gold, fx, infl, idx;
  try {
    [gold, fx, infl, idx] = await Promise.all([
      getGoldData(),
      getFxData(),
      getInflation(),
      getIndexData(),
    ]);
  } catch (err) {
    console.error("[digest] market data failed", err.message);
    return;
  }

  const idxVal = idx?.series?.at(-1)?.value ?? null;
  const idxChange = idx?.changePct ?? null;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const dateAr = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" });

  for (const { userId, chatId } of recipients) {
    try {
      const lines = [
        `☀️ Egypt Invest Daily — ${dateStr} | مصر استثمر — ${dateAr}`,
        ``,
        `🥇 Gold 24k: ${fmt(gold?.gram24k, 0)} EGP/g | الذهب`,
        `💵 USD/EGP: ${fmt(fx?.usdEgp)} | الدولار`,
        `📈 EGX30 proxy: ${idxVal != null ? fmt(idxVal, 0) : "—"}${idxChange != null ? ` (${idxChange >= 0 ? "+" : ""}${fmt(idxChange, 1)}%)` : ""}`,
        `🔥 Inflation: ${infl ? `${fmt(infl.inflationPct, 1)}% (${infl.year})` : "—"} | التضخم`,
      ];

      // Personal section — only for users with holdings.
      try {
        const { totals } = await valuePortfolio(userId, {
          fxRate: fx?.usdEgp,
          gram24k: gold?.gram24k,
        });
        if (totals?.totalEgp > 0) {
          lines.push(
            ``,
            `💼 Portfolio: ${fmt(totals.totalEgp, 0)} EGP | محفظتك`,
            totals.annualIncomeEgp
              ? `💰 Expected income: ${fmt(totals.annualIncomeEgp, 0)} EGP/yr | الدخل المتوقع`
              : null,
          );
        }
      } catch {
        // portfolio valuation is best-effort inside the digest
      }

      lines.push(``, `Stay invested 🌱 | استمر في الاستثمار`);
      const text = lines.filter((l) => l !== null).join("\n");
      await tgSend(chatId, text);
    } catch (err) {
      console.error("[digest] user failed", err.message);
    }
  }
}

/** Hourly scheduler guard: fires once per calendar day at ~08:00 Cairo time. */
let lastDigestDay = null;
export function startDigestLoop() {
  async function tick() {
    const now = new Date();
    const cairoHour = Number(
      now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Africa/Cairo" }),
    );
    const day = now.toISOString().slice(0, 10);
    if (cairoHour === 8 && lastDigestDay !== day) {
      lastDigestDay = day;
      try {
        await sendDailyDigests();
        console.log("[digest] daily digests sent");
      } catch (err) {
        console.error("[digest] run failed", err.message);
      }
    }
  }
  setTimeout(() => void tick(), 20_000);
  setInterval(() => void tick(), 10 * 60_000).unref();
}
