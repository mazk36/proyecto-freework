import type { Metadata } from "next";
import { ProfilePage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Profile | Freework" };

export default function ProfileRoute() {
  return <ProfilePage />;
}
