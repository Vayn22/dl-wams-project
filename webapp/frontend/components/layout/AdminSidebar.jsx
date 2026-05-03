"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Plus, UserCog } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/doctors", label: "Medecins", icon: UserCog },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 flex min-h-screen w-64 flex-col bg-[#1E3A5F] text-white">
      <div className="flex items-center gap-2 p-6">
        <Plus className="h-6 w-6 text-sky-400" />
        <h1 className="text-lg font-bold">MediSync</h1>
      </div>

      <div className="px-6 pb-5">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 font-semibold text-white">
          {getInitials(currentUser?.name)}
        </div>
        <p className="text-sm font-medium">Administrateur</p>
        <Badge className="mt-2 bg-amber-100 text-amber-700">Admin</Badge>
      </div>

      <div className="mx-6 border-t border-white/10" />

      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white",
                active && "border-l-2 border-white bg-white/10 text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => {
          logout();
          router.push("/login");
        }}
        className="mt-auto m-4 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Deconnexion
      </button>
    </aside>
  );
}
