import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Registrarse | MatchWork",
  description: "Crea una cuenta de empresa o freelancer en MatchWork.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
