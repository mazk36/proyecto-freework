import type { Metadata } from "next";
import { ProfileDetails } from "@/components/app/profile-details";

export const metadata: Metadata = { title: "Perfil | Freework" };

export default function ProfilePage() {
  return <ProfileDetails />;
}
