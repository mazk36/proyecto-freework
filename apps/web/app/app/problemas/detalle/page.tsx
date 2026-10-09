import type { Metadata } from "next";
import { CompanyProblemDetails } from "@/components/app/company-problem-details";

export const metadata: Metadata = { title: "Detalle del problema | MatchWork" };

export default function CompanyProblemDetailsPage() {
  return <CompanyProblemDetails />;
}
