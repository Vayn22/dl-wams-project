"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle,
  Copy,
  ScanLine,
  UploadCloud,
  X,
} from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import { usePatientData } from "@/context/PatientDataContext";
import AnnotationEditor from "@/components/doctor/AnnotationEditor";
import { listAiModelsApi, runAiModelApi } from "@/lib/api";

function normalizeSpecialty(value) {
  const s = (value || "").toLowerCase();
  if (s === "neurologist" || s === "neurologiste") return "neurologiste";
  if (s === "radiologist" || s === "radiologiste") return "radiologiste";
  if (s === "general" || s === "généraliste" || s === "generaliste") return "généraliste";
  return s;
}

export default function DoctorModelsPage() {
  const { currentUser } = useAuth();
  const { pushToast } = useToast();
  const { getPatientsData, addMriToPatient } = usePatientData();

  const specialty = normalizeSpecialty(currentUser?.specialty);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [textCase, setTextCase] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textResult, setTextResult] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");

  const myPatients = useMemo(
    () =>
      getPatientsData().filter(
        (p) => String(p.assignedDoctorId || "") === String(currentUser?.id || "")
      ),
    [currentUser, getPatientsData]
  );

  const imageModel = useMemo(
    () =>
      models.find((model) => /scan|image|vision|mri|radio/i.test(`${model.type} ${model.name}`)) ||
      models[0],
    [models]
  );

  const textModel = useMemo(
    () =>
      models.find((model) => /text|nlp|assist|symptom|diagnostic/i.test(`${model.type} ${model.name}`)) ||
      models[0],
    [models]
  );

  useEffect(() => {
    let mounted = true;
    async function loadModels() {
      setModelsLoading(true);
      setModelsError("");
      try {
        const data = await listAiModelsApi();
        if (!mounted) return;
        setModels(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setModels([]);
        setModelsError(err.message || "Impossible de charger les modèles IA.");
      } finally {
        if (mounted) setModelsLoading(false);
      }
    }

    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  if (modelsLoading) {
    return (
      <PageTransition className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <p className="text-slate-500">Chargement des modèles IA...</p>
      </PageTransition>
    );
  }

  if (modelsError) {
    return (
      <PageTransition className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-semibold text-slate-600">Modèles IA indisponibles</h1>
        <p className="mt-2 max-w-sm text-sm text-red-500">{modelsError}</p>
      </PageTransition>
    );
  }

  if (!models.length || (specialty === "radiologiste" || specialty === "généraliste")) {
    return (
      <PageTransition className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <Brain className="h-16 w-16 text-slate-300" />
        <h1 className="mt-4 text-2xl font-semibold text-slate-600">Aucun modèle IA disponible</h1>
        <p className="mt-2 max-w-sm text-slate-400">
          {"Votre spécialité ne dispose pas encore de modèles d'intelligence artificielle."}
        </p>
        <Button variant="outline" className="mt-4">
          {"Contacter l'administrateur"}
        </Button>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Modèles IA — Neurologie</h1>
        <p className="text-slate-500">{"Outils d'intelligence artificielle spécialisés en neurologie"}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between bg-gradient-to-r from-purple-600 to-purple-800 p-5">
          <div>
            <div className="flex items-center gap-3">
              <ScanLine className="h-7 w-7 text-white" />
              <h2 className="text-xl font-bold text-white">{imageModel?.name || "NeuroScan Vision"}</h2>
            </div>
            <p className="mt-2 text-sm text-purple-200">
              {imageModel?.description ||
                "Détection et localisation de tumeurs cérébrales par analyse d'image IRM"}
            </p>
          </div>
          <div className="text-right">
            <Badge className="border border-white/30 bg-white/20 text-white">Actif</Badge>
            <p className="mt-2 text-xs text-purple-200">{imageModel?.type || "vision"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 border-b border-purple-100 bg-purple-50 px-5 py-3 text-xs text-purple-700">
          <span>247 analyses ce mois</span>
          <span>Précision 94.2%</span>
          <span>IRM, CT Scan, Radiographie</span>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">1. Importer une image IRM</p>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:bg-slate-100">
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-2 text-sm text-slate-500">Glissez une image IRM ici</p>
              <p className="text-xs text-slate-400">ou cliquez pour sélectionner</p>
              <p className="mt-1 text-xs text-slate-300">JPEG, PNG, DICOM — max 20 Mo</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setImageUrl(URL.createObjectURL(file));
                  setShowResults(false);
                }}
              />
            </label>
            {imageUrl ? (
              <div className="mt-3">
                <img src={imageUrl} alt="preview" className="max-h-48 rounded-lg bg-slate-900 object-contain" />
                <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {imageFile?.name}
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImageUrl("");
                      setShowResults(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </div>
            ) : null}
          </div>

          {imageUrl ? (
            <Button
              className="w-full bg-purple-600 text-white hover:bg-purple-700"
              onClick={async () => {
                if (!imageModel || !imageFile) {
                  pushToast({
                    message: "Veuillez sélectionner une image à analyser.",
                    type: "error",
                  });
                  return;
                }
                setAnalysisLoading(true);
                try {
                  const payload = new FormData();
                  payload.append("model_id", imageModel.id);
                  payload.append("file", imageFile);
                  const result = await runAiModelApi(payload);
                  setAnalysisResult(
                    result?.result ||
                      result?.output ||
                      result?.prediction ||
                      result?.detail ||
                      JSON.stringify(result)
                  );
                  setShowResults(true);
                } catch (err) {
                  pushToast({
                    message: err.message || "Analyse image impossible.",
                    type: "error",
                  });
                } finally {
                  setAnalysisLoading(false);
                }
              }}
              disabled={analysisLoading}
            >
              <ScanLine className="h-4 w-4" />
              {analysisLoading ? "Analyse en cours..." : "2. Lancer l'analyse NeuroScan"}
            </Button>
          ) : null}

          {showResults ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle className="h-5 w-5" /> Analyse terminée</p>
              <div className="rounded-lg bg-purple-50 p-4">
                <p className="mb-2 text-sm font-semibold text-purple-800">{"Résultats de l'analyse :"}</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• {analysisResult || "Aucun détail retourné par le modèle."}</li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-red-100 text-red-700">Risque élevé</Badge>
                  <Badge className="bg-amber-100 text-amber-700">Suivi recommandé</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">Urgence: Non</Badge>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">{"Éditeur d'annotation"}</p>
                <AnnotationEditor
                  imageUrl={imageUrl}
                  patientList={myPatients}
                  onSave={(dataUrl, patientId) => {
                    const patient = myPatients.find((p) => p.id === patientId);
                    addMriToPatient(patientId, {
                      id: `mri-${Date.now()}`,
                      url: dataUrl,
                      date: new Date().toISOString().slice(0, 10),
                      isAnnotated: true,
                      annotatedUrl: dataUrl,
                    });
                    pushToast({
                      message: `Image annotée sauvegardée dans le dossier de ${patient ? `${patient.firstName} ${patient.lastName}` : "patient"}`,
                    });
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between bg-gradient-to-r from-slate-700 to-slate-900 p-5">
          <div>
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-white" />
              <h2 className="text-xl font-bold text-white">{textModel?.name || "NeuroText Assist"}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {textModel?.description ||
                "Aide au diagnostic différentiel et analyse des symptômes neurologiques"}
            </p>
          </div>
          <div className="text-right">
            <Badge className="border border-white/30 bg-white/20 text-white">Actif</Badge>
            <p className="mt-2 text-xs text-slate-400">{textModel?.type || "text"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <span>189 consultations ce mois</span>
          <span>Précision 91.5%</span>
          <span>Texte, Symptômes, Antécédents</span>
        </div>
        <div className="space-y-4 p-6">
          <p className="text-sm font-semibold text-slate-700">Décrire le cas clinique</p>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            placeholder="Ex: Patient de 52 ans présentant des céphalées persistantes depuis 3 semaines..."
            value={textCase}
            onChange={(e) => setTextCase(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {["Diagnostic différentiel", "Analyse des symptômes", "Recommandations thérapeutiques", "Interactions médicaments"].map((chip) => (
              <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{chip}</span>
            ))}
          </div>
          <Button
            className="w-full bg-slate-800 text-white hover:bg-slate-900"
            disabled={!textCase || textLoading}
            onClick={async () => {
              if (!textModel) {
                pushToast({
                  message: "Aucun modèle texte disponible.",
                  type: "error",
                });
                return;
              }
              setTextLoading(true);
              try {
                const result = await runAiModelApi({
                  model_id: textModel.id,
                  input: textCase,
                });
                setTextResult(
                  result?.result ||
                    result?.output ||
                    result?.prediction ||
                    result?.detail ||
                    JSON.stringify(result)
                );
              } catch (err) {
                pushToast({
                  message: err.message || "Analyse texte impossible.",
                  type: "error",
                });
              } finally {
                setTextLoading(false);
              }
            }}
          >
            <Brain className="h-4 w-4" /> {textLoading ? "Analyse en cours..." : "Analyser avec NeuroText"}
          </Button>
          {textResult ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Analyse NeuroText Assist</p>
                <Badge>AI</Badge>
              </div>
              <p className="text-sm text-slate-700">{textResult}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 px-2 py-1 text-xs text-emerald-700">IRM de confirmation</span>
                <span className="rounded-full border border-emerald-200 px-2 py-1 text-xs text-emerald-700">Consult neuro-ophtalmo</span>
                <span className="rounded-full border border-emerald-200 px-2 py-1 text-xs text-emerald-700">Suivi 7 jours</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(textResult);
                  pushToast({ message: "Analyse copiée" });
                }}
              >
                <Copy className="h-3 w-3" /> {"Copier l'analyse"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
}
