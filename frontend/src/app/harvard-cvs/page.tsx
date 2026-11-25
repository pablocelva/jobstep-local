"use client";

import React from "react";
import { HarvardCVStudio } from "@/components/harvard/HarvardCVStudio";
import { useStudio } from "@/context/StudioContext";

export default function HarvardCVsPage() {
  const {
    cvVariants,
    selectedCV,
    setSelectedCV,
    compileHarvardCV,
    generatingCV,
  } = useStudio();

  return (
    <HarvardCVStudio
      cvVariants={cvVariants}
      selectedCV={selectedCV}
      onSelectCV={setSelectedCV}
      onCompileCV={compileHarvardCV}
      generatingCV={generatingCV}
    />
  );
}
