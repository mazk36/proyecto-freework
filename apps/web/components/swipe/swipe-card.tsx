"use client";

import { ArrowUpRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { animate, motion, useIsPresent, useMotionValue, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { formatProblemBudget, formatProblemDeadline, type PublicProblem } from "@/lib/problem-domain";
import { objectiveLabels } from "@/lib/problem-service";
import { decideSwipe, type SwipeDecision } from "@/lib/swipe-gesture";

export type ExitDirection = { direction: Exclude<SwipeDecision, null>; width: number };

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export function SwipeCard({
  problem, position, activeRef, disabled, onDecision, onOpenDetail,
}: {
  problem: PublicProblem;
  position: number;
  activeRef: RefObject<HTMLElement | null>;
  disabled: boolean;
  onDecision: (decision: Exclude<SwipeDecision, null>, width: number) => void;
  onOpenDetail: () => void;
}) {
  const isTop = position === 0;
  const isPresent = useIsPresent();
  const interactive = isTop && isPresent;
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const rotation = useMotionValue(0);
  const likeOpacity = useMotionValue(0);
  const dismissOpacity = useMotionValue(0);
  const objectives = objectiveLabels(problem.objectives);

  useEffect(() => {
    if (!interactive) return;
    if (reducedMotion) { x.set(0); rotation.set(0); }
    else { void animate(x, 0, spring); void animate(rotation, 0, spring); }
    likeOpacity.set(0);
    dismissOpacity.set(0);
  }, [interactive, reducedMotion, x, rotation, likeOpacity, dismissOpacity]);

  function handleDrag(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const gesture = decideSwipe(info.offset.x, 0, 0);
    if (Math.abs(info.offset.x) > 6) dragged.current = true;
    rotation.set(reducedMotion ? 0 : gesture.rotationDeg);
    likeOpacity.set(info.offset.x > 0 ? gesture.labelOpacity : 0);
    dismissOpacity.set(info.offset.x < 0 ? gesture.labelOpacity : 0);
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const width = cardRef.current?.getBoundingClientRect().width ?? 0;
    const gesture = decideSwipe(info.offset.x, info.velocity.x, width);
    if (gesture.decision) onDecision(gesture.decision, width);
    else {
      void animate(rotation, 0, spring);
      void animate(likeOpacity, 0, { duration: 0.15 });
      void animate(dismissOpacity, 0, { duration: 0.15 });
    }
    window.setTimeout(() => { dragged.current = false; }, 0);
  }

  function handleClick(event: ReactMouseEvent<HTMLElement>) {
    if (!interactive || disabled || dragged.current || (event.target as HTMLElement).closest("button")) return;
    onOpenDetail();
  }

  return (
    <motion.article
      animate={{ opacity: position === 0 ? 1 : position === 1 ? 0.72 : 0.45, scale: reducedMotion ? 1 : 1 - position * 0.04, y: reducedMotion ? 0 : position * 10 }}
      aria-hidden={!interactive || undefined}
      aria-label={interactive ? `Problema: ${problem.title}. Pulsa Enter para ver el detalle.` : undefined}
      className={`absolute inset-0 flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-border bg-surface p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] ring-1 ring-inset ring-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-6 ${interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"}`}
      drag={interactive && !disabled ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={reducedMotion ? 0 : 1}
      dragMomentum={false}
      exit="exit"
      initial={false}
      inert={!interactive}
      onClick={handleClick}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onDragStart={() => { dragged.current = false; }}
      ref={(node: HTMLElement | null) => { cardRef.current = node; if (interactive) activeRef.current = node; }}
      style={{ x, rotate: rotation, touchAction: "pan-y", zIndex: 3 - position }}
      tabIndex={interactive ? 0 : -1}
      transition={spring}
      variants={{ exit: (custom: ExitDirection | undefined) => {
        const gesture = decideSwipe(custom?.direction === "like" ? 121 : -121, 0, custom?.width ?? 0);
        return reducedMotion
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { x: gesture.exitTarget?.x ?? 0, rotate: gesture.exitTarget?.rotationDeg ?? 0, opacity: 0, transition: { duration: 0.28, ease: "easeOut" } };
      } }}
    >
      <motion.span aria-hidden="true" className="pointer-events-none absolute right-5 top-6 z-10 rounded-lg border-2 border-brand-lavender bg-surface px-3 py-2 font-mono text-xs font-semibold tracking-wider text-brand-lavender sm:text-sm" style={{ opacity: likeOpacity, rotate: reducedMotion ? 0 : -8 }}>ME INTERESA</motion.span>
      <motion.span aria-hidden="true" className="pointer-events-none absolute left-5 top-6 z-10 rounded-lg border-2 border-muted-foreground bg-surface px-3 py-2 font-mono text-xs font-semibold tracking-wider text-foreground sm:text-sm" style={{ opacity: dismissOpacity, rotate: reducedMotion ? 0 : 8 }}>NO POR AHORA</motion.span>
      <div className="flex min-w-0 shrink-0 items-start gap-3">
        <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/10 font-display text-sm font-semibold text-brand-lavender">M</div>
        <div className="min-w-0 pt-0.5"><p className="truncate text-xs font-medium text-brand-lavender">{problem.industrySnapshot || "Sector empresarial"}</p><p className="mt-1 truncate text-sm text-muted-foreground">{problem.companyName || "Empresa reservada"}</p></div>
      </div>
      <div className="mt-3 shrink-0 sm:mt-4">
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">Un problema por resolver</p>
        <h2 className="mt-1 line-clamp-3 break-words font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{problem.title}</h2>
      </div>
      <div className="swipe-summary mt-2 min-h-0 flex-1 overflow-hidden">
        <p className="line-clamp-5 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{problem.description}</p>
        {objectives.length ? <div className="mt-3 flex flex-wrap gap-1.5">{objectives.slice(0, 3).map((objective) => <Badge key={objective}>{objective}</Badge>)}{objectives.length > 3 ? <Badge>+{objectives.length - 3}</Badge> : null}</div> : null}
      </div>
      <button className="-ml-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-1 self-start rounded-lg px-2 text-sm font-semibold text-foreground underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={(event) => { event.stopPropagation(); onOpenDetail(); }} tabIndex={interactive ? 0 : -1} type="button">Ver más <ArrowUpRight aria-hidden="true" className="size-3.5" /></button>
      <div className="mt-1 grid shrink-0 grid-cols-2 gap-3 border-t border-border pt-3">
        <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CircleDollarSign aria-hidden="true" className="size-4" /> Presupuesto</p><p className="mt-1 break-words font-mono text-xs font-medium leading-5 sm:text-sm">{formatProblemBudget(problem.budgetChoice, problem.currency)}</p></div>
        <div className="min-w-0"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="size-4" /> Plazo</p><p className="mt-1 break-words text-xs font-medium leading-5 sm:text-sm">{formatProblemDeadline(problem.deadlineChoice)}</p></div>
      </div>
    </motion.article>
  );
}
