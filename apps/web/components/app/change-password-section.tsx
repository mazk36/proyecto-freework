"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changePassword, requestReauthentication, validatePasswordChange } from "@/lib/password-change";
import { passwordRequirementText } from "@/lib/password-policy";

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-12 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent";

function PasswordInput({ label, name, describedBy, autoComplete = "new-password" }: { label: string; name: string; describedBy?: string; autoComplete?: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <div className="relative">
        <input aria-describedby={describedBy} autoComplete={autoComplete} className={inputClass} id={id} name={name} required type={visible ? "text" : "password"} />
        <button
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-0.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setVisible((value) => !value)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-[1.125rem]" /> : <Eye aria-hidden="true" className="size-[1.125rem]" />}
        </button>
      </div>
    </div>
  );
}

/** Cambio de contraseña con la sesión abierta. Si GoTrue pide reautenticación, envía un código al correo y lo solicita aquí. */
export function ChangePasswordSection() {
  const { toast } = useToast();
  const helpId = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    const nonce = String(values.get("nonce") ?? "").trim();
    setError("");
    setNotice("");
    const invalid = validatePasswordChange(password, confirmation);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    const failure = await changePassword(password, needsCode ? nonce : undefined);
    if (!failure) {
      form.reset();
      setNeedsCode(false);
      toast({ title: "Contraseña actualizada", tone: "success" });
      setBusy(false);
      return;
    }
    if (failure.reauth) {
      const sendError = await requestReauthentication();
      setNeedsCode(true);
      if (sendError) setError(sendError);
      else setNotice("Por seguridad te enviamos un código a tu correo. Escríbelo abajo y vuelve a pulsar «Actualizar contraseña».");
    } else {
      setError(failure.message);
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="password-section-title" className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-soft"><KeyRound className="size-5" /></span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight" id="password-section-title">Contraseña</h2>
          <p className="mt-1 text-sm text-muted-foreground" id={helpId}>Cambia la contraseña de tu cuenta. {passwordRequirementText}</p>
        </div>
      </div>
      <form className="mt-5 grid max-w-md gap-4" noValidate onSubmit={handleSubmit}>
        <PasswordInput describedBy={helpId} label="Nueva contraseña" name="password" />
        <PasswordInput label="Confirmar contraseña" name="confirmation" />
        {needsCode ? (
          <div>
            <label className="text-sm font-medium" htmlFor="password-code">Código del correo</label>
            <input autoComplete="one-time-code" className={`${inputClass} pr-3.5`} id="password-code" inputMode="numeric" name="nonce" required />
          </div>
        ) : null}
        {notice ? <p className="text-sm text-muted-foreground" role="status">{notice}</p> : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button className="w-full sm:w-auto sm:justify-self-start" disabled={busy} type="submit">{busy ? "Actualizando…" : "Actualizar contraseña"}</Button>
      </form>
    </section>
  );
}
