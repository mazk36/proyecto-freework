import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MatchWorkLogo } from "@/components/brand/matchwork-logo";

type FeatureMediaPanelProps = {
  title: string;
  titleHighlight?: string;
  description?: string;
  videoSrc?: string;
  posterSrc?: string;
  align?: "left" | "right";
  href?: string;
  themeVariant?: "night" | "violet";
  className?: string;
  mediaOnly?: boolean;
};

type CategoryImageItem = {
  title: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  objectPosition?: string;
  showTitle?: boolean;
  sizes?: string;
};

const publicBasePath = process.env.PAGES_BASE_PATH ?? "";
const specializedImageSizes = "(min-width: 1280px) 280px, (min-width: 1024px) 230px, (min-width: 640px) 290px, 45vw";

const businessCategories: CategoryImageItem[] = [
  {
    title: "AUMENTAR VENTAS",
    imageSrc: `${publicBasePath}/images/categories/sales-cash-crystal.webp`,
    imageAlt: "Fajos de billetes sobre una mesa de cristal con copas y luces nocturnas.",
    href: "/registro",
    objectPosition: "center 58%",
    showTitle: true,
  },
  {
    title: "RESOLVER ASUNTOS LEGALES",
    imageSrc: `${publicBasePath}/images/categories/legal-executive.webp`,
    imageAlt: "Profesional revisando documentos y hablando por teléfono en su despacho nocturno.",
    href: "/registro",
    objectPosition: "48% center",
    showTitle: true,
  },
  {
    title: "MEJORAR TU IMAGEN DE MARCA",
    imageSrc: `${publicBasePath}/images/categories/game-development.webp`,
    imageAlt: "Manos sosteniendo un teléfono con un videojuego de acción frente a pantallas de desarrollo.",
    href: "/registro",
    objectPosition: "center",
    showTitle: true,
  },
  {
    title: "REDUCIR COSTOS",
    imageSrc: `${publicBasePath}/images/categories/costs-accounting.webp`,
    imageAlt: "Manos usando una calculadora entre recibos y documentos en un escritorio nocturno.",
    href: "/registro",
    objectPosition: "center 58%",
    showTitle: true,
  },
];

const specializedCategories: CategoryImageItem[] = [
  {
    title: "AUTOMATIZAR PROCESOS",
    imageSrc: `${publicBasePath}/images/categories/automatizar-procesos.webp`,
    imageAlt: "Operario con exotraje robótico levantando maquinaria pesada en una fábrica.",
    href: "/registro",
    showTitle: true,
    sizes: specializedImageSizes,
  },
  {
    title: "SOFTWARE A MEDIDA",
    imageSrc: `${publicBasePath}/images/categories/software-a-medida.webp`,
    imageAlt: "Dos teléfonos muestran pantallas de una aplicación y un panel de software a medida.",
    href: "/registro",
    showTitle: true,
    sizes: specializedImageSizes,
  },
  {
    title: "PRODUCCIÓN Y EDICIÓN DE VIDEO",
    imageSrc: `${publicBasePath}/images/categories/produccion-edicion-video.webp`,
    imageAlt: "Escena cinematográfica de una protagonista sosteniendo una espada.",
    href: "/registro",
    showTitle: true,
    sizes: specializedImageSizes,
  },
  {
    title: "DISEÑO AUTOMOTRIZ",
    imageSrc: `${publicBasePath}/images/categories/diseno-automotriz.webp`,
    imageAlt: "Auto de Fórmula 1 rojo compitiendo en un circuito urbano.",
    href: "/registro",
    objectPosition: "center 70%",
    showTitle: true,
    sizes: specializedImageSizes,
  },
];

function AccentTitle({ title, highlight }: { title: string; highlight?: string }) {
  if (!highlight) {
    return title;
  }

  const [before, after] = title.split(highlight);

  return (
    <>
      {before}
      <span className="text-brand-lavender">{highlight}</span>
      {after}
    </>
  );
}

function FeatureMediaPanel({
  title,
  titleHighlight,
  description,
  videoSrc,
  posterSrc,
  align = "left",
  href,
  themeVariant = "night",
  className = "",
  mediaOnly = false,
}: FeatureMediaPanelProps) {
  const isNight = themeVariant === "night";

  return (
    <article className={`${mediaOnly ? "aspect-[4/3]" : "flex h-full min-h-[30rem] flex-col"} ${className}`.trim()}>
      <div className={`relative isolate flex overflow-hidden rounded-[1.75rem] border border-border bg-surface text-foreground ${mediaOnly ? "size-full" : "min-h-[21rem] flex-1"}`}>
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
                ? "bg-[radial-gradient(ellipse_at_72%_23%,rgba(138,77,255,0.35),transparent_35%),linear-gradient(145deg,#0B2A5B_8%,#103667_62%,#182F68)]"
                : "bg-[radial-gradient(ellipse_at_75%_20%,rgba(138,77,255,0.28),transparent_40%),linear-gradient(145deg,#103667_8%,#164071_60%,#202F6C)]"
            }`}
            role="img"
          >
            <div className="absolute -right-16 -top-16 size-64 rounded-full border border-white/15" />
            <div className="absolute -right-5 -top-5 size-44 rounded-full border border-white/15" />
            <div className="absolute -bottom-24 -left-10 size-64 rounded-full border border-brand-purple/30" />
            <svg
              aria-hidden="true"
              className={`absolute inset-0 size-full ${isNight ? "text-white/35" : "text-brand-lavender/40"}`}
              fill="none"
              viewBox="0 0 560 420"
            >
              <path d="M90 105h105c54 0 54 96 110 96h90c42 0 45 76 92 76" stroke="currentColor" strokeWidth="2" />
              <circle cx="90" cy="105" fill="#D8C4FF" r="5" />
              <circle cx="305" cy="201" fill="#8A4DFF" r="8" />
              <circle cx="487" cy="277" fill={isNight ? "#D8C4FF" : "#8A4DFF"} r="5" />
            </svg>

            <div className="absolute left-[7%] top-[15%] w-[42%] max-w-52 rounded-2xl border border-brand-lavender/50 bg-brand-white p-4 text-brand-navy shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-5">
              <span className="font-mono text-[0.58rem] font-medium tracking-[0.15em] text-brand-slate">PROBLEMA</span>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-4/5 rounded-full bg-brand-navy/15" />
                <div className="h-2 w-3/5 rounded-full bg-brand-navy/10" />
                <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.4rem] border border-brand-lavender/80 bg-brand-white shadow-[0_18px_48px_rgba(2,10,30,0.25)] sm:size-24">
              <MatchWorkLogo className="w-10 sm:w-12" />
            </div>

            <div className="absolute bottom-[15%] right-[7%] w-[42%] max-w-52 rounded-2xl border border-brand-lavender/50 bg-brand-white p-4 text-brand-navy shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-5">
              <span className="font-mono text-[0.58rem] font-medium tracking-[0.15em] text-brand-navy">PROPUESTA</span>
              <div className="mt-4 space-y-2">
                <div className="h-2 w-4/5 rounded-full bg-brand-purple/45" />
                <div className="h-2 w-3/5 rounded-full bg-brand-purple/20" />
                <div className="h-2 w-2/5 rounded-full bg-brand-navy/10" />
              </div>
            </div>

            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white/20 bg-brand-navy/70 px-3 py-2 font-mono text-[0.6rem] font-medium tracking-[0.12em] text-brand-white backdrop-blur sm:bottom-6 sm:left-6">
              <span className="size-2 rounded-full bg-accent" />
              LISTO PARA TU VIDEO
            </div>
          </div>
        )}
      </div>

      {!mediaOnly ? (
        <div className={`flex items-start justify-between gap-4 px-1 pt-5 ${align === "right" ? "text-right" : "text-left"}`}>
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
              <AccentTitle highlight={titleHighlight} title={title} />
            </h3>
            {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {href ? (
            <Link
              aria-label={`Encuentra tu Match: ${title}`}
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground transition-colors hover:border-brand-lavender hover:text-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href={href}
            >
              <ArrowUpRight aria-hidden="true" className="size-5" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CategoryImageCard({ title, imageSrc, imageAlt, href, objectPosition, showTitle = false, sizes }: CategoryImageItem) {
  return (
    <Link
      aria-label={`${title}. ${imageAlt}`}
      className={`category-image-card group relative isolate block aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-white/15 bg-surface-raised shadow-[0_12px_32px_rgba(2,10,30,0.2)] transition-shadow duration-300 hover:shadow-[0_18px_42px_rgba(2,10,30,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lavender focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${showTitle ? "category-image-card--titled" : ""}`}
      href={href}
    >
      <Image
        alt={imageAlt}
        className="category-image-card__image object-cover"
        fill
        sizes={sizes ?? "(min-width: 1280px) 180px, (min-width: 1024px) 160px, (min-width: 640px) 290px, 45vw"}
        src={imageSrc}
        style={objectPosition ? { objectPosition } : undefined}
        unoptimized
      />
      {showTitle ? (
        <>
          <span aria-hidden="true" className="category-image-card__overlay absolute inset-0" />
          <span className="category-image-card__title absolute inset-x-4 bottom-4 z-10 break-words font-display text-xs font-bold leading-tight tracking-tight text-brand-white min-[375px]:text-sm min-[390px]:text-base sm:text-xl">
            {title}
          </span>
        </>
      ) : null}
    </Link>
  );
}

function CategoryImageGrid({ categories }: { categories: CategoryImageItem[] }) {
  return (
    <div className="mx-auto grid w-full max-w-[37rem] grid-cols-2 items-start gap-3 lg:mx-0 lg:max-w-none lg:self-center">
      {categories.map((category) => (
        <CategoryImageCard key={category.title} {...category} />
      ))}
    </div>
  );
}

export function LandingEditorialSections() {
  return (
    <>
      <section aria-labelledby="retos-negocio-title" className="py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <h2 className="text-balance font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl" id="retos-negocio-title">
              Encuentra <span className="text-brand-purple">soluciones</span> para los{" "}
              <span className="text-brand-lavender">retos de tu negocio</span>
            </h2>
          </div>
          <div className="grid items-stretch gap-5 lg:grid-cols-2 lg:gap-3">
            <FeatureMediaPanel
              mediaOnly
              themeVariant="night"
              title="Del problema a una solución que hace Match"
            />
            <CategoryImageGrid categories={businessCategories} />
          </div>
        </div>
      </section>

      <section aria-labelledby="proyectos-especializados-title" className="border-y border-border bg-surface/70 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <h2 className="text-balance font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl" id="proyectos-especializados-title">
              También para <span className="text-brand-lavender">proyectos especializados</span>
            </h2>
          </div>
          <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
            <FeatureMediaPanel
              align="right"
              className="lg:col-start-2 lg:row-start-1"
              description="Encuentra el talento ideal y convierte una necesidad especializada en un nuevo Match."
              href="/registro"
              themeVariant="violet"
              title="Haz Match con talento especializado"
              titleHighlight="Match"
            />
            <div className="lg:col-start-1 lg:row-start-1">
              <CategoryImageGrid categories={specializedCategories} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
