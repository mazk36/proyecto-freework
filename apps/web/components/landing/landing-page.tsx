import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ButtonLink } from "@/components/ui/button";

const heroBenefits = [
  "No importa lo difícil del problema: encontrarás a un experto.",
  "Todos los tipos de trabajo que puedas imaginar.",
  "Encuentra y analiza las propuestas gratis.",
  "Paga solo cuando estés 100% satisfecho.",
];

const expertBenefits = [
  {
    title: "Encuentra expertos",
    description:
      "Descubre a los expertos en el área que necesites y revisa todos los problemas que han resuelto antes.",
  },
  {
    title: "Elige la propuesta ideal",
    description:
      "Recibe propuestas de soluciones y encuentra la que mejor se alinee con tu negocio.",
  },
  {
    title: "Supervisa cada avance",
    description:
      "Una vez aceptada la solución, puedes supervisar en todo momento el avance de la implementación, estés donde estés.",
  },
  {
    title: "Paga con confianza",
    description: "¡Solo pagas si quedas contento con el resultado final!",
  },
];

function ExpertBenefitsArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative isolate min-h-[20rem] overflow-hidden rounded-[1.75rem] border border-border bg-[radial-gradient(ellipse_at_58%_44%,rgba(139,92,246,0.24),transparent_58%)] sm:min-h-[26rem]"
    >
      <div className="absolute inset-4 rounded-[1.25rem] border border-white/[0.06] sm:inset-6" />
      <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20 sm:size-72" />
      <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/30 sm:size-52" />
      <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 shadow-[0_0_90px_rgba(139,92,246,0.3)] sm:size-32" />
      <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_28px_rgba(167,139,250,0.9)]" />

      <div className="absolute left-[12%] top-[24%] size-3 rounded-full border border-accent/70 bg-background shadow-[0_0_24px_rgba(139,92,246,0.55)]" />
      <div className="absolute right-[17%] top-[31%] size-2.5 rounded-full bg-violet-300 shadow-[0_0_24px_rgba(196,181,253,0.8)]" />
      <div className="absolute bottom-[24%] left-[26%] size-2 rounded-full bg-fuchsia-300 shadow-[0_0_24px_rgba(240,171,252,0.75)]" />
      <div className="absolute bottom-[19%] right-[21%] size-3 rounded-full border border-violet-300/80 bg-background shadow-[0_0_24px_rgba(196,181,253,0.65)]" />

      <div className="absolute left-[8%] top-[11%] h-px w-16 rotate-[28deg] bg-gradient-to-r from-transparent via-accent/70 to-transparent sm:left-[15%] sm:top-[15%] sm:w-24" />
      <div className="absolute bottom-[15%] right-[8%] h-px w-20 -rotate-[32deg] bg-gradient-to-r from-transparent via-violet-300/60 to-transparent sm:right-[14%] sm:bottom-[19%] sm:w-28" />
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <h1 className="max-w-5xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Contrata la mejor solución para tu problema en línea.
          </h1>
          <ul className="mt-7 grid max-w-3xl gap-3 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {heroBenefits.map((benefit) => (
              <li className="flex items-start gap-3" key={benefit}>
                <span aria-hidden="true" className="mt-[0.8rem] size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink className="min-h-12 px-6" href="/registro" size="lg">
              Publica tu problema
            </ButtonLink>
            <ButtonLink className="min-h-12 px-6" href="/registro" size="lg" variant="outline">
              Resuelve un problema
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="expertos-title" className="border-y border-border" id="como-funciona">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-14">
            <div>
              <h2 className="max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl" id="expertos-title">
                Resuelve el problema que sea con nuestros expertos
              </h2>
              <div className="mt-9 grid gap-x-8 sm:grid-cols-2">
                {expertBenefits.map((benefit, index) => (
                  <article className="border-t border-border py-5" key={benefit.title}>
                    <p className="font-mono text-xs text-accent">0{index + 1}</p>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight sm:text-xl">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                      {benefit.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <ExpertBenefitsArtwork />
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza desde un problema.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Crea una cuenta para compartir una necesidad o descubrir nuevas oportunidades.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/registro">Publica tu problema</ButtonLink>
            <ButtonLink href="/registro" variant="outline">Resuelve un problema</ButtonLink>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
