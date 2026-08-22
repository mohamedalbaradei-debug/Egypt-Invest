import { db } from "./db.js";

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
 * Periodic FX alert check. Re-arms only after the rate moves back across the
 * threshold (or 24h passes) to avoid spamming on every tick.
 */
let checking = false;

export async function checkFxAlerts(getUsdEgp) {
  if (checking) return;
  checking = true;
  try {
    const rate = await getUsdEgp();
    if (!rate || !isFinite(rate)) return;
    const alerts = await db.allFxAlertsWithChats();
    for (const a of alerts) {
      const hit =
        a.direction === "above" ? rate > a.rate : rate < a.rate;
      if (!hit) continue;

      const last = a.lastTriggeredAt ? Date.parse(a.lastTriggeredAt) : 0;
      if (Date.now() - last < 24 * 3600_000) continue;

      const msg =
        `Egypt Invest — USD/EGP ${rate.toFixed(2)} is ${a.direction} your threshold ` +
        `${Number(a.rate).toFixed(2)}\n` +
        `مصر استثمر — سعر الدولار ${rate.toFixed(2)} جنيه، تجاوز حد التنبيه (${a.direction === "above" ? "أعلى من" : "أقل من"}) ${Number(a.rate).toFixed(2)}`;
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
export function startAlertLoop(getUsdEgp, intervalMs = 15 * 60_000) {
  if (!TOKEN) {
    console.log("[alerts] TELEGRAM_BOT_TOKEN not set — alert delivery disabled");
    return;
  }
  console.log("[alerts] telegram delivery active");
  setInterval(() => checkFxAlerts(getUsdEgp), intervalMs);
  setTimeout(() => checkFxAlerts(getUsdEgp), 20_000);
}
