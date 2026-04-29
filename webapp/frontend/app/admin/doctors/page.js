"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import DoctorForm from "@/components/admin/DoctorForm";
import DoctorTable from "@/components/admin/DoctorTable";
import PageTransition from "@/components/layout/PageTransition";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import {
  apiDoctorToUi,
  apiPatientToUi,
  createDoctorApi,
  deleteDoctorApi,
  listDoctorsApi,
  listPatientsApi,
  listSpecialtiesApi,
  specialtyIdByUiKey,
  updateDoctorApi,
} from "@/lib/api";

const filters = [
  { key: "all", label: "All" },
  { key: "neurologist", label: "Neurologiste" },
  { key: "radiologist", label: "Radiologiste" },
  { key: "general", label: "Generaliste" },
];

export default function AdminDoctorsPage() {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [deletingDoctor, setDeletingDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [apiDoctors, apiPatients, apiSpecialties] = await Promise.all([
        listDoctorsApi(),
        listPatientsApi(),
        listSpecialtiesApi(),
      ]);
      const specialtiesById = Object.fromEntries(
        apiSpecialties.map((item) => [item.id, item])
      );
      setSpecialties(apiSpecialties);
      setDoctors(apiDoctors.map((doctor) => apiDoctorToUi(doctor, specialtiesById)));
      setPatients(apiPatients.map(apiPatientToUi));
    } catch (err) {
      setError(err.message || "Impossible de charger les medecins.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const bySpecialty = filterSpecialty === "all" ? true : doctor.specialty === filterSpecialty;
      const bySearch = doctor.name.toLowerCase().includes(search.toLowerCase()) || doctor.email.toLowerCase().includes(search.toLowerCase());
      return bySpecialty && bySearch;
    });
  }, [doctors, filterSpecialty, search]);

  const onSave = async (values) => {
    if (!token) return;
    try {
      const specialtyId = specialtyIdByUiKey(specialties, values.specialty);
      const basePayload = {
        username: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        specialty: specialtyId,
      };

      if (editingDoctor) {
        await updateDoctorApi(editingDoctor.id, {
          ...basePayload,
          ...(values.password ? { password: values.password } : {}),
        });
        pushToast({ message: "Medecin mis a jour avec succes." });
      } else {
        await createDoctorApi({
          ...basePayload,
          password: values.password,
        });
        pushToast({ message: "Medecin ajoute avec succes." });
      }
      await loadData();
    } catch (err) {
      pushToast({ message: err.message || "Operation impossible.", variant: "destructive" });
    }
    setEditingDoctor(null);
    setShowForm(false);
  };

  return (
    <PageTransition className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Gestion des Medecins</h1>
          <Badge>{doctors.length}</Badge>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <div className="flex rounded-full bg-slate-100 p-1">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterSpecialty(filter.key)}
                className={`rounded-full px-3 py-1 text-sm transition-all duration-200 ${filterSpecialty === filter.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="accent" onClick={() => { setEditingDoctor(null); setShowForm(true); }}>
            Ajouter un medecin
          </Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Chargement des medecins...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <DoctorTable doctors={filteredDoctors} patients={patients} onEdit={(doctor) => { setEditingDoctor(doctor); setShowForm(true); }} onDelete={(doctor) => setDeletingDoctor(doctor)} />

      <DoctorForm open={showForm} onClose={() => { setShowForm(false); setEditingDoctor(null); }} onSave={onSave} editingDoctor={editingDoctor} />

      <AlertDialog open={!!deletingDoctor} onOpenChange={() => setDeletingDoctor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voulez-vous vraiment supprimer {deletingDoctor?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!token || !deletingDoctor) return;
                try {
                  await deleteDoctorApi(deletingDoctor.id);
                  await loadData();
                  pushToast({ message: "Medecin supprime avec succes." });
                } catch (err) {
                  pushToast({ message: err.message || "Suppression impossible.", variant: "destructive" });
                }
                setDeletingDoctor(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
