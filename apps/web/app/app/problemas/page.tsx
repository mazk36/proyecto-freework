import type { Metadata } from "next";
import { BusinessProblemDashboard } from "@/components/app/business-problem-dashboard";

export const metadata: Metadata = { title: "Mis problemas | MatchWork" };

export default function CompanyProblemsPage() {
  return <BusinessProblemDashboard />;
}
