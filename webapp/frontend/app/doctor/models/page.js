"use client";

import Link from "next/link";
import { Brain, ScanLine, Stethoscope } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";

function StatusBadge({ available }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-sm">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: available ? "#38A169" : "#718096" }}
      />
      <span className="font-medium" style={{ color: available ? "#2A9D8F" : "#718096" }}>
        {available ? "Disponible" : "Bientôt disponible"}
      </span>
    </div>
  );
}

function SpecialtyCard({ icon: Icon, title, subtitle, available, href }) {
  const baseClass =
    "rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 min-h-[200px] flex flex-col";
  if (available && href) {
    return (
      <Link
        href={href}
        className={`${baseClass} cursor-pointer hover:shadow-md hover:-translate-y-[2px] hover:border-[#1A6B9A]`}
        style={{ borderColor: "#E2E8F0" }}
      >
        <Icon className="h-8 w-8" style={{ color: "#1A6B9A" }} />
        <h3 className="mt-5 text-lg font-semibold" style={{ color: "#1A202C" }}>
          {title}
        </h3>
        <p className="mt-2 text-sm" style={{ color: "#718096" }}>
          {subtitle}
        </p>
        <div className="mt-auto pt-6">
          <StatusBadge available />
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`${baseClass} cursor-not-allowed opacity-60 grayscale-[30%]`}
      style={{ borderColor: "#E2E8F0" }}
      aria-disabled="true"
    >
      <Icon className="h-8 w-8" style={{ color: "#1A6B9A" }} />
      <h3 className="mt-5 text-lg font-semibold" style={{ color: "#1A202C" }}>
        {title}
      </h3>
      <p className="mt-2 text-sm" style={{ color: "#718096" }}>
        {subtitle}
      </p>
      <div className="mt-auto pt-6">
        <StatusBadge available={false} />
      </div>
    </div>
  );
}

export default function DoctorModelsPage() {
  return (
    <PageTransition className="min-h-[75vh] rounded-2xl px-4 py-8 md:px-8" style={{ backgroundColor: "#F7FAFC" }}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold md:text-4xl" style={{ color: "#1A202C" }}>
            Intelligence Artificielle Médicale
          </h1>
          <p className="mt-3 text-sm md:text-base" style={{ color: "#718096" }}>
            Sélectionnez une spécialité pour commencer l'analyse
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <SpecialtyCard
            icon={Brain}
            title="Neurologie"
            subtitle="Segmentation IRM cérébrale"
            available
            href="/doctor/models/neurologie"
          />
          <SpecialtyCard
            icon={ScanLine}
            title="Radiologie"
            subtitle="Analyse d'imagerie thoracique"
            available={false}
          />
          <SpecialtyCard
            icon={Stethoscope}
            title="Médecine Générale"
            subtitle="Aide au diagnostic clinique"
            available={false}
          />
        </section>
      </div>
    </PageTransition>
  );
}
