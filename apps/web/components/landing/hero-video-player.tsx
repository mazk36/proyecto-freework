"use client";

import { useEffect, useState } from "react";

type ConnectionInfo = { saveData?: boolean; effectiveType?: string };

function canPlayHeroVideo(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  if (connection?.saveData) return false;
  return !connection?.effectiveType || !/^(slow-2g|2g|3g)$/.test(connection.effectiveType);
}

/** Mounts the 3 MB hero video only after the page has loaded and the browser is idle, so it never competes with the LCP poster. */
export function HeroVideoPlayer({ poster, src }: { poster: string; src: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canPlayHeroVideo()) return;
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const start = () => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      else timeoutId = window.setTimeout(() => setReady(true), 2000);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;
  return (
    <video autoPlay className="absolute inset-0 size-full object-cover" loop muted playsInline poster={poster} preload="auto">
      <source src={src} type="video/mp4" />
    </video>
  );
}
