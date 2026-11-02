"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function UiKitInteractions() {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => toast({ title: "Cambios guardados", description: "Todo está al día.", tone: "success" })}
          variant="outline"
        >
          Mostrar aviso
        </Button>
        <Button
          onClick={() => toast({
            title: "Elemento retirado",
            description: "Puedes deshacer esta acción.",
            tone: "neutral",
            actionLabel: "Deshacer",
            onAction: () => toast({ title: "Acción deshecha", tone: "success" }),
          })}
          variant="outline"
        >
          Mostrar aviso con acción
        </Button>
        <Button onClick={() => setSheetOpen(true)} variant="outline">Abrir panel</Button>
      </div>
      <BottomSheet
        description="Revisa la información con calma y continúa cuando quieras."
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        title="Un espacio para los detalles"
      >
        <div className="grid gap-4 border-t border-border pt-5">
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">Lo esencial, en un lugar</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Aquí puedes revisar el contexto antes de decidir cómo continuar.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">Tómate tu tiempo</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Desplázate para leer el contenido completo. Puedes volver a la pantalla anterior cuando lo necesites.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">El siguiente paso</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Cuando termines de revisar, cierra este panel para seguir explorando.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">Todo a tu alcance</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">La información importante permanece reunida para que puedas consultarla sin perder el contexto.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">Una lectura cómoda</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Puedes avanzar por el contenido a tu ritmo, tanto en el móvil como en una pantalla más amplia.</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="font-display text-base font-semibold">Cuando estés listo</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Al cerrar el panel regresarás al lugar desde el que lo abriste.</p>
          </div>
          <Button className="justify-self-start" onClick={() => setSheetOpen(false)} variant="outline">Entendido</Button>
        </div>
      </BottomSheet>
    </>
  );
}
