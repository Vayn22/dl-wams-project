"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SPECIALTY_BADGE, SPECIALTY_LABELS, formatDate, getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function DoctorTable({ doctors, patients, onEdit, onDelete }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="card-surface">
        {[0, 1, 2].map((row) => (
          <div key={row} className="mb-3 h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!doctors.length) {
    return (
      <div className="card-surface flex min-h-64 flex-col items-center justify-center text-slate-500">
        <UserX className="mb-3 h-12 w-12 text-slate-300" />
        Aucun medecin trouve
      </div>
    );
  }

  return (
    <div className="card-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Medecin</TableHead>
            <TableHead>Specialite</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telephone</TableHead>
            <TableHead>Patients</TableHead>
            <TableHead>Ajoute le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doctors.map((doctor) => (
            <TableRow key={doctor.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(doctor.name)}</AvatarFallback>
                  </Avatar>
                  <span>{doctor.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn(SPECIALTY_BADGE[doctor.specialty])}>{SPECIALTY_LABELS[doctor.specialty]}</Badge>
              </TableCell>
              <TableCell>{doctor.email}</TableCell>
              <TableCell>{doctor.phone}</TableCell>
              <TableCell>{patients.filter((p) => p.assignedDoctorId === doctor.id).length}</TableCell>
              <TableCell>{doctor.createdAt ? formatDate(doctor.createdAt) : "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:bg-sky-50" onClick={() => onEdit(doctor)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => onDelete(doctor)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
