import { Bookmark, CircleCheck, CircleHelp, CirclePause, TriangleAlert, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, StatusBadge, type BadgeStatus } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";
import { UiKitInteractions } from "./ui-kit-interactions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "UI kit",
};

const statuses: BadgeStatus[] = ["draft", "open", "paused", "closed", "submitted", "withdrawn"];
const actionClassName = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="private-app-shell ui-kit min-h-dvh bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">MatchWork · Revisión visual</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Una base para conectar</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Una muestra de los elementos que dan forma a una experiencia clara y cercana.</p>
        </header>

        <div className="mt-12 grid gap-8" id="componentes">
          <section aria-labelledby="badges-title" className="rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 sm:p-7">
            <h2 className="font-display text-xl font-semibold" id="badges-title">Indicadores</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Mensajes breves para reconocer estados de un vistazo.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge icon={CircleHelp} tone="neutral">Neutral</Badge>
              <Badge icon={CircleCheck} tone="accent">Destacado</Badge>
              <Badge icon={CircleCheck} tone="success">Completado</Badge>
              <Badge icon={TriangleAlert} tone="warning">Atención</Badge>
              <Badge icon={XCircle} tone="danger">No disponible</Badge>
            </div>
            <div aria-label="Estados disponibles" className="mt-4 flex flex-wrap gap-2">
              {statuses.map((status) => <StatusBadge key={status} status={status} />)}
            </div>
          </section>

          <section aria-labelledby="loading-title" className="rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 sm:p-7">
            <h2 className="font-display text-xl font-semibold" id="loading-title">Mientras llega el contenido</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Espacios reservados que mantienen la página estable.</p>
            <div className="mt-6 grid items-start gap-5 md:grid-cols-2">
              <SkeletonCard />
              <div className="grid gap-5 rounded-2xl border border-border p-5">
                <Skeleton className="h-10 w-2/3" />
                <SkeletonText />
                <Skeleton className="h-12 w-32 rounded-xl" />
              </div>
            </div>
          </section>

          <section aria-labelledby="interactions-title" className="rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 sm:p-7">
            <h2 className="font-display text-xl font-semibold" id="interactions-title">Avisos y panel</h2>
            <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">Una forma sencilla de informar y mostrar más detalles.</p>
            <UiKitInteractions />
          </section>

          <section aria-labelledby="empty-title" className="rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 sm:p-7">
            <h2 className="font-display text-xl font-semibold" id="empty-title">Cuando aún no hay contenido</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background">
                <EmptyState
                  action={<a className={actionClassName} href="#componentes">Explorar elementos</a>}
                  description="Cuando guardes algo para revisarlo después, aparecerá aquí."
                  icon={Bookmark}
                  title="Todavía no hay elementos guardados"
                />
              </div>
              <div className="rounded-2xl border border-border bg-background">
                <EmptyState
                  action={<a className={actionClassName} href="#interactions-title">Ver opciones</a>}
                  compact
                  description="Aquí verás lo que esté en pausa."
                  icon={CirclePause}
                  title="Nada en pausa"
                  tone="neutral"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
