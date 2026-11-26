import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HarvardCVStudio } from "@/components/harvard/HarvardCVStudio";
import { MOCK_CV_VARIANTS, MOCK_PROFILES } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("HarvardCVStudio.tsx — Compilador y Vista Hoja Harvard (Unit + axe-core)", () => {
  it("renderiza la vista de hoja impresa Harvard, alterna a Markdown crudo y expone descarga PDF ATS", () => {
    render(
      <HarvardCVStudio
        careerProfiles={MOCK_PROFILES}
        cvVariants={MOCK_CV_VARIANTS}
        selectedCV={MOCK_CV_VARIANTS[0]}
        onSelectCV={vi.fn()}
        onCompileCV={vi.fn().mockResolvedValue(undefined)}
        generatingCV={false}
      />
    );

    expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Exportar PDF ATS/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/profile/cv-variants/1/export-pdf")
    );

    fireEvent.click(screen.getByRole("button", { name: /Markdown Crudo/i }));
    expect(screen.getByText(/## PERFIL PROFESIONAL/i)).toBeInTheDocument();
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <HarvardCVStudio
        careerProfiles={MOCK_PROFILES}
        cvVariants={MOCK_CV_VARIANTS}
        selectedCV={MOCK_CV_VARIANTS[0]}
        onSelectCV={vi.fn()}
        onCompileCV={vi.fn().mockResolvedValue(undefined)}
        generatingCV={false}
      />
    );
    await expectNoAxeViolations(container);
  });
});
