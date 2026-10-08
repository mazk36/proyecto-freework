import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | MatchWork",
  description: "Inicia sesión en tu cuenta de MatchWork.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
