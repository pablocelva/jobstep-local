import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VaultIngestPanel } from "@/components/vault/VaultIngestPanel";
import { MOCK_PROFILES } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("VaultIngestPanel.tsx — Ingesta de Texto Libre y Perfiles Dinámicos (Unit + axe-core)", () => {
  it("carga la plantilla de ejemplo multi-perfil y despliega el formulario de nuevo perfil", () => {
    render(
      <VaultIngestPanel
        careerProfiles={MOCK_PROFILES}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
        onQuickCompileHarvard={vi.fn().mockResolvedValue(undefined)}
        generatingCV={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Cargar ejemplo/i }));
    const textarea = screen.getByLabelText(
      /Narrativa libre o texto de CV/i
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Python");

    fireEvent.click(screen.getByRole("button", { name: /\+ Nuevo Perfil/i }));
    expect(screen.getByLabelText(/Nombre del perfil/i)).toBeInTheDocument();
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <VaultIngestPanel
        careerProfiles={MOCK_PROFILES}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
        onQuickCompileHarvard={vi.fn().mockResolvedValue(undefined)}
        generatingCV={false}
      />
    );
    await expectNoAxeViolations(container);
  });
});
