"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/constants";

const durations = [15, 30, 45, 60];
const types = ["Consultation", "Suivi", "Urgence", "Contrôle"];
const statuses = ["planifié", "confirmé", "annulé", "terminé"];

export default function AppointmentForm({
  open,
  editingAppointment,
  patients,
  onClose,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(
    editingAppointment || {
      patientId: "",
      patientName: "",
      date: "",
      time: "",
      duration: 30,
      type: "Consultation",
      status: "planifié",
      notes: "",
      location: "",
    }
  );

  const patientOptions = useMemo(() => {
    const q = searchPatient.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [patients, searchPatient]);

  if (!open) return null;

  const validate = () => {
    const nextErrors = {};
    if (!form.patientId) nextErrors.patientId = "Patient obligatoire";
    if (!form.date) nextErrors.date = "Date obligatoire";
    if (!form.time) nextErrors.time = "Heure obligatoire";
    if (!form.duration) nextErrors.duration = "Durée obligatoire";
    if (!form.type) nextErrors.type = "Type obligatoire";
    if (!form.status) nextErrors.status = "Statut obligatoire";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 className="font-semibold tracking-tight text-slate-900">
            {editingAppointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Patient*</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Rechercher un patient..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
              />
            </div>
            <div className="max-h-36 space-y-1 overflow-auto rounded-lg border border-slate-200 p-2">
              {patientOptions.map((p) => {
                const fullName = `${p.firstName} ${p.lastName}`;
                const selected = form.patientId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, patientId: p.id, patientName: fullName }))}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-all duration-200 ${
                      selected ? "bg-sky-100 text-sky-700" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600">
                      {getInitials(fullName)}
                    </span>
                    {fullName}
                  </button>
                );
              })}
            </div>
            {errors.patientId ? <p className="mt-1 text-xs text-red-500">{errors.patientId}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Date*</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
              {errors.date ? <p className="mt-1 text-xs text-red-500">{errors.date}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Heure*</label>
              <Input type="time" step="900" value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} />
              {errors.time ? <p className="mt-1 text-xs text-red-500">{errors.time}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Durée*</label>
              <select
                className="input-base border px-3 text-sm"
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: Number(e.target.value) }))}
              >
                {durations.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Type*</label>
              <select className="input-base border px-3 text-sm" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Statut*</label>
              <select className="input-base border px-3 text-sm" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Lieu</label>
            <Input
              placeholder="Ex: Cabinet 3, Salle d'examen 2..."
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400 uppercase tracking-wide">Notes</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
              placeholder="Informations complémentaires..."
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-[#1E3A5F] text-white hover:bg-[#162d4a]" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
