import Link from "next/link";

export function ProblemPublishingPlaceholder() {
  return (
    <section aria-labelledby="publish-title" className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <Link className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground" href="/app/problemas">
        Volver a Mis problemas
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight" id="publish-title">Publicar un problema</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
        La publicación de problemas estará disponible cuando Freework cuente con un servicio para guardar y compartir esa información. No se ha cargado ningún ejemplo.
      </p>
    </section>
  );
}
