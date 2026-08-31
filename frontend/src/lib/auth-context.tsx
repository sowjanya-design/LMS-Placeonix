"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, ApiError, isApiError } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The session lives in an httpOnly cookie set by the API — there's nothing
    // client-readable to check, so the only way to know if one exists is to
    // ask. A 401 here just means "not logged in", not an error to surface.
    api
      .get<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>("/auth/login", { email, password });
    setUser(data.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const data = await api.post<{ user: User }>("/auth/google", { credential });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // best-effort — clear local state regardless of whether the request succeeded
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError, isApiError };
