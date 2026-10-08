"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import reversedWordmark from "@/public/brand/matchwork-wordmark-reversed.png";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-[#161B22] py-3 pl-11 pr-4 text-base text-[#F8FAFC] outline-none placeholder:text-[#9BA7B6] focus:border-[#8A4DFF] focus:ring-2 focus:ring-[#8A4DFF]/35";

export function LoginExperience() {
  const router = useRouter();
  const { login, isReady, storageNotice } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }

    const result = login({ email });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/app");
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#080D17] px-3 py-3 text-[#F8FAFC] sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-[92rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0D1117] shadow-[0_32px_100px_rgba(0,0,0,0.48)] min-[900px]:min-h-[calc(100dvh-2.5rem)] min-[900px]:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
        <section aria-labelledby="login-title" className="flex flex-col justify-center px-4 py-7 sm:px-8 sm:py-10 min-[900px]:px-8 xl:px-14">
          <div className="mx-auto flex w-full max-w-[27rem] flex-col gap-7 py-2">
            <Link
              aria-label="MatchWork, ir al inicio"
              className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
              href="/"
            >
              <MatchWorkLogoLockup preload size="large" variant="reversed" />
            </Link>

            <div>
              <p className="mb-3 w-fit rounded-full border border-[#8A4DFF]/35 bg-[#8A4DFF]/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#D8C4FF]">
                Acceso temporal de desarrollo
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#F8FAFC] sm:text-[2.15rem]" id="login-title">
                ¡Bienvenido de nuevo!
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#B6C1D0] sm:text-base">
                Inicia sesión para seguir conectando talento con oportunidades.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="login-email">
                  Correo electrónico
                </label>
                <div className="relative mt-2">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                  <input
                    autoComplete="email"
                    className={inputClassName}
                    id="login-email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    required
                    type="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="login-password">
                  Contraseña
                </label>
                <div className="relative mt-2">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                  <input
                    autoComplete="current-password"
                    className={`${inputClassName} pr-12`}
                    id="login-password"
                    minLength={1}
                    name="password"
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
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-[1.125rem]" />
                    ) : (
                      <Eye aria-hidden="true" className="size-[1.125rem]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <p aria-disabled="true" className="text-right text-xs text-[#D8C4FF] sm:text-sm">
                  ¿Olvidaste tu contraseña? <span className="text-[#B6C1D0]">Próximamente</span>
                </p>
              </div>

              <p className="text-xs leading-5 text-[#AAB6C6]">
                La contraseña solo se solicita para probar el formulario. No se guarda ni se verifica.
              </p>

              {error ? (
                <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-200" role="alert">
                  {error}
                </p>
              ) : null}
              {storageNotice ? (
                <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100" role="status">
                  {storageNotice}
                </p>
              ) : null}

              <button
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4DFF] px-5 py-3 text-base font-semibold text-white shadow-[0_10px_26px_rgba(138,77,255,0.24)] transition duration-200 hover:bg-[#9864FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8C4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!isReady}
                type="submit"
              >
                Iniciar sesión <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </form>

            <div className="flex items-center gap-4 text-xs text-[#9BA7B6]">
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
              <span>O continúa con</span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
            </div>

            <button
              aria-label="Continuar con Google, próximamente"
              className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#161B22] px-4 text-sm font-medium text-[#B6C1D0] opacity-75"
              disabled
              type="button"
            >
              <span aria-hidden="true" className="font-sans text-lg font-bold text-[#8AB4F8]">G</span>
              <span>Continuar con Google</span>
              <span className="text-xs text-[#D8C4FF]">Próximamente</span>
            </button>

            <p className="text-center text-sm text-[#B6C1D0]">
              ¿No tienes una cuenta?{" "}
              <Link
                className="font-semibold text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
                href="/registro"
              >
                Regístrate
              </Link>
            </p>

            <p className="border-t border-white/10 pt-4 text-xs leading-5 text-[#9BA7B6]">
              La autenticación es una simulación frontend. No protege información ni reemplaza una sesión validada en servidor.
            </p>
          </div>
        </section>

        <aside aria-label="Identidad de MatchWork" className="relative hidden min-h-full overflow-hidden bg-[#0B2A5B] min-[900px]:flex min-[900px]:items-center min-[900px]:justify-center min-[900px]:px-10 xl:px-14">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 18% 18%, rgb(138 77 255 / 22%), transparent 34%), radial-gradient(ellipse at 82% 76%, rgb(35 89 160 / 40%), transparent 42%), linear-gradient(145deg, #0B2A5B 0%, #101c42 52%, #11152f 100%)",
            }}
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full opacity-70"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 900 760"
          >
            <g stroke="#D8C4FF" strokeOpacity=".24" strokeWidth="1.2">
              <path d="M-55 132C86 126 99 258 207 275c89 14 127-43 191-31" />
              <path d="M-40 592c101-3 146-86 240-92 57-4 89 14 135-3" />
              <path d="M951 115c-117 8-142 113-235 128-51 8-81-1-116 20" />
              <path d="M942 612c-113-17-149-95-250-85-67 7-86 37-140 26" />
              <path d="M44 410c82-33 98-93 166-118" strokeOpacity=".14" />
              <path d="M859 354c-89 24-113 71-183 79" strokeOpacity=".14" />
            </g>
            <g fill="#D8C4FF">
              <circle cx="207" cy="275" r="3" />
              <circle cx="191" cy="500" r="2.5" />
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
              <Image
                alt="MatchWork"
                className="h-auto w-full object-contain"
                height={reversedWordmark.height}
                preload
                src={reversedWordmark}
                unoptimized
                width={reversedWordmark.width}
              />
            </div>
            <h2 className="mt-9 text-balance font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#F8FAFC] sm:text-3xl xl:text-[2.1rem]">
              El talento correcto. La oportunidad correcta.
            </h2>
            <p className="mt-4 max-w-[29rem] text-sm leading-7 text-[#D8C4FF]/90 sm:text-base">
              Donde los desafíos de las empresas encuentran soluciones creadas por el talento adecuado.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
