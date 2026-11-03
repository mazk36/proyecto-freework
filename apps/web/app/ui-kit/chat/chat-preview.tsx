"use client";

import { CircleUserRound, Compass, Heart, Layers3, MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { createSampleChatServices, type SampleMode } from "./sample-data";

const modes: { value: SampleMode; label: string }[] = [
  { value: "normal", label: "Conversaciones" }, { value: "loading", label: "Carga" },
  { value: "empty", label: "Vacío" }, { value: "error", label: "Error" },
];
const navigation = [
  { label: "Swipe", icon: Layers3 }, { label: "Explorar", icon: Compass }, { label: "Likes", icon: Heart },
  { label: "Chats", icon: MessagesSquare }, { label: "Perfil", icon: CircleUserRound },
];

export function ChatPreview() {
  const [mode, setMode] = useState<SampleMode>("normal");
  return <PreviewContent key={mode} mode={mode} onModeChange={setMode} />;
}

function PreviewContent({ mode, onModeChange }: { mode: SampleMode; onModeChange: (mode: SampleMode) => void }) {
  const [failureArmed, setFailureArmed] = useState(false);
  const [sample] = useState(() => createSampleChatServices(mode, () => setFailureArmed(false)));
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (mode === "normal" && window.matchMedia("(min-width: 768px)").matches) setSelected("muestra-ana");
  }, [mode]);
  return <div className="private-app-shell flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2"><MatchWorkLogoLockup className="w-[6.5rem] sm:w-32" size="compact" variant="reversed" /><span className="rounded-full border border-warning/40 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">Datos de muestra · sin Supabase</span></div>
      <div aria-label="Estados de muestra" className="mt-3 flex flex-wrap items-center gap-1" role="group">{modes.map((item) => <button aria-pressed={mode === item.value} className={`min-h-11 rounded-lg px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${mode === item.value ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:bg-surface-raised"}`} key={item.value} onClick={() => onModeChange(item.value)} type="button">{item.label}</button>)}{mode === "normal" ? <button className="min-h-11 rounded-lg px-3 text-xs font-semibold text-warning underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={() => { sample.failNextSend(); setFailureArmed(true); }} type="button">{failureArmed ? "Próximo envío: fallo simulado" : "Simular fallo de envío"}</button> : null}</div>
    </header>
    <div className="grid min-h-0 flex-1 md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-label="Navegación de muestra" className="hidden border-r border-border px-3 py-7 md:block lg:px-5"><div className="grid gap-2">{navigation.map(({ label, icon: Icon }) => <div className={`flex min-h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm lg:justify-start ${label === "Chats" ? "bg-accent/15 text-foreground" : "text-muted-foreground"}`} key={label}><Icon aria-hidden="true" className="size-5" /><span className="sr-only lg:not-sr-only">{label}</span></div>)}</div></aside>
      <div className="min-h-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"><ChatWorkspace onSelectMatch={setSelected} selectedMatchId={selected} services={sample.services} userId="yo" /></div>
    </div>
    <div aria-label="Navegación de muestra" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"><div className="mx-auto flex max-w-lg">{navigation.map(({ label, icon: Icon }) => <div className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.625rem] ${label === "Chats" ? "bg-accent/15 text-foreground" : "text-muted-foreground"}`} key={label}><Icon aria-hidden="true" className="size-5" />{label}</div>)}</div></div>
  </div>;
}
