"use client";

import {
  CircleUserRound,
  Compass,
  Heart,
  Layers3,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import type { UserRole } from "@/lib/auth";
import type { ComponentType, ReactNode, SVGProps } from "react";

type NavigationItem = {
  id: "swipe" | "explore" | "likes" | "chats" | "profile";
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  freelancer: [
    { id: "swipe", label: "Swipe", href: "/app/descubrir", icon: Layers3 },
    { id: "explore", label: "Explorar", href: "/app/explorar", icon: Compass },
    { id: "likes", label: "Likes", href: "/app/likes", icon: Heart },
    { id: "chats", label: "Chats", href: "/app/chats", icon: MessagesSquare },
    { id: "profile", label: "Perfil", href: "/app/perfil", icon: CircleUserRound },
  ],
  company: [
    { id: "swipe", label: "Swipe", href: "/app/propuestas", icon: Layers3 },
    { id: "explore", label: "Explorar", href: "/app/explorar", icon: Compass },
    { id: "likes", label: "Likes", href: "/app/likes", icon: Heart },
    { id: "chats", label: "Chats", href: "/app/chats", icon: MessagesSquare },
    { id: "profile", label: "Perfil", href: "/app/perfil", icon: CircleUserRound },
  ],
};

export function PrivateAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const { user, logout, storageNotice, authIssue } = useAuth();

  if (!user) return null;

  const role = user.role;
  const roleLabel = role === "company" ? "Empresa" : "Freelancer";
  const navigation = navigationByRole[role];

  function handleLogout() {
    void logout();
  }

  function isSelected(item: NavigationItem): boolean {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;

    if (item.id !== "likes") return false;

    const supportingRoutes = role === "company"
      ? ["/app/guardados", "/app/matches"]
      : ["/app/propuestas", "/app/guardados", "/app/matches"];

    return supportingRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  }

  function renderNavigationItem(item: NavigationItem, compact = false) {
    const selected = isSelected(item);
    const Icon = item.icon;

    return (
      <Link
        aria-current={selected ? "page" : undefined}
        className={`group flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          compact ? "flex-1 flex-col justify-center gap-1 px-1 py-2 text-[0.625rem]" : "justify-center lg:justify-start"
        } ${
          selected
            ? "bg-accent/15 text-foreground ring-1 ring-inset ring-accent/20"
            : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
        }`}
        href={item.href}
        key={item.id}
        title={compact ? undefined : item.label}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
        <span className={compact ? "max-w-full truncate" : "sr-only lg:not-sr-only"}>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="private-app-shell flex min-h-screen flex-col bg-background text-foreground">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-3 focus:text-foreground" href="#main-content">
        Saltar al contenido
      </a>

      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-[1720px] items-center justify-between gap-4 px-4 sm:min-h-[72px] sm:px-6 lg:px-8">
          <Link aria-label="MatchWork, inicio de la aplicación" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/app">
            <MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" preload />
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="min-w-0 text-right">
              <p className="max-w-32 truncate text-sm font-medium text-foreground sm:max-w-52">{user.name}</p>
              <p className="text-[0.6875rem] text-muted-foreground sm:text-xs">{roleLabel}</p>
            </div>
            <button
              className="min-h-10 shrink-0 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-4 sm:text-sm"
              onClick={handleLogout}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border px-3 py-7 md:block lg:px-5">
          <nav aria-label="Navegación principal" className="sticky top-6 flex flex-col gap-2">
            {navigation.map((item) => renderNavigationItem(item))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="min-w-0 flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0" id="main-content" tabIndex={-1}>
            {children}
          </div>
          <footer className="border-t border-border px-4 py-4 text-center text-xs leading-5 text-muted-foreground sm:px-6">
            <p>Tu cuenta y tus publicaciones están protegidas por los permisos de MatchWork.</p>
            {storageNotice ? <p className="mt-1 text-amber-200" role="status">{storageNotice}</p> : null}
            {authIssue ? <p className="mt-1 text-rose-300" role="alert">{authIssue}</p> : null}
          </footer>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-2 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-stretch gap-1">
          {navigation.map((item) => renderNavigationItem(item, true))}
        </div>
      </nav>
    </div>
  );
}
