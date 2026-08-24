import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import routes from "./routes.js";
import { initDb, db } from "./lib/db.js";
import { attachUser } from "./lib/auth.js";
import { startAlertLoop } from "./lib/notify.js";
import { startDigestLoop } from "./lib/digest.js";
import { getGoldData, getFxData, warmMarketCache } from "./lib/market.js";
import { valuePortfolio } from "./lib/portfolio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Gzip all JSON responses — keeps the full market payload (incl. OHLC + full
// series) fast to transfer without stripping any data.
app.use(compression());
app.use(express.json());

// Simple in-memory rate limiter (per IP) for auth + analytics endpoints.
const hits = new Map();
setInterval(() => hits.clear(), 60_000).unref();
function rateLimit(maxPerMin) {
  return (req, res, next) => {
    const key = `${req.ip}:${Math.floor(Date.now() / 60_000)}`;
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    if (n > maxPerMin) return res.status(429).json({ error: "rate_limited" });
    next();
  };
}

// Basic request log
app.use((req, res, next) => {
  const t = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`);
  });
  next();
});

app.use("/api", rateLimit(240), attachUser, routes);

// Serve the built client (production), with SPA fallback.
const clientDist = path.join(__dirname, "../client/dist");
if (fs.existsSync(clientDist)) {
  // Hashed asset bundles are immutable; the HTML shell must always revalidate
  // so a fresh deploy never serves a stale pre-deploy page referencing old JS.
  app.use(
    express.static(clientDist, {
      immutable: true,
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (_req, res) =>
    res
      .status(200)
      .send("Egypt Invest API is running. Build the client with `npm --prefix client run build`.")
  );
}

const PORT = process.env.PORT || 3000;

initDb()
  .catch((err) => console.error("[db] init failed — running degraded:", err.message))
  .then(async () => {
    // Load last-good market snapshots from the DB into memory BEFORE we start
    // listening, so the very first request after a deploy is served instantly
    // instead of waiting for Yahoo to re-warm.
    await warmMarketCache();
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Egypt Invest listening on :${PORT} (storage: ${process.env.DATABASE_URL ? "postgres" : "json-file"})`);
      // Keep Render free instance awake + drive alert checks.
      const selfUrl = process.env.SELF_URL;
      if (selfUrl) {
        setInterval(() => fetch(`${selfUrl}/api/healthz`).catch(() => {}), 14 * 60_000);
      }
      // Daily net-worth snapshot for every user that has holdings.
      // Runs hourly; upserts today's row so the chart always ends at "now".
      async function snapshotAll() {
        try {
          const userIds = await db.listUserIdsWithHoldings();
          if (userIds.length === 0) return;
          const [gold, fx] = await Promise.all([getGoldData(), getFxData()]);
          const day = new Date().toISOString().slice(0, 10);
          for (const userId of userIds) {
            try {
              const { totals } = await valuePortfolio(userId, {
                fxRate: fx.usdEgp,
                gram24k: gold.gram24k,
              });
              await db.upsertSnapshot(userId, day, totals.totalEgp, totals.totalUsd);
            } catch (e) {
              console.error("[snapshots] user failed", e.message);
            }
          }
        } catch (err) {
          console.error("[snapshots] failed", err.message);
        }
      }
      setTimeout(() => void snapshotAll(), 45_000);
      setInterval(() => void snapshotAll(), 60 * 60_000).unref();

      startAlertLoop();
      startDigestLoop();
    });
  });