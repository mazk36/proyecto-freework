import type { Metadata } from "next";
import { LoginExperience } from "@/components/auth/login-experience";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = publicPageMetadata("Iniciar sesión | MatchWork", "Inicia sesión en tu cuenta de MatchWork.", "iniciar-sesion/");

export default function LoginPage() {
  return <LoginExperience />;
}
