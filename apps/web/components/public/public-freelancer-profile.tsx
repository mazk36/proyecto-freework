"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { FreelancerProfilePresentation } from "@/components/app/freelancer-profile-presentation";
import { loadPublicFreelancerProfile, type PublicFreelancerProfile } from "@/lib/profile-service";
import { toProfileDraft } from "@/lib/profile-domain";

export function PublicFreelancerProfilePage() {
  const [profile, setProfile] = useState<PublicFreelancerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const slug = new URLSearchParams(window.location.search).get("slug") ?? "";
    if (!slug) {
      setMessage("Este enlace no incluye un identificador de perfil.");
      setIsLoading(false);
      return () => { active = false; };
    }

    void loadPublicFreelancerProfile(slug).then((result) => {
      if (!active) return;
      if (!result) setMessage("Este perfil no está disponible o su propietario lo mantiene privado.");
      else setProfile(result);
    }).catch((loadError: unknown) => {
      if (active) setMessage(loadError instanceof Error ? loadError.message : "No pudimos cargar este perfil.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, []);

  const profileDraft = profile ? toProfileDraft(profile.profile, profile.details) : null;
  const presentation = profile && profileDraft ? {
    displayName: profileDraft.displayName,
    headline: profileDraft.headline,
    bio: profileDraft.bio,
    locationText: profileDraft.locationText,
    yearsExperience: profileDraft.yearsExperience || null,
    websiteUrl: profileDraft.websiteUrl,
    linkedinUrl: profileDraft.linkedinUrl,
    githubUrl: profileDraft.githubUrl,
    availabilityStatus: profileDraft.availabilityStatus,
    avatarUrl: profile.avatarUrl,
    skills: profile.skills,
    projects: profile.projects,
  } : null;

  return (
    <main className="public-landing min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:min-h-[72px] sm:px-8">
          <Link aria-label="MatchWork, ir al inicio" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/">
            <MatchWorkLogoLockup size="large" preload variant="reversed" />
          </Link>
          <Link className="text-sm font-medium text-accent-soft underline decoration-accent/50 underline-offset-4" href="/registro">Únete a MatchWork</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        {isLoading ? <p className="text-sm text-muted-foreground" role="status">Cargando perfil…</p> : null}
        {!isLoading && !presentation ? (
          <section className="rounded-2xl border border-border bg-surface p-6 sm:p-9">
            <h1 className="text-2xl font-semibold">Perfil no disponible</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground" role="status">{message || "El perfil no está disponible."}</p>
          </section>
        ) : null}
        {presentation ? <FreelancerProfilePresentation profile={presentation} /> : null}
        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Perfil profesional en MatchWork. Las publicaciones reflejan trabajos presentados por sus autores.</p>
      </div>
    </main>
  );
}
