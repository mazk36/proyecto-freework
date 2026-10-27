"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  Eye,
  Globe2,
  MapPin,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PortfolioManager } from "@/components/app/portfolio-manager";
import { FreelancerProfilePresentation } from "@/components/app/freelancer-profile-presentation";
import {
  addFreelancerSkill,
  loadMyFreelancerProfile,
  removeAvatar,
  removeFreelancerSkill,
  saveFreelancerProfile,
  setProfileVisibility,
  uploadAvatar,
  type FreelancerProfileData,
} from "@/lib/profile-service";
import {
  AVATAR_MAX_BYTES,
  toProfileDraft,
  validateFreelancerProfile,
  validateImageFile,
  validateSkillName,
  type FreelancerProfileDraft,
} from "@/lib/profile-domain";

type Props = { userId: string };
type ViewMode = "edit" | "preview";

const emptyDraft: FreelancerProfileDraft = {
  displayName: "",
  headline: "",
  bio: "",
  locationText: "",
  yearsExperience: "",
  websiteUrl: "",
  linkedinUrl: "",
  githubUrl: "",
  availabilityStatus: "",
};

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30";
const secondaryButtonClass = "border border-border bg-transparent text-foreground hover:bg-surface-raised";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No pudimos completar el cambio. Inténtalo de nuevo.";
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "MW";
}

export function FreelancerProfileForm({ userId }: Props) {
  const [data, setData] = useState<FreelancerProfileData | null>(null);
  const [draft, setDraft] = useState<FreelancerProfileDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarNotice, setAvatarNotice] = useState("");
  const [confirmAvatarRemoval, setConfirmAvatarRemoval] = useState(false);
  const [confirmVisibility, setConfirmVisibility] = useState<boolean | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [catalogSkillId, setCatalogSkillId] = useState("");
  const [skillBusy, setSkillBusy] = useState(false);
  const [skillError, setSkillError] = useState("");

  const refreshData = useCallback(async (syncDraft: boolean) => {
    const next = await loadMyFreelancerProfile(userId);
    setData(next);
    if (syncDraft) setDraft(toProfileDraft(next.profile, next.details));
  }, [userId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    void loadMyFreelancerProfile(userId).then((next) => {
      if (!active) return;
      setData(next);
      setDraft(toProfileDraft(next.profile, next.details));
    }).catch((loadError: unknown) => {
      if (active) setError(errorMessage(loadError));
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const assignedCatalogIds = useMemo(
    () => new Set(data?.skills.flatMap((skill) => skill.skill_id ? [skill.skill_id] : []) ?? []),
    [data?.skills],
  );

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const validationError = validateFreelancerProfile(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await saveFreelancerProfile(userId, {
        displayName: draft.displayName,
        headline: draft.headline,
        bio: draft.bio,
        locationText: draft.locationText,
        yearsExperience: draft.yearsExperience.trim() ? Number(draft.yearsExperience) : null,
        websiteUrl: draft.websiteUrl,
        linkedinUrl: draft.linkedinUrl,
        githubUrl: draft.githubUrl,
        availabilityStatus: draft.availabilityStatus,
      });
      await refreshData(true);
      setNotice("Tu información profesional quedó guardada.");
    } catch (saveError) {
      try {
        await refreshData(true);
        setError(errorMessage(saveError));
      } catch (refreshError) {
        setError(`${errorMessage(saveError)} Además, no pudimos actualizar los datos que se muestran: ${errorMessage(refreshError)}`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !data) return;
    setAvatarBusy(true);
    setAvatarError("");
    setAvatarNotice("");
    try {
      const result = await uploadAvatar(userId, avatarFile, data.profile.avatar_path);
      setData((current) => current ? {
        ...current,
        profile: { ...current.profile, avatar_path: result.path },
        avatarUrl: result.url,
      } : current);
      setAvatarFile(null);
      setAvatarNotice(result.cleanupWarning
        ? "Fotografía actualizada. No pudimos retirar el archivo anterior; vuelve a intentarlo más tarde."
        : "Fotografía actualizada.");
    } catch (uploadError) {
      setAvatarError(errorMessage(uploadError));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemoval() {
    if (!data) return;
    setAvatarBusy(true);
    setAvatarError("");
    setAvatarNotice("");
    try {
      const result = await removeAvatar(userId, data.profile.avatar_path);
      setData((current) => current ? {
        ...current,
        profile: { ...current.profile, avatar_path: null },
        avatarUrl: null,
      } : current);
      setAvatarFile(null);
      setConfirmAvatarRemoval(false);
      setAvatarNotice(result.cleanupWarning
        ? "La fotografía se quitó del perfil, pero el archivo anterior no pudo eliminarse del almacenamiento."
        : "Fotografía eliminada. Se muestra tu avatar predeterminado.");
    } catch (removeError) {
      setAvatarError(errorMessage(removeError));
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleAvatarFile(file: File | undefined) {
    setAvatarError("");
    setAvatarNotice("");
    setAvatarFile(null);
    if (!file) return;
    const validationError = validateImageFile(file, AVATAR_MAX_BYTES, "La fotografía");
    if (validationError) {
      setAvatarError(validationError);
      return;
    }
    setAvatarFile(file);
  }

  async function handleVisibilityChange() {
    if (!data || confirmVisibility === null) return;
    setVisibilityBusy(true);
    setError("");
    setNotice("");
    try {
      if (confirmVisibility) {
        const validationError = validateFreelancerProfile(draft);
        if (validationError) throw new Error(validationError);
        await saveFreelancerProfile(userId, {
          displayName: draft.displayName,
          headline: draft.headline,
          bio: draft.bio,
          locationText: draft.locationText,
          yearsExperience: draft.yearsExperience.trim() ? Number(draft.yearsExperience) : null,
          websiteUrl: draft.websiteUrl,
          linkedinUrl: draft.linkedinUrl,
          githubUrl: draft.githubUrl,
          availabilityStatus: draft.availabilityStatus,
        });
      }
      await setProfileVisibility(userId, confirmVisibility);
      await refreshData(confirmVisibility);
      setNotice(confirmVisibility ? "Tu perfil ya es público." : "Tu perfil quedó privado.");
      setConfirmVisibility(null);
    } catch (visibilityError) {
      setError(errorMessage(visibilityError));
    } finally {
      setVisibilityBusy(false);
    }
  }

  async function handleAddSkill(skillId: string | null, customName: string | null) {
    setSkillError("");
    if (customName) {
      const validationError = validateSkillName(customName);
      if (validationError) {
        setSkillError(validationError);
        return;
      }
    }
    if (!skillId && !customName) {
      setSkillError("Elige una habilidad del catálogo o escribe una propia.");
      return;
    }
    setSkillBusy(true);
    try {
      await addFreelancerSkill(userId, { skillId, customName: customName?.trim() ?? null });
      await refreshData(false);
      setSkillName("");
      setCatalogSkillId("");
    } catch (addError) {
      setSkillError(errorMessage(addError));
    } finally {
      setSkillBusy(false);
    }
  }

  async function handleRemoveSkill(skillId: string) {
    setSkillError("");
    setSkillBusy(true);
    try {
      await removeFreelancerSkill(userId, skillId);
      await refreshData(false);
    } catch (removeError) {
      setSkillError(errorMessage(removeError));
    } finally {
      setSkillBusy(false);
    }
  }

  if (isLoading) {
    return <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14"><p className="text-sm text-muted-foreground" role="status">Cargando tu perfil profesional…</p></section>;
  }

  if (!data) {
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Perfil profesional</h1>
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200" role="alert">{error || "No pudimos cargar tu perfil."}</p>
        <Button className="mt-5" onClick={() => { setIsLoading(true); void refreshData(true).catch((loadError: unknown) => setError(errorMessage(loadError))).finally(() => setIsLoading(false)); }}>Volver a intentar</Button>
      </section>
    );
  }

  const profilePreview = {
    displayName: draft.displayName,
    headline: draft.headline,
    bio: draft.bio,
    locationText: draft.locationText,
    yearsExperience: draft.yearsExperience || null,
    websiteUrl: draft.websiteUrl,
    linkedinUrl: draft.linkedinUrl,
    githubUrl: draft.githubUrl,
    availabilityStatus: draft.availabilityStatus,
    avatarUrl: avatarPreview ?? data.avatarUrl,
    skills: data.skills,
    projects: data.projects,
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft">Tu espacio profesional</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Perfil profesional</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Presenta las capacidades que pueden ayudar a resolver problemas reales de empresas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewMode === "edit" ? (
            <Button className={secondaryButtonClass} onClick={() => setViewMode("preview")} variant="outline"><Eye aria-hidden="true" className="size-4" />Vista previa</Button>
          ) : (
            <Button className={secondaryButtonClass} onClick={() => setViewMode("edit")} variant="outline"><ArrowLeft aria-hidden="true" className="size-4" />Volver a editar</Button>
          )}
          {data.profile.is_public ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={`/profesionales/?slug=${encodeURIComponent(data.profile.slug)}`}><ExternalLink aria-hidden="true" className="size-4" />Perfil público</Link> : null}
        </div>
      </div>

      {error ? <p className="mb-5 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p> : null}
      {notice ? <p className="mb-5 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200" role="status">{notice}</p> : null}

      {viewMode === "preview" ? (
        <div>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm leading-6 text-muted-foreground">
            <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-soft" />
            <p>Vista previa para visitantes. Se muestran solo los proyectos que publicaste. Los datos sin guardar aparecen aquí para que puedas revisarlos.</p>
          </div>
          <FreelancerProfilePresentation profile={profilePreview} />
        </div>
      ) : (
        <>
          <section aria-labelledby="identity-title" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 items-center gap-4 sm:block">
                <div className="grid size-24 place-items-center overflow-hidden rounded-3xl border border-border bg-background text-2xl font-semibold text-accent-soft sm:size-28">
                  {(avatarPreview ?? data.avatarUrl) ? <Image alt={`Fotografía de ${draft.displayName || "tu perfil"}`} className="size-full object-cover" height={224} src={(avatarPreview ?? data.avatarUrl)!} unoptimized width={224} /> : <span aria-hidden="true">{initials(draft.displayName)}</span>}
                </div>
                <p className="mt-2 hidden text-center text-xs text-muted-foreground sm:block">{data.profile.avatar_path ? "Fotografía actual" : "Avatar predeterminado"}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">Identidad profesional</p>
                    <h2 className="mt-1 text-xl font-semibold" id="identity-title">{draft.displayName || "Tu nombre público"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{draft.headline || "Agrega tu especialidad"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.profile.is_public ? "bg-emerald-300/15 text-emerald-200" : "bg-surface-raised text-muted-foreground"}`}>
                    {data.profile.is_public ? "Perfil público" : "Perfil privado"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-raised focus-within:ring-2 focus-within:ring-accent">
                    {avatarFile ? "Cambiar selección" : data.profile.avatar_path ? "Cambiar fotografía" : "Subir fotografía"}
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { handleAvatarFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" />
                  </label>
                  {avatarFile ? <Button disabled={avatarBusy} onClick={() => void handleAvatarUpload()} size="sm">{avatarBusy ? "Subiendo…" : "Guardar fotografía"}</Button> : null}
                  {data.profile.avatar_path ? <Button className="text-rose-200 hover:bg-rose-400/10" disabled={avatarBusy} onClick={() => setConfirmAvatarRemoval((current) => !current)} size="sm" variant="quiet">Eliminar</Button> : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-100/80">La fotografía se guarda en un bucket público; su URL puede consultarse aunque el perfil esté privado. Sube solo una imagen que aceptes hacer accesible públicamente.</p>
                {avatarFile ? <p className="mt-2 text-xs text-accent-soft" role="status">Vista previa: {avatarFile.name}</p> : null}
                {avatarError ? <p className="mt-3 text-sm text-rose-200" role="alert">{avatarError}</p> : null}
                {avatarNotice ? <p className="mt-3 text-sm text-emerald-200" role="status">{avatarNotice}</p> : null}
                {confirmAvatarRemoval ? (
                  <div className="mt-4 rounded-xl border border-rose-300/25 bg-rose-400/10 p-4">
                    <p className="text-sm leading-6 text-rose-100">Se quitará la fotografía del perfil y se eliminará su archivo público si Storage lo permite. ¿Continuar?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className="bg-rose-700 text-white hover:bg-rose-600" disabled={avatarBusy} onClick={() => void handleAvatarRemoval()} size="sm">{avatarBusy ? "Eliminando…" : "Sí, eliminar fotografía"}</Button>
                      <Button className={secondaryButtonClass} disabled={avatarBusy} onClick={() => setConfirmAvatarRemoval(false)} size="sm" variant="outline">Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <form className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7" onSubmit={handleProfileSave}>
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-soft"><UserRound aria-hidden="true" className="size-4" /></span>
                <div>
                  <h2 className="text-xl font-semibold">Información profesional</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Cuenta qué problemas sabes resolver y qué experiencia aportas.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="freelancer-display-name">Nombre público</label>
                <input autoComplete="name" className={inputClass} id="freelancer-display-name" maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} required value={draft.displayName} />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="freelancer-headline">Profesión o especialidad</label>
                <input autoComplete="organization-title" className={inputClass} id="freelancer-headline" maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))} placeholder="Ej. Especialista en automatización" value={draft.headline} />
              </div>
            </div>
            <div className="mt-5">
              <label className="text-sm font-medium" htmlFor="freelancer-bio">Presentación profesional</label>
              <textarea className={`${inputClass} min-h-36 py-3`} id="freelancer-bio" maxLength={3000} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))} placeholder="Describe tu experiencia, especialización y los tipos de problemas que puedes ayudar a resolver." rows={5} value={draft.bio} />
              <p className="mt-2 text-right text-xs text-muted-foreground">{draft.bio.length}/3000</p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="inline-flex items-center gap-2 text-sm font-medium" htmlFor="freelancer-location"><MapPin aria-hidden="true" className="size-4 text-muted-foreground" />Ubicación (opcional)</label>
                <input autoComplete="address-level2" className={inputClass} id="freelancer-location" maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, locationText: event.target.value }))} placeholder="Ciudad, país" value={draft.locationText} />
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-sm font-medium" htmlFor="freelancer-experience"><BriefcaseBusiness aria-hidden="true" className="size-4 text-muted-foreground" />Años de experiencia (opcional)</label>
                <input className={inputClass} id="freelancer-experience" inputMode="numeric" max={80} min={0} onChange={(event) => setDraft((current) => ({ ...current, yearsExperience: event.target.value }))} placeholder="0 a 80" type="number" value={draft.yearsExperience} />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-medium" htmlFor="freelancer-availability">Disponibilidad profesional (opcional)</label>
              <input className={inputClass} id="freelancer-availability" maxLength={40} onChange={(event) => setDraft((current) => ({ ...current, availabilityStatus: event.target.value }))} placeholder="Escribe cómo quieres presentarla" value={draft.availabilityStatus} />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Es un texto breve que se mostrará en tu perfil público. No hay estados predefinidos.</p>
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-soft"><Globe2 aria-hidden="true" className="size-4" /></span>
                <div>
                  <h3 className="text-base font-semibold">Enlaces profesionales</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Solo se mostrarán si decides publicar tu perfil.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="freelancer-website">Sitio web</label>
                  <input autoComplete="url" className={inputClass} id="freelancer-website" maxLength={2048} onChange={(event) => setDraft((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://…" type="url" value={draft.websiteUrl} />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="freelancer-linkedin">LinkedIn</label>
                  <input autoComplete="url" className={inputClass} id="freelancer-linkedin" maxLength={2048} onChange={(event) => setDraft((current) => ({ ...current, linkedinUrl: event.target.value }))} placeholder="https://www.linkedin.com/in/…" type="url" value={draft.linkedinUrl} />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="freelancer-github">GitHub</label>
                  <input autoComplete="url" className={inputClass} id="freelancer-github" maxLength={2048} onChange={(event) => setDraft((current) => ({ ...current, githubUrl: event.target.value }))} placeholder="https://github.com/…" type="url" value={draft.githubUrl} />
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button disabled={isSaving} type="submit">{isSaving ? "Guardando…" : "Guardar información profesional"}</Button>
              <span className="text-xs text-muted-foreground">Los cambios se guardan en Supabase.</span>
            </div>
          </form>

          <section aria-labelledby="skills-title" className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-soft"><BriefcaseBusiness aria-hidden="true" className="size-4" /></span>
              <div>
                <h2 className="text-xl font-semibold" id="skills-title">Habilidades</h2>
                <p className="mt-1 text-sm text-muted-foreground">Elige del catálogo o añade una habilidad específica a tu perfil.</p>
              </div>
            </div>
            {data.skills.length ? (
              <ul className="mt-5 flex flex-wrap gap-2">
                {data.skills.map((skill) => (
                  <li className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 py-1 pl-3 pr-1 text-sm" key={skill.id}>
                    <span>{skill.name}</span>
                    <button aria-label={`Eliminar habilidad ${skill.name}`} className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-400/15 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" disabled={skillBusy} onClick={() => void handleRemoveSkill(skill.id)} type="button"><X aria-hidden="true" className="size-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">Aún no agregas habilidades.</p>}
            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="catalog-skill">Habilidad del catálogo</label>
                <select className={`${inputClass} mt-0 min-w-0 flex-1`} id="catalog-skill" onChange={(event) => setCatalogSkillId(event.target.value)} value={catalogSkillId}>
                  <option value="">Seleccionar del catálogo…</option>
                  {data.skillCatalog.filter((skill) => !assignedCatalogIds.has(skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}{skill.category ? ` · ${skill.category}` : ""}</option>)}
                </select>
                <Button className={secondaryButtonClass} disabled={skillBusy || !catalogSkillId} onClick={() => void handleAddSkill(catalogSkillId || null, null)} variant="outline">Agregar habilidad</Button>
              </div>
              <form className="flex min-w-0 gap-2 md:col-span-2" onSubmit={(event) => { event.preventDefault(); void handleAddSkill(null, skillName); }}>
                <label className="sr-only" htmlFor="custom-skill">Otra habilidad</label>
                <input autoComplete="off" className={`${inputClass} mt-0 min-w-0 flex-1`} id="custom-skill" maxLength={100} onChange={(event) => setSkillName(event.target.value)} placeholder="Otra habilidad específica" value={skillName} />
                <Button disabled={skillBusy || !skillName.trim()} type="submit">Agregar</Button>
              </form>
            </div>
            {skillError ? <p className="mt-3 text-sm text-rose-200" role="alert">{skillError}</p> : null}
          </section>

          <PortfolioManager onChanged={() => refreshData(false)} projects={data.projects} userId={userId} />

          <section aria-labelledby="visibility-title" className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-soft"><ShieldCheck aria-hidden="true" className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold" id="visibility-title">Visibilidad del perfil</h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.profile.is_public ? "bg-emerald-300/15 text-emerald-200" : "bg-surface-raised text-muted-foreground"}`}>
                    {data.profile.is_public ? "Público" : "Privado"}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {data.profile.is_public
                    ? "Tu perfil puede consultarse desde su enlace público. Solo aparecen los proyectos que publicaste."
                    : "Solo tú puedes consultar tu información profesional. Los visitantes no verán tu perfil ni tus proyectos."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className={data.profile.is_public ? secondaryButtonClass : ""} onClick={() => setConfirmVisibility(!data.profile.is_public)} variant={data.profile.is_public ? "outline" : "primary"}>
                    {data.profile.is_public ? "Retirar perfil público" : "Hacer público mi perfil"}
                  </Button>
                  {data.profile.is_public ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={`/profesionales/?slug=${encodeURIComponent(data.profile.slug)}`}><ExternalLink aria-hidden="true" className="size-4" />Ver perfil</Link> : null}
                </div>
                {confirmVisibility !== null ? (
                  <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 p-4">
                    <p className="text-sm font-semibold">{confirmVisibility ? "¿Publicar tu perfil profesional?" : "¿Retirar tu perfil público?"}</p>
                    {confirmVisibility ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">Se guardarán los cambios actuales y quedarán visibles para visitantes:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                          <li>Tu nombre, fotografía pública, especialidad y presentación.</li>
                          <li>Ubicación, experiencia, disponibilidad y enlaces profesionales que hayas completado.</li>
                          <li>Tus habilidades y los proyectos que publiques de forma individual.</li>
                        </ul>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">Tu correo, datos de sesión y detalles privados de cuenta no forman parte del perfil público. La fotografía usa un bucket público incluso mientras tu perfil está privado.</p>
                      </>
                    ) : <p className="mt-2 text-sm leading-6 text-muted-foreground">El perfil dejará de aparecer públicamente y sus proyectos quedarán ocultos para visitantes.</p>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button disabled={visibilityBusy} onClick={() => void handleVisibilityChange()} size="sm">{visibilityBusy ? "Guardando…" : confirmVisibility ? "Sí, publicar perfil" : "Sí, hacerlo privado"}</Button>
                      <Button className={secondaryButtonClass} disabled={visibilityBusy} onClick={() => setConfirmVisibility(null)} size="sm" variant="outline">Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
