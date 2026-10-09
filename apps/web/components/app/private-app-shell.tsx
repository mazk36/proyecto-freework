"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import type { UserRole } from "@/lib/auth";
import type { ReactNode } from "react";

type NavigationItem = { label: string; href: string };

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  freelancer: [
    { label: "Descubrir", href: "/app/descubrir" },
    { label: "Explorar", href: "/app/explorar" },
    { label: "Guardados", href: "/app/guardados" },
    { label: "Mis propuestas", href: "/app/propuestas" },
    { label: "Matches", href: "/app/matches" },
    { label: "Perfil", href: "/app/perfil" },
  ],
  company: [
    { label: "Mis problemas", href: "/app/problemas" },
    { label: "Publicar un problema", href: "/app/problemas/nuevo" },
    { label: "Propuestas recibidas", href: "/app/propuestas" },
    { label: "Guardados", href: "/app/guardados" },
    { label: "Matches", href: "/app/matches" },
    { label: "Perfil", href: "/app/perfil" },
  ],
};

export function PrivateAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const { user, logout, storageNotice, authIssue } = useAuth();

  if (!user) return null;

  const roleLabel = user.role === "company" ? "Empresa" : "Freelancer";

  function handleLogout() {
    void logout();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:min-h-[72px] sm:px-8">
          <Link className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/app">
            <MatchWorkLogoLockup size="compact" preload />
          </Link>
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              className="min-h-10 shrink-0 rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-4 sm:text-sm"
              onClick={handleLogout}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav aria-label="Navegación de la aplicación" className="border-t border-border">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:px-7">
            {navigationByRole[user.role].map((item) => {
              const selected =
                pathname === item.href ||
                (item.href !== "/app/problemas" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  aria-current={selected ? "page" : undefined}
                  className={`min-h-10 shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-5 py-4 text-center text-xs leading-5 text-muted-foreground">
        <p>Tu cuenta y tus publicaciones están protegidas por los permisos de MatchWork.</p>
        {storageNotice ? <p className="mt-1 text-amber-800" role="status">{storageNotice}</p> : null}
        {authIssue ? <p className="mt-1 text-rose-700" role="alert">{authIssue}</p> : null}
      </footer>
    </div>
  );
}
