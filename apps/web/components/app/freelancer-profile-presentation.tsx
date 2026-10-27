import Image from "next/image";
import { ExternalLink, MapPin, MonitorCheck } from "lucide-react";
import type { PortfolioProject, ProfileSkill } from "@/lib/profile-service";

export type FreelancerProfilePresentationData = {
  displayName: string;
  headline: string;
  bio: string;
  locationText: string;
  yearsExperience: string | number | null;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  availabilityStatus: string;
  avatarUrl: string | null;
  skills: ProfileSkill[];
  projects: PortfolioProject[];
};

function initials(name: string): string {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "MW";
}

export function FreelancerProfilePresentation({ profile }: { profile: FreelancerProfilePresentationData }) {
  const publishedProjects = profile.projects.filter((project) => project.is_published);
  const links = [
    ["Sitio web", profile.websiteUrl],
    ["LinkedIn", profile.linkedinUrl],
    ["GitHub", profile.githubUrl],
  ].filter((link): link is [string, string] => Boolean(link[1]));

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <header className="relative overflow-hidden border-b border-border bg-surface-raised p-6 sm:p-9">
        <div aria-hidden="true" className="absolute -right-12 -top-16 size-52 rounded-full border border-accent/20" />
        <div aria-hidden="true" className="absolute -right-4 -top-8 size-36 rounded-full border border-accent/15" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-border bg-background text-2xl font-semibold text-accent-soft sm:size-28">
            {profile.avatarUrl ? (
              <Image alt={`Fotografía de ${profile.displayName}`} className="size-full object-cover" height={224} src={profile.avatarUrl} unoptimized width={224} />
            ) : <span aria-hidden="true">{initials(profile.displayName)}</span>}
          </div>
          <div className="min-w-0">
            {profile.availabilityStatus ? (
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-300" />{profile.availabilityStatus}
              </p>
            ) : null}
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{profile.displayName || "Tu nombre público"}</h1>
            <p className="mt-2 text-base leading-6 text-accent-soft sm:text-lg">{profile.headline || "Tu especialidad profesional"}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {profile.locationText ? <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-4" />{profile.locationText}</span> : null}
              {profile.yearsExperience !== null && profile.yearsExperience !== "" ? <span>{profile.yearsExperience} {Number(profile.yearsExperience) === 1 ? "año de experiencia" : "años de experiencia"}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-8 p-6 sm:p-9">
        <section aria-labelledby="public-bio-title">
          <h2 className="text-lg font-semibold" id="public-bio-title">Acerca de mí</h2>
          {profile.bio ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{profile.bio}</p> : <p className="mt-3 text-sm text-muted-foreground">Aún no agregas una presentación profesional.</p>}
        </section>

        <section aria-labelledby="public-skills-title">
          <h2 className="text-lg font-semibold" id="public-skills-title">Habilidades</h2>
          {profile.skills.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {profile.skills.map((skill) => <li className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm text-foreground" key={skill.id}>{skill.name}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">Todavía no agregas habilidades.</p>}
        </section>

        {links.length ? (
          <section aria-labelledby="public-links-title">
            <h2 className="text-lg font-semibold" id="public-links-title">Enlaces profesionales</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {links.map(([label, href]) => (
                <li key={label}>
                  <a className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-accent-soft transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={href} rel="noreferrer" target="_blank">
                    <ExternalLink aria-hidden="true" className="size-4" />{label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="public-projects-title">
          <div className="flex flex-wrap items-center gap-2">
            <MonitorCheck aria-hidden="true" className="size-5 text-accent-soft" />
            <h2 className="text-lg font-semibold" id="public-projects-title">Proyectos publicados</h2>
          </div>
          {publishedProjects.length ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {publishedProjects.map((project) => (
                <li className="overflow-hidden rounded-xl border border-border bg-background" key={project.id}>
                  {project.image_url ? <Image alt={`Imagen del proyecto ${project.title}`} className="h-40 w-full object-cover" height={320} src={project.image_url} unoptimized width={560} /> : null}
                  <div className="p-4">
                    {project.category ? <p className="text-xs font-semibold uppercase tracking-wider text-accent-soft">{project.category}</p> : null}
                    <h3 className="mt-1 text-base font-semibold">{project.title}</h3>
                    {project.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
                    {project.skills_used.length ? <ul aria-label={`Habilidades utilizadas en ${project.title}`} className="mt-3 flex flex-wrap gap-1.5">{project.skills_used.map((skill) => <li className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-muted-foreground" key={skill}>{skill}</li>)}</ul> : null}
                    {project.project_period ? <p className="mt-3 text-xs text-muted-foreground">{project.project_period}</p> : null}
                    {project.external_url ? <a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent-soft underline decoration-accent/50 underline-offset-4" href={project.external_url} rel="noreferrer" target="_blank">Ver proyecto <ExternalLink aria-hidden="true" className="size-3.5" /></a> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">Aún no hay proyectos publicados.</p>}
        </section>
      </div>
    </article>
  );
}
