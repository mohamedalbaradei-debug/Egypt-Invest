// Tier limits — every gate in the app reads from here so flipping the
// paywall later is an env-var change, not a code change.
// Free defaults are intentionally generous while the product grows; tighten
// via env when subscriptions go live (FREE_*/PREMIUM_*).
const num = (k, d) => {
  const v = process.env[k];
  return v === undefined || v === "" || !isFinite(Number(v)) ? d : Number(v);
};

export const TIERS = {
  free: {
    alerts: num("FREE_ALERT_LIMIT", 3),
    goals: num("FREE_GOAL_LIMIT", 5),
    holdings: num("FREE_HOLDING_LIMIT", 50),
    watchlist: num("FREE_WATCHLIST_LIMIT", 20),
    analysesPerDay: num("FREE_ANALYSES_PER_DAY", 10),
    snapshotDays: num("FREE_SNAPSHOT_DAYS", 30),
  },
  premium: {
    alerts: num("PREMIUM_ALERT_LIMIT", 500),
    goals: num("PREMIUM_GOAL_LIMIT", 100),
    holdings: num("PREMIUM_HOLDING_LIMIT", 500),
    watchlist: num("PREMIUM_WATCHLIST_LIMIT", 200),
    analysesPerDay: num("PREMIUM_ANALYSES_PER_DAY", 200),
    snapshotDays: num("PREMIUM_SNAPSHOT_DAYS", 3650),
  },
};

/** Daily cap for anonymous /analyze traffic (per IP). */
export const ANON_ANALYSES_PER_DAY = num("ANON_ANALYSES_PER_DAY", 3);

export function tierOf(user) {
  return user?.tier === "premium" ? "premium" : "free";
}

export function limitsFor(user) {
  return TIERS[tierOf(user)];
}

/** Standard 403 payload consumed by the client to show quota UI. */
export function quotaPayload(used, max) {
  return { error: "quota_reached", quota: { used, max } };
}
