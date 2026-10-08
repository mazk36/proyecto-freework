import Image from "next/image";
import astronautPhoto from "@/public/images/astronaut-matchwork.webp";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ButtonLink } from "@/components/ui/button";
import { LandingEditorialSections } from "@/components/landing/landing-editorial-sections";

const heroBenefits = [
  {
    text: "No importa lo difícil del problema: encontrarás a un experto.",
    highlight: "encontrarás a un experto",
  },
  {
    text: "Todos los tipos de trabajo que puedas imaginar.",
    highlight: "tipos de trabajo",
  },
  {
    text: "Encuentra y analiza las propuestas gratis.",
    highlight: "propuestas gratis",
  },
  {
    text: "Paga solo cuando estés 100% satisfecho.",
    highlight: "100% satisfecho",
  },
];

function HighlightedText({
  text,
  highlight,
  tone,
}: {
  text: string;
  highlight: string;
  tone: "purple" | "lavender";
}) {
  const [before, after] = text.split(highlight);

  return (
    <>
      {before}
      <span className={tone === "purple" ? "font-medium text-brand-purple" : "font-medium text-brand-lavender"}>
        {highlight}
      </span>
      {after}
    </>
  );
}

const expertBenefits = [
  {
    title: "Encuentra expertos",
    description: (
      <>
        Descubre a los <span className="font-medium text-brand-lavender">expertos en el área que necesites</span> y revisa todos
        los problemas que han resuelto antes.
      </>
    ),
  },
  {
    title: "Elige la propuesta ideal",
    description: (
      <>
        Recibe propuestas de soluciones y encuentra la que mejor se alinee con tu negocio. Cuando ambas partes quieran avanzar, hacen{" "}
        <span className="font-semibold text-brand-lavender">Match</span> para continuar la conversación.
      </>
    ),
  },
  {
    title: "Supervisa cada avance",
    description: (
      <>
        Una vez aceptada la solución, puedes <span className="font-medium text-brand-lavender">supervisar cada avance</span> de
        la implementación, estés donde estés.
      </>
    ),
  },
  {
    title: "Paga con confianza",
    description: (
      <>
        ¡Solo pagas si quedas <span className="font-medium text-brand-purple">contento con el resultado final!</span>
      </>
    ),
  },
];

export function LandingPage() {
  return (
    <div className="public-landing flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <h1 className="max-w-5xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Contrata la <span className="text-brand-lavender">mejor solución</span> para tu{" "}
            <span className="text-brand-purple">problema</span> en línea.
          </h1>
          <ul className="mt-7 grid max-w-3xl gap-3 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {heroBenefits.map((benefit, index) => (
              <li className="flex items-start gap-3" key={benefit.text}>
                <span aria-hidden="true" className="mt-[0.8rem] size-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <HighlightedText
                    highlight={benefit.highlight}
                    text={benefit.text}
                    tone={index % 2 === 0 ? "lavender" : "purple"}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Cuando una propuesta encaja con tu problema y ambas partes quieren avanzar, hacen{" "}
            <span className="font-semibold text-brand-lavender">Match</span> para continuar la conversación.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink className="min-h-12 px-6" href="/iniciar-sesion" size="lg">
              Publica tu problema
            </ButtonLink>
            <ButtonLink className="min-h-12 px-6" href="/iniciar-sesion" size="lg" variant="outline">
              Resuelve un problema
            </ButtonLink>
          </div>
        </section>

        <section
          aria-labelledby="expertos-title"
          className="relative isolate min-h-[42rem] overflow-hidden border-y border-border bg-brand-navy text-brand-white md:min-h-[46rem] lg:min-h-[43.75rem]"
          id="como-funciona"
        >
          <div aria-hidden="true" className="absolute inset-0">
            <Image
              alt=""
              className="object-cover object-left"
              fill
              sizes="100vw"
              src={astronautPhoto}
              unoptimized
            />
          </div>

          <div className="relative z-10 mx-auto flex max-w-[78rem] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[43.75rem] lg:py-16">
            <div className="w-full max-w-[35rem]">
              <h2 className="rounded-[1.5rem] border border-white/15 bg-[#0d1117]/80 px-5 py-6 text-balance text-3xl font-semibold leading-tight tracking-tight text-brand-white shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[2px] sm:px-7 sm:text-4xl lg:text-[2.5rem]" id="expertos-title">
                Resuelve el <span className="text-brand-purple">problema</span> que sea con nuestros{" "}
                <span className="text-brand-lavender">expertos</span>
              </h2>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {expertBenefits.map((benefit) => (
                  <article className="rounded-2xl border border-white/15 bg-[#0d1117]/80 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop-blur-[2px]" key={benefit.title}>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-brand-purple sm:text-xl">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-brand-mist/90 sm:text-[0.95rem] sm:leading-6">
                      {benefit.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <LandingEditorialSections />

        <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Encuentra la <span className="text-brand-lavender">solución</span> y haz{" "}
              <span className="text-brand-purple">Match.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Publica un problema o explora oportunidades. Cuando ambas partes encuentran el encaje, hacen{" "}
              <span className="font-medium text-brand-lavender">Match.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/iniciar-sesion">Publica tu problema</ButtonLink>
            <ButtonLink href="/iniciar-sesion" variant="outline">Resuelve un problema</ButtonLink>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
