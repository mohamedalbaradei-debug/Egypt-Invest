import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import routes from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Basic request log
app.use((req, res, next) => {
  const t = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`);
  });
  next();
});

app.use("/api", routes);

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
app.listen(PORT, () => console.log(`Egypt Invest listening on :${PORT}`));