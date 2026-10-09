"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isValidEmail, type AuthUser, type UserRole } from "@/lib/auth";
import { getAbsoluteSiteUrl, getSupabaseClient, SUPABASE_CONFIGURATION_MESSAGE } from "@/lib/supabase/client";
import { getRegisteredProfile } from "@/lib/auth-service";

type AuthResult =
  | { ok: true; requiresEmailConfirmation?: boolean }
  | { ok: false; error: string };

type RegisterInput = { name: string; email: string; password: string; role: UserRole; next?: string };

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoggingOut: boolean;
  storageNotice: string;
  authIssue: string;
  login: (input: { email: string; password: string }) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  finishLogout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authIssue, setAuthIssue] = useState("");
  const storageNotice = getSupabaseClient() ? "" : SUPABASE_CONFIGURATION_MESSAGE;

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsReady(true);
      return;
    }

    let active = true;
    let requestSequence = 0;

    const loadAuthenticatedUser = async (authUser: SupabaseUser | null) => {
      const sequence = ++requestSequence;
      if (!authUser) {
        if (active && sequence === requestSequence) {
          setUser(null);
          setAuthIssue("");
          setIsReady(true);
          setIsLoggingOut(false);
        }
        return;
      }

      try {
        const profile = await getRegisteredProfile(authUser);
        if (active && sequence === requestSequence) {
          setUser({
            id: profile.id,
            name: profile.fullName,
            email: authUser.email ?? "",
            role: profile.role,
          });
          setAuthIssue("");
          setIsLoggingOut(false);
        }
      } catch (error) {
        if (active && sequence === requestSequence) {
          setUser(null);
          setAuthIssue(error instanceof Error ? error.message : "No pudimos validar tu cuenta.");
        }
      } finally {
        if (active && sequence === requestSequence) setIsReady(true);
      }
    };

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthIssue("No pudimos comprobar tu sesión. Inicia sesión nuevamente.");
      void loadAuthenticatedUser(data.session?.user ?? null);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      // Run the profile lookup after Supabase finishes its auth callback to avoid holding its auth lock.
      window.setTimeout(() => {
        if (active) void loadAuthenticatedUser(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }): Promise<AuthResult> => {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: SUPABASE_CONFIGURATION_MESSAGE };
    if (!isValidEmail(email)) return { ok: false, error: "Escribe un correo electrónico válido." };
    if (!password) return { ok: false, error: "Escribe tu contraseña." };

    try {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { ok: false, error: authErrorMessage(error.message) };
      if (!data.user) return { ok: false, error: "No pudimos iniciar sesión con esos datos." };
      setUser(await hydrateCurrentUser(data.user));
      setAuthIssue("");
      setIsReady(true);
      return { ok: true };
    } catch (profileError) {
      return { ok: false, error: profileError instanceof Error ? "No pudimos conectar con MatchWork. Revisa tu conexión e inténtalo de nuevo." : "No pudimos validar tu cuenta." };
    }
  }, []);

  const register = useCallback(async ({ name, email, password, role, next }: RegisterInput): Promise<AuthResult> => {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: SUPABASE_CONFIGURATION_MESSAGE };
    if (!name.trim()) return { ok: false, error: "Escribe tu nombre." };
    if (!isValidEmail(email)) return { ok: false, error: "Escribe un correo electrónico válido." };
    if (password.length < 8) return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
    if (role !== "company" && role !== "freelancer") return { ok: false, error: "Selecciona un tipo de cuenta." };

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), role },
          emailRedirectTo: getAbsoluteSiteUrl(`/auth/callback/${next && next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`),
        },
      });
      if (error) return { ok: false, error: authErrorMessage(error.message) };
      if (!data.session || !data.user) return { ok: true, requiresEmailConfirmation: true };
      setUser(await hydrateCurrentUser(data.user));
      setAuthIssue("");
      setIsReady(true);
      return { ok: true };
    } catch {
      return { ok: false, error: "No pudimos crear la cuenta. Revisa tu conexión e inténtalo de nuevo." };
    }
  }, []);

  const logout = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setIsLoggingOut(true);
    try {
      const { error } = await client.auth.signOut();
      if (!error) return;
      setAuthIssue("No pudimos cerrar la sesión. Inténtalo nuevamente.");
      setIsLoggingOut(false);
    } catch {
      setAuthIssue("No pudimos cerrar la sesión. Inténtalo nuevamente.");
      setIsLoggingOut(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const client = getSupabaseClient();
    if (!client) return { ok: false, error: SUPABASE_CONFIGURATION_MESSAGE };
    if (!isValidEmail(email)) return { ok: false, error: "Escribe un correo electrónico válido." };
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAbsoluteSiteUrl("/auth/callback/?flow=recovery"),
      });
      return error ? { ok: false, error: authErrorMessage(error.message) } : { ok: true };
    } catch {
      return { ok: false, error: "No pudimos enviar el enlace. Inténtalo de nuevo." };
    }
  }, []);

  const finishLogout = useCallback(() => setIsLoggingOut(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isReady,
      isLoggingOut,
      storageNotice,
      authIssue,
      login,
      register,
      requestPasswordReset,
      logout,
      finishLogout,
    }),
    [user, isReady, isLoggingOut, storageNotice, authIssue, login, register, requestPasswordReset, logout, finishLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function hydrateCurrentUser(authUser: SupabaseUser): Promise<AuthUser> {
  const profile = await getRegisteredProfile(authUser);
  return {
    id: profile.id,
    name: profile.fullName,
    email: authUser.email ?? "",
    role: profile.role,
  };
}

function authErrorMessage(message: string): string {
  if (/invalid login credentials/i.test(message)) return "El correo o la contraseña no son correctos.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo desde el enlace que te enviamos antes de iniciar sesión.";
  if (/already registered|user already/i.test(message)) return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (/password/i.test(message)) return "La contraseña no cumple los requisitos de seguridad.";
  return "No pudimos completar la autenticación. Revisa tus datos e inténtalo de nuevo.";
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}
