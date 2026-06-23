import { db } from "@/db";
import { employees, masterSections } from "@/db/schema/hero";
import { aliasedTable } from "drizzle-orm/alias";
import { eq, sql } from "drizzle-orm";

async function run() {
  const reviewerEmail = "mochamad.khadafi@chitraparatama.co.id";

  // Step 1: Get reviewer emp (same as getLeadersForReviewer)
  const [reviewerEmp] = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      email: employees.email,
      accessRole: employees.accessRole,
      section: employees.section,
      sectionId: employees.sectionId,
      workLocation: employees.workLocation,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .where(eq(sql`lower(${employees.email})`, reviewerEmail.toLowerCase()))
    .limit(1);

  console.log("Reviewer emp:", reviewerEmp);

  // Step 2: Fetch sectionsWithHead
  const sectionsWithHead = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
      headEmployeeId: masterSections.headEmployeeId,
    })
    .from(masterSections)
    .where(sql`${masterSections.headEmployeeId} IS NOT NULL`);

  console.log(`\nsectionsWithHead count: ${sectionsWithHead.length}`);
  const sectionHeadEmployeeIds = new Set(
    sectionsWithHead.map((s) => s.headEmployeeId).filter((id): id is number => id !== null)
  );
  console.log("sectionHeadEmployeeIds:", [...sectionHeadEmployeeIds].slice(0, 10), "...");

  // Step 3: All active employees
  const allEmployeesRaw = await db
    .select({
      id: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      departmentName: employees.department,
      positionName: employees.jobTitle,
      directManagerId: employees.directManagerId,
      section: employees.section,
      workLocation: employees.workLocation,
      empId: employees.id,
    })
    .from(employees)
    .where(eq(employees.isActive, true));

  const allSectionHeads = allEmployeesRaw.filter((emp) => {
    return emp.empId !== null && sectionHeadEmployeeIds.has(emp.empId);
  });
  console.log(`\nallSectionHeads count: ${allSectionHeads.length}`);
  console.log("allSectionHeads names:", allSectionHeads.map(e => e.fullName));

  // Step 4: Section match for Annas
  const reviewerSectionId = reviewerEmp?.sectionId;
  const reviewerSectionName = (reviewerEmp?.section || "").trim().toLowerCase();

  console.log(`\nreviewer sectionId: ${reviewerSectionId}, sectionName: '${reviewerSectionName}'`);

  let match = reviewerSectionId
    ? sectionsWithHead.find((s) => s.id === reviewerSectionId)
    : null;

  console.log("match by ID:", match);

  if (!match && reviewerSectionName) {
    match = sectionsWithHead.find(
      (s) => s.name.trim().toLowerCase() === reviewerSectionName
    );
    console.log("match by name:", match);
  }

  console.log("\nFinal match:", match);

  if (match) {
    console.log(`reviewerSectionHeadEmpId: ${match.headEmployeeId}`);
    
    // Find the matching leader
    const matchedLeader = allEmployeesRaw.find(
      (emp) => emp.empId === match!.headEmployeeId && emp.email?.toLowerCase() !== reviewerEmail.toLowerCase()
    );
    console.log("Matched leader:", matchedLeader?.fullName, matchedLeader?.email);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
