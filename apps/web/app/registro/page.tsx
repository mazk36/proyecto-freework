import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = publicPageMetadata("Registrarse | MatchWork", "Crea una cuenta de empresa o freelancer en MatchWork.", "registro/");

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
