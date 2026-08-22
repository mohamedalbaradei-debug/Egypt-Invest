import React from "react";

export type User = { id: string; email: string } | null;

type AuthCtx = {
  user: User;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const Ctx = React.createContext<AuthCtx>(null as unknown as AuthCtx);

async function post(path: string, body?: unknown) {
  const r = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const { status, data } = await post("/auth/login", { email, password });
    if (status === 200 && data.user) {
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "error" };
  }, []);

  const register = React.useCallback(async (email: string, password: string) => {
    const { status, data } = await post("/auth/register", { email, password });
    if (status === 200 && data.user) {
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "error" };
  }, []);

  const logout = React.useCallback(async () => {
    await post("/auth/logout");
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return React.useContext(Ctx);
}
