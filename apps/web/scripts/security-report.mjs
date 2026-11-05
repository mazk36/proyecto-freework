// Convierte el resultado JSON de e2e/security-final.mjs en las tablas de docs/security/revision-final.md.
// Uso: node scripts/security-report.mjs <security-final.json>  > tabla.md
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("Falta la ruta del JSON de resultados."); process.exit(2); }
const results = JSON.parse(readFileSync(file, "utf8"));
const sections = [
  ["P1.s.", "1b. Privacidad: Storage"],
  ["P1.", "1. Privacidad"],
  ["P2.", "2. Autorización"],
  ["P3.enum", "3b. Enumeración de cuentas"],
  ["P3.", "3. Abuso: límites y cuotas"],
];
const used = new Set();
const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\n/g, " ");
for (const [prefix, title] of sections) {
  const rows = results.filter((r) => !used.has(r.id) && r.id.startsWith(prefix));
  rows.forEach((r) => used.add(r.id));
  if (!rows.length) continue;
  console.log(`\n### ${title}\n\n| Intento | Resultado | Gravedad si prosperara | Detalle |\n|---|---|---|---|`);
  for (const r of rows) console.log(`| ${cell(r.title)} | ${r.blocked ? "Bloqueado" : r.accepted ? "**Aceptado** (ver motivo)" : "**Vulnerable**"} | ${r.severity} | ${cell(r.detail).slice(0, 200)}${r.accepted ? ` Motivo: ${cell(r.accepted)}` : ""} |`);
}
const blocked = results.filter((r) => r.blocked).length;
const accepted = results.filter((r) => r.accepted).length;
console.log(`\n**Total: ${blocked} de ${results.length} intentos bloqueados; ${accepted} riesgos aceptados y documentados; ${results.length - blocked - accepted} vulnerables.**`);
