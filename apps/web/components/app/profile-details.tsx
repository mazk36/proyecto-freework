"use client";

import { useAuth } from "@/components/auth/auth-provider";

export function ProfileDetails() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section aria-labelledby="profile-title" className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight" id="profile-title">Perfil</h1>
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
          <dd className="text-sm font-medium text-foreground">{user.role === "company" ? "Empresa" : "Freelancer"}</dd>
        </div>
      </dl>
    </section>
  );
}
