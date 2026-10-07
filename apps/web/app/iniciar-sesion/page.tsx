import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Freework",
  description: "Inicia sesión en tu cuenta de Freework.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
