const AUTH_URL = (
  process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || "http://auth.localhost:8080"
).replace(/\/$/, "");
const PATIENT_URL = (
  process.env.NEXT_PUBLIC_PATIENT_SERVICE_URL || "http://patient.localhost:8080"
).replace(/\/$/, "");
const AI_URL = (
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://ai.localhost:8080"
).replace(/\/$/, "");
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

function computeAgeFromDate(dateValue) {
  if (!dateValue) return null;
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age > 0 ? age : null;
}

function toAbsoluteMediaUrl(value) {
  const raw = String(value || "");
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `${PATIENT_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
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

function buildUrl(path, baseUrl) {
  if (String(path).startsWith("http://") || String(path).startsWith("https://")) {
    return path;
  }
  const normalizedPath = String(path).startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
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
      const response = await fetch(buildUrl("/api/token/refresh/", AUTH_URL), {
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
    baseUrl = AUTH_URL,
  } = options;

  const headers = { ...customHeaders };
  const accessToken = getStoredToken(ACCESS_TOKEN_KEY);
  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path, baseUrl), {
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
        uploadedBy:
          file.uploaded_by != null
            ? String(file.uploaded_by)
            : file.uploaded_by_user_id != null
            ? String(file.uploaded_by_user_id)
            : null,
      }))
    : [];

  return {
    id: String(patient.id),
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    age: patient.age ?? "",
    gender: UI_GENDER_BY_API[patient.gender] || patient.gender,
    phone: patient.phone_number || "",
    email: "",
    address: patient.address || "",
    bloodType: patient.blood_type || "",
    assignedDoctorId: patient.assigned_doctor_ids?.length
      ? String(patient.assigned_doctor_ids[0])
      : "",
    diagnosis: patient.diagnosis || "",
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
  const doctorId =
    appointment.doctor_user_id != null
      ? String(appointment.doctor_user_id)
      : appointment.doctor != null
      ? String(appointment.doctor)
      : "";

  return {
    id: String(appointment.id),
    patientId: String(appointment.patient),
    patientName,
    doctorId,
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
  const computedAge = computeAgeFromDate(values.dateOfBirth);
  return {
    first_name: values.firstName,
    last_name: values.lastName,
    age: computedAge,
    date_of_birth: values.dateOfBirth,
    gender: API_GENDER_BY_UI[String(values.gender || "").trim().toLowerCase()] || "other",
    blood_type: values.bloodType || null,
    phone_number: values.phone,
    address: values.address || "",
    diagnosis: values.diagnosis || "",
    notes: values.notes || "",
    assigned_doctor_ids: doctorId ? [Number(doctorId)] : [],
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
  return get("/api/users/me/", { baseUrl: AUTH_URL });
}

export async function listDoctorsApi() {
  return get("/api/users/doctors/", { baseUrl: AUTH_URL });
}

export async function createDoctorApi(payload) {
  return post("/api/users/doctors/create/", payload, { baseUrl: AUTH_URL });
}

export async function updateDoctorApi(doctorId, payload) {
  return put(`/api/users/doctors/${doctorId}/update/`, payload, { baseUrl: AUTH_URL });
}

export async function deleteDoctorApi(doctorId) {
  return del(`/api/users/doctors/${doctorId}/delete/`, { baseUrl: AUTH_URL });
}

export async function listSpecialtiesApi() {
  return get("/api/users/specialties/", { baseUrl: AUTH_URL });
}

export async function listPatientsApi() {
  return get("/api/patients/", { baseUrl: PATIENT_URL });
}

export async function getPatientApi(patientId) {
  return get(`/api/patients/${patientId}/`, { baseUrl: PATIENT_URL });
}

export async function createPatientApi(payload) {
  return post("/api/patients/create/", payload, { baseUrl: PATIENT_URL });
}

export async function updatePatientApi(patientId, payload) {
  return put(`/api/patients/${patientId}/update/`, payload, { baseUrl: PATIENT_URL });
}

export async function deletePatientApi(patientId) {
  return del(`/api/patients/${patientId}/delete/`, { baseUrl: PATIENT_URL });
}

export async function uploadPatientFileApi(patientId, file, label = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("label", label || file?.name || "Fichier medical");
  return post(`/api/patients/${patientId}/files/upload/`, formData, {
    isFormData: true,
    baseUrl: PATIENT_URL,
  });
}

export async function deletePatientFileApi(fileId) {
  return del(`/api/patients/files/${fileId}/delete/`, { baseUrl: PATIENT_URL });
}

export async function listAppointmentsApi() {
  return get("/api/appointments/", { baseUrl: PATIENT_URL });
}

export async function createAppointmentApi(payload) {
  return post("/api/appointments/create/", payload, { baseUrl: PATIENT_URL });
}

export async function updateAppointmentApi(appointmentId, payload) {
  return put(`/api/appointments/${appointmentId}/update/`, payload, { baseUrl: PATIENT_URL });
}

export async function deleteAppointmentApi(appointmentId) {
  return del(`/api/appointments/${appointmentId}/delete/`, { baseUrl: PATIENT_URL });
}
