import React from "react";
import { Wallet, Plus, Trash2, BellRing, LogOut } from "lucide-react";
import { Card, SectionTitle, Stat, LoadState } from "@/components/ui";
import { useLang, fmtNum, fmtPct, pctColor, pick } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type Holding = {
  id: string;
  kind: "gold" | "usd" | "egx" | "fund";
  ref?: string | null;
  label?: string | null;
  qty: number;
  costEgp?: number | null;
  valueEgp?: number | null;
  valueUsd?: number | null;
  changePct?: number | null;
  estimateNote?: string | null;
};

type Totals = {
  totalEgp: number | null;
  totalUsd: number | null;
  totalChangePct: number | null;
};

const KIND_LABEL_KEYS = ["pf_kind_gold", "pf_kind_usd", "pf_kind_egx", "pf_kind_fund"] as const;

function AuthGate() {
  const { t } = useLang();
  const { login, register } = useAuth();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "login" ? await login(email, password) : await register(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "error");
  }

  return (
    <Card className="max-w-md mx-auto mt-10">
      <h2 className="text-lg font-bold text-slate-100 mb-4">{t("pf_login_title")}</h2>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder={t("pf_email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder={t("pf_password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button
          disabled={busy}
          className="w-full bg-gold-500 text-base-900 font-bold rounded-lg py-2 text-sm hover:bg-gold-400 transition-colors"
        >
          {mode === "login" ? t("pf_signin") : t("pf_signup")}
        </button>
      </form>
      <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-3 text-xs text-gold-300 hover:underline">
        {mode === "login" ? t("pf_no_account") : t("pf_have_account")}
      </button>
    </Card>
  );
}

function AddAssetForm({ onAdded }: { onAdded: () => void }) {
  const { t, lang } = useLang();
  const [kind, setKind] = React.useState<Holding["kind"]>("gold");
  const [qty, setQty] = React.useState("");
  const [ref, setRef] = React.useState("");
  const [costEgp, setCostEgp] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [funds, setFunds] = React.useState<{ id: string; en: string; ar: string }[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (kind === "fund") {
      fetch("/api/funds")
        .then((r) => r.json())
        .then((d) => setFunds((d.funds ?? []).filter((f: { type: string }) => f.type === "money-market")))
        .catch(() => {});
    }
  }, [kind]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        qty: Number(qty),
        ref: kind === "fund" ? ref : kind === "egx" ? ref.toUpperCase() : undefined,
        costEgp: costEgp ? Number(costEgp) : undefined,
        label: label || undefined,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr((await r.json().catch(() => ({}))).error ?? "error");
      return;
    }
    setQty("");
    setCostEgp("");
    setLabel("");
    onAdded();
  }

  return (
    <Card>
      <SectionTitle>{t("pf_add_title")}</SectionTitle>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(KIND_LABEL_KEYS as readonly string[]).map((k, i) => {
            const kinds: Holding["kind"][] = ["gold", "usd", "egx", "fund"];
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(kinds[i]);
                  setRef("");
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  kind === kinds[i]
                    ? "border-gold-500 bg-gold-500/10 text-gold-300"
                    : "border-base-600 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t(k as never)}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            required
            inputMode="decimal"
            placeholder={t("pf_qty")}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
          {kind === "egx" && (
            <input
              required
              placeholder={t("pf_ref") + " — COMI.CA"}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono uppercase"
            />
          )}
          {kind === "fund" && (
            <select
              required
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
            >
              <option value="">—</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {pick(f, lang)}
                </option>
              ))}
            </select>
          )}
          {(kind === "gold" || kind === "usd") && (
            <input
              placeholder={t("pf_label")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
            />
          )}
          <input
            inputMode="decimal"
            placeholder={t("pf_cost")}
            value={costEgp}
            onChange={(e) => setCostEgp(e.target.value)}
            className="bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-slate-100"
          />
        </div>

        {err && <div className="text-xs text-red-400">{err}</div>}
        <button
          disabled={busy}
          className="flex items-center gap-2 bg-gold-500 text-base-900 font-bold rounded-lg px-4 py-2 text-sm hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("pf_add")}
        </button>
      </form>
    </Card>
  );
}

function AlertsPanel() {
  const { t } = useLang();
  const { user } = useAuth();
  const [alerts, setAlerts] = React.useState<Array<{ id: string; direction: string; rate: number }>>([]);
  const [tgConfigured, setTgConfigured] = React.useState(false);
  const [chatId, setChatId] = React.useState("");
  const [direction, setDirection] = React.useState<"above" | "below">("above");
  const [rate, setRate] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!user) return;
    fetch("/api/alerts/fx")
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts ?? []);
        setTgConfigured(Boolean(d.telegramConfigured));
        setChatId(d.chatId ?? "");
      })
      .catch(() => {});
  }, [user]);

  React.useEffect(load, [load]);

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/alerts/fx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, rate: Number(rate) }),
    });
    if (r.ok) {
      setRate("");
      load();
    }
  }

  async function connectTg() {
    setMsg(null);
    const r = await fetch("/api/alerts/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
    });
    setMsg(r.ok ? "✓ Telegram connected" : "✗ send failed");
    if (r.ok) load();
  }

  if (!tgConfigured && alerts.length === 0) {
    return (
      <Card>
        <SectionTitle>{t("al_title")}</SectionTitle>
        <p className="text-xs text-slate-400 leading-relaxed">{t("al_howto")}</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>{t("al_title")}</SectionTitle>
      {!tgConfigured && <p className="text-xs text-amber-400 mb-3">{t("al_howto")}</p>}
      {alerts.length > 0 && (
        <ul className="space-y-2 mb-4">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between bg-base-700/60 rounded-lg px-3 py-2 text-sm">
              <span className="font-mono">
                USD/EGP {a.direction === "above" ? ">" : "<"}{" "}
                <b className="text-gold-300">{fmtNum(a.rate)}</b>
              </span>
              <button
                onClick={async () => {
                  await fetch(`/api/alerts/fx/${a.id}`, { method: "DELETE" });
                  load();
                }}
                className="text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={createAlert} className="flex flex-wrap gap-2 items-center">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "above" | "below")}
          className="bg-base-700 border border-base-600 rounded-lg px-2 py-1.5 text-xs text-slate-100"
        >
          <option value="above">{t("al_above")}</option>
          <option value="below">{t("al_below")}</option>
        </select>
        <input
          required
          inputMode="decimal"
          placeholder={t("al_rate")}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-24 bg-base-700 border border-base-600 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono"
        />
        <button className="flex items-center gap-1.5 bg-base-700 hover:bg-base-600 border border-base-600 rounded-lg px-3 py-1.5 text-xs font-bold text-gold-300">
          <BellRing className="w-3.5 h-3.5" /> {t("al_add")}
        </button>
      </form>
      {tgConfigured && (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <input
            placeholder={t("al_chat")}
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-36 bg-base-700 border border-base-600 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono"
          />
          <button onClick={connectTg} className="text-xs font-bold text-gold-300 hover:underline">
            {t("al_connect")}
          </button>
          {msg && <span className="text-xs text-slate-400">{msg}</span>}
        </div>
      )}
    </Card>
  );
}

export default function Portfolio() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const [data, setData] = React.useState<{
    rows: Holding[];
    totals: Totals;
    note?: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch("/api/portfolio")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user]);

  React.useEffect(load, [load]);

  if (!user) return <AuthGate />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gold-400" /> {t("pf_title")}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t("pf_sub")}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 font-mono">{user.email}</div>
          <button onClick={logout} className="text-xs text-slate-400 hover:text-gold-300 inline-flex items-center gap-1">
            <LogOut className="w-3 h-3" /> {t("pf_logout")}
          </button>
        </div>
      </div>

      {loading && <LoadState />}
      {error && !loading && <div className="card p-6 text-sm text-red-400">Error loading portfolio.</div>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <Stat label={t("pf_total_egp")} value={fmtNum(data.totals.totalEgp)} sub={`≈ $${fmtNum(data.totals.totalUsd)}`} />
            </Card>
            <Card>
              <Stat
                label={t("pf_total_usd")}
                value={`$${fmtNum(data.totals.totalUsd)}`}
                sub={t("pf_note_usd")}
              />
            </Card>
            <Card>
              <Stat
                label={t("pf_change")}
                value={
                  data.totals.totalChangePct != null ? fmtPct(data.totals.totalChangePct) : "—"
                }
                valueClass={pctColor(data.totals.totalChangePct)}
              />
            </Card>
          </div>

          <Card>
            {data.rows.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">{t("pf_empty")}</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-base-600">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">{t("pf_qty")}</th>
                      <th className="py-2 pr-3 font-medium">{t("pf_value")}</th>
                      <th className="py-2 pr-3 font-medium">{t("pf_change")}</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.id} className="border-b border-base-600/50 last:border-0">
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-slate-200">
                            {r.label || (r.kind === "fund" ? r.ref : t(`pf_kind_${r.kind}` as never))}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {r.kind === "egx" ? r.ref : r.kind}
                            {r.estimateNote && ` · ${t("pf_est")}: ${r.estimateNote}`}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">{fmtNum(r.qty)}</td>
                        <td className="py-2.5 pr-3 font-mono">
                          <div className="text-slate-100">{fmtNum(r.valueEgp)} ج.م</div>
                          <div className="text-xs text-slate-500">${fmtNum(r.valueUsd)}</div>
                        </td>
                        <td className={`py-2.5 pr-3 font-mono ${pctColor(r.changePct)}`}>
                          {r.costEgp ? fmtPct(r.changePct) : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            title={t("pf_delete")}
                            onClick={async () => {
                              await fetch(`/api/portfolio/${r.id}`, { method: "DELETE" });
                              load();
                            }}
                            className="text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.rows.some((r) => r.kind === "fund") && (
              <p className="text-[11px] text-slate-500 mt-3">{t("pf_fund_estimate")}</p>
            )}
          </Card>

          <AddAssetForm onAdded={load} />
          <AlertsPanel />

          {data.note && <p className="text-[11px] text-slate-500 max-w-3xl">{data.note}</p>}
        </>
      )}
    </div>
  );
}
