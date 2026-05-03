"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { segmentImage } from "@/services/aiService";

export function useSegmentation(imageFile) {
  const { token } = useAuth();
  const [maskBase64, setMaskBase64] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSegmentation = useCallback(
    async (fileOverride = null) => {
      const fileToSegment = fileOverride || imageFile;
      if (!fileToSegment) {
        setError("Veuillez sélectionner une image à analyser.");
        return null;
      }

      const contextToken = token && token !== "ready" ? token : null;
      const storedToken =
        typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
      const jwtToken = contextToken || storedToken || "";

      setIsLoading(true);
      setError(null);
      try {
        let mask = null;
        try {
          mask = await segmentImage(fileToSegment, jwtToken);
        } catch (err) {
          // En mode test (AllowAny), un token invalide peut provoquer 401.
          // On retente sans header Authorization.
          if ((err?.status === 401 || err?.status === 403) && jwtToken) {
            mask = await segmentImage(fileToSegment);
          } else {
            throw err;
          }
        }
        setMaskBase64(mask);
        return mask;
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          setError("Accès non autorisé — permission IA requise");
        } else if (err?.status >= 500) {
          setError("Service IA indisponible, veuillez réessayer.");
        } else if (err?.message) {
          setError(err.message);
        } else {
          setError("Erreur réseau lors de l'analyse IA.");
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [imageFile, token]
  );

  const reset = useCallback(() => {
    setMaskBase64(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { runSegmentation, maskBase64, isLoading, error, reset };
}
