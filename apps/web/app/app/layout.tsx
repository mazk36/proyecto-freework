import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PrivateAppShell } from "@/components/app/private-app-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: ReactNode }) {
  return <PrivateAppShell>{children}</PrivateAppShell>;
}
