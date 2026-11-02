"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toastQueueReducer, type ToastEntry, type ToastOptions, type ToastTone } from "@/lib/toast-queue";

type ToastContextValue = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneDetails = {
  neutral: { icon: Info, className: "text-foreground" },
  accent: { icon: Sparkles, className: "text-foreground" },
  success: { icon: CheckCircle2, className: "text-success" },
  warning: { icon: AlertTriangle, className: "text-warning" },
  danger: { icon: AlertCircle, className: "text-danger" },
} satisfies Record<ToastTone, { icon: typeof Info; className: string }>;

function ToastNotice({
  item,
  dismiss,
  expire,
  remove,
}: {
  item: ToastEntry;
  dismiss: (id: string) => void;
  expire: (id: string) => void;
  remove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remainingMs = useRef(item.durationMs);
  const closeNotified = useRef(false);
  const { icon: Icon, className: iconClassName } = toneDetails[item.tone];

  useEffect(() => {
    if (item.state !== "visible" || hovered || focused) return;

    const startedAt = performance.now();
    const timer = window.setTimeout(() => expire(item.id), remainingMs.current);
    return () => {
      window.clearTimeout(timer);
      remainingMs.current = Math.max(0, remainingMs.current - (performance.now() - startedAt));
    };
  }, [expire, focused, hovered, item.id, item.state]);

  useEffect(() => {
    if (item.state !== "closing") return;
    if (!closeNotified.current) {
      closeNotified.current = true;
      item.onClose?.();
    }
    const timer = window.setTimeout(() => remove(item.id), 150);
    return () => window.clearTimeout(timer);
  }, [item, remove]);

  return (
    <div
      className="ui-toast pointer-events-auto flex min-w-0 gap-3 rounded-2xl border border-border bg-surface p-4 text-foreground ring-1 ring-inset ring-white/5"
      data-state={item.state}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${iconClassName}`} strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-5">{item.title}</p>
        {item.description ? <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{item.description}</p> : null}
        {item.actionLabel && item.onAction ? <div className="-ml-2 mt-1 flex flex-wrap gap-x-2">
          {[
            { label: item.actionLabel, action: item.onAction },
            { label: item.secondaryActionLabel, action: item.onSecondaryAction },
          ].map(({ label, action }) => label && action ? (
            <button
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-foreground underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              key={label}
              onClick={() => {
                try { action(); } finally { dismiss(item.id); }
              }}
              type="button"
            >
              {label}
            </button>
          ) : null)}
        </div> : null}
      </div>
      <button
        aria-label="Cerrar notificación"
        className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => dismiss(item.id)}
        type="button"
      >
        <X aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(toastQueueReducer, []);
  const prefix = useId();
  const nextId = useRef(0);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${prefix}-${++nextId.current}`;
    const durationMs = options.durationMs ?? 6000;
    dispatch({
      type: "add",
      toast: { ...options, id, state: "visible", durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 6000 },
    });
    return id;
  }, [prefix]);
  const dismiss = useCallback((id: string) => dispatch({ type: "dismiss", id }), []);
  const expire = useCallback((id: string) => dispatch({ type: "expire", id }), []);
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-relevant="additions text" className="ui-portal ui-toast-region" role="status">
        {items.map((item) => (
          <ToastNotice dismiss={dismiss} expire={expire} item={item} key={item.id} remove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return context;
}
