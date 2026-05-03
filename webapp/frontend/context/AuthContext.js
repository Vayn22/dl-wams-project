"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthTokens, hasAccessToken, loginApi, meApi, specialtyToUiKey } from "@/lib/api";

const AuthContext = createContext(null);
const USER_STORAGE_KEY = "medisync_user";

function readStoredSession() {
  if (typeof window === "undefined") {
    return { user: null };
  }
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return { user: null };
  }
  try {
    const parsed = JSON.parse(raw);
    return { user: parsed || null };
  } catch {
    return { user: null };
  }
}

function resolveRole(groups = []) {
  const normalized = groups.map((group) => String(group || "").toLowerCase());
  if (normalized.includes("doctor")) return "doctor";
  return "admin";
}

function mapUser(user) {
  const groups = user.groups || [];
  return {
    id: String(user.id),
    name: user.username,
    email: user.email || "",
    role: resolveRole(groups),
    groups,
    specialty: specialtyToUiKey(user.specialty || ""),
  };
}

export function AuthProvider({ children }) {
  const stored = readStoredSession();
  const [currentUser, setCurrentUser] = useState(stored.user);
  const [token, setToken] = useState(hasAccessToken() ? "ready" : null);
  const [isReady, setIsReady] = useState(false);

  const persistUser = useCallback((nextUser) => {
    if (typeof window === "undefined") return;
    if (!nextUser) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      if (!hasAccessToken()) {
        if (isMounted) setIsReady(true);
        return;
      }
      try {
        const me = await meApi();
        const mappedUser = mapUser(me);
        if (isMounted) {
          setCurrentUser(mappedUser);
          setToken("ready");
          persistUser(mappedUser);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
          clearAuthTokens();
          persistUser(null);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [persistUser]);

  const login = useCallback(async (identifier, password) => {
    try {
      await loginApi(identifier.trim(), password);
      const me = await meApi();
      const mappedUser = mapUser(me || {});
      setCurrentUser(mappedUser);
      setToken("ready");
      persistUser(mappedUser);
      return mappedUser;
    } catch {
      return null;
    }
  }, [persistUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    clearAuthTokens();
    persistUser(null);
  }, [persistUser]);

  const value = useMemo(
    () => ({ currentUser, token, isReady, login, logout }),
    [currentUser, token, isReady, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
