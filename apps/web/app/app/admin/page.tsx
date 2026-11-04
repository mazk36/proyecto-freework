import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata: Metadata = { title: "Admin | MatchWork" };

export default function AdminPage() {
  return <AdminPanel />;
}
