"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const resolvedType =
      toast.type ||
      (toast.variant === "destructive" ? "error" : "success");
    setToasts((prev) => [
      ...prev,
      { duration: 3000, type: resolvedType, ...toast, id },
    ]);
    setTimeout(() => removeToast(id), toast.duration || 3000);
  }, [removeToast]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[70] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex min-w-[280px] items-start gap-2 rounded-lg border p-3 shadow-lg transition-all duration-200",
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
          >
            {toast.type === "error" ? <CircleAlert className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
