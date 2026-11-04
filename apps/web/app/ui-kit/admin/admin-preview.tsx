"use client";

import { useMemo } from "react";
import { AdminPanel } from "@/components/admin/admin-panel";
import type { AdminApi } from "@/components/admin/admin-api";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import type { AdminProblemRow, AdminUserRow, VerificationRequestRow } from "@/types/database";

const daysAgo = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function createFakeApi(): AdminApi {
  let requests: VerificationRequestRow[] = [
    { company_user_id: "c1", company_name: "Estudio Lumen", legal_name: "Estudio Lumen S.A.C.", country_code: "PE", tax_id: "20123456781", website_url: "https://estudiolumen.example", corporate_email: null, linkedin_url: "https://www.linkedin.com/company/estudio-lumen", status: "pending", rejection_reason: null, submitted_at: daysAgo(3), verified_at: null, updated_at: daysAgo(3) },
    { company_user_id: "c2", company_name: "Andes Logística", legal_name: "Andes Logística E.I.R.L.", country_code: "PE", tax_id: "20987654321", website_url: null, corporate_email: "contacto@andeslogistica.example", linkedin_url: null, status: "pending", rejection_reason: null, submitted_at: daysAgo(1, 4), verified_at: null, updated_at: daysAgo(1, 4) },
    { company_user_id: "c3", company_name: "Nube Retail", legal_name: "Nube Retail SpA", country_code: "CL", tax_id: "76123456-7", website_url: "https://nuberetail.example", corporate_email: "hola@nuberetail.example", linkedin_url: null, status: "pending", rejection_reason: null, submitted_at: daysAgo(0, 5), verified_at: null, updated_at: daysAgo(0, 5) },
    { company_user_id: "c4", company_name: "Taller Norte", legal_name: "Taller Norte S.A.", country_code: "PE", tax_id: "20555666771", website_url: "https://tallernorte.example", corporate_email: null, linkedin_url: null, status: "verified", rejection_reason: null, submitted_at: daysAgo(12), verified_at: daysAgo(10), updated_at: daysAgo(10) },
    { company_user_id: "c5", company_name: "Casa Verde", legal_name: "Casa Verde S.R.L.", country_code: "PE", tax_id: "20444333221", website_url: null, corporate_email: "admin@casaverde.example", linkedin_url: null, status: "rejected", rejection_reason: "Datos incompletos.", submitted_at: daysAgo(8), verified_at: null, updated_at: daysAgo(6) },
  ];
  let staleOnce = true; // The first verify on c2 simulates "the company edited the request while you were reviewing it".
  let users: AdminUserRow[] = [
    { user_id: "u1", full_name: "Estudio Lumen", role: "company", email: "equipo@estudiolumen.example", created_at: daysAgo(20), suspended_at: null, suspension_reason: null },
    { user_id: "u2", full_name: "Ana Torres", role: "freelancer", email: "ana@example.test", created_at: daysAgo(15), suspended_at: null, suspension_reason: null },
    { user_id: "u3", full_name: "Diego Salazar", role: "freelancer", email: "diego@example.test", created_at: daysAgo(9), suspended_at: daysAgo(2), suspension_reason: "Mensajes repetidos a varias empresas." },
    { user_id: "u4", full_name: "Casa Verde", role: "company", email: "admin@casaverde.example", created_at: daysAgo(8), suspended_at: null, suspension_reason: null },
  ];
  let problems: AdminProblemRow[] = [
    { problem_id: "p1", title: "Queremos ordenar la atención de nuestros clientes", company_user_id: "c1", company_name: "Estudio Lumen", company_verified: false, budget_choice: "3000_5000", currency: "PEN", published_at: daysAgo(4), sort_at: daysAgo(4), proposal_count: 3, status: "open", suspended_at: null, suspension_reason: null },
    { problem_id: "p2", title: "Reducir el trabajo manual en reportes", company_user_id: "c4", company_name: "Taller Norte", company_verified: true, budget_choice: "1000_3000", currency: "USD", published_at: daysAgo(6), sort_at: daysAgo(6), proposal_count: 1, status: "open", suspended_at: null, suspension_reason: null },
    { problem_id: "p3", title: "Entender mejor nuestro proceso de compras", company_user_id: "c5", company_name: null, company_verified: false, budget_choice: "unknown", currency: "PEN", published_at: daysAgo(9), sort_at: daysAgo(9), proposal_count: 0, status: "open", suspended_at: daysAgo(1), suspension_reason: "Contenido repetido." },
  ];
  let strict = false;
  let strictAt = daysAgo(30);
  const page = <T,>(items: T[]) => ({ items, nextCursor: null });
  const lower = (value: string) => value.toLocaleLowerCase("es");
  return {
    async isAdmin() { await wait(); return true; },
    async getAdminSummary() { await wait(); return { pending_verifications: requests.filter((r) => r.status === "pending").length, verified_companies: requests.filter((r) => r.status === "verified").length, open_problems: problems.filter((p) => p.status === "open" && !p.suspended_at).length, active_freelancers: 2 }; },
    async listVerificationRequests({ status = "pending" } = {}) { await wait(); return page(requests.filter((r) => status === "all" || r.status === status)); },
    async verify(id, expected) {
      await wait();
      const row = requests.find((r) => r.company_user_id === id);
      if (!row) throw new Error("No encontramos la solicitud.");
      if (id === "c2" && staleOnce) { staleOnce = false; requests = requests.map((r) => r.company_user_id === id ? { ...r, updated_at: new Date().toISOString(), tax_id: "20987654322" } : r); throw new Error("La empresa modificó su solicitud mientras la revisabas. Recarga la lista y vuelve a revisarla."); }
      if (row.updated_at !== expected) throw new Error("La empresa modificó su solicitud mientras la revisabas. Recarga la lista y vuelve a revisarla.");
      requests = requests.map((r) => r.company_user_id === id ? { ...r, status: "verified", verified_at: new Date().toISOString(), updated_at: new Date().toISOString() } : r);
    },
    async reject(id, expected, reason) {
      await wait();
      const row = requests.find((r) => r.company_user_id === id);
      if (!row || row.updated_at !== expected) throw new Error("La empresa modificó su solicitud mientras la revisabas. Recarga la lista y vuelve a revisarla.");
      requests = requests.map((r) => r.company_user_id === id ? { ...r, status: "rejected", rejection_reason: reason, updated_at: new Date().toISOString() } : r);
    },
    async undoVerification(id) { await wait(); requests = requests.map((r) => r.company_user_id === id ? { ...r, status: "pending", verified_at: null, updated_at: new Date().toISOString() } : r); },
    async listUsers({ search = "", role = "all", suspension = "all" } = {}) {
      await wait();
      return page(users.filter((u) => (role === "all" || u.role === role) && (suspension === "all" || (suspension === "suspended") === (u.suspended_at !== null)) && (!search || lower(`${u.full_name} ${u.email ?? ""}`).includes(lower(search)))));
    },
    async setUserSuspended(id, suspended, reason) { await wait(); users = users.map((u) => u.user_id === id ? { ...u, suspended_at: suspended ? new Date().toISOString() : null, suspension_reason: suspended ? reason : null } : u); },
    async listProblems({ search = "", status = "all" } = {}) {
      await wait();
      return page(problems.filter((p) => (status === "all" || (status === "suspended" ? p.suspended_at !== null : p.status === status && p.suspended_at === null)) && (!search || lower(`${p.title} ${p.company_name ?? ""}`).includes(lower(search)))));
    },
    async setProblemSuspended(id, suspended, reason) { await wait(); problems = problems.map((p) => p.problem_id === id ? { ...p, suspended_at: suspended ? new Date().toISOString() : null, suspension_reason: suspended ? reason : null } : p); },
    async getSettings() { await wait(); return [{ key: "require_company_verification_to_publish", value: strict, updated_at: strictAt, updated_by: null }]; },
    async setSetting(_key, value) { await wait(); strict = value; strictAt = new Date().toISOString(); },
  };
}

export function AdminPreview() {
  const api = useMemo(createFakeApi, []);
  return (
    <div className="private-app-shell min-h-screen bg-background text-foreground">
      <header className="border-b border-border"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8"><MatchWorkLogoLockup size="compact" variant="reversed" /><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">Datos de muestra · sin Supabase</span></div></header>
      <main><AdminPanel api={api} syncUrl={false} /></main>
    </div>
  );
}
