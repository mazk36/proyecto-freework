import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Chats | MatchWork" };

export default function ChatsPage() {
  return (
    <AppEmptyState
      action={<ButtonLink href="/app/matches" variant="outline">Consultar Matches</ButtonLink>}
      description="El chat se habilitará cuando exista una conexión autorizada y esté integrado el servicio de conversaciones. No hay conversaciones de ejemplo."
      title="Las conversaciones empiezan con un Match."
    />
  );
}
