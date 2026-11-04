"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicCounters } from "@/lib/public-counters-service";
import { COUNTER_DURATION_MS, formatCounterNumber, formatPublicCounter, interpolateCounter, type PublicCounters } from "@/lib/public-counters";

const items: { key: keyof PublicCounters; label: string }[] = [
  { key: "open_problems", label: "Problemas abiertos" },
  { key: "companies_published", label: "Empresas que publicaron problemas" },
  { key: "freelancers_active", label: "Profesionales con perfil público" },
  { key: "proposals_submitted", label: "Propuestas enviadas" },
];

type LoadState = { status: "loading" } | { status: "ready"; data: PublicCounters } | { status: "unavailable" };

export function LiveCounters() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [elapsed, setElapsed] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const inView = useInView(sectionRef, { once: true });
  const reducedMotion = useReducedMotion();
  const data = state.status === "ready" ? state.data : null;
  const hasData = data !== null;

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const result = await getPublicCounters();
      if (mounted) setState(result ? { status: "ready", data: result } : { status: "unavailable" });
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { mounted = false; window.removeEventListener("focus", refresh); };
  }, []);

  useEffect(() => {
    if (!hasData || !inView) return;
    if (hasAnimated.current || reducedMotion) {
      hasAnimated.current = true;
      setElapsed(COUNTER_DURATION_MS);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const tick = (time: number) => {
      start ??= time;
      const next = Math.min(time - start, COUNTER_DURATION_MS);
      setElapsed(next);
      if (next < COUNTER_DURATION_MS) frame = requestAnimationFrame(tick);
      else hasAnimated.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasData, inView, reducedMotion]);

  if (state.status === "unavailable") return <div ref={sectionRef} />;

  const accessibleSummary = data
    ? items.map(({ key, label }) => `${label}: ${formatPublicCounter(data[key])}`).join(". ")
    : "";

  return (
    <div ref={sectionRef}>
      <section aria-labelledby="live-counters-title" className="border-b border-border bg-surface/70">
        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-8">
          <h2 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.16em] text-brand-lavender" id="live-counters-title">
            <span aria-hidden="true" className="live-indicator size-2 rounded-full bg-emerald-300" />
            En vivo
          </h2>
          <p aria-atomic="true" aria-live="polite" className="sr-only">{accessibleSummary}</p>
          <dl aria-hidden="true" className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-7">
            {items.map(({ key, label }) => (
              <div className="min-w-0" key={key}>
                <dt className="min-h-10 text-xs leading-5 text-muted-foreground sm:text-sm">{label}</dt>
                <dd className="mt-1 min-h-8 font-mono text-xl font-medium leading-8 text-foreground sm:text-2xl">
                  {data ? (
                    data[key] === 0 ? <span className="text-sm leading-6 text-brand-lavender">Sé de los primeros</span>
                      : formatCounterNumber(reducedMotion ? data[key] : interpolateCounter(data[key], elapsed))
                  ) : <Skeleton className="mt-1 h-6 w-20" />}
                </dd>
              </div>
            ))}
          </dl>
          {state.status === "loading" ? <span className="sr-only" role="status">Actualizando cifras de MatchWork</span> : null}
        </div>
      </section>
    </div>
  );
}
