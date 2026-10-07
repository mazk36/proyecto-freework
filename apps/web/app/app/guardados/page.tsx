import type { Metadata } from "next";
import { AccountEmptyPage } from "@/components/app/account-empty-page";

export const metadata: Metadata = { title: "Guardados | Freework" };

export default function SavedPage() {
  return <AccountEmptyPage kind="saved" />;
}
