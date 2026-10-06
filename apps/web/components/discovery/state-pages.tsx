"use client";

import { useDemoStore } from "@/components/discovery/demo-store";
import {
  CompanyDismissedItemsPage,
  CompanyProblemsPage,
  CompanySavedItemsPage,
} from "@/components/discovery/company-pages";
import {
  FreelancerDismissedItemsPage,
  FreelancerSavedItemsPage,
  MyProposalsPage as FreelancerMyProposalsPage,
  PreferencesPage as FreelancerPreferencesPage,
  ProfilePage as DemoProfilePage,
} from "@/components/discovery/freelancer-pages";
import { MatchesPage } from "@/components/discovery/matches-page";

export function SavedItemsPage() {
  const { role } = useDemoStore();
  return role === "company" ? <CompanySavedItemsPage /> : <FreelancerSavedItemsPage />;
}

export function DismissedItemsPage() {
  const { role } = useDemoStore();
  return role === "company" ? <CompanyDismissedItemsPage /> : <FreelancerDismissedItemsPage />;
}

export function MyProposalsPage() {
  const { role } = useDemoStore();
  return role === "freelancer" ? <FreelancerMyProposalsPage /> : <FreelancerOnlyNotice />;
}

export function PreferencesPage() {
  const { role } = useDemoStore();
  return role === "freelancer" ? <FreelancerPreferencesPage /> : <FreelancerOnlyNotice />;
}

export function ProfilePage() {
  return <DemoProfilePage />;
}

export { MatchesPage };

export { CompanyProblemsPage };

function FreelancerOnlyNotice() {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Vista de freelancer</p>
      <h1 className="mt-2 text-2xl font-semibold">Esta página solo está disponible en el rol Freelancer.</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Cambia el rol de demostración desde el selector de la barra superior.</p>
    </section>
  );
}
