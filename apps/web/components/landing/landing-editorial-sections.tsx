import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CarFront,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clapperboard,
  Landmark,
  Palette,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MatchWorkMark } from "@/components/brand/matchwork-logo";

type FeatureMediaPanelProps = {
  title: string;
  description?: string;
  videoSrc?: string;
  posterSrc?: string;
  align?: "left" | "right";
  href?: string;
  themeVariant?: "night" | "mist";
  className?: string;
};

type FeatureTileItem = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

const businessFeatures: FeatureTileItem[] = [
  {
    title: "AUMENTAR VENTAS",
    description: "Encuentra apoyo para vender más y mejorar tu proceso comercial.",
    Icon: ChartNoAxesCombined,
  },
  {
    title: "RESOLVER ASUNTOS LEGALES",
    description: "Conecta con profesionales que te ayuden a enfrentar necesidades legales.",
    Icon: Landmark,
  },
  {
    title: "MEJORAR TU IMAGEN DE MARCA",
    description: "Transforma cómo se ve y se percibe tu negocio.",
    Icon: Palette,
  },
  {
    title: "REDUCIR COSTOS",
    description: "Descubre nuevas formas de operar con mayor eficiencia.",
    Icon: CircleDollarSign,
  },
];

const specializedFeatures: FeatureTileItem[] = [
  {
    title: "AUTOMATIZAR PROCESOS",
    description: "Reduce tareas manuales y conecta mejor tus operaciones.",
    Icon: Workflow,
  },
  {
    title: "SOFTWARE A MEDIDA",
    description: "Construye herramientas adaptadas a las necesidades de tu negocio.",
    Icon: BriefcaseBusiness,
  },
  {
    title: "PRODUCCIÓN Y EDICIÓN DE VIDEO",
    description: "Crea piezas audiovisuales para comunicar mejor tu propuesta.",
    Icon: Clapperboard,
  },
  {
    title: "DISEÑO AUTOMOTRIZ",
    description: "Encuentra talento especializado para proyectos de diseño automotriz.",
    Icon: CarFront,
  },
];

function FeatureMediaPanel({
  title,
  description,
  videoSrc,
  posterSrc,
  align = "left",
  href,
  themeVariant = "night",
  className = "",
}: FeatureMediaPanelProps) {
  const isNight = themeVariant === "night";

  return (
    <article className={`flex h-full min-h-[30rem] flex-col ${className}`.trim()}>
      <div
        className={`relative isolate flex min-h-[21rem] flex-1 overflow-hidden rounded-[1.75rem] border ${
          isNight
            ? "border-brand-navy bg-brand-navy text-white"
            : "border-brand-lavender/70 bg-surface-raised text-brand-navy"
        }`}
      >
        {videoSrc ? (
          <video
            aria-label={title}
            className="absolute inset-0 size-full object-cover"
            controls
            playsInline
            preload="metadata"
            poster={posterSrc}
          >
            <source src={videoSrc} />
          </video>
        ) : (
          <div
            aria-label={`Espacio para video: ${title}`}
            className={`absolute inset-0 overflow-hidden ${
              isNight
                ? "bg-[radial-gradient(ellipse_at_72%_23%,rgba(138,77,255,0.45),transparent_35%),linear-gradient(145deg,#0B2A5B_8%,#102F67_62%,#18265A)]"
                : "bg-[radial-gradient(ellipse_at_75%_20%,rgba(216,196,255,0.9),transparent_40%),linear-gradient(145deg,#F8FAFC_8%,#F5F7FB_60%,#E9E2FF)]"
            }`}
            role="img"
          >
            <div className="absolute -right-16 -top-16 size-64 rounded-full border border-white/15" />
            <div className="absolute -right-5 -top-5 size-44 rounded-full border border-white/15" />
            <div className="absolute -bottom-24 -left-10 size-64 rounded-full border border-brand-purple/30" />
            <svg
              aria-hidden="true"
              className={`absolute inset-0 size-full ${isNight ? "text-white/35" : "text-brand-navy/25"}`}
              fill="none"
              viewBox="0 0 560 420"
            >
              <path d="M90 105h105c54 0 54 96 110 96h90c42 0 45 76 92 76" stroke="currentColor" strokeWidth="2" />
              <circle cx="90" cy="105" fill={isNight ? "#D8C4FF" : "#0B2A5B"} r="5" />
              <circle cx="305" cy="201" fill="#8A4DFF" r="8" />
              <circle cx="487" cy="277" fill={isNight ? "#D8C4FF" : "#8A4DFF"} r="5" />
            </svg>

            <div
              className={`absolute left-[7%] top-[15%] w-[42%] max-w-52 rounded-2xl border p-4 shadow-[0_18px_48px_rgba(0,0,0,0.14)] sm:p-5 ${
                isNight
                  ? "border-white/15 bg-white/95 text-brand-navy"
                  : "border-brand-lavender bg-white text-brand-navy"
              }`}
            >
              <span className="font-mono text-[0.58rem] font-medium tracking-[0.15em] text-brand-slate">PROBLEMA</span>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-4/5 rounded-full bg-brand-navy/15" />
                <div className="h-2 w-3/5 rounded-full bg-brand-navy/10" />
                <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.4rem] border border-brand-lavender/80 bg-white shadow-[0_18px_48px_rgba(11,42,91,0.18)] sm:size-24">
              <MatchWorkMark className="w-10 sm:w-12" />
            </div>

            <div
              className={`absolute bottom-[15%] right-[7%] w-[42%] max-w-52 rounded-2xl border p-4 shadow-[0_18px_48px_rgba(0,0,0,0.14)] sm:p-5 ${
                isNight
                  ? "border-brand-lavender/70 bg-white/95 text-brand-navy"
                  : "border-brand-lavender bg-white text-brand-navy"
              }`}
            >
              <span className="font-mono text-[0.58rem] font-medium tracking-[0.15em] text-accent">PROPUESTA</span>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-4/5 rounded-full bg-brand-purple/45" />
                <div className="h-2 w-3/5 rounded-full bg-brand-purple/20" />
                <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
              </div>
            </div>

            <div
              className={`absolute bottom-5 left-5 flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.6rem] font-medium tracking-[0.12em] backdrop-blur sm:bottom-6 sm:left-6 ${
                isNight
                  ? "border-white/20 bg-brand-navy/65 text-white"
                  : "border-brand-lavender/70 bg-white/80 text-brand-navy"
              }`}
            >
              <span className="size-2 rounded-full bg-accent" />
              LISTO PARA TU VIDEO
            </div>
          </div>
        )}
      </div>

      <div className={`flex items-start justify-between gap-4 px-1 pt-5 ${align === "right" ? "text-right" : "text-left"}`}>
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{title}</h3>
          {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {href ? (
          <Link
            aria-label={`Encuentra tu Match: ${title}`}
            className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-brand-navy transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            href={href}
          >
            <ArrowUpRight aria-hidden="true" className="size-5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function FeatureTile({ title, description, Icon }: FeatureTileItem) {
  return (
    <Link
      className="group flex min-h-[14rem] flex-col rounded-[1.4rem] border border-border bg-surface-raised p-5 shadow-[0_12px_36px_rgba(11,42,91,0.035)] transition duration-200 hover:-translate-y-1 hover:border-brand-lavender hover:shadow-[0_18px_42px_rgba(11,42,91,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:p-6"
      href="/registro"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-mist text-brand-navy transition-colors group-hover:bg-brand-lavender/50 group-hover:text-accent">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        <span className="font-mono text-[0.65rem] font-medium tracking-[0.12em] text-accent">MATCH</span>
      </div>
      <h3 className="mt-6 max-w-xs font-display text-base font-semibold leading-snug tracking-[-0.025em] text-brand-navy sm:text-lg">
        {title}
      </h3>
      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
        <ArrowDownRight aria-hidden="true" className="mb-1 size-5 shrink-0 text-accent transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
      </div>
    </Link>
  );
}

function FeatureGrid({ features }: { features: FeatureTileItem[] }) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {features.map((feature) => <FeatureTile key={feature.title} {...feature} />)}
    </div>
  );
}

export function LandingEditorialSections() {
  return (
    <>
      <section aria-labelledby="retos-negocio-title" className="py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <p className="font-mono text-xs font-medium tracking-[0.16em] text-accent">01 / RETOS DE NEGOCIO</p>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl" id="retos-negocio-title">
              Encuentra soluciones para los retos de tu negocio
            </h2>
          </div>
          <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10">
            <FeatureMediaPanel
              align="left"
              description="Cuando el reto y la propuesta encajan, hacen Match y pueden avanzar juntos."
              href="/registro"
              themeVariant="night"
              title="Del problema a una solución que hace Match"
            />
            <FeatureGrid features={businessFeatures} />
          </div>
        </div>
      </section>

      <section aria-labelledby="proyectos-especializados-title" className="border-y border-border bg-surface/70 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <p className="font-mono text-xs font-medium tracking-[0.16em] text-accent">02 / TALENTO ESPECIALIZADO</p>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl" id="proyectos-especializados-title">
              También para proyectos especializados
            </h2>
          </div>
          <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
            <FeatureMediaPanel
              align="right"
              className="lg:col-start-2 lg:row-start-1"
              description="Encuentra el talento ideal y convierte una necesidad especializada en un nuevo Match."
              href="/registro"
              themeVariant="mist"
              title="Haz Match con talento especializado"
            />
            <div className="lg:col-start-1 lg:row-start-1">
              <FeatureGrid features={specializedFeatures} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
