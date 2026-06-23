import { db } from "@/db";
import { employees, hrEmployees } from "@/db/schema/hero";

const ABBREV: Record<string, string[]> = {
  m: ["muhammad", "mohammad", "muhamad", "mohamed", "muchamat", "muh", "mochammad"],
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

function sameLengthAbbreviation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isAbbreviation(a[i], b[i]) && !isAbbreviation(b[i], a[i])) return false;
  }
  return true;
}

function isPrefixName(shorter: string[], longer: string[]): boolean {
  if (shorter.length >= longer.length) return false;
  if (shorter.length < 2) return false;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] !== longer[i]) return false;
  }
  return true;
}

// Match "Havid Raka R.P." (["havid","raka","rp"]) against
// "Havid Raka Radhitya Putra" (["havid","raka","radhitya","putra"])
// Strategy: walk short tokens; for each token, either match exact or expand initials
function matchWithInitialExpansion(short: string[], long: string[]): boolean {
  if (short.length >= long.length) return false;
  let j = 0;
  for (let i = 0; i < short.length; i++) {
    if (j >= long.length) return false;
    const s = short[i];

    if (s === long[j]) {
      j++;
    } else if (long[j].startsWith(s) && s.length >= 2) {
      // e.g. "Muham" vs "Muhammad" (prefix match)
      j++;
    } else if (s.length <= 3) {
      // Short token like "rp", "r", "y", "s": each char is initial of corresponding long token
      let consumed = 0;
      for (let k = 0; k < s.length; k++) {
        const idx = j + k;
        if (idx >= long.length) return false;
        if (!long[idx].startsWith(s[k])) break;
        consumed++;
      }
      if (consumed === 0) return false;
      j += consumed;
    } else {
      return false;
    }
  }
  return j <= long.length;
}

function isPotentialDuplicate(nameA: string, nameB: string): boolean {
  if (nameA === nameB) return false;
  const a = tokens(nameA);
  const b = tokens(nameB);
  if (a.length === 0 || b.length === 0) return false;

  if (sameLengthAbbreviation(a, b)) return true;
  if (a.length < b.length && isPrefixName(a, b)) return true;
  if (b.length < a.length && isPrefixName(b, a)) return true;
  if (a.length < b.length && matchWithInitialExpansion(a, b)) return true;
  if (b.length < a.length && matchWithInitialExpansion(b, a)) return true;

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
        `  [${emp.source}] id=${emp.id} | sn=${emp.employeeSn || "-"} | "${emp.name}" | active=${emp.isActive}`
      );
    }
    console.log("");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
