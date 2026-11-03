"use client";

import { useState } from "react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { CompanyInbox } from "@/components/inbox/company-inbox";
import { createSampleInboxServices } from "./sample-data";

export function InboxPreview() {
  const [services] = useState(createSampleInboxServices);
  return <div className="private-app-shell inbox-preview min-h-dvh bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8"><MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" /><span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Datos de muestra · sin Supabase</span></div></header>
    <CompanyInbox services={services} />
  </div>;
}
