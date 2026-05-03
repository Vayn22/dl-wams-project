"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, ScanLine, Stethoscope, UserCheck } from "lucide-react";
import DoctorTable from "@/components/admin/DoctorTable";
import PageTransition from "@/components/layout/PageTransition";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  apiDoctorToUi,
  apiPatientToUi,
  listDoctorsApi,
  listPatientsApi,
  listSpecialtiesApi,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const [apiDoctors, apiPatients, specialties] = await Promise.all([
          listDoctorsApi(),
          listPatientsApi(),
          listSpecialtiesApi(),
        ]);
        const specialtiesById = Object.fromEntries(
          specialties.map((item) => [item.id, item])
        );

        if (!mounted) return;
        setDoctors(apiDoctors.map((doctor) => apiDoctorToUi(doctor, specialtiesById)));
        setPatients(apiPatients.map(apiPatientToUi));
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Impossible de charger les données.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const metrics = useMemo(
    () => [
      {
        label: "Total Medecins",
        value: doctors.length,
        icon: UserCheck,
        bg: "bg-sky-50",
        color: "text-sky-600",
      },
      {
        label: "Neurologistes",
        value: doctors.filter((d) => d.specialty === "neurologist").length,
        icon: Brain,
        bg: "bg-purple-50",
        color: "text-purple-600",
      },
      {
        label: "Radiologistes",
        value: doctors.filter((d) => d.specialty === "radiologist").length,
        icon: ScanLine,
        bg: "bg-sky-50",
        color: "text-sky-600",
      },
      {
        label: "Generalistes",
        value: doctors.filter((d) => d.specialty === "general").length,
        icon: Stethoscope,
        bg: "bg-emerald-50",
        color: "text-emerald-600",
      },
    ],
    [doctors]
  );

  return (
    <PageTransition className="space-y-6">
      {loading ? <p className="text-sm text-slate-500">Chargement des donnees...</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
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
              <p className="text-2xl font-semibold">{metric.value}</p>
            </Card>
          );
        })}
      </div>
      <DoctorTable doctors={doctors} patients={patients} onEdit={() => {}} onDelete={() => {}} />
    </PageTransition>
  );
}
