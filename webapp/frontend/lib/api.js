const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

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

async function apiRequest(path, options = {}) {
  const { method = "GET", token, body, isFormData = false } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const raw = await response.text();
  const data = toJsonIfPossible(raw);

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      (Array.isArray(data) ? data.join(", ") : null) ||
      raw ||
      `API error (${response.status})`;
    throw new Error(message);
  }

  return data;
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
  return apiRequest("/api/users/login/", {
    method: "POST",
    body: { username, password },
  });
}

export async function meApi(token) {
  return apiRequest("/api/users/me/", { token });
}

export async function listDoctorsApi(token) {
  return apiRequest("/api/users/doctors/", { token });
}

export async function createDoctorApi(token, payload) {
  return apiRequest("/api/users/doctors/create/", { method: "POST", token, body: payload });
}

export async function updateDoctorApi(token, doctorId, payload) {
  return apiRequest(`/api/users/doctors/${doctorId}/update/`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteDoctorApi(token, doctorId) {
  return apiRequest(`/api/users/doctors/${doctorId}/delete/`, { method: "DELETE", token });
}

export async function listSpecialtiesApi(token) {
  return apiRequest("/api/users/specialties/", { token });
}

export async function listPatientsApi(token) {
  return apiRequest("/api/patients/", { token });
}

export async function createPatientApi(token, payload) {
  return apiRequest("/api/patients/create/", { method: "POST", token, body: payload });
}

export async function updatePatientApi(token, patientId, payload) {
  return apiRequest(`/api/patients/${patientId}/update/`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deletePatientApi(token, patientId) {
  return apiRequest(`/api/patients/${patientId}/delete/`, { method: "DELETE", token });
}

export async function uploadPatientFileApi(token, patientId, file, label = "") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("label", label || file?.name || "Fichier medical");
  return apiRequest(`/api/patients/${patientId}/files/upload/`, {
    method: "POST",
    token,
    body: formData,
    isFormData: true,
  });
}

export async function deletePatientFileApi(token, fileId) {
  return apiRequest(`/api/patients/files/${fileId}/delete/`, {
    method: "DELETE",
    token,
  });
}

export async function listAppointmentsApi(token) {
  return apiRequest("/api/patients/appointments/", { token });
}

export async function createAppointmentApi(token, payload) {
  return apiRequest("/api/patients/appointments/create/", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function updateAppointmentApi(token, appointmentId, payload) {
  return apiRequest(`/api/patients/appointments/${appointmentId}/update/`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export async function deleteAppointmentApi(token, appointmentId) {
  return apiRequest(`/api/patients/appointments/${appointmentId}/delete/`, {
    method: "DELETE",
    token,
  });
}
