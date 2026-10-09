"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAppPath, legacyAppTarget, safeAppDestination } from "@/lib/auth-routing";
import { useAuth } from "@/components/auth/auth-provider";

export function AuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, isReady, isLoggingOut, finishLogout } = useAuth();
  const legacyTarget = legacyAppTarget(pathname);
  const appPath = isAppPath(pathname);
  const landingPath = pathname === "/";
  const authPage = pathname === "/iniciar-sesion" || pathname === "/registro";
  const requiresSession = appPath || legacyTarget !== null;

  useEffect(() => {
    if (!isReady) return;
    if (isLoggingOut) {
      if (landingPath) finishLogout();
      else router.replace("/");
      return;
    }
    if (!user && requiresSession) {
      const requestedPath = typeof window === "undefined"
        ? pathname
        : `${pathname}${window.location.search}`;
      router.replace(`/iniciar-sesion?next=${encodeURIComponent(requestedPath)}`);
      return;
    }
    if (user && legacyTarget) {
      router.replace(legacyTarget);
      return;
    }
    if (user && landingPath) router.replace("/app");
    if (user && authPage) {
      const candidate = typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("next");
      router.replace(safeAppDestination(candidate));
    }
  }, [authPage, finishLogout, isLoggingOut, isReady, landingPath, legacyTarget, requiresSession, router, user]);

  const changingRoute =
    (isLoggingOut && !landingPath) ||
    (requiresSession && (!isReady || !user)) ||
    (user !== null && (legacyTarget !== null || landingPath || authPage));

  if (changingRoute) {
    return (
      <main className="grid min-h-screen place-items-center px-5 text-center">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {isReady ? "Abriendo MatchWork…" : "Comprobando la sesión…"}
        </p>
      </main>
    );
  }

  return children;
}
