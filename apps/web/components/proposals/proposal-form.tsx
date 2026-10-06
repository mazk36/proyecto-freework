"use client";

import { Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { SolutionProposal } from "@/types/domain";

type ProposalFormProps = {
  onCancel: () => void;
  onSubmit: (proposal: SolutionProposal) => void;
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50 focus:ring-4 focus:ring-accent/10";
const labelClass = "block text-sm font-semibold text-foreground";

export function ProposalForm({ onCancel, onSubmit }: ProposalFormProps) {
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const approach = String(formData.get("approach") ?? "").trim();
    const deliverables = String(formData.get("deliverables") ?? "").trim();
    const estimatedTimeline = String(formData.get("estimatedTimeline") ?? "").trim();
    const conditions = String(formData.get("conditions") ?? "").trim();
    const price = Number(formData.get("price"));

    if (!title || !approach || !deliverables || !estimatedTimeline) {
      setError("Completa el título y todos los campos obligatorios.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Ingresa un precio mayor que cero.");
      return;
    }

    onSubmit({
      id: `proposal-${Date.now()}`,
      title,
      approach,
      deliverables,
      estimatedTimeline,
      price,
      currency: "USD",
      conditions,
      freelancer: {
        name: "Tu propuesta",
        initials: "TP",
        description: "Freelancer de demostración",
      },
    });
  }

  return (
    <form className="rounded-card border border-border bg-white p-5 sm:p-7" noValidate onSubmit={handleSubmit}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Tu perspectiva</p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-foreground">
            Propón una solución
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Explica el enfoque, el alcance y el precio para que la empresa pueda valorar tu propuesta.
          </p>
        </div>
        <button
          aria-label="Cerrar formulario de propuesta"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={onCancel}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <p className="mb-5 rounded-xl border border-accent/15 bg-accent-soft/60 px-4 py-3 text-xs leading-5 text-foreground/75">
        Demostración: la propuesta solo se añade a esta página mientras permanezca abierta. No se guarda ni se envía.
      </p>

      <div className="grid gap-5">
        <div>
          <label className={labelClass} htmlFor="proposal-title">Título de la solución</label>
          <input className={inputClass} id="proposal-title" maxLength={90} name="title" placeholder="Resume tu enfoque" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="proposal-approach">Cómo resolverías el problema</label>
          <textarea className={`${inputClass} min-h-28 resize-y py-3`} id="proposal-approach" maxLength={1600} name="approach" placeholder="Describe los pasos que propones y por qué pueden ayudar." required />
        </div>
        <div>
          <label className={labelClass} htmlFor="proposal-deliverables">Qué entregarías</label>
          <textarea className={`${inputClass} min-h-24 resize-y py-3`} id="proposal-deliverables" maxLength={1000} name="deliverables" placeholder="Enumera los resultados y entregables esperados." required />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="proposal-time">Tiempo estimado</label>
            <input className={inputClass} id="proposal-time" maxLength={60} name="estimatedTimeline" placeholder="Por ejemplo, 3 semanas" required />
          </div>
          <div>
            <label className={labelClass} htmlFor="proposal-price">Precio propuesto (USD)</label>
            <input className={inputClass} id="proposal-price" min="1" name="price" placeholder="0" required step="1" type="number" />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="proposal-conditions">Condiciones o aclaraciones <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <textarea className={`${inputClass} min-h-20 resize-y py-3`} id="proposal-conditions" maxLength={800} name="conditions" placeholder="Incluye supuestos o detalles que ayuden a entender la propuesta." />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-accent" role="alert">{error}</p> : null}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} variant="outline">Cancelar</Button>
        <Button type="submit">
          Añadir propuesta de demostración
          <Send aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </form>
  );
}
