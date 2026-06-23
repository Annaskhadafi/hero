import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";

const ABBREV: Record<string, string[]> = {
  m: ["muhammad", "mohammad", "muhamad", "mohamed"],
  a: ["ahmad", "abdul", "abdullah"],
  h: ["habib", "hasan", "husain", "hussein"],
  s: ["siti", "syamsuddin", "surya"],
  n: ["nur", "nora"],
  r: ["rahman", "ridwan", "rudi"],
  i: ["ibnu", "imam", "iskandar"],
  f: ["fachri", "fahrul", "farhan"],
  d: ["dodi", "dedi"],
};

function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/\./g, "").trim();
}

function tokens(name: string): string[] {
  return name.split(/\s+/).map(normalizeToken).filter(Boolean);
}

function isAbbreviation(short: string, full: string): boolean {
  if (short === full) return true;
  if (short.length === 1 && full.startsWith(short)) return true;
  const expansions = ABBREV[short] || [];
  if (expansions.includes(full)) return true;
  return false;
}

function namesMatch(nameA: string, nameB: string): boolean {
  if (nameA === nameB) return false;
  const a = tokens(nameA);
  const b = tokens(nameB);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ta = a[i];
    const tb = b[i];
    if (!isAbbreviation(ta, tb) && !isAbbreviation(tb, ta)) return false;
  }
  return true;
}

function isMoreComplete(nameA: string, nameB: string): boolean {
  // Prefer longer name (less abbreviated)
  const a = tokens(nameA);
  const b = tokens(nameB);
  const aAbbrCount = a.filter((t) => t.length === 1).length;
  const bAbbrCount = b.filter((t) => t.length === 1).length;
  if (aAbbrCount !== bAbbrCount) return aAbbrCount < bAbbrCount;
  return nameA.length > nameB.length;
}

async function main() {
  const legacy = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.isActive, true));

  const hr = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeSn: hrEmployees.employeeId,
      email: hrEmployees.email,
    })
    .from(hrEmployees);

  const all = [
    ...legacy.map((e) => ({ ...e, source: "employees" as const })),
    ...hr.map((e) => ({ ...e, source: "hr_employees" as const })),
  ];

  const groups: Array<typeof all> = [];
  const used = new Set<number>();

  for (let i = 0; i < all.length; i++) {
    if (used.has(i)) continue;
    const group = [all[i]];
    used.add(i);
    for (let j = i + 1; j < all.length; j++) {
      if (used.has(j)) continue;
      if (namesMatch(all[i].name, all[j].name)) {
        group.push(all[j]);
        used.add(j);
      }
    }
    if (group.length > 1) groups.push(group);
  }

  let deactivatedCount = 0;

  for (const group of groups) {
    // Pick canonical: prefer hr_employees, else the most complete name
    const hrRecord = group.find((g) => g.source === "hr_employees");
    let canonical = hrRecord || group[0];
    if (!hrRecord) {
      canonical = group.reduce((best, current) =>
        isMoreComplete(current.name, best.name) ? current : best
      );
    }

    for (const record of group) {
      if (record.source === "hr_employees") continue; // never deactivate hr source of truth
      if (record.id === canonical.id && record.source === canonical.source) continue;

      await db
        .update(employees)
        .set({ isActive: false })
        .where(eq(employees.id, record.id));

      console.log(
        `DEACTIVATED employees.id=${record.id} | sn=${record.employeeSn || "-"} | name="${record.name}" (keep: "${canonical.name}")`
      );
      deactivatedCount++;
    }
  }

  console.log(`\nDone. Deactivated ${deactivatedCount} abbreviated duplicate employees records.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
