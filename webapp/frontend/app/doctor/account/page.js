"use client";

import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import PageTransition from "@/components/layout/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SPECIALTY_BADGE, SPECIALTY_LABELS, getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function DoctorAccountPage() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: currentUser?.name?.split(" ")[1] || "",
    lastName: currentUser?.name?.split(" ").slice(2).join(" ") || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const onSave = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsLoading(false);
    setSuccess(true);
  };

  return (
    <PageTransition className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="text-center">
        <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-700">
          {getInitials(currentUser?.name)}
        </div>
        <h2 className="text-xl font-semibold">{currentUser?.name}</h2>
        <Badge className={cn("mt-2", SPECIALTY_BADGE[currentUser?.specialty])}>{SPECIALTY_LABELS[currentUser?.specialty]}</Badge>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p className="flex items-center justify-center gap-2"><Mail className="h-4 w-4" /> {currentUser?.email}</p>
          <p className="flex items-center justify-center gap-2"><Phone className="h-4 w-4" /> {currentUser?.phone}</p>
        </div>
        <button className="mt-4 text-sm text-sky-600">Changer la photo</button>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="mb-4 font-semibold tracking-tight">Informations personnelles</h3>
        {success ? <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Profil mis a jour avec succes ✓</div> : null}
        <form className="space-y-4" onSubmit={onSave}>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} placeholder="Prenom" />
            <Input value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} placeholder="Nom" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
            <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Telephone" />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Specialite</p>
            <Badge className={cn(SPECIALTY_BADGE[currentUser?.specialty])}>{SPECIALTY_LABELS[currentUser?.specialty]}</Badge>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <h4 className="mb-3 font-semibold">Securite</h4>
            <div className="space-y-3">
              <Input type="password" placeholder="Mot de passe actuel" value={form.currentPassword} onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              <Input type="password" placeholder="Nouveau mot de passe" value={form.newPassword} onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
              <Input type="password" placeholder="Confirmer le mot de passe" value={form.confirmPassword} onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Enregistrement..." : "Enregistrer les modifications"}</Button>
        </form>
      </Card>
    </PageTransition>
  );
}
