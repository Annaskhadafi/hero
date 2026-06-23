import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";

const ABBREV: Record<string, string[]> = {
  m: ["muhammad", "mohammad", "muhamad", "mohamed", "muchamat", "muh", "muh.", "mochammad"],
  a: ["ahmad", "abdul", "abdullah"],
  h: ["habib", "hasan", "husain", "hussein", "haji"],
  s: ["siti", "syamsuddin", "surya"],
  n: ["nur", "nora"],
  r: ["rahman", "ridwan", "rudi"],
  i: ["ibnu", "imam", "iskandar"],
  f: ["fachri", "fahrul", "farhan"],
  d: ["dodi", "dedi", "dimas"],
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

// Check if token arrays match as abbreviations (same length)
function namesMatchSameLength(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isAbbreviation(a[i], b[i]) && !isAbbreviation(b[i], a[i])) return false;
  }
  return true;
}

// Check if one name is abbreviation/subsequence of the other (e.g. "Wahyu Ichsan" inside "Muhammad Wahyu Ichsan")
function namesMatchSubsequence(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  // Try to match a inside b
  function isSubsequence(short: string[], long: string[]): boolean {
    let j = 0;
    for (let i = 0; i < long.length && j < short.length; i++) {
      if (isAbbreviation(short[j], long[i]) || isAbbreviation(long[i], short[j]) || short[j] === long[i]) {
        j++;
      }
    }
    return j === short.length;
  }
  if (a.length < b.length) return isSubsequence(a, b);
  if (b.length < a.length) return isSubsequence(b, a);
  return false;
}

function isPotentialDuplicate(nameA: string, nameB: string): boolean {
  if (nameA === nameB) return false;
  const a = tokens(nameA);
  const b = tokens(nameB);
  if (a.length === 0 || b.length === 0) return false;

  if (namesMatchSameLength(a, b)) return true;
  if (namesMatchSubsequence(a, b)) return true;

  return false;
}

async function main() {
  const legacy = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      isActive: employees.isActive,
    })
    .from(employees);

  const hr = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeSn: hrEmployees.employeeId,
      email: hrEmployees.email,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
      isActive: hrEmployees.isActive,
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
      if (isPotentialDuplicate(all[i].name, all[j].name)) {
        group.push(all[j]);
        used.add(j);
      }
    }
    if (group.length > 1) groups.push(group);
  }

  console.log(`\nFound ${groups.length} potential abbreviated-name duplicate groups:\n`);
  for (const group of groups) {
    console.log("--- Group ---");
    for (const emp of group) {
      console.log(
        `  [${emp.source}] id=${emp.id} | sn=${emp.employeeSn || "-"} | email=${emp.email || "-"} | name="${emp.name}" | active=${emp.isActive}`
      );
    }
    console.log("");
  }

  console.log("\n=== JSON OUTPUT ===");
  console.log(
    JSON.stringify(
      groups.map((g) =>
        g.map((e) => ({
          source: e.source,
          id: e.id,
          name: e.name,
          employeeSn: e.employeeSn,
          email: e.email,
          active: e.isActive,
        }))
      ),
      null,
      2
    )
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
