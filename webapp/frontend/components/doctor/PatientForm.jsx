"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const defaultValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  address: "",
  bloodType: "",
  notes: "",
  attachmentName: "",
};

export default function PatientForm({ open, onClose, onSave, editingPatient }) {
  const initialData = editingPatient || defaultValues;
  const [isLoading, setIsLoading] = useState(false);
  const [attachmentName, setAttachmentName] = useState(initialData.attachmentName || "");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const { register, setValue, reset, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  useEffect(() => {
    const nextValues = editingPatient || defaultValues;
    reset(nextValues);
    setAttachmentName(nextValues.attachmentName || "");
    setAttachmentFile(null);
  }, [editingPatient, open, reset]);

  if (!open) return null;

  const submit = handleSubmit(async (values) => {
    setIsLoading(true);
    try {
      await onSave({ ...values, attachmentName, attachmentFile });
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
            {editingPatient ? "Modifier le patient" : "Ajouter un patient"}
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
              <Input type="date" {...register("dateOfBirth", { required: "Champ obligatoire" })} />
              {errors.dateOfBirth ? <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p> : null}
            </div>
            <div>
              <select className="input-base border px-3 text-sm" {...register("gender", { required: "Champ obligatoire" })}>
                <option value="">Genre*</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
              {errors.gender ? <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p> : null}
            </div>
          </div>

          <div>
            <div>
              <Input placeholder="Telephone*" {...register("phone", { required: "Champ obligatoire" })} />
              {errors.phone ? <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p> : null}
            </div>
          </div>

          <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm" rows={2} placeholder="Adresse" {...register("address")} />

          <select className="input-base border px-3 text-sm" {...register("bloodType")}>
            <option value="">Groupe sanguin</option>
            {bloodTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm" rows={2} placeholder="Notes" {...register("notes")} />

          <label className="block rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
            <UploadCloud className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">Glissez un fichier ici ou cliquez pour selectionner</p>
            <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG, DOCX - max 10 Mo</p>
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setAttachmentName(file.name);
                setAttachmentFile(file);
                setValue("attachmentName", file.name);
              }}
            />
          </label>

          {attachmentName ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {attachmentName}
              <button
                type="button"
                onClick={() => {
                  setAttachmentName("");
                  setAttachmentFile(null);
                  setValue("attachmentName", "");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}

          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer le patient
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
