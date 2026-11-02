import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { PublicProblem } from "@/lib/problem-domain";
import { DeckExperience } from "./swipe-deck";

const problem: PublicProblem = {
  id: "open", title: "Ordenar la atención", description: "La información está dispersa.",
  companyName: null, industrySnapshot: "Servicios", impacts: ["time"], objectives: ["organize"],
  successCriteria: "Reducir el tiempo de respuesta.", budgetChoice: "1000_3000", currency: "USD",
  deadlineChoice: "flexible", publishedAt: "2026-10-20T12:00:00Z",
};

describe("SwipeDeck rendering", () => {
  it("renders the public problem and its real currency and hides already saved problems", () => {
    const html = renderToStaticMarkup(<ToastProvider><DeckExperience
      initialInteractions={{ saved: "saved" }}
      problems={[{ ...problem, id: "saved", title: "No debe aparecer" }, problem]}
      saveInteraction={async (_id, state) => state ?? "unseen"}
    /></ToastProvider>);
    expect(html).toContain("Ordenar la atención");
    expect(html).toContain("Empresa reservada");
    expect(html).toContain("US$ 1,000 – US$ 3,000");
    expect(html).toContain("Reducir el tiempo de respuesta.");
    expect(html).not.toContain("No debe aparecer");
    expect(html).toContain('aria-label="No me interesa"');
    expect(html).toContain('aria-label="Me interesa"');
    expect(html).toContain('aria-live="polite"');
  });

  it("shows the recovery actions when there are no unseen problems", () => {
    const html = renderToStaticMarkup(<ToastProvider><DeckExperience
      initialInteractions={{ open: "dismissed" }}
      problems={[problem]}
      saveInteraction={async (_id, state) => state ?? "unseen"}
    /></ToastProvider>);
    expect(html).toContain("Ya viste todo por ahora");
    expect(html).toContain("Ver mis Likes");
    expect(html).toContain("Volver a revisar descartados");
  });
});
