import type { Metadata } from "next";
import { PublicFreelancerProfilePage } from "@/components/public/public-freelancer-profile";

export const metadata: Metadata = { title: "Perfil profesional | MatchWork" };

export default function ProfessionalsPage() {
  return <PublicFreelancerProfilePage />;
}
