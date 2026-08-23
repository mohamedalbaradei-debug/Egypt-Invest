import { db } from "./db.js";
import { assetLabel, resolveAssetPrice } from "./assets.js";

/**
 * Optional Telegram delivery for alerts. Costs $0: create a bot with
 * @BotFather, set TELEGRAM_BOT_TOKEN, and the user sends the bot any message
 * then posts their numeric chat id in the app (getidsimple-style bots print it).
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export async function tgSend(chatId, text) {
  if (!TOKEN || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return r.ok;
  } catch (err) {
    console.error("[telegram] send failed", err);
    return false;
  }
}

/**
 * Periodic multi-asset alert check (fx_alerts table, generalized with an
 * asset key). Re-arms only after 24h to avoid spamming on every tick.
 */
let checking = false;

export async function checkFxAlerts() {
  if (checking) return;
  checking = true;
  try {
    const alerts = await db.allFxAlertsWithChats();
    if (alerts.length === 0) return;

    // Resolve each distinct asset once per cycle.
    const assets = [...new Set(alerts.map((a) => a.asset))];
    const priceByAsset = {};
    for (const asset of assets) {
      priceByAsset[asset] = await resolveAssetPrice(asset);
    }

    for (const a of alerts) {
      const rate = priceByAsset[a.asset];
      if (!rate || !isFinite(rate)) continue;
      const hit =
        a.direction === "above" ? rate > a.rate : rate < a.rate;
      if (!hit) continue;

      const last = a.lastTriggeredAt ? Date.parse(a.lastTriggeredAt) : 0;
      if (Date.now() - last < 24 * 3600_000) continue;

      const label = assetLabel(a.asset, "en");
      const labelAr = assetLabel(a.asset, "ar");
      const fmt = (v) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
      const dirEn = a.direction === "above" ? "above" : "below";
      const dirAr = a.direction === "above" ? "أعلى من" : "أقل من";
      const msg =
        `Egypt Invest — ${label} ${fmt(rate)} is ${dirEn} your threshold ${fmt(a.rate)}\n` +
        `مصر استثمر — ${labelAr} ${fmt(rate)}، تجاوز حد التنبيه (${dirAr}) ${fmt(a.rate)}`;
      const ok = await tgSend(a.chatId, msg);
      if (ok) await db.markAlertTriggered(a.id);
    }
  } catch (err) {
    console.error("[alerts] check failed", err);
  } finally {
    checking = false;
  }
}

/** Start the checker loop when a bot token exists. */
export function startAlertLoop(intervalMs = 15 * 60_000) {
  if (!TOKEN) {
    console.log("[alerts] TELEGRAM_BOT_TOKEN not set — alert delivery disabled");
    return;
  }
  console.log("[alerts] telegram delivery active");
  setInterval(() => checkFxAlerts(), intervalMs);
  setTimeout(() => checkFxAlerts(), 20_000);
}
