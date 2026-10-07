import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16 text-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">No encontramos esta página.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Comprueba la dirección o vuelve al inicio de Freework.
        </p>
        <Link className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
