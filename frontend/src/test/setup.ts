import "@testing-library/jest-dom/vitest";
import axe from "axe-core";
import { expect } from "vitest";

/**
 * Helper centralizado para ejecutar auditorías WCAG / ARIA reales con axe-core
 * sobre cualquier contenedor renderizado en Vitest + JSDOM.
 */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // JSDOM no calcula layout visual real para contraste de colores CSS computados
      "color-contrast": { enabled: false },
    },
  });

  const violationsSummary = results.violations
    .map(
      (v) =>
        `[${v.id}] (${v.impact}): ${v.help} -> ${v.nodes
          .map((n) => n.html)
          .join(" | ")}`
    )
    .join("\n");

  expect(results.violations, violationsSummary).toEqual([]);
}
