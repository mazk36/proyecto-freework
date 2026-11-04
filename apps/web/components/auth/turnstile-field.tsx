"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey, TURNSTILE_SCRIPT_SRC } from "@/lib/captcha";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error("turnstile-script")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Captcha de Cloudflare Turnstile. Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no renderiza nada y `ready` es siempre true.
 * El token es de un solo uso: llama a `reset()` después de cada intento de envío.
 */
export function useTurnstile() {
  const siteKey = getTurnstileSiteKey();
  const enabled = siteKey !== "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: "es",
        callback: (value: string) => { setToken(value); setFailed(false); },
        "expired-callback": () => setToken(null),
        "error-callback": () => { setToken(null); setFailed(true); },
      });
    }).catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [enabled, siteKey]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const field = enabled ? (
    <div className="min-h-[65px]">
      <div ref={containerRef} />
      {failed ? <p className="mt-2 text-sm text-danger" role="alert">No pudimos cargar la verificación de seguridad. Recarga la página e inténtalo de nuevo.</p> : null}
    </div>
  ) : null;

  return { enabled, token, ready: !enabled || token !== null, reset, field };
}
