"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import AppointmentForm from "@/components/doctor/AppointmentForm";
import PageTransition from "@/components/layout/PageTransition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import {
  apiAppointmentToUi,
  apiPatientToUi,
  createAppointmentApi,
  deleteAppointmentApi,
  listAppointmentsApi,
  listPatientsApi,
  uiAppointmentToApi,
  updateAppointmentApi,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const statusList = ["planifié", "confirmé", "annulé", "terminé"];
const typeList = ["Consultation", "Suivi", "Urgence", "Contrôle"];

const statusStyle = {
  "planifié": "bg-amber-100 text-amber-700",
  "confirmé": "bg-emerald-100 text-emerald-700",
  "annulé": "bg-red-100 text-red-700",
  "terminé": "bg-slate-100 text-slate-600",
};

const typeStyle = {
  Consultation: "bg-sky-100 text-sky-700",
  Suivi: "bg-purple-100 text-purple-700",
  Urgence: "bg-red-100 text-red-700",
  Contrôle: "bg-amber-100 text-amber-700",
};

function formatLongDate(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function AppointmentsPage() {
  const { currentUser, token } = useAuth();
  const { pushToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailsAppointment, setDetailsAppointment] = useState(null);
  const [deletingAppointment, setDeletingAppointment] = useState(null);
  const [activeDayDialog, setActiveDayDialog] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!token || !currentUser) return;
      setLoading(true);
      setError("");
      try {
        const [apiPatients, apiAppointments] = await Promise.all([
          listPatientsApi(token),
          listAppointmentsApi(token),
        ]);
        const uiPatients = apiPatients.map(apiPatientToUi);
        const patientsById = Object.fromEntries(uiPatients.map((item) => [item.id, item]));
        const uiAppointments = apiAppointments
          .map((item) => apiAppointmentToUi(item, patientsById))
          .filter((item) => item.doctorId === String(currentUser.id));
        if (!mounted) return;
        setPatients(uiPatients);
        setAppointments(uiAppointments);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Impossible de charger les rendez-vous.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [token, currentUser]);

  const myPatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          !patient.assignedDoctorId || patient.assignedDoctorId === String(currentUser?.id)
      ),
    [patients, currentUser]
  );

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => (filterStatus === "all" ? true : a.status === filterStatus))
      .filter((a) => (filterType === "all" ? true : a.type === filterType))
      .filter((a) => a.patientName.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  }, [appointments, filterStatus, filterType, search]);

  const counts = useMemo(
    () => ({
      "planifié": appointments.filter((a) => a.status === "planifié").length,
      "confirmé": appointments.filter((a) => a.status === "confirmé").length,
      "annulé": appointments.filter((a) => a.status === "annulé").length,
      "terminé": appointments.filter((a) => a.status === "terminé").length,
    }),
    [appointments]
  );

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const weekDay = (monthStart.getDay() + 6) % 7;
  gridStart.setDate(monthStart.getDate() - weekDay);
  const days = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const today = new Date();

  const saveAppointment = async (payload) => {
    if (!token) return;
    try {
      const apiPayload = uiAppointmentToApi(payload);
      let saved;
      if (editingAppointment) {
        saved = await updateAppointmentApi(token, editingAppointment.id, apiPayload);
      } else {
        saved = await createAppointmentApi(token, apiPayload);
      }
      const patientMap = Object.fromEntries(myPatients.map((item) => [item.id, item]));
      const uiSaved = apiAppointmentToUi(saved, patientMap);
      setAppointments((prev) =>
        editingAppointment
          ? prev.map((item) => (item.id === editingAppointment.id ? uiSaved : item))
          : [uiSaved, ...prev]
      );
      pushToast({ message: "Rendez-vous enregistré" });
    } catch (err) {
      pushToast({ message: err.message || "Enregistrement impossible.", variant: "destructive" });
    }
    setEditingAppointment(null);
    setShowForm(false);
  };

  return (
    <PageTransition className="space-y-6">
      {loading ? <p className="text-sm text-slate-500">Chargement des rendez-vous...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rendez-vous</h1>
          <Badge className="bg-sky-100 text-sky-700">{appointments.length}</Badge>
        </div>
        <Button
          className="bg-[#1E3A5F] text-white hover:bg-[#162d4a]"
          onClick={() => {
            setEditingAppointment(null);
            setShowForm(true);
          }}
        >
          Ajouter un rendez-vous
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="h-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Planifiés</p>
            <div className="rounded-lg bg-amber-50 p-2"><CalendarClock className="h-4 w-4 text-amber-600" /></div>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">{counts["planifié"]}</p>
        </div>
        <div className="h-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Confirmés</p>
            <div className="rounded-lg bg-emerald-50 p-2"><CalendarCheck className="h-4 w-4 text-emerald-600" /></div>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">{counts["confirmé"]}</p>
        </div>
        <div className="h-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Annulés</p>
            <div className="rounded-lg bg-red-50 p-2"><CalendarX className="h-4 w-4 text-red-600" /></div>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">{counts["annulé"]}</p>
        </div>
        <div className="h-20 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Terminés</p>
            <div className="rounded-lg bg-slate-50 p-2"><CheckCircle className="h-4 w-4 text-slate-600" /></div>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">{counts["terminé"]}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-60">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Rechercher un patient..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex rounded-full bg-slate-100 p-1">
            <button onClick={() => setFilterStatus("all")} className={cn("rounded-full px-3 py-1 text-sm", filterStatus === "all" ? "bg-[#1E3A5F] text-white" : "text-slate-600")}>Tous</button>
            <button onClick={() => setFilterStatus("planifié")} className={cn("rounded-full px-3 py-1 text-sm", filterStatus === "planifié" ? "bg-[#1E3A5F] text-white" : "text-slate-600")}>Planifié</button>
            <button onClick={() => setFilterStatus("confirmé")} className={cn("rounded-full px-3 py-1 text-sm", filterStatus === "confirmé" ? "bg-[#1E3A5F] text-white" : "text-slate-600")}>Confirmé</button>
            <button onClick={() => setFilterStatus("annulé")} className={cn("rounded-full px-3 py-1 text-sm", filterStatus === "annulé" ? "bg-[#1E3A5F] text-white" : "text-slate-600")}>Annulé</button>
            <button onClick={() => setFilterStatus("terminé")} className={cn("rounded-full px-3 py-1 text-sm", filterStatus === "terminé" ? "bg-[#1E3A5F] text-white" : "text-slate-600")}>Terminé</button>
          </div>
          <select className="input-base w-44 border px-3 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tous les types</option>
            {typeList.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setView("list")} className={cn("rounded-lg p-2", view === "list" ? "bg-[#1E3A5F] text-white" : "border border-slate-200 bg-white text-slate-500")}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setView("calendar")} className={cn("rounded-lg p-2", view === "calendar" ? "bg-[#1E3A5F] text-white" : "border border-slate-200 bg-white text-slate-500")}>
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filtered.length ? (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="p-3">Patient</th>
                    <th className="p-3">Date & Heure</th>
                    <th className="p-3">Durée</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Lieu</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {item.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                          <span className="font-medium text-slate-800">{item.patientName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-slate-700">{formatLongDate(item.date)}</p>
                        <p className="text-xs text-slate-500">{item.time}</p>
                      </td>
                      <td className="p-3 text-slate-600">{item.duration} min</td>
                      <td className="p-3"><span className={cn("rounded-full px-2 py-1 text-xs", typeStyle[item.type])}>{item.type}</span></td>
                      <td className="p-3 text-slate-600">{item.location || "-"}</td>
                      <td className="p-3"><span className={cn("rounded-full px-2 py-1 text-xs", statusStyle[item.status])}>{item.status}</span></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailsAppointment(item)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => { setEditingAppointment(item); setShowForm(true); }} className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-50"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => setDeletingAppointment(item)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">Statut</button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {statusList.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() =>
                                    setAppointments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status } : a)))
                                  }
                                >
                                  Marquer comme {status}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-end gap-2 p-3">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>Previous</Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button key={i} variant={safePage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setPage(i + 1)}>{i + 1}</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <CalendarX className="mb-2 h-12 w-12 text-slate-300" />
              <p className="font-medium text-slate-500">Aucun rendez-vous trouvé</p>
              <p className="text-sm text-slate-400">Ajustez vos filtres ou ajoutez un nouveau rendez-vous.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="text-lg font-semibold text-slate-800">{selectedDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
              <button onClick={() => setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <Button variant="outline" onClick={() => setSelectedDate(new Date())}>{"Aujourd'hui"}</Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs uppercase text-slate-400">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const dayItems = filtered.filter((a) => sameDay(new Date(`${a.date}T00:00:00`), day));
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setActiveDayDialog(day)}
                  className={cn("min-h-28 cursor-pointer rounded-lg border border-slate-100 p-1 text-left hover:bg-slate-50", !isCurrentMonth && "bg-slate-50 text-slate-300")}
                >
                  <span className={cn("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium", sameDay(day, today) ? "bg-[#1E3A5F] text-white" : day < today ? "text-slate-400" : "text-slate-700")}>
                    {day.getDate()}
                  </span>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((a) => (
                      <div key={a.id} className={cn("truncate rounded px-1.5 py-0.5 text-xs", a.status === "planifié" && "bg-amber-100 text-amber-700", a.status === "confirmé" && "bg-sky-100 text-sky-700", a.status === "annulé" && "bg-red-100 text-red-700 line-through", a.status === "terminé" && "bg-slate-100 text-slate-600")}>
                        {a.time} {a.patientName}
                      </div>
                    ))}
                    {dayItems.length > 3 ? <div className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">+{dayItems.length - 3} autres</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AppointmentForm
        open={showForm}
        editingAppointment={editingAppointment}
        patients={myPatients}
        onClose={() => {
          setShowForm(false);
          setEditingAppointment(null);
        }}
        onSave={saveAppointment}
      />

      <Dialog open={!!detailsAppointment} onOpenChange={() => setDetailsAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du rendez-vous</DialogTitle>
            <DialogDescription>Lecture seule</DialogDescription>
          </DialogHeader>
          {detailsAppointment ? (
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-500">Patient:</span> {detailsAppointment.patientName}</p>
              <p><span className="text-slate-500">Date:</span> {formatLongDate(detailsAppointment.date)}</p>
              <p><span className="text-slate-500">Heure:</span> {detailsAppointment.time}</p>
              <p><span className="text-slate-500">Durée:</span> {detailsAppointment.duration} min</p>
              <p><span className="text-slate-500">Type:</span> {detailsAppointment.type}</p>
              <p><span className="text-slate-500">Statut:</span> {detailsAppointment.status}</p>
              <p><span className="text-slate-500">Lieu:</span> {detailsAppointment.location || "-"}</p>
              <p><span className="text-slate-500">Notes:</span> {detailsAppointment.notes || "-"}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeDayDialog} onOpenChange={() => setActiveDayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rendez-vous du jour</DialogTitle>
            <DialogDescription>
              {activeDayDialog
                ? activeDayDialog.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(activeDayDialog
              ? filtered.filter((a) => sameDay(new Date(`${a.date}T00:00:00`), activeDayDialog))
              : []
            ).map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                <p className="font-medium text-slate-800">{a.patientName}</p>
                <p className="text-xs text-slate-500">{a.time} · {a.type}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAppointment} onOpenChange={() => setDeletingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rendez-vous ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!token || !deletingAppointment) return;
                try {
                  await deleteAppointmentApi(token, deletingAppointment.id);
                  setAppointments((prev) => prev.filter((a) => a.id !== deletingAppointment.id));
                } catch (err) {
                  pushToast({ message: err.message || "Suppression impossible.", variant: "destructive" });
                } finally {
                  setDeletingAppointment(null);
                }
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
