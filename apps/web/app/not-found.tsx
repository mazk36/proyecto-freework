import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center px-5 py-16 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <SearchX aria-hidden="true" className="size-6" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-accent">No disponible</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
          No encontramos ese problema
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Puede que la dirección no sea correcta o que este ejemplo no esté disponible.
        </p>
        <ButtonLink className="mt-6" href="/problems" variant="outline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Explorar problemas
        </ButtonLink>
        <Link className="sr-only" href="/">Ir al inicio</Link>
      </div>
    </section>
  );
}
