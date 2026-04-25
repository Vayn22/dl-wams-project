import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PatientDataProvider } from "@/context/PatientDataContext";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "MediSync",
  description: "Plateforme medicale intelligente",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <PatientDataProvider>
            <ToastProvider>{children}</ToastProvider>
          </PatientDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
