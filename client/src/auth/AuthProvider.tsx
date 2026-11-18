import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserPublic } from "@tracker/shared";
import { api } from "../api.ts";

type AuthValue = {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  revalidate: () => Promise<boolean>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const revalidate = useCallback(async () => {
    try {
      const result = await api<{ user: UserPublic }>("/api/auth/me");
      setUser(result.user);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    revalidate().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [revalidate]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: UserPublic }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api<{ user: UserPublic }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, revalidate }),
    [user, loading, login, register, logout, revalidate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("auth missing");
  return value;
}
