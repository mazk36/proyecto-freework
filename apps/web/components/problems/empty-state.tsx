import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <section className="grid min-h-[360px] place-items-center rounded-card border border-dashed border-border bg-white px-6 py-12 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          No encontramos problemas con estos filtros
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Prueba con otras palabras o elimina algunos filtros para ver más opciones.
        </p>
        <Button className="mt-5" onClick={onClear} variant="outline">
          Limpiar filtros
        </Button>
      </div>
    </section>
  );
}
