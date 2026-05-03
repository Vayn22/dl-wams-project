"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Eye,
  FileImage,
  ImageOff,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Trash2,
  Upload,
} from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { usePatientData } from "@/context/PatientDataContext";
import {
  apiAppointmentToUi,
  apiPatientToUi,
  deletePatientApi,
  getPatientApi,
  listAppointmentsApi,
} from "@/lib/api";
import { calculateAge, getInitials } from "@/lib/medisync";

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fileRef = useRef(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const { pushToast } = useToast();
  const { token, currentUser } = useAuth();
  const { getPatientsData, uploadMedicalFiles, deleteMedicalFile, loading, error } = usePatientData();
  const [appointments, setAppointments] = useState([]);
  const [fetchedPatient, setFetchedPatient] = useState(null);
  const patientId = String(params?.id || "");
  const patient = useMemo(() => {
    const cached = getPatientsData().find((item) => String(item.id) === patientId);
    return cached || fetchedPatient;
  }, [patientId, getPatientsData, fetchedPatient]);
  const doctor = useMemo(() => {
    if (!patient || !currentUser) return null;
    if (String(currentUser.id) !== String(patient.assignedDoctorId)) return null;
    return { name: `Dr. ${currentUser.name}` };
  }, [patient, currentUser]);
  const nextAppointment = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patient?.id && a.status !== "annulé" && new Date(a.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))[0],
    [appointments, patient]
  );

  useEffect(() => {
    let mounted = true;

    async function loadPatientById() {
      if (!token || !patientId) return;
      try {
        const apiPatient = await getPatientApi(patientId);
        if (!mounted) return;
        setFetchedPatient(apiPatientToUi(apiPatient));
      } catch {
        if (!mounted) return;
        setFetchedPatient(null);
      }
    }

    async function loadRelatedData() {
      if (!token) return;
      try {
        const apiAppointments = await listAppointmentsApi();
        const patientsById = Object.fromEntries(getPatientsData().map((item) => [item.id, item]));
        const appointmentsData = apiAppointments.map((item) => apiAppointmentToUi(item, patientsById));
        if (!mounted) return;
        setAppointments(appointmentsData);
      } catch {
        if (!mounted) return;
        setAppointments([]);
      }
    }

    loadPatientById();
    loadRelatedData();
    return () => {
      mounted = false;
    };
  }, [token, patientId, getPatientsData]);

  if (!patient) {
    if (loading) {
      return <div className="card-surface">Chargement du patient...</div>;
    }
    return <div className="card-surface">{error || "Patient introuvable."}</div>;
  }

  const mriImages = patient.medicalFiles || [];
  const isLightboxImage = lightboxImage ? /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lightboxImage.url) : false;

  return (
    <PageTransition className="space-y-6">
      <div className="text-sm text-slate-500">
        <Link href="/doctor/patients" className="hover:underline">Patients</Link> &gt; {patient.firstName} {patient.lastName}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#1E3A5F] text-2xl font-bold text-white">
            {getInitials(`${patient.firstName} ${patient.lastName}`)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.firstName} {patient.lastName}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{calculateAge(patient.dateOfBirth)} ans</Badge>
              <Badge>{patient.gender}</Badge>
              <Badge>{patient.bloodType || "-"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              <p className="flex items-center gap-1"><Phone className="h-4 w-4" /> {patient.phone}</p>
              <p className="flex items-center gap-1"><Mail className="h-4 w-4" /> {patient.email || "-"}</p>
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {patient.address || "-"}</p>
          </div>

          <div className="ml-auto flex flex-col items-end gap-2">
            <Button variant="outline"><Pencil className="h-4 w-4" /> Modifier</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Supprimer</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce patient ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      try {
                        await deletePatientApi(patient.id);
                        pushToast({ message: "Patient supprimé avec succès." });
                        router.push("/doctor/patients");
                      } catch (deleteError) {
                        pushToast({
                          message: deleteError.message || "Suppression impossible.",
                          type: "error",
                        });
                      }
                    }}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {patient.attachmentName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                <Paperclip className="h-3 w-3" /> {patient.attachmentName}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Informations médicales</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Diagnostic</p>
                <p className="text-sm text-slate-800">{patient.diagnosis || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Médecin assigné</p>
                <p className="text-sm text-slate-800">{doctor?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{"Date d'enregistrement"}</p>
                <p className="text-sm text-slate-800">{new Date(patient.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Groupe sanguin</p>
                <Badge>{patient.bloodType || "-"}</Badge>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="text-sm text-slate-800">{patient.notes || "Aucune note"}</p>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Galerie IRM</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-sky-100 text-sky-700">{mriImages.length}</Badge>
                <Button variant="accent" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Ajouter des images
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    try {
                      await uploadMedicalFiles(patient.id, files);
                      pushToast({ message: "Fichier(s) medical(aux) ajoute(s) avec succes." });
                    } catch (uploadError) {
                      pushToast({
                        message: uploadError.message || "Impossible de televerser le fichier.",
                        variant: "destructive",
                      });
                    } finally {
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            </div>

            {mriImages.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {mriImages.map((img) => (
                  <div key={img.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="relative aspect-square bg-slate-900">
                      {/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(img.url) ? (
                        <img src={img.url} alt={img.label || "medical file"} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <FileImage className="h-10 w-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setLightboxImage(img)} className="rounded-full bg-white/20 p-2 text-white"><Eye className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2">
                      <div>
                        <p className="text-xs text-slate-500">{new Date(img.uploadedAt || Date.now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        <span className="max-w-[180px] truncate text-xs text-slate-700">{img.label || "Fichier medical"}</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await deleteMedicalFile(img.id);
                            pushToast({ message: "Fichier supprime avec succes." });
                          } catch (deleteError) {
                            pushToast({
                              message: deleteError.message || "Suppression impossible.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ImageOff className="mb-2 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">Aucune image IRM disponible</p>
                <Button variant="outline" className="mt-3" onClick={() => fileRef.current?.click()}>Ajouter des images</Button>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Historique</h3>
            <div className="relative ml-2 border-l-2 border-slate-100 pl-4">
              {[
                ["Enregistrement du dossier", "05/01/2026"],
                ["Consultation initiale", "12/01/2026"],
                ["Résultat d'analyse reçu", "18/01/2026"],
                ["Mise à jour du diagnostic", "22/01/2026"],
              ].map(([label, date]) => (
                <div key={label} className="relative mb-5">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-sky-400" />
                  <p className="text-xs text-slate-400">{date}</p>
                  <p className="text-sm text-slate-700">{label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Prochain rendez-vous</h3>
            {nextAppointment ? (
              <div className="space-y-2 text-sm">
                <p className="text-lg font-bold text-[#1E3A5F]">
                  {new Date(nextAppointment.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                </p>
                <p className="text-slate-600">{nextAppointment.time}</p>
                <div className="flex gap-2">
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{nextAppointment.type}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{nextAppointment.status}</span>
                </div>
                <p className="text-slate-500">{nextAppointment.location}</p>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm text-slate-500">Aucun rendez-vous planifié</p>
                <Link href="/doctor/appointments">
                  <Button variant="outline">Prendre un RDV</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxImage ? isLightboxImage ? (
            <img src={lightboxImage.url} alt={lightboxImage.label || "Medical file"} className="h-auto w-full rounded-lg bg-black object-contain" />
          ) : (
            <div className="space-y-3 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-600">Apercu indisponible pour ce type de fichier.</p>
              <a href={lightboxImage.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-600 hover:underline">
                Ouvrir le fichier dans un nouvel onglet
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
