import type { Metadata } from "next";
import { MyProposalsPage } from "@/components/discovery/state-pages";

export const metadata: Metadata = { title: "Mis propuestas | Freework" };

export default function ProposalsPage() {
  return <MyProposalsPage />;
}
