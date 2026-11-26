import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ATSEvaluatorStudio } from "@/components/ats/ATSEvaluatorStudio";
import { MOCK_CV_VARIANTS } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("ATSEvaluatorStudio.tsx — Simulador & Evaluador ATS 0-100 (Unit + axe-core)", () => {
  it("permite alternar modos de origen de CV y cargar una oferta laboral de ejemplo", () => {
    render(
      <ATSEvaluatorStudio
        cvVariants={MOCK_CV_VARIANTS}
        onEvaluationSaved={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cargar ejemplo/i }));
    const jdTextarea = screen.getByLabelText(
      /Oferta Laboral \(Job Description\)/i
    ) as HTMLTextAreaElement;
    expect(jdTextarea.value).toContain("FastAPI");
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <ATSEvaluatorStudio
        cvVariants={MOCK_CV_VARIANTS}
        onEvaluationSaved={vi.fn().mockResolvedValue(undefined)}
      />
    );
    await expectNoAxeViolations(container);
  });
});
