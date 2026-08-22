
## Deploy notes (Render)

- **Env-var changes need a manual redeploy** after editing env vars via
  Render dashboard/API (Dashboard → Manual Deploy, or POST /v1/services/.../deploys).
- Storage: Postgres (Neon `neondb`) when DATABASE_URL is set; JSON file at
  server/data/db.json otherwise (ephemeral on Render free).
