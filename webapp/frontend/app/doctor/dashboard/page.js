"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, CalendarDays, CalendarPlus, ClipboardList, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageTransition from "@/components/layout/PageTransition";
import { useAuth } from "@/context/AuthContext";
import { apiAppointmentToUi, apiPatientToUi, listAppointmentsApi, listPatientsApi } from "@/lib/api";

export default function DoctorDashboardPage() {
  const { currentUser, token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token || !currentUser) return;
      setLoading(true);
      setError("");
      try {
        const [apiPatients, apiAppointments] = await Promise.all([
          listPatientsApi(token),
          listAppointmentsApi(token),
        ]);
        const patientsData = apiPatients.map(apiPatientToUi);
        const patientsById = Object.fromEntries(patientsData.map((item) => [item.id, item]));
        const appointmentsData = apiAppointments
          .map((item) => apiAppointmentToUi(item, patientsById))
          .filter((item) => item.doctorId === String(currentUser.id));

        if (!mounted) return;
        setPatients(
          patientsData.filter(
            (patient) =>
              !patient.assignedDoctorId || patient.assignedDoctorId === String(currentUser.id)
          )
        );
        setAppointments(appointmentsData);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Impossible de charger le tableau de bord.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token, currentUser]);

  const monthlyData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    const counts = new Map();

    appointments.forEach((item) => {
      const monthKey = item.date.slice(0, 7);
      counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([monthKey, value]) => {
        const monthDate = new Date(`${monthKey}-01T00:00:00`);
        return {
          month: formatter.format(monthDate),
          value,
        };
      });
  }, [appointments]);

  const monthStartIso = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return monthStart.toISOString().slice(0, 10);
  }, []);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const metrics = useMemo(
    () => [
      {
        label: "Total Patients",
        value: patients.length,
        icon: Users,
        bg: "bg-sky-50",
        color: "text-sky-600",
      },
      {
        label: "Ce mois",
        value: appointments.filter((item) => item.date >= monthStartIso).length,
        icon: CalendarPlus,
        bg: "bg-emerald-50",
        color: "text-emerald-600",
      },
      {
        label: "En attente",
        value: appointments.filter((item) => item.status === "planifié").length,
        icon: ClipboardList,
        bg: "bg-amber-50",
        color: "text-amber-600",
      },
      {
        label: "Analyses IA",
        value: appointments.filter((item) => item.status === "terminé").length,
        icon: Brain,
        bg: "bg-purple-50",
        color: "text-purple-600",
      },
    ],
    [patients, appointments, monthStartIso]
  );

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "annulé" && a.date >= todayIso)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 4),
    [appointments, todayIso]
  );

  return (
    <PageTransition className="space-y-6">
      {loading ? <p className="text-sm text-slate-500">Chargement du tableau de bord...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <div className={`rounded-lg p-2 ${metric.bg}`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
              <p className="text-xs text-emerald-600">+12% ce mois</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <h3 className="mb-4 font-semibold tracking-tight text-slate-900">Evolution des consultations</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
                <Area type="monotone" dataKey="value" stroke="#0EA5E9" fill="url(#colorGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Prochains rendez-vous</h3>
            <Link href="/doctor/appointments" className="text-xs text-sky-500 hover:underline">Voir tout →</Link>
          </div>
          {upcoming.length ? (
            <div>
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-0">
                  <div className="min-w-[40px] text-center">
                    <p className="text-lg font-bold text-[#1E3A5F]">{new Date(item.date).getDate()}</p>
                    <p className="text-xs uppercase text-slate-400">
                      {new Date(item.date).toLocaleDateString("fr-FR", { month: "short" })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{item.patientName}</p>
                    <p className="text-xs text-slate-500">{item.time} · {item.type}</p>
                  </div>
                  <Badge className={item.status === "confirmé" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{item.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <CalendarDays className="mx-auto mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm text-slate-400">Aucun rendez-vous à venir</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight text-slate-900">Patients recents</h3>
          <Link href="/doctor/patients" className="text-sm text-sky-600">Voir tous -&gt;</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2">Nom</th>
              <th className="pb-2">Diagnostic</th>
              <th className="pb-2">Date</th>
              <th className="pb-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {patients.slice(0, 5).map((patient) => (
              <tr key={patient.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                <td className="py-3">{patient.firstName} {patient.lastName}</td>
                <td className="py-3">{patient.diagnosis || "-"}</td>
                <td className="py-3">{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString("fr-FR") : "-"}</td>
                <td className="py-3"><Badge variant="sky">Actif</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </PageTransition>
  );
}
