"use client";

import {
  CircleUserRound,
  Compass,
  Heart,
  Layers3,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountStatusContext, SuspensionNotice, type AccountStatus } from "@/components/app/account-status";
import { isAdmin as checkIsAdmin } from "@/lib/admin-service";
import { getMyAccountStatus } from "@/lib/company-verification-service";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import type { UserRole } from "@/lib/auth";
import { CHAT_DATA_CHANGED, notifyChatDataChanged } from "@/lib/chat-events";
import { subscribeToAllMessages, unreadTotal } from "@/lib/chat-service";
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [accountStatusResult, setAccountStatusResult] = useState<{ userId: string; status: AccountStatus } | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [adminResult, setAdminResult] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const showAdminLink = adminResult !== null && adminResult.userId === user?.id && adminResult.isAdmin;
  const accountStatus: AccountStatus = accountStatusResult && accountStatusResult.userId === user?.id ? accountStatusResult.status : { state: "loading" };
  const isChatPage = pathname === "/app/chats" || pathname === "/app/chats/";

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setAccountStatusResult({ userId: user.id, status: { state: "loading" } });
    void getMyAccountStatus().then((status) => {
      if (active) setAccountStatusResult({ userId: user.id, status: status.suspended ? { state: "suspended", reason: status.reason } : { state: "active" } });
    }).catch(() => { if (active) setAccountStatusResult({ userId: user.id, status: { state: "error" } }); });
    return () => { active = false; };
  }, [user?.id, statusAttempt]);

  // The link is only a convenience: every admin RPC re-checks the role on the server.
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void checkIsAdmin().then((value) => { if (active) setAdminResult({ userId: user.id, isAdmin: value }); }).catch(() => { if (active) setAdminResult({ userId: user.id, isAdmin: false }); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setUnreadCount(0);
    let active = true;
    let request = 0;
    let debounce: number | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const current = ++request;
      void unreadTotal().then((total) => {
        if (active && current === request) setUnreadCount(total);
      }).catch(() => console.error("No se pudo actualizar el contador de mensajes."));
    };
    const scheduleRefresh = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(refresh, 150);
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener(CHAT_DATA_CHANGED, scheduleRefresh);
    document.addEventListener("visibilitychange", onVisible);
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToAllMessages(() => notifyChatDataChanged());
    } catch {
      console.error("No se pudo activar la actualización en tiempo real del contador de mensajes.");
    }
    return () => {
      active = false;
      window.clearTimeout(debounce);
      window.clearInterval(timer);
      window.removeEventListener(CHAT_DATA_CHANGED, scheduleRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [user?.id]);

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
        <span className="relative shrink-0">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
          {item.id === "chats" && unreadCount > 0 ? (
            <span aria-label={`${unreadCount} mensajes sin leer`} className="absolute -right-2.5 -top-2 grid min-h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-accent-soft px-1 text-[0.625rem] font-bold leading-none text-brand-navy" role="img">
              <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>
            </span>
          ) : null}
        </span>
        <span className={compact ? "max-w-full truncate" : "sr-only lg:not-sr-only"}>{item.label}</span>
      </Link>
    );
  }

  return (
    <AccountStatusContext.Provider value={accountStatus}><div className={`private-app-shell flex flex-col bg-background text-foreground ${isChatPage ? "h-dvh overflow-hidden" : "min-h-screen"}`}>
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-3 focus:text-foreground" href="#main-content">
        Saltar al contenido
      </a>

      <header className="shrink-0 border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-[1720px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:min-h-[72px] sm:px-6 lg:px-8">
          <Link aria-label="MatchWork, inicio de la aplicación" className="inline-flex min-h-11 min-w-11 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/app">
            <MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" preload />
          </Link>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <div className="min-w-0 text-right">
              <p className="max-w-32 truncate text-sm font-medium text-foreground sm:max-w-52">{user.name}</p>
              <p className="text-[0.6875rem] text-muted-foreground sm:text-xs">{roleLabel}</p>
            </div>
            {showAdminLink ? (
              <Link aria-label="Admin" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden" href="/app/admin/">
                <ShieldCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </Link>
            ) : null}
            <button
              className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-4 sm:text-sm"
              onClick={handleLogout}
              type="button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        {isChatPage && (storageNotice || authIssue) ? <div className="mx-auto w-full max-w-[1720px] px-4 pb-3 text-xs leading-5 sm:px-6 lg:px-8">
          {storageNotice ? <p className="text-amber-200" role="status">{storageNotice}</p> : null}
          {authIssue ? <p className="text-rose-300" role="alert">{authIssue}</p> : null}
        </div> : null}
      </header>

      {accountStatus.state === "suspended" ? <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 lg:px-8"><SuspensionNotice onLogout={handleLogout} reason={accountStatus.reason} /></div> : null}
      {accountStatus.state === "error" ? <div className="mx-auto w-full max-w-[1720px] px-4 py-3 text-sm text-muted-foreground" role="status">No pudimos consultar el estado de tu cuenta. Las acciones de escritura están pausadas. <button className="min-h-11 rounded px-2 font-semibold text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => setStatusAttempt((value) => value + 1)} type="button">Reintentar</button></div> : null}
      {accountStatus.state === "loading" ? <p className="px-4 py-2 text-sm text-muted-foreground" role="status">Comprobando el estado de tu cuenta…</p> : null}

      <div className={`mx-auto grid w-full max-w-[1720px] flex-1 grid-cols-1 md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)] ${isChatPage ? "min-h-0" : ""}`}>
        <aside className="hidden border-r border-border px-3 py-7 md:block lg:px-5">
          <nav aria-label="Navegación principal" className="sticky top-6 flex flex-col gap-2">
            {navigation.map((item) => renderNavigationItem(item))}
            {showAdminLink ? (
              <Link
                aria-current={pathname.startsWith("/app/admin") ? "page" : undefined}
                className={`group flex min-h-11 min-w-0 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:justify-start ${pathname.startsWith("/app/admin") ? "bg-accent/15 text-foreground ring-1 ring-inset ring-accent/20" : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"}`}
                href="/app/admin/"
                title="Admin"
              >
                <ShieldCheck aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                <span className="sr-only lg:not-sr-only">Admin</span>
              </Link>
            ) : null}
          </nav>
        </aside>

        <div className={`flex min-w-0 flex-col ${isChatPage ? "min-h-0" : ""}`}>
          <div className={`min-w-0 flex-1 ${isChatPage ? "min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0" : "pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0"}`} id="main-content" tabIndex={-1}>
            {children}
          </div>
          <footer className={`${isChatPage ? "hidden" : ""} border-t border-border px-4 py-4 text-center text-xs leading-5 text-muted-foreground sm:px-6`}>
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
    </div></AccountStatusContext.Provider>
  );
}
