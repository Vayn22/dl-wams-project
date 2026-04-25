"use client";

import { useState } from "react";
import Image from "next/image";
import { Brain, Loader2, ScanLine, Stethoscope, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const configs = {
  neurologist: {
    title: "NeuroAI",
    icon: Brain,
    color: "text-purple-600",
    button: "bg-purple-600 hover:bg-purple-700",
    description: "Analyse des donnees neurologiques, detection de patterns EEG, aide au diagnostic des pathologies cerebrales.",
    features: ["Analyse EEG", "Detection tumeurs", "Prediction AVC", "Suivi cognitif"],
    stats: ["247 analyses ce mois", "v2.4.1", "Precision 94.2%"],
  },
  radiologist: {
    title: "RadioScan AI",
    icon: ScanLine,
    color: "text-sky-600",
    button: "bg-sky-500 hover:bg-sky-600",
    description: "Interpretation d'images medicales, detection d'anomalies radiologiques, rapport automatise.",
    features: ["Analyse IRM", "Scan CT", "Radiographie", "Rapport PDF"],
    stats: ["189 scans ce mois", "v1.8.3", "Precision 96.7%"],
  },
  general: {
    title: "MediAssist",
    icon: Stethoscope,
    color: "text-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
    description: "Assistant medical generaliste, aide au diagnostic differentiel, recommandations therapeutiques.",
    features: ["Diagnostic differentiel", "Ordonnances", "Interactions medicaments", "Suivi chronique"],
    stats: ["312 consultations ce mois", "v3.1.0", "Precision 91.5%"],
  },
};

export default function AIModelWidget({ specialty }) {
  const cfg = configs[specialty] || configs.general;
  const Icon = cfg.icon;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [image, setImage] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setShowResult(true);
    setLoading(false);
  };

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-4">
        <Icon className={`h-10 w-10 ${cfg.color}`} />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{cfg.title}</h2>
          <Badge variant="success">Actif</Badge>
        </div>
      </div>

      <p className="text-slate-600">{cfg.description}</p>
      <div className="flex flex-wrap gap-2">{cfg.features.map((item) => <Badge key={item}>{item}</Badge>)}</div>
      <div className="flex flex-wrap gap-5 border-b border-slate-200 pb-5 text-sm text-slate-500">{cfg.stats.map((item) => <span key={item}>{item}</span>)}</div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {specialty === "radiologist" ? "Telecharger l'image medicale" : "Decrire les symptomes du patient"}
        </p>

        {specialty === "radiologist" ? (
          <>
            <label className="block rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
              <UploadCloud className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">Cliquez pour selectionner une image</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImage(URL.createObjectURL(file));
                }}
              />
            </label>
            {image ? <Image src={image} alt="preview" width={128} height={128} unoptimized className="h-32 w-32 rounded-lg border border-slate-200 object-cover" /> : null}
            <Button className={cfg.button} onClick={runAnalysis} disabled={loading || !image}>{"Analyser l'image"}</Button>
          </>
        ) : (
          <>
            <textarea
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm"
              placeholder="Ex: Patient de 45 ans presentant des cephalees persistantes..."
            />
            <Button className={cfg.button} onClick={runAnalysis} disabled={loading || !input}>
              {specialty === "neurologist" ? "Analyser avec NeuroAI" : "Consulter MediAssist"}
            </Button>
          </>
        )}
      </div>

      {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : null}

      {showResult ? (
        <div className={`${specialty === "neurologist" ? "border-purple-100 bg-purple-50" : "border-slate-200 bg-slate-50"} rounded-xl border p-4`}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {specialty === "radiologist" ? "Rapport RadioScan AI" : specialty === "neurologist" ? "Analyse NeuroAI" : "Evaluation MediAssist"}
          </p>
          <p className="text-sm text-slate-700">
            {"Analyse preliminaire completee. Les indicateurs suggerent une priorite clinique moderee avec recommandation d'examens complementaires."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="warning">Risque modere</Badge>
            <Badge variant="sky">Controle recommande</Badge>
            <Badge variant="success">Suivi actif</Badge>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
