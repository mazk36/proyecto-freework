import type { Metadata } from "next";
import { AppHome } from "@/components/app/app-home";

export const metadata: Metadata = { title: "Inicio | Freework" };

export default function PrivateHomePage() {
  return <AppHome />;
}
