import type { Metadata } from "next";
import { AuthCallbackExperience } from "@/components/auth/auth-callback-experience";

export const metadata: Metadata = { title: "Confirmar cuenta | MatchWork" };

export default function AuthCallbackPage() {
  return <AuthCallbackExperience />;
}
