"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listPatientsApi, apiPatientToUi, uploadPatientFileApi, deletePatientFileApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PatientDataContext = createContext(null);

export function PatientDataProvider({ children }) {
  const { token } = useAuth();
  const [patientsData, setPatientsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshPatients = useCallback(async () => {
    if (!token) {
      setPatientsData([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const apiPatients = await listPatientsApi(token);
      setPatientsData(apiPatients.map(apiPatientToUi));
    } catch (err) {
      setError(err.message || "Impossible de charger les patients.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  const getPatientsData = useCallback(() => patientsData, [patientsData]);

  const uploadMedicalFiles = useCallback(
    async (patientId, files) => {
      if (!token || !files?.length) return;

      await Promise.all(
        files.map((file) =>
          uploadPatientFileApi(token, patientId, file, file.name)
        )
      );
      await refreshPatients();
    },
    [token, refreshPatients]
  );

  const deleteMedicalFile = useCallback(
    async (fileId) => {
      if (!token || !fileId) return;
      await deletePatientFileApi(token, fileId);
      await refreshPatients();
    },
    [token, refreshPatients]
  );

  const addMriToPatient = useCallback((patientId, mriObject) => {
    setPatientsData((prev) =>
      prev.map((patient) =>
        patient.id === patientId
          ? { ...patient, mriImages: [...(patient.mriImages || []), mriObject] }
          : patient
      )
    );
  }, []);

  const deleteMriFromPatient = useCallback((patientId, mriId) => {
    setPatientsData((prev) =>
      prev.map((patient) =>
        patient.id === patientId
          ? { ...patient, mriImages: (patient.mriImages || []).filter((img) => img.id !== mriId) }
          : patient
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      patientsData,
      loading,
      error,
      refreshPatients,
      getPatientsData,
      uploadMedicalFiles,
      deleteMedicalFile,
      addMriToPatient,
      deleteMriFromPatient,
    }),
    [
      patientsData,
      loading,
      error,
      refreshPatients,
      getPatientsData,
      uploadMedicalFiles,
      deleteMedicalFile,
      addMriToPatient,
      deleteMriFromPatient,
    ]
  );

  return <PatientDataContext.Provider value={value}>{children}</PatientDataContext.Provider>;
}

export function usePatientData() {
  const context = useContext(PatientDataContext);
  if (!context) {
    throw new Error("usePatientData must be used within PatientDataProvider");
  }
  return context;
}
