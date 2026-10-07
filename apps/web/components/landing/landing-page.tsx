import Link from "next/link";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { ButtonLink } from "@/components/ui/button";

const companySteps = [
  "Publica un problema.",
  "Recibe diferentes propuestas.",
  "Elige con quién quieres continuar.",
];

const freelancerSteps = [
  "Descubre problemas.",
  "Propón una solución.",
  "Haz Match con empresas interesadas.",
];

function Steps({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section aria-labelledby={`${id}-title`} className="border-t border-border py-7">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent" id={`${id}-title`}>
        {title}
      </h3>
      <ol className="mt-5 space-y-3 text-base leading-7 text-foreground sm:text-lg">
        {items.map((item, index) => (
          <li className="flex gap-4" key={item}>
            <span aria-hidden="true" className="w-6 shrink-0 font-mono text-sm text-muted-foreground">
              0{index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <p className="text-sm font-medium text-accent">Freework conecta necesidades con distintas perspectivas.</p>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Describe el problema.
            <br className="hidden sm:block" /> Encuentra la solución.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Las empresas publican los problemas que necesitan resolver y profesionales independientes proponen diferentes formas de solucionarlos.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink className="min-h-12 px-6" href="/registro" size="lg">
              Registrarse
            </ButtonLink>
            <ButtonLink className="min-h-12 px-6" href="/iniciar-sesion" size="lg" variant="outline">
              Iniciar sesión
            </ButtonLink>
          </div>
        </section>

        <section className="border-y border-border" id="como-funciona">
          <div className="mx-auto grid max-w-6xl gap-x-16 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2">
            <Steps id="empresas" items={companySteps} title="Empresas" />
            <Steps id="profesionales" items={freelancerSteps} title="Profesionales independientes" />
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
            <ButtonLink href="/registro">Registrarse</ButtonLink>
            <Link className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/iniciar-sesion">
              Iniciar sesión
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
