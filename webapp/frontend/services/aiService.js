const AI_SERVICE_BASE_URL = (
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8001"
).replace(/\/$/, "");

function buildAIUrl(path) {
  const normalized = String(path).startsWith("/") ? path : `/${path}`;
  return `${AI_SERVICE_BASE_URL}${normalized}`;
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

  const headers = {};
  if (token && String(token).trim()) {
    headers.Authorization = `Bearer ${String(token).trim()}`;
  }

  const response = await fetch(buildAIUrl("/api/segment/"), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  const data = await response.json();
  if (!data?.mask || typeof data.mask !== "string") {
    throw new Error("Réponse de segmentation invalide: masque absent.");
  }
  return data.mask;
}
