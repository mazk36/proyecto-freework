"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/problem-service";
import { validateCompanyProfile, type CompanyProfile } from "@/lib/problem-domain";
import { validateImageFile, AVATAR_MAX_BYTES } from "@/lib/profile-domain";
import { loadMyCompanyLogo, removeCompanyLogo, uploadCompanyLogo } from "@/lib/profile-service";

type Props = { userId: string };

const countryOptions = [
  ["PE", "Perú"], ["AR", "Argentina"], ["CL", "Chile"], ["CO", "Colombia"],
  ["MX", "México"], ["US", "Estados Unidos"], ["BR", "Brasil"], ["ES", "España"],
] as const;

const emptyProfile: CompanyProfile = {
  companyName: "",
  industry: "",
  countryCode: "PE",
  description: "",
  websiteUrl: "",
};

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-2 focus:ring-accent/30";
const secondaryButtonClass = "border border-border bg-transparent text-foreground hover:bg-surface-raised";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No pudimos completar el cambio. Inténtalo de nuevo.";
}

export function CompanyProfileForm({ userId }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoBusy, setIsLogoBusy] = useState(false);
  const [confirmLogoRemoval, setConfirmLogoRemoval] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logoError, setLogoError] = useState("");
  const [logoNotice, setLogoNotice] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    void Promise.all([getCompanyProfile(), loadMyCompanyLogo(userId)]).then(([saved, logo]) => {
      if (!active) return;
      if (saved) setProfile({ ...emptyProfile, ...saved });
      setLogoPath(logo.path);
      setLogoUrl(logo.url);
    }).catch((loadError: unknown) => {
      if (active) setLoadError(errorMessage(loadError));
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [loadAttempt, userId]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const validationError = validateCompanyProfile(profile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveCompanyProfile(profile);
      setProfile({ ...emptyProfile, ...saved });
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/app/") && !next.startsWith("//") && !next.includes("\\")) {
        router.replace(next);
      } else {
        setNotice("El perfil de tu empresa quedó guardado.");
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogoFile(file: File | undefined) {
    setLogoError("");
    setLogoNotice("");
    setLogoFile(null);
    if (!file) return;
    const validationError = validateImageFile(file, AVATAR_MAX_BYTES, "El logotipo");
    if (validationError) {
      setLogoError(validationError);
      return;
    }
    setLogoFile(file);
  }

  async function handleLogoSave() {
    if (!logoFile) return;
    setIsLogoBusy(true);
    setLogoError("");
    setLogoNotice("");
    try {
      const saved = await uploadCompanyLogo(userId, logoFile, logoPath);
      setLogoPath(saved.path);
      setLogoUrl(saved.url);
      setLogoFile(null);
      setLogoNotice(saved.cleanupWarning
        ? "Logotipo actualizado. No pudimos eliminar el archivo anterior."
        : "Logotipo actualizado.");
    } catch (uploadError) {
      setLogoError(errorMessage(uploadError));
    } finally {
      setIsLogoBusy(false);
    }
  }

  async function handleLogoRemoval() {
    setIsLogoBusy(true);
    setLogoError("");
    setLogoNotice("");
    try {
      const result = await removeCompanyLogo(userId, logoPath);
      setLogoPath(null);
      setLogoUrl(null);
      setLogoFile(null);
      setConfirmLogoRemoval(false);
      setLogoNotice(result.cleanupWarning
        ? "El logotipo se quitó del perfil, pero no pudimos eliminar el archivo anterior."
        : "Logotipo eliminado.");
    } catch (removeError) {
      setLogoError(errorMessage(removeError));
    } finally {
      setIsLogoBusy(false);
    }
  }

  const imageSrc = logoPreview ?? logoUrl;

  return (
    <>
      <section aria-labelledby="company-profile-title" className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-soft"><Building2 aria-hidden="true" className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">Identidad de empresa</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight" id="company-profile-title">Perfil de empresa</h2>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Actualiza la información que MatchWork usa como contexto al publicar tus problemas.</p>

        {isLoading ? <p className="mt-5 text-sm text-muted-foreground" role="status">Cargando el perfil…</p> : loadError ? (
          <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-400/10 p-4">
            <p className="text-sm text-rose-200" role="alert">{loadError}</p>
            <Button className="mt-4" onClick={() => { setIsLoading(true); setLoadAttempt((attempt) => attempt + 1); }} variant="outline">Volver a intentar</Button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-border bg-background text-accent-soft sm:size-28">
                {imageSrc ? <Image alt="Logotipo de la empresa" className="size-full object-contain p-2" height={224} src={imageSrc} unoptimized width={224} /> : <Building2 aria-hidden="true" className="size-9" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">Logotipo</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Sube una imagen JPEG, PNG o WebP de hasta 2 MiB.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-raised focus-within:ring-2 focus-within:ring-accent">
                    <ImagePlus aria-hidden="true" className="size-4" />{logoFile ? "Cambiar selección" : logoPath ? "Cambiar logotipo" : "Subir logotipo"}
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { handleLogoFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} type="file" />
                  </label>
                  {logoFile ? <Button disabled={isLogoBusy} onClick={() => void handleLogoSave()} size="sm">{isLogoBusy ? "Subiendo…" : "Guardar logotipo"}</Button> : null}
                  {logoPath ? <Button className="text-rose-200 hover:bg-rose-400/10" disabled={isLogoBusy} onClick={() => setConfirmLogoRemoval((current) => !current)} size="sm" variant="quiet"><Trash2 aria-hidden="true" className="size-4" />Quitar</Button> : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-100/80">El archivo se guarda en el almacenamiento público de imágenes de perfil, así que su URL puede consultarse aunque el perfil de empresa sea privado. Sube solo un logotipo que aceptes hacer accesible públicamente.</p>
                {logoError ? <p className="mt-3 text-sm text-rose-200" role="alert">{logoError}</p> : null}
                {logoNotice ? <p className="mt-3 text-sm text-emerald-200" role="status">{logoNotice}</p> : null}
                {confirmLogoRemoval ? (
                  <div className="mt-4 rounded-xl border border-rose-300/25 bg-rose-400/10 p-4">
                    <p className="text-sm leading-6 text-rose-100">Se quitará el logotipo del perfil y se eliminará el archivo público si Storage lo permite. ¿Continuar?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button className="bg-rose-700 text-white hover:bg-rose-600" disabled={isLogoBusy} onClick={() => void handleLogoRemoval()} size="sm">{isLogoBusy ? "Eliminando…" : "Sí, quitar logotipo"}</Button>
                      <Button className={secondaryButtonClass} disabled={isLogoBusy} onClick={() => setConfirmLogoRemoval(false)} size="sm" variant="outline">Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <form className="mt-6 space-y-5 border-t border-border pt-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="company-name">Nombre comercial</label>
                  <input autoComplete="organization" className={inputClass} id="company-name" maxLength={160} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} required value={profile.companyName} />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="company-industry">Sector empresarial</label>
                  <input className={inputClass} id="company-industry" maxLength={100} onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value }))} placeholder="Ej. Comercio, salud, educación" required value={profile.industry} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="company-description">Descripción</label>
                <textarea className={`${inputClass} min-h-28 py-3`} id="company-description" maxLength={3000} onChange={(event) => setProfile((current) => ({ ...current, description: event.target.value }))} placeholder="Describe brevemente la actividad de tu empresa." rows={4} value={profile.description ?? ""} />
                <p className="mt-2 text-right text-xs text-muted-foreground">{(profile.description ?? "").length}/3000</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="company-website">Sitio web (opcional)</label>
                  <input autoComplete="url" className={inputClass} id="company-website" maxLength={2048} onChange={(event) => setProfile((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://empresa.com" type="url" value={profile.websiteUrl ?? ""} />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="company-country">País</label>
                  <select className={inputClass} id="company-country" onChange={(event) => setProfile((current) => ({ ...current, countryCode: event.target.value }))} value={profile.countryCode}>
                    {countryOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">El presupuesto se mostrará en la moneda habitual del país seleccionado.</p>
                </div>
              </div>
              {error ? <p className="text-sm text-rose-200" role="alert">{error}</p> : null}
              {notice ? <p className="text-sm text-emerald-300" role="status">{notice}</p> : null}
              <Button disabled={isSaving} type="submit">{isSaving ? "Guardando…" : "Guardar perfil empresarial"}</Button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
