const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
let refreshPromise = null;

const UI_SPECIALTY_BY_NAME = {
  neurologist: "neurologist",
  neurology: "neurologist",
  neurologie: "neurologist",
  radiologist: "radiologist",
  radiology: "radiologist",
  radiologie: "radiologist",
  general: "general",
  generalist: "general",
  generaliste: "general",
};

const UI_GENDER_BY_API = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
};

const API_GENDER_BY_UI = {
  homme: "male",
  femme: "female",
  autre: "other",
  male: "male",
  female: "female",
  other: "other",
};

const UI_STATUS_BY_API = {
  scheduled: "planifié",
  completed: "terminé",
  cancelled: "annulé",
  expired: "terminé",
};

function toAbsoluteMediaUrl(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `${API_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function toJsonIfPossible(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function getStoredToken(key) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function setAuthTokens({ access, refresh }) {
  if (typeof window === "undefined") return;
  if (access) window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(getStoredToken(ACCESS_TOKEN_KEY));
}

function buildUrl(path) {
  if (String(path).startsWith("http://") || String(path).startsWith("https://")) {
    return path;
  }
  const normalizedPath = String(path).startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getErrorMessage(data, rawText, status) {
  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail) return String(data.detail);
  if (data?.message) return String(data.message);
  if (Array.isArray(data) && data.length) return data.join(", ");
  if (data && typeof data === "object") {
    const firstEntry = Object.values(data)[0];
    if (Array.isArray(firstEntry) && firstEntry.length) return String(firstEntry[0]);
    if (typeof firstEntry === "string") return firstEntry;
  }
  if (rawText?.trim()) return rawText;
  return `API error (${status})`;
}

async function refreshAccessToken() {
  const refresh = getStoredToken(REFRESH_TOKEN_KEY);
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/api/token/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });

      const raw = await response.text();
      const data = toJsonIfPossible(raw);
      if (!response.ok || !data?.access) {
        clearAuthTokens();
        throw new Error(getErrorMessage(data, raw, response.status));
      }

      setAuthTokens({ access: data.access });
      return data.access;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    isFormData = false,
    customHeaders = {},
    skipAuth = false,
    allowRefresh = true,
  } = options;

  const headers = { ...customHeaders };
  const accessToken = getStoredToken(ACCESS_TOKEN_KEY);
  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const raw = await response.text();
  const data = toJsonIfPossible(raw);

  if (response.status === 401 && !skipAuth && allowRefresh && getStoredToken(REFRESH_TOKEN_KEY)) {
    try {
      await refreshAccessToken();
      return apiRequest(path, { ...options, allowRefresh: false });
    } catch {
      clearAuthTokens();
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, raw, response.status));
  }

  return data;
}

export function get(path, options = {}) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function post(path, body, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "POST",
    body,
    isFormData: body instanceof FormData || options.isFormData,
  });
}

export function put(path, body, options = {}) {
  return apiRequest(path, {
    ...options,
    method: "PUT",
    body,
    isFormData: body instanceof FormData || options.isFormData,
  });
}

export function del(path, options = {}) {
  return apiRequest(path, { ...options, method: "DELETE" });
}

export function specialtyToUiKey(specialtyName = "") {
  return UI_SPECIALTY_BY_NAME[String(specialtyName).trim().toLowerCase()] || "general";
}

export function specialtyIdByUiKey(specialties, uiKey) {
  const target = String(uiKey || "").trim().toLowerCase();
  const candidates = Object.entries(UI_SPECIALTY_BY_NAME)
    .filter(([, value]) => value === target)
    .map(([name]) => name);

  const exact = specialties.find((item) =>
    candidates.includes(String(item.name || "").trim().toLowerCase())
  );
  return exact?.id ?? null;
}

export function apiDoctorToUi(doctor, specialtiesById = {}) {
  const specialtyName = specialtiesById[doctor.specialty]?.name || "";
  const specialty = specialtyToUiKey(specialtyName);
  return {
    id: String(doctor.id),
    name: `Dr. ${doctor.username}`,
    username: doctor.username,
    email: doctor.email || "",
    phone: "-",
    specialty,
    createdAt: null,
  };
}

export function apiPatientToUi(patient) {
  const medicalFiles = Array.isArray(patient.files)
    ? patient.files.map((file) => ({
        id: String(file.id),
        label: file.label || "Fichier medical",
        url: toAbsoluteMediaUrl(file.file),
        uploadedAt: file.uploaded_at || null,
        uploadedBy: file.uploaded_by ? String(file.uploaded_by) : null,
      }))
    : [];

  return {
    id: String(patient.id),
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    gender: UI_GENDER_BY_API[patient.gender] || patient.gender,
    phone: patient.phone_number || "",
    email: "",
    address: patient.address || "",
    bloodType: patient.blood_type || "",
    assignedDoctorId: patient.doctors?.length ? String(patient.doctors[0]) : "",
    diagnosis: "",
    notes: patient.notes || "",
    attachmentName: "",
    medicalFiles,
    // kept for compatibility with existing components
    mriImages: medicalFiles.map((file) => ({
      id: file.id,
      url: file.url,
      date: file.uploadedAt || new Date().toISOString(),
      isAnnotated: false,
      annotatedUrl: null,
      label: file.label,
    })),
    createdAt: patient.created_at || null,
    updatedAt: patient.updated_at || null,
  };
}

export function apiAppointmentToUi(appointment, patientsById = {}) {
  const date = new Date(appointment.date_time);
  const patient = patientsById[String(appointment.patient)];
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : `Patient #${appointment.patient}`;

  return {
    id: String(appointment.id),
    patientId: String(appointment.patient),
    patientName,
    doctorId: String(appointment.doctor),
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 16),
    duration: 30,
    type: "Consultation",
    status: UI_STATUS_BY_API[appointment.status] || "planifié",
    notes: appointment.notes || "",
    location: "",
  };
}

export function uiPatientToApi(values, doctorId) {
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    date_of_birth: values.dateOfBirth,
    gender: API_GENDER_BY_UI[String(values.gender || "").trim().toLowerCase()] || "other",
    blood_type: values.bloodType || null,
    phone_number: values.phone,
    address: values.address || "",
    notes: values.notes || values.diagnosis || "",
    doctors: doctorId ? [Number(doctorId)] : [],
  };
}

export function uiAppointmentToApi(values) {
  return {
    patient: Number(values.patientId),
    date_time: `${values.date}T${values.time}:00`,
    notes: values.notes || "",
  };
}

export async function loginApi(username, password) {
  const tokenResponse = await post(
    "/api/token/",
    { username, password },
    { skipAuth: true, allowRefresh: false }
  );

  if (!tokenResponse?.access || !tokenResponse?.refresh) {
    throw new Error("Réponse de connexion invalide.");
  }

  setAuthTokens({ access: tokenResponse.access, refresh: tokenResponse.refresh });
  return tokenResponse;
}

export async function meApi() {
  return get("/api/users/me/");
}

export async function listDoctorsApi() {
  return get("/api/users/doctors/");
}

export async function createDoctorApi(payload) {
  return post("/api/users/doctors/create/", payload);
}

export async function updateDoctorApi(doctorId, payload) {
  return put(`/api/users/doctors/${doctorId}/update/`, payload);
}

export async function deleteDoctorApi(doctorId) {
  return del(`/api/users/doctors/${doctorId}/delete/`);
}

export async function listSpecialtiesApi() {
  return get("/api/users/specialties/");
}

export async function listPatientsApi() {
  return get("/api/patients/");
}

export async function createPatientApi(payload) {
  return post("/api/patients/create/", payload);
}

export async function updatePatientApi(patientId, payload) {
  return put(`/api/patients/${patientId}/update/`, payload);
}

export async function deletePatientApi(patientId) {
  return del(`/api/patients/${patientId}/delete/`);
}

export async function uploadPatientFileApi(patientId, file, label = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("label", label || file?.name || "Fichier medical");
  return post(`/api/patients/${patientId}/files/upload/`, formData, { isFormData: true });
}

export async function deletePatientFileApi(fileId) {
  return del(`/api/patients/files/${fileId}/delete/`);
}

export async function listAppointmentsApi() {
  return get("/api/patients/appointments/");
}

export async function createAppointmentApi(payload) {
  return post("/api/patients/appointments/create/", payload);
}

export async function updateAppointmentApi(appointmentId, payload) {
  return put(`/api/patients/appointments/${appointmentId}/update/`, payload);
}

export async function deleteAppointmentApi(appointmentId) {
  return del(`/api/patients/appointments/${appointmentId}/delete/`);
}

export async function listAiModelsApi() {
  return get("/ai/models/");
}

export async function runAiModelApi(payload) {
  return post("/ai/run/", payload);
}
