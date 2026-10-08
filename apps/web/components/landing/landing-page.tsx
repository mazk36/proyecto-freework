import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ButtonLink } from "@/components/ui/button";
import { MatchWorkMark } from "@/components/brand/matchwork-logo";

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
      "Recibe propuestas de soluciones y encuentra la que mejor se alinee con tu negocio. Cuando ambas partes quieran avanzar, hacen Match para continuar la conversación.",
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
      className="relative isolate min-h-[20rem] overflow-hidden rounded-[1.75rem] border border-border bg-[radial-gradient(ellipse_at_55%_46%,rgba(216,196,255,0.6),transparent_62%)] sm:min-h-[26rem]"
    >
      <div className="absolute inset-4 rounded-[1.25rem] border border-brand-navy/10 sm:inset-6" />
      <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 480 400">
        <path d="M112 130C178 130 185 200 240 200s63 70 128 70" stroke="#0B2A5B" strokeOpacity=".18" strokeWidth="2" />
        <circle cx="112" cy="130" fill="#0B2A5B" r="5" />
        <circle cx="240" cy="200" fill="#8A4DFF" r="7" />
        <circle cx="368" cy="270" fill="#8A4DFF" r="5" />
      </svg>

      <div className="absolute left-[7%] top-[15%] w-[38%] max-w-44 rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_50px_rgba(11,42,91,0.12)] sm:left-[10%] sm:top-[18%] sm:p-5">
        <p className="font-mono text-[0.65rem] font-medium tracking-[0.12em] text-brand-slate">PROBLEMA</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-4/5 rounded-full bg-brand-navy/15" />
          <div className="h-2 w-3/5 rounded-full bg-brand-navy/10" />
          <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[1.5rem] border border-brand-lavender bg-surface-raised shadow-[0_20px_50px_rgba(11,42,91,0.14)] sm:size-32 sm:rounded-[1.75rem]">
        <MatchWorkMark className="w-14 sm:w-[4.5rem]" />
        <span className="mt-1 rounded-full bg-accent px-2.5 py-1 font-mono text-[0.55rem] font-medium tracking-[0.12em] text-white sm:mt-2 sm:text-[0.6rem]">
          MATCH
        </span>
      </div>

      <div className="absolute bottom-[15%] right-[7%] w-[38%] max-w-44 rounded-2xl border border-brand-lavender bg-surface-raised p-4 shadow-[0_20px_50px_rgba(11,42,91,0.12)] sm:bottom-[18%] sm:right-[10%] sm:p-5">
        <p className="font-mono text-[0.65rem] font-medium tracking-[0.12em] text-accent">PROPUESTA</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-4/5 rounded-full bg-brand-purple/45" />
          <div className="h-2 w-3/5 rounded-full bg-brand-purple/20" />
          <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
        </div>
      </div>
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
          <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Cuando una propuesta encaja con tu problema y ambas partes quieren avanzar, hacen{" "}
            <span className="font-semibold text-accent">Match</span> para continuar la conversación.
          </p>
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
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Encuentra la solución y haz Match.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Publica un problema o explora oportunidades. Cuando ambas partes encuentran el encaje, hacen Match.
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
