import type { Metadata } from "next";
import { AccountEmptyPage } from "@/components/app/account-empty-page";

export const metadata: Metadata = { title: "Propuestas | Freework" };

export default function ProposalsPage() {
  return <AccountEmptyPage kind="proposals" />;
}
