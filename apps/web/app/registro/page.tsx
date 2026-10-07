import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Registrarse | Freework",
  description: "Crea una cuenta temporal de Freework.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
