import { describe, expect, it } from "vitest";
import { resolveTagBadge } from "@/constants/domains";
import { MOCK_PROFILES } from "@/test/fixtures";

describe("domains.ts — resolveTagBadge", () => {
  it("resuelve correctamente perfiles laborales inscritos y aplica su tema de color", () => {
    const known = resolveTagBadge("ti-fullstack", MOCK_PROFILES);
    expect(known.label).toBe("TI & Full-Stack Development");
    expect(known.dotColor).toContain("cyan");
  });

  it("resuelve etiquetas secundarias incluidas dentro de un CareerProfile", () => {
    const subTag = resolveTagBadge("ti-support", MOCK_PROFILES);
    expect(subTag.label).toBe("ti-support");
    expect(subTag.dotColor).toContain("cyan");
  });

  it("permite cualquier etiqueta dinámica nueva no inscrita previamente sin fallar", () => {
    const customDynamic = resolveTagBadge("finanzas-corporativas", MOCK_PROFILES);
    expect(customDynamic.label).toBe("finanzas-corporativas");
    expect(customDynamic.dotColor).toBe("bg-zinc-500");
  });
});
