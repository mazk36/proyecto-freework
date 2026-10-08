import type { Metadata } from "next";
import { LoginExperience } from "@/components/auth/login-experience";

export const metadata: Metadata = {
  title: "Iniciar sesión | MatchWork",
  description: "Inicia sesión en tu cuenta de MatchWork.",
};

export default function LoginPage() {
  return <LoginExperience />;
}
