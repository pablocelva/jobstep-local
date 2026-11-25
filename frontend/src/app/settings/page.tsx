"use client";

import React from "react";
import { LLMSettingsView } from "@/components/settings/LLMSettingsView";
import { useStudio } from "@/context/StudioContext";

export default function SettingsPage() {
  const { settings, setSettings } = useStudio();

  return (
    <LLMSettingsView
      settings={settings}
      onSettingsUpdated={(updated) => setSettings(updated)}
    />
  );
}
