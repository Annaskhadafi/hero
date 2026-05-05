/**
 * Backfill script: copy `section` from hero_employees into centralServiceEmployees
 * for employees matched by employeeSn.
 * Run once after db:push to populate existing records.
 * Usage: npx tsx scripts/backfill-cs-section.ts
 */
import { db } from "../db";
import { centralServiceEmployees } from "../db/schema/central-service";
import { employees as heroEmployees } from "../db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Fetching centralServiceEmployees...");
  const csEmps = await db.select({ id: centralServiceEmployees.id, sn: centralServiceEmployees.employeeSn, section: centralServiceEmployees.section }).from(centralServiceEmployees);
  console.log(`Found ${csEmps.length} employees`);

  let updated = 0;
  for (const csEmp of csEmps) {
    // Skip if section already set
    if (csEmp.section) { continue; }

    const [hero] = await db
      .select({ section: heroEmployees.section, workLocation: heroEmployees.workLocation })
      .from(heroEmployees)
      .where(eq(heroEmployees.employeeSn, csEmp.sn))
      .limit(1);

    if (hero?.section) {
      await db
        .update(centralServiceEmployees)
        .set({ section: hero.section, siteName: hero.workLocation || undefined })
        .where(eq(centralServiceEmployees.id, csEmp.id));
      updated++;
      console.log(`  Updated SN=${csEmp.sn} → section="${hero.section}"`);
    }
  }
  console.log(`\nDone! Updated ${updated} employees.`);
}

main().catch((e) => { console.error("Error:", e); process.exit(1); }).finally(() => process.exit(0));
