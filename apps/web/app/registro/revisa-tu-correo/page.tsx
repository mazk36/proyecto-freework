import type { Metadata } from "next";
import { CheckEmailExperience } from "@/components/auth/check-email-experience";

export const metadata: Metadata = { title: "Revisa tu correo | MatchWork", robots: { index: false, follow: false } };

export default function CheckEmailPage() {
  return <CheckEmailExperience />;
}
