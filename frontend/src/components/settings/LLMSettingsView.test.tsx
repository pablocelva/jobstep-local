import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LLMSettingsView } from "@/components/settings/LLMSettingsView";
import { MOCK_SETTINGS } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

describe("LLMSettingsView.tsx — Configuración Motor IA Dual Groq / Ollama (Unit + axe-core)", () => {
  it("permite alternar visibilidad de la API Key de Groq entre password y texto", async () => {
    render(
      <LLMSettingsView
        settings={MOCK_SETTINGS}
        onSettingsUpdated={vi.fn()}
      />
    );

    const keyInput = screen.getByLabelText(/Groq API Key/i) as HTMLInputElement;
    expect(keyInput.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: /Mostrar/i }));
    await waitFor(() => {
      expect(keyInput.type).toBe("text");
    });
  });

  it("pasa la auditoría de accesibilidad axe-core sin violaciones", async () => {
    const { container } = render(
      <LLMSettingsView
        settings={MOCK_SETTINGS}
        onSettingsUpdated={vi.fn()}
      />
    );
    await expectNoAxeViolations(container);
  });
});
