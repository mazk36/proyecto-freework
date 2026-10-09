"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getCompanyProfile, saveCompanyProfile } from "@/lib/problem-service";
import type { CompanyProfile } from "@/lib/problem-domain";
import { Button } from "@/components/ui/button";

const countryOptions = [
  ["PE", "Perú"], ["AR", "Argentina"], ["CL", "Chile"], ["CO", "Colombia"],
  ["MX", "México"], ["US", "Estados Unidos"], ["BR", "Brasil"], ["ES", "España"],
] as const;

export function CompanyProfileForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile>({ companyName: "", industry: "", countryCode: "PE" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void getCompanyProfile().then((saved) => {
      if (active && saved) setProfile(saved);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el perfil de empresa.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      const saved = await saveCompanyProfile(profile);
      setProfile(saved);
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/app/") && !next.startsWith("//") && !next.includes("\\")) {
        router.replace(next);
      } else {
        setNotice("El perfil de tu empresa quedó guardado.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar el perfil. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <section aria-labelledby="company-profile-title" className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight" id="company-profile-title">Perfil de empresa</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Completa estos datos una sola vez. Los usaremos como contexto al publicar tus problemas.</p>
      {isLoading ? <p className="mt-5 text-sm text-muted-foreground" role="status">Cargando el perfil…</p> : (
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium" htmlFor="company-name">Nombre de la empresa</label>
            <input autoComplete="organization" className={inputClass} id="company-name" maxLength={160} onChange={(event) => setProfile((current) => ({ ...current, companyName: event.target.value }))} required value={profile.companyName} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="company-industry">Sector empresarial</label>
            <input className={inputClass} id="company-industry" maxLength={100} onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value }))} placeholder="Ej. Comercio, salud, educación" required value={profile.industry} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="company-country">País</label>
            <select className={inputClass} id="company-country" onChange={(event) => setProfile((current) => ({ ...current, countryCode: event.target.value }))} value={profile.countryCode}>
              {countryOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">El presupuesto se mostrará en la moneda habitual del país seleccionado.</p>
          </div>
          {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-800" role="status">{notice}</p> : null}
          <Button disabled={isSaving} type="submit">{isSaving ? "Guardando…" : "Guardar perfil empresarial"}</Button>
        </form>
      )}
    </section>
  );
}
