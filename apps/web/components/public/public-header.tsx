import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { MatchWorkWordmark } from "@/components/brand/matchwork-logo";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:min-h-[72px] sm:px-8">
        <Link
          aria-label="MatchWork, ir al inicio"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/"
        >
          <MatchWorkWordmark />
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-2 sm:gap-4">
          <Link
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            href="/iniciar-sesion"
          >
            <span className="sm:hidden">Entrar</span>
            <span className="hidden sm:inline">Iniciar sesión</span>
          </Link>
          <ButtonLink href="/registro" size="sm">
            Registrarse
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
