"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInViewOnce } from "@/lib/use-in-view-once";

export function LandingMotion({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Fade + 16 px rise, once, with CSS only (no animation library on the public pages). See `.landing-reveal` in globals.css. */
export function LandingReveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(ref, "0px 0px -40px 0px");
  return (
    <div
      className="landing-reveal"
      data-visible={inView ? "true" : "false"}
      ref={ref}
      style={{ "--reveal-delay": `${Math.round(delay * 1000)}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
