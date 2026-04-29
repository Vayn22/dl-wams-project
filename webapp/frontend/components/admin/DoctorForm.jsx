"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  specialty: "",
  password: "",
  confirmPassword: "",
};

export default function DoctorForm({ open, onClose, onSave, editingDoctor }) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, reset, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  useEffect(() => {
    if (editingDoctor) {
      const split = editingDoctor.name.replace("Dr. ", "").split(" ");
      reset({
        firstName: split[0] || "",
        lastName: split.slice(1).join(" "),
        email: editingDoctor.email,
        phone: editingDoctor.phone,
        specialty: editingDoctor.specialty,
        password: "",
        confirmPassword: "",
      });
    } else {
      reset(defaultValues);
    }
  }, [editingDoctor, reset, open]);

  if (!open) return null;

  const submit = handleSubmit(async (values) => {
    setIsLoading(true);
    try {
      await onSave(values);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5">
          <h2 className="font-semibold tracking-tight text-slate-900">
            {editingDoctor ? "Modifier le medecin" : "Ajouter un medecin"}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input placeholder="Prenom*" {...register("firstName", { required: "Champ obligatoire" })} />
              {errors.firstName ? <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p> : null}
            </div>
            <div>
              <Input placeholder="Nom*" {...register("lastName", { required: "Champ obligatoire" })} />
              {errors.lastName ? <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="Email*"
                {...register("email", {
                  required: "Champ obligatoire",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Format email invalide" },
                })}
              />
              {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email.message}</p> : null}
            </div>
            <div>
              <Input placeholder="Telephone*" {...register("phone", { required: "Champ obligatoire" })} />
              {errors.phone ? <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p> : null}
            </div>
          </div>

          {!editingDoctor ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input placeholder="Mot de passe*" type="password" {...register("password", { required: "Champ obligatoire" })} />
                {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password.message}</p> : null}
              </div>
              <div>
                <Input
                  placeholder="Confirmer le mot de passe*"
                  type="password"
                  {...register("confirmPassword", {
                    required: "Champ obligatoire",
                    validate: (value, formValues) =>
                      value === formValues.password || "Les mots de passe ne correspondent pas",
                  })}
                />
                {errors.confirmPassword ? <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p> : null}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Laisser vide pour ne pas modifier le mot de passe.</p>
          )}

          <div>
            <select className="input-base border px-3 text-sm" {...register("specialty", { required: "Champ obligatoire" })}>
              <option value="">Specialite*</option>
              <option value="neurologist">Neurologiste</option>
              <option value="radiologist">Radiologiste</option>
              <option value="general">Generaliste</option>
            </select>
            {errors.specialty ? <p className="mt-1 text-xs text-red-500">{errors.specialty.message}</p> : null}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
