import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Navbar } from "@/components/layout/Navbar";
import { MOCK_SETTINGS } from "@/test/fixtures";
import { expectNoAxeViolations } from "@/test/setup";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Navbar.tsx — Navegación Principal & Telemetría (Unit + axe-core)", () => {
  it("renderiza enlaces del App Router, contadores, estado de API y marca la ruta activa con aria-current='page'", () => {
    render(
      <Navbar
        vaultCount={5}
        cvCount={2}
        appCount={3}
        apiOnline={true}
        settings={MOCK_SETTINGS}
      />
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Bóveda")).toBeInTheDocument();
    expect(screen.getByText("Ofertas")).toBeInTheDocument();
    expect(screen.getByText("API Online")).toBeInTheDocument();

    const activeLink = screen.getByRole("link", { name: /Bóveda/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");
  });

  it("cumple 100% las reglas de accesibilidad WCAG / ARIA auditadas con axe-core", async () => {
    const { container } = render(
      <Navbar
        vaultCount={5}
        cvCount={2}
        appCount={3}
        apiOnline={true}
        settings={MOCK_SETTINGS}
      />
    );
    await expectNoAxeViolations(container);
  });
});
