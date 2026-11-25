import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobStep Local — Multi-Perfil ATS Studio & Harvard CV Builder",
  description:
    "Simulador ATS local estilo JobStep, Bóveda Profesional Multi-Perfil (TI, Servicio al Cliente, Audio/Video) y organizador híbrido PostgreSQL + Carpetas Locales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
