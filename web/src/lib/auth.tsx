"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setUnauthorizedHandler, type User } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarUser: (u: User) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!getToken()) {
        if (vivo) setLoading(false);
        return;
      }
      try {
        const u = await api.me();
        if (vivo) setUser(u);
      } catch {
        // 401 ja tratado pelo cliente
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // token ja invalido: sai na mesma
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  const atualizarUser = useCallback((u: User) => setUser(u), []);

  const value = useMemo(
    () => ({ user, loading, login, logout, atualizarUser }),
    [user, loading, login, logout, atualizarUser],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
