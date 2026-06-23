import { db } from "@/db";
import { hrEmployees, employees, masterSections, hrDepartments } from "@/db/schema/hero";
import { eq, sql } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";

async function run() {
  const hrDepartmentsAlias = aliasedTable(hrDepartments, "dept");
  const leaders = await db
    .select({
      id: hrEmployees.id,
      fullName: hrEmployees.fullName,
      email: hrEmployees.email,
      departmentName: hrDepartmentsAlias.name,
      workLocation: employees.workLocation,
      section: employees.section,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartmentsAlias, eq(hrEmployees.departmentId, hrDepartmentsAlias.id))
    .leftJoin(employees, eq(hrEmployees.email, employees.email))
    .where(eq(hrEmployees.isActive, true));

  const sectionsWithHead = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
      headEmployeeId: masterSections.headEmployeeId,
    })
    .from(masterSections);

  const sectionHeadIds = sectionsWithHead
    .map((s) => s.headEmployeeId)
    .filter((id): id is number => id !== null);

  const activeLeaders = leaders.filter((l) => l.id !== null && sectionHeadIds.includes(l.id));

  console.log(`Active leaders (section heads): ${activeLeaders.length}`);
  activeLeaders.forEach((l) => {
    console.log(`- ${l.fullName} (${l.email}) | Dept: ${l.departmentName} | Loc: ${l.workLocation} | Sec: ${l.section}`);
  });
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
