"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDemoStore } from "@/components/discovery/demo-store";

export function RoleSwitcher() {
  const { role, setRole } = useDemoStore();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
      <span className="hidden sm:inline">Vista demo</span>
      <select
        aria-label="Cambiar rol de demostración"
        className="min-h-9 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onChange={(event) => {
          const nextRole = event.target.value === "company" ? "company" : "freelancer";
          setRole(nextRole);
          if (pathname !== "/") router.push("/discover");
        }}
        value={role}
      >
        <option value="freelancer">Freelancer</option>
        <option value="company">Empresa</option>
      </select>
    </label>
  );
}
