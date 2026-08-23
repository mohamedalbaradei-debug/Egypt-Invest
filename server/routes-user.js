import express from "express";
import { db } from "./lib/db.js";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireUser,
} from "./lib/auth.js";
import { valuePortfolio } from "./lib/portfolio.js";
import { getGoldData, getFxData, getInflation, getIndexData } from "./lib/market.js";
import { EGYPT_FUNDS, moneyMarketYield } from "./data/funds.js";
import { tgSend, checkFxAlerts } from "./lib/notify.js";
import {
  ALERT_ASSETS,
  isValidAlertAsset,
  normalizeAsset,
  assetLabel,
  resolveAssetPrice,
  portfolioPresets,
} from "./lib/assets.js";

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tighter per-IP limit on credential endpoints (10/min).
const loginHits = new Map();
setInterval(() => loginHits.clear(), 60_000).unref();
function authLimit(req, res, next) {
  const key = `${req.ip}:${Math.floor(Date.now() / 60_000)}`;
  const n = (loginHits.get(key) ?? 0) + 1;
  loginHits.set(key, n);
  if (n > 10) return res.status(429).json({ error: "rate_limited" });
  next();
}

// ── Auth ────────────────────────────────────────────────────────────────────

router.post("/auth/register", authLimit, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!EMAIL_RE.test(String(email ?? ""))) return res.status(400).json({ error: "invalid_email" });
  if (typeof password !== "string" || password.length < 8)
    return res.status(400).json({ error: "password_too_short" });
  try {
    if (await db.getUserByEmail(email)) return res.status(409).json({ error: "email_taken" });
    const { salt, hash } = hashPassword(password);
    const user = await db.createUser(email, hash, salt);
    const token = await db.createSession(user.id);
    setSessionCookie(res, token);
    res.json({ user });
  } catch (err) {
    console.error("[auth] register failed", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/auth/login", authLimit, async (req, res) => {
  const { email, password } = req.body ?? {};
  try {
    const u = await db.getUserByEmail(String(email ?? ""));
    const ok = u && verifyPassword(String(password ?? ""), u.salt, u.pwHash);
    if (!ok) return res.status(401).json({ error: "bad_credentials" });
    const token = await db.createSession(u.id);
    setSessionCookie(res, token);
    res.json({ user: { id: u.id, email: u.email } });
  } catch (err) {
    console.error("[auth] login failed", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/auth/logout", authLimit, async (req, res) => {
  try {
    if (req.sessionToken) await db.deleteSession(req.sessionToken);
  } finally {
    clearSessionCookie(res);
    res.json({ ok: true });
  }
});

router.get("/auth/me", (req, res) => res.json({ user: req.user }));

// ── Portfolio ───────────────────────────────────────────────────────────────

const VALID_KINDS = new Set(["gold", "egx", "usd", "fund"]);

function validateHolding(body) {
  const kind = String(body.kind ?? "");
  if (!VALID_KINDS.has(kind)) return { error: "invalid_kind" };
  const qty = Number(body.qty);
  if (!isFinite(qty) || qty <= 0) return { error: "invalid_qty" };
  const out = { kind, qty, ref: body.ref ? String(body.ref).trim() : null };
  if (kind === "fund" && !EGYPT_FUNDS.some((f) => f.id === out.ref))
    return { error: "unknown_fund" };
  if (kind === "egx" && !out.ref) return { error: "missing_symbol" };
  if (body.costEgp != null && body.costEgp !== "") {
    const c = Number(body.costEgp);
    if (isFinite(c) && c > 0) out.costEgp = c;
  }
  if (body.label) out.label = String(body.label).slice(0, 80);
  return { holding: out };
}

router.get("/portfolio", requireUser, async (req, res) => {
  try {
    const [gold, fx] = await Promise.all([getGoldData(), getFxData()]);
    const gram24k = gold.gram24k;
    const fxRate = fx.usdEgp;
    const result = await valuePortfolio(req.user.id, { fxRate, gram24k });
    res.json({ ...result, fxUsed: fxRate, gram24kUsed: gram24k, note: gold.note });
  } catch (err) {
    console.error("[portfolio]", err);
    res.status(500).json({ error: "valuation_failed" });
  }
});

router.post("/portfolio", requireUser, async (req, res) => {
  const v = validateHolding(req.body ?? {});
  if (v.error) return res.status(400).json({ error: v.error });
  res.json(await db.addHolding(req.user.id, v.holding));
});

router.put("/portfolio/:id", requireUser, async (req, res) => {
  const patch = {};
  if (req.body?.qty !== undefined) {
    const q = Number(req.body.qty);
    if (!isFinite(q) || q <= 0) return res.status(400).json({ error: "invalid_qty" });
    patch.qty = q;
  }
  if (req.body?.costEgp !== undefined) {
    const c = Number(req.body.costEgp);
    patch.costEgp = isFinite(c) && c > 0 ? c : null;
  }
  if (req.body?.label !== undefined) patch.label = String(req.body.label).slice(0, 80);
  await db.updateHolding(req.user.id, req.params.id, patch);
  res.json({ ok: true });
});

router.delete("/portfolio/:id", requireUser, async (req, res) => {
  await db.deleteHolding(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ── Watchlist ───────────────────────────────────────────────────────────────

router.get("/watchlist", requireUser, async (req, res) =>
  res.json({ symbols: await db.listWatch(req.user.id) }),
);

router.post("/watchlist", requireUser, async (req, res) => {
  await db.watchAdd(req.user.id, req.body?.symbol ?? "");
  res.json({ symbols: await db.listWatch(req.user.id) });
});

router.delete("/watchlist/:symbol", requireUser, async (req, res) => {
  await db.watchDel(req.user.id, req.params.symbol);
  res.json({ symbols: await db.listWatch(req.user.id) });
});

// ── Alerts (any alertable asset: FX, gold, crypto, EGX stocks & indices) ────

// Catalog of preset assets for the picker. Public — also powers the
// portfolio add-form symbol suggestions.
router.get("/alerts/catalog", (_req, res) => {
  const groups = ["currency", "gold", "crypto", "indices", "stocks"];
  res.json({
    groups: groups.map((g) => ({
      id: g,
      assets: ALERT_ASSETS.filter((a) => a.grp === g).map((a) => ({ id: a.id, en: a.en, ar: a.ar })),
    })),
  });
});

router.get("/alerts/fx", requireUser, async (req, res) => {
  const [alerts, chatId] = await Promise.all([
    db.listFxAlerts(req.user.id),
    db.getTgChat(req.user.id),
  ]);
  res.json({ alerts, telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN), chatId });
});

router.post("/alerts/fx", requireUser, async (req, res) => {
  const asset = normalizeAsset(req.body?.asset ?? "USDEGP");
  if (!isValidAlertAsset(asset)) return res.status(400).json({ error: "invalid_asset" });
  const direction = req.body?.direction === "below" ? "below" : "above";
  const rate = Number(req.body?.rate);
  if (!isFinite(rate) || rate <= 0 || rate > 10_000_000)
    return res.status(400).json({ error: "invalid_rate" });
  res.json(await db.addFxAlert(req.user.id, asset, direction, rate));
});

router.delete("/alerts/fx/:id", requireUser, async (req, res) => {
  await db.delFxAlert(req.user.id, req.params.id);
  res.json({ ok: true });
});

router.get("/alerts/price/:asset", requireUser, async (req, res) => {
  const asset = normalizeAsset(req.params.asset);
  try {
    res.json({ asset, label: assetLabel(asset), price: await resolveAssetPrice(asset) });
  } catch {
    res.status(502).json({ error: "quote_failed" });
  }
});

router.post("/alerts/telegram", requireUser, async (req, res) => {
  const chatId = String(req.body?.chatId ?? "").trim();
  if (!/^-?\d{4,}$/.test(chatId)) return res.status(400).json({ error: "invalid_chat_id" });
  const ok = await tgSend(
    chatId,
    "Egypt Invest alert channel connected ✓\nتم ربط تنبيهات مصر استثمر بنجاح",
  );
  if (!ok) return res.status(400).json({ error: "telegram_send_failed" });
  await db.setTgChat(req.user.id, chatId);
  res.json({ ok: true });
});

// Manual trigger (also runs automatically every 15 min when bot configured).
router.post("/alerts/check", requireUser, async (_req, res) => {
  await checkFxAlerts();
  res.json({ checkedAt: new Date().toISOString() });
});

// ── Portfolio presets (EGX stocks / indices / ETFs picker) ──────────────────

router.get("/portfolio/presets", (_req, res) => res.json(portfolioPresets()));

// ── Net-worth history snapshots ─────────────────────────────────────────────

router.get("/snapshots", requireUser, async (req, res) => {
  const snaps = await db.listSnapshots(req.user.id, Number(req.query.days ?? 90));
  res.json({ snapshots: snaps });
});

// ── Savings goals ───────────────────────────────────────────────────────────

router.get("/goals", requireUser, async (req, res) => {
  res.json({ goals: await db.listGoals(req.user.id) });
});

router.post("/goals", requireUser, async (req, res) => {
  const name = String(req.body?.name ?? "").trim().slice(0, 60);
  const target = Number(req.body?.targetEgp);
  if (!name) return res.status(400).json({ error: "invalid_name" });
  if (!isFinite(target) || target <= 0) return res.status(400).json({ error: "invalid_target" });
  res.json(await db.addGoal(req.user.id, name, target));
});

router.delete("/goals/:id", requireUser, async (req, res) => {
  await db.delGoal(req.user.id, req.params.id);
  res.json({ ok: true });
});

// ── Beat-inflation dashboard data (public) ─────────────────────────────────

function seriesPct(series, days) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1].value;
  const pastIdx = Math.max(0, series.length - 1 - days);
  const first = series[pastIdx].value;
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}

router.get("/realvalue", async (_req, res) => {
  try {
    const [infl, gold, fx, idx] = await Promise.all([
      getInflation(),
      getGoldData(),
      getFxData(),
      getIndexData(),
    ]);

    // EGP depreciation ≈ USD/EGP rise over the last year.
    const egpDepreciationPct = seriesPct(fx.series, 252);

    const bars = [
      { key: "mm_yield", labelEn: "Money-market yield", labelAr: "عائد سوق النقد", pct: moneyMarketYield() },
      { key: "cpi", labelEn: `Inflation (${infl.year})`, labelAr: `التضخم (${infl.year})`, pct: infl.inflationPct },
      { key: "gold_egp", labelEn: "Gold in EGP (1y)", labelAr: "الذهب بالجنيه (سنة)", pct: seriesPct(gold.usdSeries, 252) == null ? null : ((1 + seriesPct(gold.usdSeries, 252) / 100) * (1 + (egpDepreciationPct ?? 0) / 100) * 100 - 100) },
      { key: "usd_cash", labelEn: "USD cash (1y)", labelAr: "الدولار نقداً (سنة)", pct: egpDepreciationPct },
      { key: "egx30_proxy", labelEn: "EGX basket (1y)", labelAr: "سلة البورصة (سنة)", pct: idx.proxy ? seriesPct(idx.series, 252) : null },
    ];

    res.json({
      inflation: infl,
      mmYield: moneyMarketYield(),
      egpDepreciationPct,
      bars: bars.filter((b) => b.pct != null).map((b) => ({ ...b, pct: +b.pct.toFixed(1) })),
      note:
        "Trailing-12-month comparisons; money-market yield is annualised current average. Past performance does not guarantee future results.",
    });
  } catch (err) {
    console.error("[realvalue]", err);
    res.status(500).json({ error: "unavailable" });
  }
});

// ── Admin: fund yield refresh pipeline ─────────────────────────────────────
// POST {token, updates:[{id:"mm-ci", yieldPct:24.9, asOf:"2026-08-21", note}]}
router.post("/admin/funds", async (req, res) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.body?.token !== expected)
    return res.status(403).json({ error: "forbidden" });
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (updates.length === 0) return res.status(400).json({ error: "no_updates" });
  await db.setFundOverrides(updates);
  const overrides = await db.getFundOverrides();
  res.json({ applied: updates.length, totalOverrides: Object.keys(overrides).length });
});

// ── Privacy-friendly pageview counter ──────────────────────────────────────

router.post("/analytics", (req, res) => {
  const ppath = String(req.body?.path ?? "/").slice(0, 120);
  if (/^\/[A-Za-z0-9\-_/]*$/.test(ppath)) {
    db.bumpPageview(ppath).catch((e) => console.error("[analytics]", e));
  }
  res.json({ ok: true });
});

router.get("/admin/stats", async (req, res) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.query.token !== expected)
    return res.status(403).json({ error: "forbidden" });
  res.json({ pageviews: await db.pageviewTotals(Number(req.query.days ?? 30)) });
});

export default router;
