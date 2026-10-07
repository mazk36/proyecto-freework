export type UserRole = "company" | "freelancer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export const AUTH_ACCOUNTS_KEY = "freework.dev.accounts.v1";
export const AUTH_SESSION_KEY = "freework.dev.session.v1";

export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("es");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function parseAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    (candidate.role !== "company" && candidate.role !== "freelancer")
  ) {
    return null;
  }

  const name = candidate.name.trim();
  const email = normalizeEmail(candidate.email);
  if (!candidate.id.trim() || !name || !isValidEmail(email)) return null;

  return {
    id: candidate.id,
    name,
    email,
    role: candidate.role,
  };
}

export function parseAuthAccounts(serialized: string | null): AuthUser[] {
  if (!serialized) return [];

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];

    const accounts = parsed.flatMap((item) => {
      const account = parseAuthUser(item);
      return account ? [account] : [];
    });

    return accounts.filter(
      (account, index) =>
        accounts.findIndex((candidate) => candidate.email === account.email) === index,
    );
  } catch {
    return [];
  }
}

export function findAuthAccount(
  accounts: AuthUser[],
  email: string,
): AuthUser | null {
  const normalizedEmail = normalizeEmail(email);
  return accounts.find((account) => account.email === normalizedEmail) ?? null;
}

export function upsertAuthAccount(
  accounts: AuthUser[],
  nextAccount: AuthUser,
): AuthUser[] {
  return [
    ...accounts.filter((account) => account.email !== nextAccount.email),
    nextAccount,
  ];
}
