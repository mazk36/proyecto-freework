import type { Metadata } from "next";
import { PasswordRecoveryExperience } from "@/components/auth/password-recovery-experience";

export const metadata: Metadata = {
  title: "Recupera tu contraseña | MatchWork",
  description: "Solicita recuperar el acceso a tu cuenta de MatchWork.",
};

export default function PasswordRecoveryPage() {
  return <PasswordRecoveryExperience />;
}
