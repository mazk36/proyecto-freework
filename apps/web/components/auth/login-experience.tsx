"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";
import { authContinuationHref, safeAppDestination } from "@/lib/auth-routing";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const inputClassName =
  "min-h-11 w-full rounded-xl border border-white/10 bg-[#161B22] py-2.5 pl-11 pr-4 text-base text-[#F8FAFC] outline-none placeholder:text-[#9BA7B6] focus:border-[#8A4DFF] focus:ring-2 focus:ring-[#8A4DFF]/35";

export function LoginExperience() {
  const router = useRouter();
  const { login, isReady, storageNotice, authIssue } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [continuationHref, setContinuationHref] = useState("/registro");

  useEffect(() => {
    const destination = new URLSearchParams(window.location.search).get("next");
    setContinuationHref(authContinuationHref("/registro", destination));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");

    if (!password) {
      setError("Escribe tu contraseña.");
      setIsSubmitting(false);
      return;
    }

    const result = await login({ email, password });
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const candidate = new URLSearchParams(window.location.search).get("next");
    router.replace(safeAppDestination(candidate));
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#080D17] p-2 text-[#F8FAFC] sm:p-3">
      <div className="mx-auto grid min-h-[calc(100dvh-1rem)] w-full max-w-[92rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0D1117] shadow-[0_32px_100px_rgba(0,0,0,0.48)] min-[768px]:min-h-[calc(100dvh-1.5rem)] min-[768px]:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
        <section aria-labelledby="login-title" className="flex flex-col justify-center px-4 py-[clamp(0.625rem,1.5dvh,1rem)] sm:px-8 min-[900px]:px-8 xl:px-14">
          <div className="mx-auto flex w-full max-w-[27rem] flex-col gap-[clamp(0.625rem,1.75dvh,1.125rem)]">
            <Link
              aria-label="MatchWork, ir al inicio"
              className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0D1117]"
              href="/"
            >
              <MatchWorkLogoLockup preload size="large" variant="reversed" />
            </Link>

            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#F8FAFC] sm:text-[2.15rem]" id="login-title">
                ¡Bienvenido de nuevo!
              </h1>
              <p className="mt-1.5 max-w-md text-sm leading-5 text-[#B6C1D0] sm:text-base sm:leading-6">
                Inicia sesión para seguir conectando talento con oportunidades.
              </p>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC]" htmlFor="login-email">
                  Correo electrónico
                </label>
                <div className="relative mt-1.5">
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
                <div className="relative mt-1.5">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-[#9BA7B6]" />
                  <input
                    autoComplete="current-password"
                    className={`${inputClassName} pr-12`}
                    id="login-password"
                    minLength={8}
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
                <Link
                  className="text-right text-xs font-medium text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF] sm:text-sm"
                  href="/recuperar-contrasena"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

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
              {authIssue ? (
                <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-200" role="alert">
                  {authIssue}
                </p>
              ) : null}

              <button
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#8A4DFF] px-5 py-2.5 text-base font-semibold text-white shadow-[0_10px_26px_rgba(138,77,255,0.24)] transition duration-200 hover:bg-[#9864FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8C4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!isReady || isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Ingresando…" : "Iniciar sesión"} <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-[#9BA7B6]">
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
              <span>O continúa con</span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
            </div>

            <button
              aria-label="Continuar con Google, sin proveedor configurado"
              className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#161B22] px-4 text-sm font-medium text-[#B6C1D0] opacity-75"
              disabled
              type="button"
            >
              <span aria-hidden="true" className="font-sans text-lg font-bold text-[#8AB4F8]">G</span>
              <span>Continuar con Google</span>
              <span className="text-xs text-[#D8C4FF]">No configurado</span>
            </button>

            <p className="text-center text-sm text-[#B6C1D0]">
              ¿No tienes una cuenta?{" "}
              <Link
                className="font-semibold text-[#D8C4FF] underline decoration-[#8A4DFF]/70 underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A4DFF]"
                href={continuationHref}
              >
                Regístrate
              </Link>
            </p>
          </div>
        </section>

        <aside aria-labelledby="login-promise-title" className="relative hidden min-h-full overflow-hidden bg-[#0B2A5B] min-[768px]:block">
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-[68%_50%]"
            fill
            sizes="(min-width: 92rem) 46rem, 52vw"
            src={`${publicBasePath}/images/auth/everest-login.webp`}
            unoptimized
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(7, 12, 23, 0.04) 0%, rgba(11, 42, 91, 0.12) 42%, rgba(7, 12, 23, 0.86) 100%)",
            }}
          />
          <div className="absolute inset-x-6 bottom-8 z-10 max-w-[34rem] sm:inset-x-8 sm:bottom-10 lg:inset-x-10 lg:bottom-12 xl:inset-x-14 xl:bottom-14">
            <h2 className="text-balance font-display text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.04em] text-[#F8FAFC] lg:text-[2.15rem] xl:text-[2.6rem]" id="login-promise-title">
              Los humanos siempre hemos buscado <span className="text-[#D8C4FF]">retos.</span>
            </h2>
            <p className="mt-4 max-w-[30rem] font-sans text-sm font-normal leading-6 text-[#F8FAFC]/90 sm:text-base sm:leading-7 lg:text-lg">
              Resolver problemas es parte de quienes somos.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
