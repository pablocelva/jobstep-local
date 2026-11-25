"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { StatusBanner } from "@/components/layout/StatusBanner";
import { StudioProvider, useStudio } from "@/context/StudioContext";

function ShellContent({ children }: { children: React.ReactNode }) {
  const { apiOnline, settings, profileItems, cvVariants } = useStudio();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar vaultCount={profileItems.length} cvCount={cvVariants.length} />
      <main
        id="main-content"
        className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-6"
      >
        <StatusBanner
          apiOnline={apiOnline}
          settings={settings}
          vaultCount={profileItems.length}
          cvCount={cvVariants.length}
        />
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
