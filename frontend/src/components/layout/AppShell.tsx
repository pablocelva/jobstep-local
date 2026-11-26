"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { StudioProvider, useStudio } from "@/context/StudioContext";

function ShellContent({ children }: { children: React.ReactNode }) {
  const { apiOnline, settings, profileItems, cvVariants, applications } = useStudio();

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <Navbar
        vaultCount={profileItems.length}
        cvCount={cvVariants.length}
        appCount={applications.length}
        apiOnline={apiOnline}
        settings={settings}
      />
      <main
        id="main-content"
        className="max-w-7xl mx-auto w-full px-6 py-7 flex-1"
      >
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <ShellContent>{children}</ShellContent>
    </StudioProvider>
  );
}
