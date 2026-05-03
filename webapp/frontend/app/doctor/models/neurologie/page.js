"use client";



import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import { ArrowLeft, CheckCircle, ScanLine, UploadCloud, X } from "lucide-react";

import PageTransition from "@/components/layout/PageTransition";

import { Button } from "@/components/ui/button";

import { useToast } from "@/components/ui/toast";

import { useAuth } from "@/context/AuthContext";

import { usePatientData } from "@/context/PatientDataContext";

import AnnotationEditor from "@/components/doctor/AnnotationEditor";

import { checkAIHealth, segmentImage } from "@/services/aiService";



function formatSegmentationError(err) {

  const message = String(err?.message || "");

  const lowered = message.toLowerCase();

  if (

    lowered.includes("given token not valid for any token type") ||

    lowered.includes("token not valid") ||

    lowered.includes("token is invalid") ||

    lowered.includes("unauthorized") ||

    lowered.includes("forbidden")

  ) {

    return "Acces non autorise - permission IA requise";

  }

  return message || "Erreur pendant l'analyse IA.";

}



async function dataUrlToPngFile(dataUrl, patientId) {

  const response = await fetch(dataUrl);

  const blob = await response.blob();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const safePatientId = String(patientId || "patient");

  return new File([blob], `annotation-${safePatientId}-${stamp}.png`, { type: "image/png" });

}

export default function NeurologiePage() {

  const { currentUser } = useAuth();

  const { pushToast } = useToast();

  const { getPatientsData, uploadMedicalFiles } = usePatientData();



  const [imageFile, setImageFile] = useState(null);

  const [imageUrl, setImageUrl] = useState("");

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [showResults, setShowResults] = useState(false);

  const [analysisResponse, setAnalysisResponse] = useState(null);

  const [analysisError, setAnalysisError] = useState("");

  const [aiHealthWarning, setAiHealthWarning] = useState("");



  const myPatients = useMemo(

    () =>

      getPatientsData().filter(

        (p) => String(p.assignedDoctorId || "") === String(currentUser?.id || "")

      ),

    [currentUser, getPatientsData]

  );



  useEffect(() => {

    let mounted = true;



    async function probeAiHealth() {

      try {

        const health = await checkAIHealth();

        if (!mounted) return;

        if (health?.status !== "ok") {

          setAiHealthWarning("Service IA temporairement indisponible");

        } else {

          setAiHealthWarning("");

        }

      } catch {

        if (mounted) {

          setAiHealthWarning("Service IA temporairement indisponible");

        }

      }

    }



    probeAiHealth();

    return () => {

      mounted = false;

    };

  }, []);



  return (

    <PageTransition

      className="space-y-6 rounded-2xl px-4 py-6 md:px-8"

      style={{ backgroundColor: "#F7FAFC" }}

    >

      <div className="flex items-center justify-between">

        <Link

          href="/doctor/models"

          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 hover:-translate-y-[1px]"

          style={{ borderColor: "#E2E8F0", color: "#1A6B9A", backgroundColor: "#FFFFFF" }}

        >

          <ArrowLeft className="h-4 w-4" />

          Neurologie

        </Link>

      </div>



      {aiHealthWarning ? (

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">

          {aiHealthWarning}

        </div>

      ) : null}



      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[45%_55%]">

        <section

          className="rounded-2xl border bg-white p-5 shadow-sm"

          style={{ borderColor: "#E2E8F0" }}

        >

          <div className="mb-4">

            <h1 className="text-xl font-semibold" style={{ color: "#1A202C" }}>

              Segmentation IRM cerebrale

            </h1>

            <p className="mt-1 text-sm" style={{ color: "#718096" }}>

              Importez une image puis lancez l'analyse.

            </p>

          </div>



          <label

            className="block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200"

            style={{ borderColor: "#E2E8F0", backgroundColor: "#EBF4FB" }}

          >

            <UploadCloud className="mx-auto h-10 w-10" style={{ color: "#1A6B9A" }} />

            <p className="mt-2 text-sm font-medium" style={{ color: "#1A202C" }}>

              Importer une image IRM

            </p>

            <p className="text-xs" style={{ color: "#718096" }}>

              JPEG, PNG, DICOM

            </p>

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

                setAnalysisResponse(null);

                setAnalysisError("");

              }}

            />

          </label>



          {imageUrl ? (

            <div className="mt-4">

              <img

                src={imageUrl}

                alt="Apercu IRM"

                className="max-h-56 w-full rounded-xl border object-contain"

                style={{ borderColor: "#E2E8F0", backgroundColor: "#0f172a" }}

              />

              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">

                {imageFile?.name}

                <button

                  onClick={() => {

                    setImageFile(null);

                    setImageUrl("");

                    setShowResults(false);

                    setAnalysisResponse(null);

                    setAnalysisError("");

                  }}

                >

                  <X className="h-3 w-3" />

                </button>

              </div>

            </div>

          ) : null}



          <Button

            className="mt-4 w-full text-white"

            style={{ backgroundColor: "#1A6B9A" }}

            onClick={async () => {

              if (!imageFile) {

                pushToast({

                  message: "Veuillez selectionner une image a analyser.",

                  type: "error",

                });

                return;

              }

              setAnalysisLoading(true);

              setAnalysisError("");

              try {

                const mask = await segmentImage(imageFile);

                setAnalysisResponse({ mask });

                setShowResults(true);

              } catch (err) {

                setAnalysisResponse(null);

                setShowResults(true);

                setAnalysisError(formatSegmentationError(err));

              } finally {

                setAnalysisLoading(false);

              }

            }}

            disabled={analysisLoading}

          >

            <ScanLine className="h-4 w-4" />

            {analysisLoading ? "Analyse en cours..." : "Lancer l'analyse"}

          </Button>

        </section>



        <section

          className="min-w-[420px] rounded-2xl border bg-white p-5 shadow-sm"

          style={{ borderColor: "#E2E8F0" }}

        >

          {showResults && analysisError ? (

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">

              {analysisError}

            </div>

          ) : null}



          {analysisResponse?.mask ? (

            <div className="space-y-4">

              <p className="inline-flex items-center gap-2 font-semibold" style={{ color: "#2A9D8F" }}>

                <CheckCircle className="h-5 w-5" /> Reponse IA recue

              </p>

              <div className="rounded-xl p-4" style={{ backgroundColor: "#EBF4FB" }}>

                <p className="mb-2 text-sm font-semibold" style={{ color: "#1A202C" }}>

                  Masque IA

                </p>

                <img

                  src={`data:image/png;base64,${analysisResponse.mask}`}

                  alt="Masque IA"

                  className="max-h-56 rounded-lg border object-contain"

                  style={{ borderColor: "#E2E8F0", backgroundColor: "#0f172a" }}

                />

                <p className="mt-3 text-xs" style={{ color: "#718096" }}>

                  Reponse brute: {"{ \"mask\": \"<base64_png>\" }"}

                </p>

              </div>



              <div>

                <p className="mb-3 text-sm font-semibold" style={{ color: "#1A202C" }}>

                  Editeur d'annotation

                </p>

                <AnnotationEditor

                  imageUrl={imageUrl}

                  patientList={myPatients}

                  onSave={async (dataUrl, patientId) => {

                    const patient = myPatients.find((p) => p.id === patientId);

                    try {

                      const annotatedFile = await dataUrlToPngFile(dataUrl, patientId);

                      await uploadMedicalFiles(patientId, [annotatedFile]);

                      pushToast({

                        message: `Image annotee sauvegardee dans les medical files de ${

                          patient ? `${patient.firstName} ${patient.lastName}` : "patient"

                        }`,

                      });
                      return true;

                    } catch (saveError) {

                      pushToast({

                        message: saveError?.message || "Impossible de sauvegarder l'image annotee.",

                        type: "error",

                      });
                      return false;

                    }

                  }}

                />

              </div>

            </div>

          ) : (

            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed p-6 text-center">

              <p className="text-sm" style={{ color: "#718096" }}>

                Le resultat IA et le canvas apparaitront ici apres l'analyse.

              </p>

            </div>

          )}

        </section>

      </div>

    </PageTransition>

  );

}

