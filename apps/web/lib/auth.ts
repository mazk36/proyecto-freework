export type UserRole = "company" | "freelancer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLocaleLowerCase("es"));
}
