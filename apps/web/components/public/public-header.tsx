import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:min-h-[72px] sm:px-8">
        <Link
          aria-label="Freework, ir al inicio"
          className="text-lg font-semibold tracking-tight text-foreground"
          href="/"
        >
          Freework
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-2 sm:gap-4">
          <Link
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            href="/iniciar-sesion"
          >
            Iniciar sesión
          </Link>
          <ButtonLink href="/registro" size="sm">
            Registrarse
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
