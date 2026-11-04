import type { Metadata } from "next";
import { PasswordRecoveryExperience } from "@/components/auth/password-recovery-experience";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata("Recupera tu contraseña | MatchWork", "Solicita recuperar el acceso a tu cuenta de MatchWork.", "recuperar-contrasena/"),
  robots: { index: false, follow: true },
};

export default function PasswordRecoveryPage() {
  return <PasswordRecoveryExperience />;
}
