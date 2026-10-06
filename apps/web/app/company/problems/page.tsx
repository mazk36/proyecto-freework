import type { Metadata } from "next";
import { CompanyProblemsPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Mis problemas | Freework" };

export default function CompanyProblemsRoute() {
  return <CompanyProblemsPage />;
}
