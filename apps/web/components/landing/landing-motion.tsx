"use client";

import { MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function LandingReveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="landing-reveal"
      ref={ref}
      initial={false}
      animate={inView ? { opacity: [0, 1], y: reducedMotion ? 0 : [16, 0] } : { opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0.12 : 0.5, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
