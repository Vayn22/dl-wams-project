"use client";

import { ChevronRight, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePatientData } from "@/context/PatientDataContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/constants";
import { getPageTitle } from "@/lib/medisync";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { patientsData } = usePatientData();
  const title = getPageTitle(pathname);

  const patientId = pathname.startsWith("/doctor/patients/") ? pathname.split("/").pop() : null;
  const currentPatient = patientId ? patientsData.find((item) => item.id === patientId) : null;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="font-semibold tracking-tight text-slate-900">{title}</h1>
        {currentPatient ? (
          <p className="mt-1 flex items-center text-sm text-slate-500">
            Patients <ChevronRight className="mx-1 h-4 w-4" /> {currentPatient.firstName} {currentPatient.lastName}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 transition-all duration-200 hover:bg-slate-100">
              <span className="text-sm text-slate-600">{currentUser?.name}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {getInitials(currentUser?.name)}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
