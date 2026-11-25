"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchStudioBootstrap, generateHarvardCVRequest } from "@/lib/api";
import type {
  BestPracticesData,
  CVVariant,
  CareerProfile,
  LLMSettings,
  ProfileItem,
  TargetDomain,
} from "@/types/studio";

interface StudioContextValue {
  settings: LLMSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<LLMSettings | null>>;
  guide: BestPracticesData | null;
  careerProfiles: CareerProfile[];
  profileItems: ProfileItem[];
  cvVariants: CVVariant[];
  selectedCV: CVVariant | null;
  setSelectedCV: React.Dispatch<React.SetStateAction<CVVariant | null>>;
  apiOnline: boolean;
  generatingCV: boolean;
  reloadStudioData: () => Promise<void>;
  compileHarvardCV: (
    domain: TargetDomain,
    name: string,
    notes?: string | null,
    customHeadline?: string | null
  ) => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [guide, setGuide] = useState<BestPracticesData | null>(null);
  const [careerProfiles, setCareerProfiles] = useState<CareerProfile[]>([]);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);
  const [cvVariants, setCvVariants] = useState<CVVariant[]>([]);
  const [selectedCV, setSelectedCV] = useState<CVVariant | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);
  const [generatingCV, setGeneratingCV] = useState<boolean>(false);

  const reloadStudioData = useCallback(async () => {
    const data = await fetchStudioBootstrap();
    setSettings(data.settings);
    setGuide(data.guide);
    setCareerProfiles(data.careerProfiles);
    setProfileItems(data.items);
    setCvVariants(data.cvVariants);
    setApiOnline(data.online);
    if (data.cvVariants.length > 0) {
      setSelectedCV((prev) => prev || data.cvVariants[0]);
    }
  }, []);

  useEffect(() => {
    reloadStudioData();
  }, [reloadStudioData]);

  const compileHarvardCV = useCallback(
    async (
      domain: TargetDomain,
      name: string,
      notes: string | null = null,
      customHeadline: string | null = null
    ) => {
      setGeneratingCV(true);
      try {
        const created = await generateHarvardCVRequest({
          name,
          target_domain: domain,
          custom_role_headline: customHeadline,
          custom_focus_notes: notes,
          language: settings?.preferred_language || "es",
          use_ai_polish: true,
        });
        await reloadStudioData();
        setSelectedCV(created);
        router.push("/harvard-cvs");
      } finally {
        setGeneratingCV(false);
      }
    },
    [reloadStudioData, router, settings?.preferred_language]
  );

  return (
    <StudioContext.Provider
      value={{
        settings,
        setSettings,
        guide,
        careerProfiles,
        profileItems,
        cvVariants,
        selectedCV,
        setSelectedCV,
        apiOnline,
        generatingCV,
        reloadStudioData,
        compileHarvardCV,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio debe usarse dentro de un <StudioProvider>");
  }
  return ctx;
}
