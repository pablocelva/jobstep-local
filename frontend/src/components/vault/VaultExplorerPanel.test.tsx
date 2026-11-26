import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VaultExplorerPanel } from "@/components/vault/VaultExplorerPanel";
import { MOCK_ITEMS, MOCK_PROFILES } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("VaultExplorerPanel.tsx — Explorador y Filtros de la Bóveda (Unit + axe-core)", () => {
  it("filtra dinámicamente los registros por perfil laboral seleccionado", () => {
    render(
      <VaultExplorerPanel
        careerProfiles={MOCK_PROFILES}
        items={MOCK_ITEMS}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("Full-Stack Engineer")).toBeInTheDocument();
    expect(screen.getByText("Customer Success Specialist")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Servicio al Cliente & Soporte" })
    );

    expect(screen.queryByText("Full-Stack Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("Customer Success Specialist")).toBeInTheDocument();
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <VaultExplorerPanel
        careerProfiles={MOCK_PROFILES}
        items={MOCK_ITEMS}
        onDataChanged={vi.fn().mockResolvedValue(undefined)}
      />
    );
    await expectNoAxeViolations(container);
  });
});
