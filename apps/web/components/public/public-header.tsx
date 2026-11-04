import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 sm:min-h-[72px] sm:gap-4 sm:px-8">
        <Link
          aria-label="MatchWork, ir al inicio"
          className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/"
        >
          <MatchWorkLogoLockup size="large" preload variant="reversed" />
        </Link>
        <nav aria-label="Acciones principales" className="flex items-center gap-1 sm:gap-3">
          <ButtonLink
            className="!min-h-11 !bg-[#7940e8] !px-1.5 !text-xs !text-white hover:!bg-[#6733ca] sm:!px-3 sm:!text-sm"
            href="/app/problemas/nuevo"
            size="sm"
          >
            Publica tu problema
          </ButtonLink>
          <ButtonLink
            className="!min-h-11 !px-1.5 !text-xs sm:!px-3 sm:!text-sm"
            href="/app/explorar"
            size="sm"
            variant="outline"
          >
            Resuelve un problema
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
