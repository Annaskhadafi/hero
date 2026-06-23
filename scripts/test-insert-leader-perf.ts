import { db } from "@/db";
import { hcLeaderPerformance, employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

async function run() {
  // Simulate what createLeaderPerformanceReview does
  const leaderId = "47006"; // Andana's employeeSn
  const reviewerId = "71261"; // Annas's employeeSn

  // 1. Find leader
  const [leaderEmp] = await db
    .select({
      departmentName: employees.department,
      workLocation: employees.workLocation,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.employeeSn, leaderId))
    .limit(1);

  console.log("Leader found:", leaderEmp);

  // 2. Check PJO applicability
  const loc = (leaderEmp?.workLocation || "").trim().toLowerCase();
  const dept = (leaderEmp?.departmentName || "").trim().toLowerCase();
  const isApplicable = !loc.includes("balikpapan") && !loc.includes("jakarta") && 
    (dept.includes("central service") || dept.includes("central services"));

  console.log(`isApplicable: ${isApplicable}, loc: '${loc}', dept: '${dept}'`);

  const survey = isApplicable ? 3 : 0;
  const responseTime = 3;
  const leadership = 3;
  const overall = isApplicable
    ? ((survey + responseTime + leadership) / 3).toFixed(2)
    : ((responseTime + leadership) / 2).toFixed(2);

  console.log(`Scores: survey=${survey}, response=${responseTime}, leadership=${leadership}, overall=${overall}`);

  // 3. Try insert
  try {
    const [created] = await db
      .insert(hcLeaderPerformance)
      .values({
        leaderSn: leaderId,
        reviewerSn: reviewerId,
        period: "2026 Q1",
        surveyScore: survey,
        responseTimeScore: responseTime,
        leadershipScore: leadership,
        overallScore: overall,
        feedback: "test insert",
        status: "draft",
      })
      .returning();

    console.log("✅ Insert success! id:", created.id);

    // Cleanup - delete the test record
    await db.delete(hcLeaderPerformance).where(eq(hcLeaderPerformance.id, created.id));
    console.log("✅ Test record deleted.");
  } catch (err: any) {
    console.error("❌ Insert failed:", err.message);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
