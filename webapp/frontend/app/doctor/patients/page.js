"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import PatientForm from "@/components/doctor/PatientForm";
import PatientTable from "@/components/doctor/PatientTable";
import PageTransition from "@/components/layout/PageTransition";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import {
  apiPatientToUi,
  createPatientApi,
  deletePatientApi,
  listPatientsApi,
  uiPatientToApi,
  updatePatientApi,
} from "@/lib/api";

export default function PatientsPage() {
  const { currentUser, token } = useAuth();
  const { pushToast } = useToast();
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPatients() {
      if (!token || !currentUser) return;
      setLoading(true);
      setError("");
      try {
        const apiPatients = await listPatientsApi(token);
        if (!mounted) return;
        const uiPatients = apiPatients
          .map(apiPatientToUi)
          .filter(
            (patient) =>
              !patient.assignedDoctorId || patient.assignedDoctorId === String(currentUser.id)
          );
        setPatients(uiPatients);
      } catch (err) {
        if (mounted) setError(err.message || "Impossible de charger les patients.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPatients();
    return () => {
      mounted = false;
    };
  }, [token, currentUser]);

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(q));
  }, [query, patients]);

  const handleSave = async (payload) => {
    if (!token || !currentUser) return;
    let didSucceed = false;
    try {
      const apiPayload = uiPatientToApi(payload, currentUser.id);
      if (editingPatient) {
        const updated = await updatePatientApi(token, editingPatient.id, apiPayload);
        setPatients((prev) =>
          prev.map((item) =>
            item.id === editingPatient.id
              ? { ...apiPatientToUi(updated), attachmentName: payload.attachmentName || "" }
              : item
          )
        );
        pushToast({ message: "Patient mis a jour avec succes." });
        didSucceed = true;
      } else {
        const created = await createPatientApi(token, apiPayload);
        const next = apiPatientToUi(created);
        const nextWithAttachment = { ...next, attachmentName: payload.attachmentName || "" };
        setPatients((prev) => {
          const withoutDuplicate = prev.filter((item) => item.id !== nextWithAttachment.id);
          return [nextWithAttachment, ...withoutDuplicate];
        });
        pushToast({ message: "Patient ajoute avec succes." });
        didSucceed = true;
      }
    } catch (err) {
      pushToast({ message: err.message || "Operation impossible.", variant: "destructive" });
    }
    if (didSucceed) {
      setEditingPatient(null);
      setShowForm(false);
    }
  };

  return (
    <PageTransition className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mes Patients</h1>
          <Badge>{patients.length}</Badge>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher un patient..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button variant="accent" onClick={() => { setEditingPatient(null); setShowForm(true); }}>
            Ajouter un patient
          </Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">Chargement des patients...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <PatientTable
        patients={filteredPatients}
        onEdit={(patient) => {
          setEditingPatient(patient);
          setShowForm(true);
        }}
        onDelete={(patient) => setDeletingPatient(patient)}
      />

      <PatientForm
        key={editingPatient?.id || "new-patient"}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPatient(null);
        }}
        onSave={handleSave}
        editingPatient={editingPatient}
      />

      <AlertDialog open={!!deletingPatient} onOpenChange={() => setDeletingPatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce patient ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulerr</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!token || !deletingPatient) return;
                try {
                  await deletePatientApi(token, deletingPatient.id);
                  setPatients((prev) => prev.filter((item) => item.id !== deletingPatient.id));
                  pushToast({ message: "Patient supprime avec succes." });
                } catch (err) {
                  pushToast({ message: err.message || "Suppression impossible.", variant: "destructive" });
                }
                setDeletingPatient(null);
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
