import type { Metadata } from "next";
import { AppHome } from "@/components/app/app-home";

export const metadata: Metadata = { title: "Inicio | MatchWork" };

export default function PrivateHomePage() {
  return <AppHome />;
}
