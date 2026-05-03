export const SPECIALTY_LABELS = {
  neurologist: "Neurologiste",
  radiologist: "Radiologiste",
  general: "Généraliste",
};

export const SPECIALTY_BADGE = {
  neurologist: "bg-purple-100 text-purple-700",
  radiologist: "bg-sky-100 text-sky-700",
  general: "bg-emerald-100 text-emerald-700",
};

export function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR");
}
