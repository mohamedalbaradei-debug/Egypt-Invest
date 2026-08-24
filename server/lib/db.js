import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

/**
 * Storage layer — two interchangeable backends behind one async API:
 *
 * 1. Postgres (Neon free tier) when DATABASE_URL is set — persistent on
 *    hosting platforms that wipe local disk between deploys.
 * 2. JSON file fallback (server/data/db.json) — zero setup for local dev;
 *    best-effort persistence only.
 *
 * Entities: users, sessions, holdings, watchlist, fxAlerts,
 * fundOverrides, telegramChats, pageviews.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "db.json")
  : path.join(__dirname, "../data/db.json");

const SESSION_DAYS = 30;

// ── JSON-file backend ────────────────────────────────────────────────────────

function emptyDb() {
  return {
    users: [],
    sessions: [],
    holdings: [],
    watchlist: [],
    fxAlerts: [],
    fundOverrides: {},
    telegramChats: {},
    snapshots: [],
    goals: [],
    pageviews: {}, // { "YYYY-MM-DD": { "/path": count } }
    dataCache: {},
    seq: 1,
  };
}

let jsonDb = null;
let saveTimer = null;

async function jsonSaveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(jsonDb));
    } catch (err) {
      console.error("db.json write failed", err);
    }
  }, 250);
}

// ── Backend selection ────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL || "";
const usePg = DATABASE_URL.length > 0;

let pgPool = null;
if (usePg) {
  const { Pool } = await import("pg");
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
}

export const backend = usePg ? "postgres" : "json";

async function pgInit() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      pw_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      ref TEXT,
      label TEXT,
      qty DOUBLE PRECISION NOT NULL,
      cost_egp DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS watchlist (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      PRIMARY KEY (user_id, symbol)
    );
    CREATE TABLE IF NOT EXISTS fx_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      rate DOUBLE PRECISION NOT NULL,
      last_triggered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      total_egp DOUBLE PRECISION,
      total_usd DOUBLE PRECISION,
      PRIMARY KEY (user_id, day)
    );
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_egp DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS fund_overrides (
      fund_id TEXT PRIMARY KEY,
      yield_pct DOUBLE PRECISION NOT NULL,
      as_of TEXT,
      note TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS telegram_chats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pageviews (
      day TEXT NOT NULL,
      ppath TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, ppath)
    );
  `);
  // Migration: fx_alerts became the generic alerts table — asset column was
  // added later; backfill legacy rows as USD/EGP.
  await pgPool.query(`
    ALTER TABLE fx_alerts ADD COLUMN IF NOT EXISTS asset TEXT;
    UPDATE fx_alerts SET asset='USDEGP' WHERE asset IS NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';
    ALTER TABLE telegram_chats ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT true;`);
  // Last-good market snapshots so the site never goes blank after a deploy
  // (the in-memory cache is wiped on restart; this survives restarts).
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS data_cache (
      key TEXT PRIMARY KEY,
      value_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`);
}

const uid = () => `u_${crypto.randomUUID()}`;

// ── Public API ───────────────────────────────────────────────────────────────

export async function initDb() {
  if (usePg) {
    await pgInit();
    console.log("[db] postgres backend ready");
    return;
  }
  try {
    jsonDb = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    jsonDb = emptyDb();
  }
  // Forward-fill any keys added by newer versions.
  jsonDb = { ...emptyDb(), ...jsonDb };
  console.log(`[db] json backend ready (${DB_FILE})`);
}

const j = async (v) => v; // parity shim so call sites stay identical

export const db = {
  // Users ───────────────────────────────────────────────────────────────────
  async getUserByEmail(email) {
    const e = String(email).toLowerCase().trim();
    if (usePg) {
      const r = await pgPool.query("SELECT * FROM users WHERE email=$1", [e]);
      return r.rows[0] ? { id: r.rows[0].id, email: r.rows[0].email, pwHash: r.rows[0].pw_hash, salt: r.rows[0].salt } : null;
    }
    const u = jsonDb.users.find((x) => x.email === e);
    return u ?? null;
  },

  async getUserById(id) {
    if (usePg) {
      const r = await pgPool.query("SELECT * FROM users WHERE id=$1", [id]);
      return r.rows[0] ? { id: r.rows[0].id, email: r.rows[0].email } : null;
    }
    const u = jsonDb.users.find((x) => x.id === id);
    return u ? { id: u.id, email: u.email } : null;
  },

  async createUser(email, pwHash, salt) {
    const e = String(email).toLowerCase().trim();
    const id = uid();
    if (usePg) {
      await pgPool.query("INSERT INTO users (id,email,pw_hash,salt) VALUES ($1,$2,$3,$4)", [id, e, pwHash, salt]);
    } else {
      jsonDb.users.push({ id, email: e, pwHash, salt, tier: "free", createdAt: Date.now() });
      await jsonSaveSoon();
    }
    return { id, email: e, tier: "free" };
  },

  // Sessions ────────────────────────────────────────────────────────────────
  async createSession(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
    if (usePg) {
      await pgPool.query("INSERT INTO sessions (token,user_id,expires_at) VALUES ($1,$2,$3)", [token, userId, expiresAt]);
    } else {
      jsonDb.sessions.push({ token, userId, expiresAt: expiresAt.getTime() });
      await jsonSaveSoon();
    }
    return token;
  },

  async getSessionUser(token) {
    if (!token) return null;
    if (usePg) {
      const r = await pgPool.query(
        `SELECT u.id, u.email, u.tier FROM sessions s JOIN users u ON u.id=s.user_id
         WHERE s.token=$1 AND s.expires_at > now()`,
        [token],
      );
      const row = r.rows[0];
      return row ? { id: row.id, email: row.email, tier: row.tier ?? "free" } : null;
    }
    const s = jsonDb.sessions.find((x) => x.token === token);
    if (!s || s.expiresAt < Date.now()) return null;
    const u = jsonDb.users.find((x) => x.id === s.userId);
    return u ? { id: u.id, email: u.email, tier: u.tier ?? "free" } : null;
  },

  async deleteSession(token) {
    if (usePg) {
      await pgPool.query("DELETE FROM sessions WHERE token=$1", [token]);
    } else {
      jsonDb.sessions = jsonDb.sessions.filter((x) => x.token !== token);
      await jsonSaveSoon();
    }
  },

  // Holdings ────────────────────────────────────────────────────────────────
  async listHoldings(userId) {
    if (usePg) {
      const r = await pgPool.query(
        "SELECT * FROM holdings WHERE user_id=$1 ORDER BY created_at DESC",
        [userId],
      );
      return r.rows.map((h) => ({
        id: h.id, userId: h.user_id, kind: h.kind, ref: h.ref,
        label: h.label, qty: h.qty, costEgp: h.cost_egp, createdAt: h.created_at,
      }));
    }
    return jsonDb.holdings.filter((h) => h.userId === userId);
  },

  async addHolding(userId, h) {
    const row = { id: uid(), userId, ...h, createdAt: new Date().toISOString() };
    if (usePg) {
      await pgPool.query(
        `INSERT INTO holdings (id,user_id,kind,ref,label,qty,cost_egp) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [row.id, userId, row.kind, row.ref ?? null, row.label ?? null, row.qty, row.costEgp ?? null],
      );
    } else {
      jsonDb.holdings.unshift(row);
      await jsonSaveSoon();
    }
    return row;
  },

  async updateHolding(userId, id, patch) {
    if (usePg) {
      const sets = [];
      const vals = [];
      let i = 1;
      for (const k of ["qty", "costEgp", "label"]) {
        if (patch[k] !== undefined) {
          sets.push(`${k === "costEgp" ? "cost_egp" : k}=$${i++}`);
          vals.push(patch[k]);
        }
      }
      if (sets.length === 0) return;
      vals.push(id, userId);
      await pgPool.query(`UPDATE holdings SET ${sets.join(",")} WHERE id=$${i++} AND user_id=$${i}`, vals);
    } else {
      const h = jsonDb.holdings.find((x) => x.id === id && x.userId === userId);
      if (h) Object.assign(h, patch);
      await jsonSaveSoon();
    }
  },

  async deleteHolding(userId, id) {
    if (usePg) {
      await pgPool.query("DELETE FROM holdings WHERE id=$1 AND user_id=$2", [id, userId]);
    } else {
      jsonDb.holdings = jsonDb.holdings.filter((x) => !(x.id === id && x.userId === userId));
      await jsonSaveSoon();
    }
  },

  // Watchlist ───────────────────────────────────────────────────────────────
  async listWatch(userId) {
    if (usePg) {
      const r = await pgPool.query("SELECT symbol FROM watchlist WHERE user_id=$1", [userId]);
      return r.rows.map((x) => x.symbol);
    }
    return jsonDb.watchlist.filter((x) => x.userId === userId).map((x) => x.symbol);
  },

  async watchAdd(userId, symbol) {
    const sym = String(symbol).toUpperCase().trim();
    if (!sym) return;
    if (usePg) {
      await pgPool.query("INSERT INTO watchlist (user_id,symbol) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, sym]);
    } else {
      if (!jsonDb.watchlist.some((x) => x.userId === userId && x.symbol === sym)) {
        jsonDb.watchlist.push({ userId, symbol: sym });
        await jsonSaveSoon();
      }
    }
  },

  async watchDel(userId, symbol) {
    const sym = String(symbol).toUpperCase().trim();
    if (usePg) {
      await pgPool.query("DELETE FROM watchlist WHERE user_id=$1 AND symbol=$2", [userId, sym]);
    } else {
      jsonDb.watchlist = jsonDb.watchlist.filter((x) => !(x.userId === userId && x.symbol === sym));
      await jsonSaveSoon();
    }
  },

  // Alerts (fx_alerts table, generalized with an asset key) ────────────────
  async listFxAlerts(userId) {
    if (usePg) {
      const r = await pgPool.query("SELECT * FROM fx_alerts WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
      return r.rows.map((a) => ({ id: a.id, asset: a.asset ?? "USDEGP", direction: a.direction, rate: a.rate, lastTriggeredAt: a.last_triggered_at }));
    }
    return jsonDb.fxAlerts.filter((a) => a.userId === userId).map((a) => ({ ...a, asset: a.asset ?? "USDEGP" }));
  },

  async addFxAlert(userId, asset, direction, rate) {
    const id = uid();
    if (usePg) {
      await pgPool.query("INSERT INTO fx_alerts (id,user_id,direction,rate,asset) VALUES ($1,$2,$3,$4,$5)", [id, userId, direction, rate, asset]);
    } else {
      jsonDb.fxAlerts.push({ id, userId, asset, direction, rate, lastTriggeredAt: null });
      await jsonSaveSoon();
    }
    return { id, asset, direction, rate };
  },

  async delFxAlert(userId, id) {
    if (usePg) {
      await pgPool.query("DELETE FROM fx_alerts WHERE id=$1 AND user_id=$2", [id, userId]);
    } else {
      jsonDb.fxAlerts = jsonDb.fxAlerts.filter((x) => !(x.id === id && x.userId === userId));
      await jsonSaveSoon();
    }
  },

  /** All alerts with owner chat ids — used by the checker loop. */
  async allFxAlertsWithChats() {
    if (usePg) {
      const r = await pgPool.query(`
        SELECT a.id, a.user_id, a.asset, a.direction, a.rate, a.last_triggered_at, t.chat_id
        FROM fx_alerts a LEFT JOIN telegram_chats t ON t.user_id=a.user_id`);
      return r.rows.map((a) => ({ id: a.id, userId: a.user_id, asset: a.asset ?? "USDEGP", direction: a.direction, rate: a.rate, lastTriggeredAt: a.last_triggered_at, chatId: a.chat_id }));
    }
    return jsonDb.fxAlerts.map((a) => ({
      ...a,
      asset: a.asset ?? "USDEGP",
      chatId: jsonDb.telegramChats[a.userId] ?? null,
    }));
  },

  // Portfolio snapshots (daily net-worth history) ──────────────────────────
  async upsertSnapshot(userId, day, totalEgp, totalUsd) {
    if (usePg) {
      await pgPool.query(
        `INSERT INTO portfolio_snapshots (user_id,day,total_egp,total_usd) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id,day) DO UPDATE SET total_egp=EXCLUDED.total_egp, total_usd=EXCLUDED.total_usd`,
        [userId, day, totalEgp, totalUsd],
      );
    } else {
      jsonDb.snapshots = jsonDb.snapshots || [];
      const row = jsonDb.snapshots.find((s) => s.userId === userId && s.day === day);
      if (row) { row.totalEgp = totalEgp; row.totalUsd = totalUsd; }
      else jsonDb.snapshots.push({ userId, day, totalEgp, totalUsd });
      await jsonSaveSoon();
    }
  },

  async listSnapshots(userId, days = 90) {
    if (usePg) {
      const r = await pgPool.query(
        `SELECT day, total_egp, total_usd FROM portfolio_snapshots WHERE user_id=$1
         ORDER BY day DESC LIMIT $2`,
        [userId, days],
      );
      return r.rows.map((s) => ({ day: s.day, totalEgp: s.total_egp, totalUsd: s.total_usd })).reverse();
    }
    return (jsonDb.snapshots || [])
      .filter((s) => s.userId === userId)
      .slice(-days);
  },

  async listUserIdsWithHoldings() {
    if (usePg) {
      const r = await pgPool.query("SELECT DISTINCT user_id FROM holdings");
      return r.rows.map((x) => x.user_id);
    }
    return [...new Set(jsonDb.holdings.map((h) => h.userId))];
  },

  // Savings goals ────────────────────────────────────────────────────────────
  async listGoals(userId) {
    if (usePg) {
      const r = await pgPool.query("SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at", [userId]);
      return r.rows.map((g) => ({ id: g.id, name: g.name, targetEgp: g.target_egp }));
    }
    return jsonDb.goals.filter((g) => g.userId === userId).map((g) => ({ id: g.id, name: g.name, targetEgp: g.targetEgp }));
  },

  async addGoal(userId, name, targetEgp) {
    const id = uid();
    if (usePg) {
      await pgPool.query("INSERT INTO goals (id,user_id,name,target_egp) VALUES ($1,$2,$3,$4)", [id, userId, name, targetEgp]);
    } else {
      jsonDb.goals.push({ id, userId, name, targetEgp });
      await jsonSaveSoon();
    }
    return { id, name, targetEgp };
  },

  async delGoal(userId, id) {
    if (usePg) {
      await pgPool.query("DELETE FROM goals WHERE id=$1 AND user_id=$2", [id, userId]);
    } else {
      jsonDb.goals = jsonDb.goals.filter((g) => !(g.id === id && g.userId === userId));
      await jsonSaveSoon();
    }
  },

  async markAlertTriggered(id) {
    const now = new Date();
    if (usePg) {
      await pgPool.query("UPDATE fx_alerts SET last_triggered_at=now() WHERE id=$1", [id]);
    } else {
      const a = jsonDb.fxAlerts.find((x) => x.id === id);
      if (a) a.lastTriggeredAt = now.toISOString();
      await jsonSaveSoon();
    }
  },

  // Telegram chat binding ───────────────────────────────────────────────────
  async setTgChat(userId, chatId) {
    if (usePg) {
      await pgPool.query(
        "INSERT INTO telegram_chats (user_id,chat_id) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET chat_id=EXCLUDED.chat_id",
        [userId, chatId],
      );
    } else {
      jsonDb.telegramChats[userId] = String(chatId);
      await jsonSaveSoon();
    }
  },

  async getTgChat(userId) {
    if (usePg) {
      const r = await pgPool.query("SELECT chat_id FROM telegram_chats WHERE user_id=$1", [userId]);
      return r.rows[0]?.chat_id ?? null;
    }
    return jsonDb.telegramChats[userId] ?? null;
  },

  // Daily digest preference (stored alongside the chat binding) ────────────
  async setDigestEnabled(userId, enabled) {
    if (usePg) {
      await pgPool.query("UPDATE telegram_chats SET digest_enabled=$2 WHERE user_id=$1", [userId, Boolean(enabled)]);
    } else {
      jsonDb.digestPrefs = jsonDb.digestPrefs || {};
      jsonDb.digestPrefs[userId] = Boolean(enabled);
      await jsonSaveSoon();
    }
  },

  async getDigestEnabled(userId) {
    if (usePg) {
      const r = await pgPool.query(
        "SELECT digest_enabled FROM telegram_chats WHERE user_id=$1",
        [userId],
      );
      return r.rows[0] ? r.rows[0].digest_enabled !== false : null;
    }
    return jsonDb.digestPrefs?.[userId] ?? null;
  },

  /** Chat ids of users who want the daily digest (with their tier). */
  async allDigestRecipients() {
    if (usePg) {
      const r = await pgPool.query(
        `SELECT t.user_id, t.chat_id, u.tier FROM telegram_chats t
         JOIN users u ON u.id = t.user_id WHERE t.digest_enabled = true`,
      );
      return r.rows.map((x) => ({ userId: x.user_id, chatId: x.chat_id, tier: x.tier ?? "free" }));
    }
    return Object.entries(jsonDb.telegramChats)
      .filter(([uid]) => jsonDb.digestPrefs?.[uid] !== false)
      .map(([uid, chatId]) => ({
        userId: uid,
        chatId,
        tier: jsonDb.users.find((u) => u.id === uid)?.tier ?? "free",
      }));
  },

  // Fund overrides (admin refresh pipeline) ────────────────────────────────
  async setFundOverrides(updates) {
    for (const u of updates) {
      const id = String(u.id || "").trim();
      if (!id || typeof u.yieldPct !== "number" || !isFinite(u.yieldPct)) continue;
      if (usePg) {
        await pgPool.query(
          `INSERT INTO fund_overrides (fund_id,yield_pct,as_of,note) VALUES ($1,$2,$3,$4)
           ON CONFLICT (fund_id) DO UPDATE SET yield_pct=EXCLUDED.yield_pct, as_of=EXCLUDED.as_of, note=EXCLUDED.note, updated_at=now()`,
          [id, u.yieldPct, u.asOf ?? null, u.note ?? null],
        );
      } else {
        jsonDb.fundOverrides[id] = { yieldPct: u.yieldPct, asOf: u.asOf ?? null, note: u.note ?? null, updatedAt: Date.now() };
      }
    }
    await jsonSaveSoon();
  },

  async getFundOverrides() {
    if (usePg) {
      const r = await pgPool.query("SELECT * FROM fund_overrides");
      const m = {};
      for (const o of r.rows) m[o.fund_id] = { yieldPct: o.yield_pct, asOf: o.as_of, note: o.note };
      return m;
    }
    return { ...jsonDb.fundOverrides };
  },

  // Pageview counters (privacy-friendly: paths + days only) ────────────────
  async bumpPageview(ppath) {
    const day = new Date().toISOString().split("T")[0];
    if (usePg) {
      await pgPool.query(
        `INSERT INTO pageviews (day,ppath,count) VALUES ($1,$2,1)
         ON CONFLICT (day,ppath) DO UPDATE SET count=pageviews.count+1`,
        [day, ppath],
      );
    } else {
      jsonDb.pageviews[day] = jsonDb.pageviews[day] || {};
      jsonDb.pageviews[day][ppath] = (jsonDb.pageviews[day][ppath] || 0) + 1;
      await jsonSaveSoon();
    }
  },

  async pageviewTotals(days = 30) {
    if (usePg) {
      const r = await pgPool.query(
        `SELECT ppath, SUM(count)::int AS total FROM pageviews
         WHERE day >= to_char(now() - ($1 || ' days')::interval, 'YYYY-MM-DD')
         GROUP BY ppath ORDER BY total DESC`,
        [String(days)],
      );
      return r.rows;
    }
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString().split("T")[0];
    const agg = {};
    for (const [day, paths] of Object.entries(jsonDb.pageviews)) {
      if (day < cutoff) continue;
      for (const [p, c] of Object.entries(paths)) agg[p] = (agg[p] || 0) + c;
    }
    return Object.entries(agg)
      .map(([ppath, total]) => ({ ppath, total }))
      .sort((a, b) => b.total - a.total);
  },

  // Market data cache (survives restarts) ─────────────────────────────────
  async getCache(key) {
    if (usePg) {
      const r = await pgPool.query("SELECT value_json FROM data_cache WHERE key=$1", [key]);
      return r.rows[0]?.value_json ?? null;
    }
    return jsonDb.dataCache?.[key] ?? null;
  },
  async getAllCache() {
    if (usePg) {
      const r = await pgPool.query("SELECT key, value_json FROM data_cache");
      const out = {};
      for (const row of r.rows) out[row.key] = row.value_json;
      return out;
    }
    return { ...(jsonDb.dataCache || {}) };
  },
  async setCache(key, value) {
    if (usePg) {
      await pgPool.query(
        `INSERT INTO data_cache (key, value_json, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
      return;
    }
    jsonDb.dataCache = jsonDb.dataCache || {};
    jsonDb.dataCache[key] = value;
    await jsonSaveSoon();
  },
};

export { j as noopAwait };
