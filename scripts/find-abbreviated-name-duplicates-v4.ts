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

// Same token count, token-by-token abbreviation match
function sameLengthAbbreviation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isAbbreviation(a[i], b[i]) && !isAbbreviation(b[i], a[i])) return false;
  }
  return true;
}

// Shorter name is a prefix of longer name (e.g. "Ade Fazri" vs "Ade Fazri Hariyadi")
function isPrefixName(shorter: string[], longer: string[]): boolean {
  if (shorter.length >= longer.length) return false;
  if (shorter.length < 2) return false;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] !== longer[i]) return false;
  }
  return true;
}

// Short name has some tokens that are single letters matching start of multi-token in long
// e.g. "Havid Raka R.P." → ["havid","raka","rp"] vs "Havid Raka Radhitya Putra" → ["havid","raka","radhitya","putra"]
// "rp" is split into "r"+"p" matching "radhitya"+"putra"
function initialMultiTokenMatch(shorter: string[], longer: string[]): boolean {
  if (shorter.length >= longer.length) return false;
  // shorter must have at least 1 single-letter token that could expand to 2+ tokens
  let i = 0, j = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++; j++;
    } else if (shorter[i].length === 1 && longer[j].startsWith(shorter[i])) {
      // Single letter token in shorter matches start of current longer token
      // Try to consume one or more longer tokens with the single letter
      let consumed = 0;
      while (
        j + consumed < longer.length &&
        longer[j + consumed].startsWith(shorter[i])
      ) {
        consumed++;
      }
      i++; j += consumed;
    } else {
      return false;
    }
  }
  return i === shorter.length && j <= longer.length;
}

// Improved: check if short tokens match long tokens where single-letter short tokens
// can match one or more long tokens (each by first letter)
function isInitialMatch(short: string[], long: string[]): boolean {
  if (short.length >= long.length) return false;
  let j = 0;
  for (let i = 0; i < short.length && j < long.length; i++) {
    if (short[i] === long[j]) {
      j++;
    } else if (short[i].length === 1) {
      // Single letter: can match 1+ consecutive long tokens starting with that letter
      let matched = false;
      for (let k = j; k < long.length; k++) {
        if (long[k].startsWith(short[i])) {
          j = k + 1;
          matched = true;
          break;
        }
      }
      if (!matched) return false;
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
  if (a.length < b.length && isInitialMatch(a, b)) return true;
  if (b.length < a.length && isInitialMatch(b, a)) return true;

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
