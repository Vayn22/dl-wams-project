"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getInitials } from "@/lib/constants";

const PAGE_SIZE = 8;

export default function PatientTable({ patients, onEdit, onDelete }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => patients.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [patients, safePage]
  );

  if (loading) {
    return (
      <div className="card-surface">
        {[0, 1, 2].map((row) => (
          <div key={row} className="mb-3 h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="card-surface flex min-h-64 flex-col items-center justify-center text-slate-500">
        <UserX className="mb-3 h-12 w-12 text-slate-300" />
        Aucun patient trouve
      </div>
    );
  }

  return (
    <div className="card-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom Prenom</TableHead>
            <TableHead>Naissance</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead>Telephone</TableHead>
            <TableHead>Diagnostic</TableHead>
            <TableHead>Ajoute le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <button
                  onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-100 text-slate-600">{getInitials(`${patient.firstName} ${patient.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <span>{patient.firstName} {patient.lastName}</span>
                </button>
              </TableCell>
              <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
              <TableCell>{patient.gender}</TableCell>
              <TableCell>{patient.phone}</TableCell>
              <TableCell>{patient.diagnosis || "-"}</TableCell>
              <TableCell>{formatDate(patient.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-50" onClick={() => onEdit(patient)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(patient)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
          Precedent
        </Button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <Button key={i} variant={safePage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setPage(i + 1)}>
            {i + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
