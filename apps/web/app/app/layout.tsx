import type { ReactNode } from "react";
import { PrivateAppShell } from "@/components/app/private-app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <PrivateAppShell>{children}</PrivateAppShell>;
}
