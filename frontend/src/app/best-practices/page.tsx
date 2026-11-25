"use client";

import React from "react";
import { BestPracticesView } from "@/components/guide/BestPracticesView";
import { useStudio } from "@/context/StudioContext";

export default function BestPracticesPage() {
  const { guide, reloadStudioData } = useStudio();

  return <BestPracticesView guide={guide} onGuideRefreshed={reloadStudioData} />;
}
