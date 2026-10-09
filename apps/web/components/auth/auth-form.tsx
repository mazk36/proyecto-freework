"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/auth";
import reversedWordmark from "@/public/brand/matchwork-wordmark-reversed.png";

type AuthFormProps = { mode: "login" | "register" };

const labelClass = "block text-sm font-medium text-foreground";
const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30";
const registrationInputClass =
  "min-h-11 w-full rounded-xl border border-white/10 bg-[#161B22] py-2.5 pl-11 pr-4 text-base text-[#F8FAFC] outline-none placeholder:text-[#9BA7B6] focus:border-[#8A4DFF] focus:ring-2 focus:ring-[#8A4DFF]/35";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login, register, isReady, storageNotice } = useAuth();
  const [role, setRole] = useState<UserRole | "">("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isRegistration = mode === "register";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    if (isRegistration) {
      const name = String(values.get("name") ?? "").trim();
      const confirmation = String(values.get("confirmation") ?? "");
      if (password !== confirmation) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      if (!role) {
        setError("Selecciona si tu cuenta será de empresa o freelancer.");
        return;
      }
      const result = register({ name, email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } else {
      if (!password) {
        setError("Escribe tu contraseña.");
        return;
      }
      const result = login({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }

    router.replace("/app");
  }

  if (isRegistration) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[#080D17] p-2 text-[#F8FAFC] sm:p-3">
        <div className="mx-auto grid min-h-[calc(100dvh-1rem)] w-full max-w-[92rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0D1117] shadow-[0_32px_100px_rgba(0,0,0,0.48)] min-[900px]:min-h-[calc(100dvh-1.5rem)] min-[900px]:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
          <section aria-labelledby="auth-title" className="flex flex-col justify-center px-4 py-8 sm:px-8 sm:py-10 xl:px-14">
            <div className="mx-auto w-full max-w-[27rem]">
              <Link
                aria-label="MatchWork, ir al inicio"
                className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
                href="/"
              >
                <MatchWorkLogoLockup preload size="large" variant="reversed" />
              </Link>

              <div className="mt-8">
                <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#F8FAFC] sm:text-[2.15rem]" id="auth-title">
                  Crea tu cuenta
                </h1>
                <p className="mt-1.5 max-w-md text-sm leading-5 text-[#B6C1D0] sm:text-base sm:leading-6">
                  Regístrate en MatchWork y elige tu tipo de cuenta.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="name">Nombre</label>
                  <div className="relative mt-1.5">
                    <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                    <input autoComplete="name" className={registrationInputClass} id="name" maxLength={100} name="name" placeholder="Tu nombre" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="email">Correo electrónico</label>
                  <div className="relative mt-1.5">
                    <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                    <input autoComplete="email" className={registrationInputClass} id="email" name="email" placeholder="correo@ejemplo.com" required type="email" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="password">Contraseña</label>
                  <div className="relative mt-1.5">
                    <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                    <input
                      autoComplete="new-password"
                      className={`${registrationInputClass} pr-12`}
                      id="password"
                      minLength={1}
                      name="password"
                      placeholder="Crea una contraseña"
                      required
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#B6C1D0] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
                      onClick={() => setShowPassword((visible) => !visible)}
                      type="button"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="size-[1.125rem]" /> : <Eye aria-hidden="true" className="size-[1.125rem]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="confirmation">Confirmar contraseña</label>
                  <div className="relative mt-1.5">
                    <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                    <input
                      autoComplete="new-password"
                      className={`${registrationInputClass} pr-12`}
                      id="confirmation"
                      minLength={1}
                      name="confirmation"
                      placeholder="Repite tu contraseña"
                      required
                      type={showConfirmation ? "text" : "password"}
                    />
                    <button
                      aria-label={showConfirmation ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                      aria-pressed={showConfirmation}
                      className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#B6C1D0] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
                      onClick={() => setShowConfirmation((visible) => !visible)}
                      type="button"
                    >
                      {showConfirmation ? <EyeOff aria-hidden="true" className="size-[1.125rem]" /> : <Eye aria-hidden="true" className="size-[1.125rem]" />}
                    </button>
                  </div>
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium text-[#F8FAFC]">Tipo de cuenta</legend>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <label className={`flex min-h-[4.25rem] cursor-pointer items-center gap-2.5 rounded-xl border px-3 transition duration-200 hover:border-white/20 hover:bg-white/[0.03] sm:gap-3 sm:px-4 ${role === "company" ? "border-[#8A4DFF] bg-[#8A4DFF]/10 shadow-[0_0_0_1px_rgba(138,77,255,0.18)]" : "border-white/10 bg-[#161B22]"}`}>
                      <input checked={role === "company"} className="size-4 shrink-0 accent-[#8A4DFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8C4FF]" name="role" onChange={() => setRole("company")} type="radio" value="company" />
                      <Briefcase aria-hidden="true" className="hidden size-4 shrink-0 text-[#D8C4FF] min-[400px]:block" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Empresa</span>
                    </label>
                    <label className={`flex min-h-[4.25rem] cursor-pointer items-center gap-2.5 rounded-xl border px-3 transition duration-200 hover:border-white/20 hover:bg-white/[0.03] sm:gap-3 sm:px-4 ${role === "freelancer" ? "border-[#8A4DFF] bg-[#8A4DFF]/10 shadow-[0_0_0_1px_rgba(138,77,255,0.18)]" : "border-white/10 bg-[#161B22]"}`}>
                      <input checked={role === "freelancer"} className="size-4 shrink-0 accent-[#8A4DFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8C4FF]" name="role" onChange={() => setRole("freelancer")} type="radio" value="freelancer" />
                      <UserRound aria-hidden="true" className="hidden size-4 shrink-0 text-[#D8C4FF] min-[400px]:block" />
                      <span className="text-sm font-medium text-[#F8FAFC]">Freelancer</span>
                    </label>
                  </div>
                </fieldset>

                {error ? <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-200" role="alert">{error}</p> : null}
                {storageNotice ? <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100" role="status">{storageNotice}</p> : null}

                <Button className="w-full rounded-xl shadow-[0_10px_26px_rgba(138,77,255,0.24)] transition duration-200 hover:-translate-y-px" disabled={!isReady} size="lg" type="submit">
                  Crear cuenta <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-[#B6C1D0]">
                ¿Ya tienes cuenta?{" "}
                <Link className="font-semibold text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]" href="/iniciar-sesion">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </section>

          <aside aria-label="Identidad de MatchWork" className="relative hidden min-h-full overflow-hidden bg-[#0B2A5B] min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:px-10 xl:px-14">
            <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 18% 18%, rgb(138 77 255 / 22%), transparent 34%), radial-gradient(ellipse at 82% 76%, rgb(35 89 160 / 40%), transparent 42%), linear-gradient(145deg, #0B2A5B 0%, #101c42 52%, #11152f 100%)" }} />
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-70" fill="none" preserveAspectRatio="none" viewBox="0 0 900 760">
              <g stroke="#D8C4FF" strokeOpacity=".24" strokeWidth="1.2">
                <path d="M-55 132C86 126 99 258 207 275c89 14 127-43 191-31" />
                <path d="M-40 592c101-3 146-86 240-92 57-4 89 14 135-3" />
                <path d="M951 115c-117 8-142 113-235 128-51 8-81-1-116 20" />
                <path d="M942 612c-113-17-149-95-250-85-67 7-86 37-140 26" />
              </g>
              <g fill="#D8C4FF">
                <circle cx="207" cy="275" r="3" />
                <circle cx="716" cy="243" r="3" />
                <circle cx="692" cy="553" r="2.5" />
                <circle cx="83" cy="131" r="2" />
                <circle cx="811" cy="611" r="2" />
              </g>
              <g fill="#8A4DFF" fillOpacity=".9">
                <circle cx="136" cy="173" r="2" />
                <circle cx="758" cy="190" r="2" />
                <circle cx="105" cy="589" r="2" />
                <circle cx="792" cy="574" r="2" />
              </g>
            </svg>

            <div className="relative z-10 flex w-full max-w-[34rem] flex-col items-center text-center">
              <div className="w-full max-w-[25rem] drop-shadow-[0_12px_36px_rgba(4,10,28,0.32)]">
                <Image alt="MatchWork" className="h-auto w-full object-contain" height={reversedWordmark.height} preload src={reversedWordmark} unoptimized width={reversedWordmark.width} />
              </div>
              <h2 className="mt-7 text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#F8FAFC] sm:text-3xl xl:text-[2.1rem]">
                Tu próxima gran conexión comienza aquí.
              </h2>
              <p className="mt-3 max-w-[29rem] text-sm leading-6 text-[#D8C4FF]/90 sm:text-base sm:leading-7">
                Empresas con desafíos y profesionales con soluciones, en un solo lugar.
              </p>
            </div>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <Link aria-label="MatchWork, ir al inicio" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/">
          <MatchWorkLogoLockup preload />
        </Link>
        <section aria-labelledby="auth-title" className="mt-8">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight" id="auth-title">
            Inicia sesión
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Ingresa con el correo que registraste en este navegador.
          </p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className={labelClass} htmlFor="email">Correo electrónico</label>
              <input autoComplete="email" className={inputClass} id="email" name="email" required type="email" />
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Contraseña</label>
              <input
                autoComplete="current-password"
                className={inputClass}
                id="password"
                minLength={1}
                name="password"
                required
                type="password"
              />
            </div>

            {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
            {storageNotice ? <p className="text-sm text-amber-800" role="status">{storageNotice}</p> : null}

            <Button className="w-full" disabled={!isReady} size="lg" type="submit">
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link className="font-semibold text-foreground underline decoration-accent underline-offset-4 hover:text-accent" href="/registro">
              Regístrate
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
