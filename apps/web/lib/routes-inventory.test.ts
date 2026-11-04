import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Route = { path: string; file?: string | null };
const inventory = JSON.parse(readFileSync(join(process.cwd(), "e2e/routes.json"), "utf8")) as { routes: Route[] };

function pageRoutes(dir: string, base = ""): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "ui-kit") continue; // las vistas previas de diseño las elimina el build de producción
      found.push(...pageRoutes(full, `${base}/${name}`));
    } else if (name === "page.tsx") found.push(base || "/");
  }
  return found;
}

const normalized = (path: string) => path.split("?")[0].replace(/\/$/, "") || "/";

describe("inventario de rutas", () => {
  const inInventory = new Set(inventory.routes.filter((route) => route.file !== null).map((route) => normalized(route.file ?? route.path)));

  it("toda página de app/ está en e2e/routes.json (añádela con sus roles y estados)", () => {
    const missing = pageRoutes(join(process.cwd(), "app")).filter((route) => !inInventory.has(normalized(route)));
    expect(missing).toEqual([]);
  });

  it("todo ítem del inventario con archivo corresponde a una página existente", () => {
    const real = new Set(pageRoutes(join(process.cwd(), "app")).map(normalized));
    const orphans = [...inInventory].filter((route) => !real.has(route));
    expect(orphans).toEqual([]);
  });
});
