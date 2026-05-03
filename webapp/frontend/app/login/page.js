"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { BarChart3, Brain, Eye, EyeOff, Loader2, Lock, Plus, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isReady } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: { username: "", password: "" } });

  useEffect(() => {
    if (!isReady || !currentUser) return;
    router.push(currentUser.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard");
  }, [currentUser, isReady, router]);

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    setIsLoading(true);
    const user = await login(values.username, values.password);
    setIsLoading(false);

    if (!user) {
      setError("Identifiants invalides. Veuillez verifier vos informations.");
      return;
    }

    router.push(user.role === "admin" ? "/admin/dashboard" : "/doctor/dashboard");
  });

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-[#1E3A5F] p-16 md:flex">
        <div className="flex flex-col justify-center">
          <div className="mb-8 flex items-center gap-3">
            <Plus className="h-12 w-12 text-white" />
            <h1 className="text-4xl font-bold text-white">MediSync</h1>
          </div>
          <p className="mb-12 text-sky-200">La plateforme medicale intelligente</p>
          <div className="space-y-4 text-white/80">
            <div className="flex items-center gap-3"><Users className="h-5 w-5" /> Gestion complete des patients</div>
            <div className="flex items-center gap-3"><Brain className="h-5 w-5" /> IA medicale specialisee</div>
            <div className="flex items-center gap-3"><BarChart3 className="h-5 w-5" /> Analytiques en temps reel</div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-white px-6 md:w-1/2">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h2>
          <p className="mt-1 text-slate-500">Accedez a votre espace medical</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Nom d'utilisateur" {...register("username", { required: true })} />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 pr-9"
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                {...register("password", { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error ? <div className="text-sm text-red-500">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
