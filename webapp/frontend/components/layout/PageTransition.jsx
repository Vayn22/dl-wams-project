"use client";

import { cn } from "@/lib/utils";

export default function PageTransition({ children, className }) {
  return <div className={cn("page-enter transition-all duration-200", className)}>{children}</div>;
}
