import { SPECIALTY_BADGE, SPECIALTY_LABELS, getInitials } from "@/lib/constants";

export { SPECIALTY_BADGE, SPECIALTY_LABELS, getInitials };

export function getPageTitle(pathname) {
  if (pathname.startsWith("/doctor/dashboard")) return "Tableau de bord";
  if (pathname.startsWith("/doctor/patients/")) return "Dossier patient";
  if (pathname.startsWith("/doctor/patients")) return "Patients";
  if (pathname.startsWith("/doctor/models")) return "Modeles IA";
  if (pathname.startsWith("/doctor/account")) return "Mon compte";
  if (pathname.startsWith("/admin/dashboard")) return "Tableau de bord";
  if (pathname.startsWith("/admin/doctors")) return "Gestion des medecins";
  return "MediSync";
}

export function getPatientById(id, patients = []) {
  return patients.find((patient) => patient.id === id);
}

export function calculateAge(dateString) {
  const dob = new Date(dateString);
  const diff = Date.now() - dob.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}
