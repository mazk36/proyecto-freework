import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
        <Link className="text-base font-bold tracking-[-0.04em] text-foreground" href="/">
          Freework
        </Link>
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">
          Experiencia de demostración. Los problemas y las propuestas son ficticios y los formularios no guardan información.
        </p>
        <div className="flex gap-5 text-xs font-medium text-muted-foreground">
          <Link className="hover:text-foreground" href="/problems">
            Explorar problemas
          </Link>
          <Link className="hover:text-foreground" href="/problems/new">
            Publicar
          </Link>
        </div>
      </div>
    </footer>
  );
}
