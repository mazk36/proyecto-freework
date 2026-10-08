import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Registrarse | MatchWork",
  description: "Crea una cuenta temporal de MatchWork.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
