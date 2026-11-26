"use client";

import React from "react";
import { ApplicationsStudio } from "@/components/applications/ApplicationsStudio";
import { useStudio } from "@/context/StudioContext";

export default function ApplicationsPage() {
  const { applications, careerProfiles, reloadStudioData } = useStudio();

  return (
    <ApplicationsStudio
      applications={applications}
      careerProfiles={careerProfiles}
      onDataChanged={reloadStudioData}
    />
  );
}
