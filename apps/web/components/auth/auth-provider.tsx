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
import {
  AUTH_ACCOUNTS_KEY,
  AUTH_SESSION_KEY,
  findAuthAccount,
  isValidEmail,
  normalizeEmail,
  parseAuthAccounts,
  parseAuthUser,
  upsertAuthAccount,
  type AuthUser,
  type UserRole,
} from "@/lib/auth";

type AuthResult = { ok: true } | { ok: false; error: string };

type RegisterInput = {
  name: string;
  email: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoggingOut: boolean;
  storageNotice: string;
  login: (input: { email: string }) => AuthResult;
  register: (input: RegisterInput) => AuthResult;
  logout: () => void;
  finishLogout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    try {
      const savedAccounts = parseAuthAccounts(
        window.localStorage.getItem(AUTH_ACCOUNTS_KEY),
      );
      const savedSession = window.localStorage.getItem(AUTH_SESSION_KEY);
      const sessionValue: unknown = savedSession ? JSON.parse(savedSession) : null;
      setAccounts(savedAccounts);
      setUser(parseAuthUser(sessionValue));
    } catch {
      setStorageNotice(
        "El navegador no permite conservar la sesión. Podrás usarla hasta recargar la página.",
      );
    } finally {
      setIsReady(true);
    }
  }, []);

  const saveAuthState = useCallback(
    (nextAccounts: AuthUser[], nextUser: AuthUser): void => {
      try {
        window.localStorage.setItem(
          AUTH_ACCOUNTS_KEY,
          JSON.stringify(nextAccounts),
        );
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextUser));
        setStorageNotice("");
      } catch {
        setStorageNotice(
          "El navegador no permitió guardar la sesión. Podrás usarla hasta recargar la página.",
        );
      }
      setAccounts(nextAccounts);
      setUser(nextUser);
      setIsLoggingOut(false);
    },
    [],
  );

  const register = useCallback(
    ({ name, email, role }: RegisterInput): AuthResult => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedName = name.trim();
      if (!normalizedName) return { ok: false, error: "Escribe tu nombre." };
      if (!isValidEmail(normalizedEmail)) {
        return { ok: false, error: "Escribe un correo electrónico válido." };
      }
      if (role !== "company" && role !== "freelancer") {
        return { ok: false, error: "Selecciona un tipo de cuenta." };
      }
      if (findAuthAccount(accounts, normalizedEmail)) {
        return {
          ok: false,
          error: "Ya existe una cuenta local con ese correo. Inicia sesión.",
        };
      }

      const account: AuthUser = {
        id: window.crypto.randomUUID(),
        name: normalizedName,
        email: normalizedEmail,
        role,
      };
      saveAuthState(upsertAuthAccount(accounts, account), account);
      return { ok: true };
    },
    [accounts, saveAuthState],
  );

  const login = useCallback(
    ({ email }: { email: string }): AuthResult => {
      if (!isValidEmail(email)) {
        return { ok: false, error: "Escribe un correo electrónico válido." };
      }
      const account = findAuthAccount(accounts, email);
      if (!account) {
        return {
          ok: false,
          error: "No hay una cuenta local con ese correo. Regístrate primero.",
        };
      }
      saveAuthState(accounts, account);
      return { ok: true };
    },
    [accounts, saveAuthState],
  );

  const logout = useCallback(() => {
    setIsLoggingOut(true);
    try {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      setStorageNotice("");
    } catch {
      setStorageNotice(
        "El navegador no permitió borrar la sesión guardada. Cierra esta pestaña para finalizarla.",
      );
    }
    setUser(null);
  }, []);

  const finishLogout = useCallback(() => setIsLoggingOut(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isReady,
      isLoggingOut,
      storageNotice,
      login,
      register,
      logout,
      finishLogout,
    }),
    [user, isReady, isLoggingOut, storageNotice, login, register, logout, finishLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}
