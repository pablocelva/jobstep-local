import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApplicationsStudio } from "@/components/applications/ApplicationsStudio";
import { MOCK_APPLICATIONS, MOCK_PROFILES } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("ApplicationsStudio.tsx — Gestor de Ofertas, Carpetas Locales y Copiloto XYZ (Unit + axe-core)", () => {
  it("muestra la carpeta física sincronizada, sus archivos .md/.pdf y el Copiloto de Viñetas XYZ", () => {
    render(
      <ApplicationsStudio
        applications={MOCK_APPLICATIONS}
        careerProfiles={MOCK_PROFILES}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("Acme Cloud Systems")).toBeInTheDocument();
    expect(screen.getByText("04_cv_adaptado_ATS.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Descargar PDF ATS/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/applications/10/export-pdf")
    );

    fireEvent.click(screen.getByRole("button", { name: /Copiloto Viñetas XYZ/i }));
    expect(
      screen.getByText(/Copiloto Interactivo Viñeta por Viñeta/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sugerir 3 Reescrituras XYZ/i })
    ).toBeInTheDocument();
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <ApplicationsStudio
        applications={MOCK_APPLICATIONS}
        careerProfiles={MOCK_PROFILES}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
      />
    );
    await expectNoAxeViolations(container);
  });
});
