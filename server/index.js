import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import routes from "./routes.js";
import { initDb } from "./lib/db.js";
import { attachUser } from "./lib/auth.js";
import { startAlertLoop } from "./lib/notify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

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
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
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
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Egypt Invest listening on :${PORT} (storage: ${process.env.DATABASE_URL ? "postgres" : "json-file"})`);
      // Keep Render free instance awake + drive alert checks.
      const selfUrl = process.env.SELF_URL;
      if (selfUrl) {
        setInterval(() => fetch(`${selfUrl}/api/healthz`).catch(() => {}), 14 * 60_000);
      }
      startAlertLoop(async () => {
        try {
          return (await getFxData()).usdEgp;
        } catch {
          return null;
        }
      });
    });
  });