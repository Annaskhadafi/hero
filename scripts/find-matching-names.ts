import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { sql } from "drizzle-orm";

const names = [
  { id: 23, sn: "114", name: "Priyono" },
  { id: 32, sn: "123", name: "Fakhi Rohandi" },
  { id: 46, sn: "137", name: "Herlambang Wijaya K." },
  { id: 55, sn: "146", name: "Septi Dian Rahmawati" },
  { id: 68, sn: "159", name: "Ria Anissa Putri" },
  { id: 77, sn: "168", name: "Gregorius D. S." },
  { id: 84, sn: "175", name: "M. Furqon" },
  { id: 93, sn: "184", name: "Reza Iskandar" },
  { id: 99, sn: "190", name: "Fadjar Ismail" },
  { id: 109, sn: "200", name: "Fahrulroji B.C." },
];

async function main() {
  for (const n of names) {
    // Extract first 2 tokens for fuzzy match
    const tokens = n.name.toLowerCase().split(/\s+/).filter(Boolean);
    const searchTerms = tokens.slice(0, 2).join(" ");
    if (!searchTerms) continue;

    const legacy = await db
      .select({ id: employees.id, name: employees.name, employeeSn: employees.employeeSn, email: employees.email, isActive: employees.isActive })
      .from(employees)
      .where(sql`LOWER(${employees.name}) LIKE '%' || LOWER(${searchTerms}) || '%' AND ${employees.id} != ${n.id}`);

    const hr = await db
      .select({ id: hrEmployees.id, name: hrEmployees.fullName, employeeSn: hrEmployees.employeeId, email: hrEmployees.email, isActive: hrEmployees.isActive })
      .from(hrEmployees)
      .where(sql`LOWER(${hrEmployees.fullName}) LIKE '%' || LOWER(${searchTerms}) || '%'`);

    if (legacy.length > 0 || hr.length > 0) {
      console.log(`\n=== "${n.name}" (id=${n.id}, sn=${n.sn}) ===`);
      for (const e of legacy) {
        console.log(`  [employees] id=${e.id} | sn=${e.employeeSn} | "${e.name}" | active=${e.isActive}`);
      }
      for (const e of hr) {
        console.log(`  [hr_employees] id=${e.id} | sn=${e.employeeSn} | "${e.name}" | active=${e.isActive}`);
      }
    }
  }
  process.exit(0);
}
main().catch(console.error);
