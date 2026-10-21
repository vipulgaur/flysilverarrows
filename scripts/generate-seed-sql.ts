/** Emits the demo-academy seed as literal SQL from the same practice data the app shipped with. */
import { seedData } from "../src/lib/seed";
import { TABLE_ORDER, toTables } from "../src/lib/api/mapping";

export const DEMO_TENANT_ID = "5a0e0000-0000-4000-8000-000000000001";
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const out: string[] = [
  `insert into public.tenants (id, slug, name, time_zone) values (${q(DEMO_TENANT_ID)}, 'silverarrows', 'SilverArrows Flight Academy', 'Europe/Copenhagen');`,
];
const tables = toTables(seedData(), DEMO_TENANT_ID);
for (const name of TABLE_ORDER) {
  const rows = tables[name].map((r) => Object.fromEntries(Object.entries(r).filter(([k, v]) => v !== null && k !== "tenant_id")));
  if (!rows.length) continue;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  out.push(`insert into public.${name} (tenant_id, ${cols.join(", ")}) select '${DEMO_TENANT_ID}', ${cols.join(", ")} from jsonb_populate_recordset(null::public.${name}, ${q(JSON.stringify(rows))});`);
}
console.log(out.join("\n"));
