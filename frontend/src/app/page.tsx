"use client";

import React from "react";
import { VaultExplorerPanel } from "@/components/vault/VaultExplorerPanel";
import { VaultIngestPanel } from "@/components/vault/VaultIngestPanel";
import { useStudio } from "@/context/StudioContext";

export default function VaultPage() {
  const {
    careerProfiles,
    profileItems,
    reloadStudioData,
    compileHarvardCV,
    generatingCV,
  } = useStudio();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5">
        <VaultIngestPanel
          careerProfiles={careerProfiles}
          onDataChanged={reloadStudioData}
          onQuickCompileHarvard={(domain, name) =>
            compileHarvardCV(domain, name, null, null)
          }
          generatingCV={generatingCV}
        />
      </div>
      <div className="lg:col-span-7">
        <VaultExplorerPanel
          careerProfiles={careerProfiles}
          items={profileItems}
          onDataChanged={reloadStudioData}
        />
      </div>
    </div>
  );
}
