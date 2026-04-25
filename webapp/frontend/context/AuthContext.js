"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loginApi, meApi, specialtyToUiKey } from "@/lib/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "medisync_auth";

function readStoredSession() {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token || null,
      user: parsed?.user || null,
    };
  } catch {
    return { token: null, user: null };
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
  const [token, setToken] = useState(stored.token);
  const [isReady, setIsReady] = useState(false);

  const persistSession = useCallback((nextToken, nextUser) => {
    if (!nextToken || !nextUser) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser })
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      if (!token) {
        if (isMounted) setIsReady(true);
        return;
      }
      try {
        const me = await meApi(token);
        const mappedUser = mapUser(me);
        if (isMounted) {
          setCurrentUser(mappedUser);
          persistSession(token, mappedUser);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
          persistSession(null, null);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [token, persistSession]);

  const login = useCallback(async (identifier, password) => {
    try {
      const response = await loginApi(identifier.trim(), password);
      const mappedUser = mapUser(response.user || {});
      setCurrentUser(mappedUser);
      setToken(response.access_token);
      persistSession(response.access_token, mappedUser);
      return mappedUser;
    } catch {
      return null;
    }
  }, [persistSession]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    persistSession(null, null);
  }, [persistSession]);

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
