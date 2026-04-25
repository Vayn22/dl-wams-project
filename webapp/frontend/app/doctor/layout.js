"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DoctorSidebar from "@/components/layout/DoctorSidebar";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/context/AuthContext";

export default function DoctorLayout({ children }) {
  const router = useRouter();
  const { currentUser, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!currentUser || currentUser.role !== "doctor") {
      router.push("/login");
    }
  }, [currentUser, isReady, router]);

  if (!isReady || !currentUser || currentUser.role !== "doctor") {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DoctorSidebar />
      <main className="ml-64 min-h-screen bg-[#F8FAFC]">
        <TopBar />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
