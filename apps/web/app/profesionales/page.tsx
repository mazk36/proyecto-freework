import type { Metadata } from "next";
import { PublicFreelancerProfilePage } from "@/components/public/public-freelancer-profile";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = publicPageMetadata(
  "Perfil profesional | MatchWork",
  "Conoce el perfil y los trabajos de profesionales en MatchWork.",
  "profesionales/",
);

export default function ProfessionalsPage() {
  return <PublicFreelancerProfilePage />;
}
