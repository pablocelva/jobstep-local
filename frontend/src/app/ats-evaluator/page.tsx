"use client";

import React from "react";
import { ATSEvaluatorStudio } from "@/components/ats/ATSEvaluatorStudio";
import { useStudio } from "@/context/StudioContext";

export default function ATSEvaluatorPage() {
  const { cvVariants, reloadStudioData } = useStudio();

  return (
    <ATSEvaluatorStudio
      cvVariants={cvVariants}
      onEvaluationSaved={reloadStudioData}
    />
  );
}
