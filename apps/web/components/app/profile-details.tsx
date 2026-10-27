"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { CompanyProfileForm } from "@/components/app/company-profile-form";
import { CompanyProfilePublications } from "@/components/app/company-profile-publications";
import { FreelancerProfileForm } from "@/components/app/freelancer-profile-form";

export function ProfileDetails() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "freelancer") return <FreelancerProfileForm userId={user.id} />;

  return (
    <section aria-labelledby="profile-title" className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft">Tu espacio empresarial</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" id="profile-title">Perfil de empresa</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Administra la identidad de tu negocio y consulta el estado de tus publicaciones.</p>
      <dl className="mt-8 divide-y divide-border border-y border-border">
        <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm text-muted-foreground">Nombre</dt>
          <dd className="text-sm font-medium text-foreground">{user.name}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm text-muted-foreground">Correo electrónico</dt>
          <dd className="text-sm font-medium text-foreground">{user.email}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm text-muted-foreground">Tipo de cuenta</dt>
          <dd className="text-sm font-medium text-foreground">Empresa</dd>
        </div>
      </dl>
      <CompanyProfileForm userId={user.id} />
      <CompanyProfilePublications />
    </section>
  );
}
