import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_COOKIE = "ei_sid";

// ── Password hashing (node:crypto scrypt — no dependencies) ─────────────────

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  try {
    const hash = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, "hex");
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}`,
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

// ── Middleware ──────────────────────────────────────────────────────────────

/** Populates req.user ({id,email}) when a valid session cookie is present. */
export async function attachUser(req, _res, next) {
  req.user = null;
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) req.user = await db.getSessionUser(token);
    req.sessionToken = token;
  } catch (err) {
    console.error("[auth] attachUser failed", err);
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth_required" });
  next();
}
