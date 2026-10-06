"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RoleSwitcher } from "@/components/discovery/role-switcher";
import { useDemoStore } from "@/components/discovery/demo-store";
import { ButtonLink } from "@/components/ui/button";

const publicNavigation = [
  { label: "Descubrir", href: "/discover" },
  { label: "Explorar problemas", href: "/problems" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Para empresas", href: "/problems/new" },
];

const freelancerNavigation = [
  { label: "Discover", href: "/discover" },
  { label: "Explore", href: "/problems" },
  { label: "Saved", href: "/saved" },
  { label: "My proposals", href: "/proposals" },
  { label: "Matches", href: "/matches" },
  { label: "Profile", href: "/profile" },
];

const companyNavigation = [
  { label: "Discover solutions", href: "/discover" },
  { label: "My problems", href: "/company/problems" },
  { label: "Saved", href: "/saved" },
  { label: "Matches", href: "/matches" },
  { label: "Profile", href: "/profile" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const signInDialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const { role } = useDemoStore();
  const isProductRoute = pathname !== "/";
  const productNavigation = role === "company" ? companyNavigation : freelancerNavigation;

  useEffect(() => {
    const dialog = signInDialogRef.current;
    if (!dialog) return;
    if (signInOpen && !dialog.open) dialog.showModal();
    if (!signInOpen && dialog.open) dialog.close();
  }, [signInOpen]);

  const navLinkClass = (href: string) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
          <Link
            aria-label="Freework, ir al inicio"
            className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-[-0.04em] text-foreground"
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            <span className="grid size-8 place-items-center rounded-[10px] bg-accent text-sm font-black text-white">f</span>
            Freework
          </Link>

          {!isProductRoute ? (
            <nav aria-label="Navegación pública" className="hidden items-center gap-1 xl:flex">
              {publicNavigation.map((item) => (
                <Link className={navLinkClass(item.href)} href={item.href} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <RoleSwitcher />
            {!isProductRoute ? (
              <>
                <button
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:inline-flex"
                  onClick={() => setSignInOpen(true)}
                  type="button"
                >
                  Iniciar sesión
                </button>
                <ButtonLink className="hidden sm:inline-flex" href="/problems/new" size="sm">
                  Publicar un problema
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </ButtonLink>
              </>
            ) : null}
            {!isProductRoute ? (
              <button
                aria-controls="mobile-navigation"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                className="grid size-10 place-items-center rounded-xl border border-border text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent xl:hidden"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
              </button>
            ) : null}
          </div>
        </div>

        {isProductRoute ? (
          <nav aria-label="Navegación del producto" className="border-t border-border/70">
            <div className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-3 py-2 sm:px-6 lg:px-9">
              {productNavigation.map((item) => (
                <Link className={navLinkClass(item.href)} href={item.href} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : (
          <nav
            aria-label="Navegación móvil"
            className={`border-t border-border bg-white px-5 py-3 xl:hidden ${menuOpen ? "" : "hidden"}`}
            id="mobile-navigation"
          >
            <div className="mx-auto grid max-w-[1320px] gap-1">
              {publicNavigation.map((item) => (
                <Link
                  className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                  href={item.href}
                  key={item.label}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <button
                className="rounded-lg px-3 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  setSignInOpen(true);
                }}
                type="button"
              >
                Iniciar sesión
              </button>
            </div>
          </nav>
        )}
      </header>

      <dialog
        aria-labelledby="sign-in-title"
        className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-white p-6 text-foreground shadow-2xl backdrop:bg-black/40"
        onClose={() => setSignInOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) signInDialogRef.current?.close();
        }}
        ref={signInDialogRef}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">Próximamente</p>
            <h2 className="text-xl font-semibold tracking-tight" id="sign-in-title">El acceso aún no está habilitado</h2>
          </div>
          <button
            aria-label="Cerrar aviso"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => signInDialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">Esta versión es una demostración. La autenticación se definirá en una siguiente etapa.</p>
      </dialog>
    </>
  );
}
