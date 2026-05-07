const AI_SERVICE_BASE_URL = (
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://ai.localhost:8080"
).replace(/\/$/, "");
const AUTH_SERVICE_BASE_URL = (
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://auth.localhost:8080"
).replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

function buildAIUrl(path) {
  const normalized = String(path).startsWith("/") ? path : `/${path}`;
  return `${AI_SERVICE_BASE_URL}${normalized}`;
}

function getStoredToken(key) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function setStoredAccessToken(value) {
  if (typeof window === "undefined" || !value) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, value);
}

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function parseErrorResponse(response) {
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const message =
    parsed?.detail ||
    parsed?.error ||
    parsed?.message ||
    raw ||
    `Erreur AI (${response.status})`;
  const error = new Error(message);
  error.status = response.status;
  throw error;
}

async function refreshAiAccessToken() {
  const refresh = getStoredToken(REFRESH_TOKEN_KEY);
  if (!refresh) return null;

  const response = await fetch(`${AUTH_SERVICE_BASE_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.access) {
    clearStoredTokens();
    return null;
  }

  setStoredAccessToken(parsed.access);
  return parsed.access;
}

export async function checkAIHealth() {
  const response = await fetch(buildAIUrl("/api/health/"), {
    method: "GET",
  });
  if (!response.ok) {
    await parseErrorResponse(response);
  }
  return response.json();
}

export async function segmentImage(imageFile, token) {
  if (!imageFile) {
    throw new Error("Aucun fichier image fourni pour la segmentation.");
  }

  const formData = new FormData();
  formData.append("image", imageFile);

  async function postSegment(jwtToken) {
    const headers = {};
    if (jwtToken && String(jwtToken).trim()) {
      headers.Authorization = `Bearer ${String(jwtToken).trim()}`;
    }

    return fetch(buildAIUrl("/api/segment/"), {
      method: "POST",
      headers,
      body: formData,
    });
  }

  const initialToken = token || getStoredToken(ACCESS_TOKEN_KEY) || "";
  let response = await postSegment(initialToken);

  if (response.status === 401 && getStoredToken(REFRESH_TOKEN_KEY)) {
    const renewed = await refreshAiAccessToken();
    if (renewed) {
      response = await postSegment(renewed);
    }
  }

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const data = await response.json();
  if (!data?.mask || typeof data.mask !== "string") {
    throw new Error("Réponse de segmentation invalide: masque absent.");
  }
  return data.mask;
}
