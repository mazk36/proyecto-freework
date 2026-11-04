"use client";

import { X } from "lucide-react";
import { motion, MotionConfig, useReducedMotion, useSpring } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { shouldCloseSheet } from "@/lib/sheet-gesture";

type PointerSample = { y: number; time: number };
type DragState = { pointerId: number; startY: number; samples: PointerSample[] };

function focusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden" && !element.matches(":disabled") &&
      !element.closest("[inert], [aria-hidden='true']"),
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  centered = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  centered?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const dragRef = useRef<DragState | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragOffset = useSpring(0, { stiffness: 300, damping: 30 });
  const reducedMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !mounted) {
      dragRef.current = null;
      dragOffset.jump(0);
      setDragging(false);
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;
    if (!reducedMotion && window.matchMedia("(max-width: 767px)").matches) {
      dragOffset.jump(32);
      dragOffset.set(0);
    }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (focusableElements(panel)[0] ?? panel).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!panel) return;
      if (event.key === "Escape") {
        const popover = panel.querySelector<HTMLElement>(":popover-open");
        if (popover) {
          event.preventDefault();
          event.stopPropagation();
          popover.hidePopover();
          panel.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(popover.id)}"]`)?.focus();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements(panel);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function keepFocusInside(event: FocusEvent) {
      if (panel && event.target instanceof Node && !panel.contains(event.target)) {
        (focusableElements(panel)[0] ?? panel).focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", keepFocusInside, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", keepFocusInside, true);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [dragOffset, mounted, open, reducedMotion]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || window.matchMedia("(min-width: 768px)").matches) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      samples: [{ y: event.clientY, time: event.timeStamp }],
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function recordPointer(event: ReactPointerEvent<HTMLDivElement>): DragState | null {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return null;
    drag.samples.push({ y: event.clientY, time: event.timeStamp });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[1].time > 120) {
      drag.samples.shift();
    }
    return drag;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = recordPointer(event);
    if (drag && !reducedMotion) dragOffset.jump(Math.max(0, event.clientY - drag.startY));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = recordPointer(event);
    if (!drag) return;
    const first = drag.samples[0];
    const elapsed = event.timeStamp - first.time;
    const velocity = elapsed > 0 ? ((event.clientY - first.y) / elapsed) * 1000 : 0;
    const distance = Math.max(0, event.clientY - drag.startY);
    dragRef.current = null;
    setDragging(false);
    dragOffset.set(0);
    if (shouldCloseSheet(distance, velocity)) onCloseRef.current();
  }

  function handlePointerCancel() {
    dragRef.current = null;
    setDragging(false);
    dragOffset.set(0);
  }

  if (!open || !mounted) return null;

  return createPortal(
    <MotionConfig reducedMotion="user"><div className={`ui-portal ui-sheet-layer${centered ? " ui-sheet-layer--centered" : ""}`}>
      <div aria-hidden="true" className="ui-sheet-backdrop" onClick={() => onCloseRef.current()} />
      <motion.section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="ui-sheet-panel flex min-w-0 flex-col border-border bg-surface text-foreground ring-1 ring-inset ring-white/5"
        data-dragging={dragging}
        ref={panelRef}
        role="dialog"
        style={{ y: dragOffset }}
        tabIndex={-1}
      >
        <div
          aria-hidden="true"
          className="ui-sheet-handle grid shrink-0 place-items-center md:hidden"
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <span className="h-1.5 w-12 rounded-full bg-muted-foreground/60" />
        </div>
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-5 md:px-7 md:pt-7">
          <div className="min-w-0 pt-1">
            <h2 className="font-display text-xl font-semibold tracking-tight" id={titleId}>{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground" id={descriptionId}>{description}</p> : null}
          </div>
          <button
            aria-label="Cerrar panel"
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => onCloseRef.current()}
            type="button"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </button>
        </header>
        <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-7">
          {children}
        </div>
      </motion.section>
    </div></MotionConfig>,
    document.body,
  );
}
