import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16 text-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6733ca]">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">No encontramos esta página.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Comprueba la dirección o vuelve al inicio de MatchWork.
        </p>
        <Link className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#7940e8] px-4 text-sm font-semibold text-white hover:bg-[#6733ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
