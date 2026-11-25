import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobStep Local — ATS Studio & Harvard CV Builder",
  description:
    "Simulador ATS local, Bóveda Profesional Dinámica y compilador de CVs en Formato Harvard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-zinc-200 selection:text-zinc-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
