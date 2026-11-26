import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BestPracticesView } from "@/components/guide/BestPracticesView";
import { MOCK_GUIDE } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("BestPracticesView.tsx — Renderizador Editorial de Guía Harvard & ATS (Unit + axe-core)", () => {
  it("renderiza el Markdown en formato visual de artículo (títulos, listas y tarjetas comparativas)", () => {
    render(
      <BestPracticesView
        guide={MOCK_GUIDE}
        onGuideRefreshed={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Guía Formato Harvard" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Diseño de una sola columna:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Incrementé las ventas en un 30%/i)
    ).toBeInTheDocument();
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <BestPracticesView
        guide={MOCK_GUIDE}
        onGuideRefreshed={vi.fn().mockResolvedValue(undefined)}
      />
    );
    await expectNoAxeViolations(container);
  });
});
