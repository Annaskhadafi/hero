import { db } from "../db";
import { cerApprovalMatrices, cerApprovalMatrixSteps } from "../db/schema/cer";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding Default CER Approval Matrix...");

  // Check if default matrix already exists
  const existing = await db
    .select()
    .from(cerApprovalMatrices)
    .where(eq(cerApprovalMatrices.name, "Standard Master Matrix (All Departments)"))
    .limit(1);

  let matrixId: number;

  if (!existing || existing.length === 0) {
    const [inserted] = await db
      .insert(cerApprovalMatrices)
      .values({
        name: "Standard Master Matrix (All Departments)",
        description:
          "Matriks alur bertingkat 15-tahap baku sesuai sistem CapEx Hero Chitra Paratama (Staff -> Leader -> Spv -> IT Device -> Manager -> Budget Validator (Dual Parallel) -> GM -> Director -> Checked by Finance -> File CER)",
        departmentId: null, // Global default
        siteId: null,
        isActive: true,
      })
      .returning({ id: cerApprovalMatrices.id });
    matrixId = inserted.id;
    console.log(`Created Master Matrix ID: ${matrixId}`);
  } else {
    matrixId = existing[0].id;
    console.log(`Using existing Master Matrix ID: ${matrixId}`);
    // Clear old steps for clean seeding
    await db
      .delete(cerApprovalMatrixSteps)
      .where(eq(cerApprovalMatrixSteps.matrixId, matrixId));
  }

  // 15 Standard Legacy Steps:
  const defaultSteps = [
    {
      stepOrder: 1,
      stepKey: "leader_1",
      label: "Acknowledge Leader-1",
      approverRole: "Leader-1 Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false, // Inactive by default unless dept has leader 1
    },
    {
      stepOrder: 2,
      stepKey: "leader_2",
      label: "Acknowledge Leader-2",
      approverRole: "Leader-2 Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false,
    },
    {
      stepOrder: 3,
      stepKey: "leader",
      label: "Acknowledge Leader",
      approverRole: "Leader Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false,
    },
    {
      stepOrder: 4,
      stepKey: "coordinator",
      label: "Acknowledge Coordinator",
      approverRole: "Coordinator Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false,
    },
    {
      stepOrder: 5,
      stepKey: "supervisor_1",
      label: "Acknowledge Supervisor-1",
      approverRole: "Supervisor-1 Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false,
    },
    {
      stepOrder: 6,
      stepKey: "supervisor",
      label: "Acknowledge Supervisor",
      approverRole: "Supervisor Atasan Langsung",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: true,
    },
    {
      stepOrder: 7,
      stepKey: "business_innovation_spv",
      label: "Acknowledge Business Innovation & Marketing Spv.",
      approverRole: "Business Innovation & Marketing Supervisor (Khusus IT Device)",
      specificEmployeeId: 1016, // Arif Maulana Ghafar
      approvalMode: "single",
      slaHours: 24,
      isActive: true,
    },
    {
      stepOrder: 8,
      stepKey: "manager_1",
      label: "Approval Manager-1",
      approverRole: "Manager-1 Departemen",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: false,
    },
    {
      stepOrder: 9,
      stepKey: "manager",
      label: "Approval Manager",
      approverRole: "Department Manager",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 24,
      isActive: true,
    },
    // Step 10: Dual Parallel Budget Validator (Amama Ira & Febrian Dani)
    {
      stepOrder: 10,
      stepKey: "budget_validator_head",
      label: "Budget Validator (Head of Finance)",
      approverRole: "Head of Finance & Accounting",
      specificEmployeeId: 1341, // Amama Ira Amalia Priyono
      approvalMode: "parallel_all",
      slaHours: 24,
      isActive: true,
    },
    {
      stepOrder: 10,
      stepKey: "budget_validator_fbp",
      label: "Budget Validator (Finance BP Manager)",
      approverRole: "Finance Business Partner Manager",
      specificEmployeeId: 960, // Febrian Dani
      approvalMode: "parallel_all",
      slaHours: 24,
      isActive: true,
    },
    // Step 11: General Manager
    {
      stepOrder: 11,
      stepKey: "general_manager",
      label: "Approval General Manager",
      approverRole: "General Manager",
      specificEmployeeId: 940, // Person Sihaloho
      approvalMode: "single",
      slaHours: 48,
      isActive: true,
    },
    // Step 12: Director-1
    {
      stepOrder: 12,
      stepKey: "director_1",
      label: "Approval Director-1",
      approverRole: "Director-1",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 48,
      isActive: false,
    },
    // Step 13: Director
    {
      stepOrder: 13,
      stepKey: "director",
      label: "Approval Director",
      approverRole: "Director Utama",
      specificEmployeeId: 10, // Hidayat Rahman
      approvalMode: "single",
      slaHours: 48,
      isActive: true,
    },
    // Step 14: Checked by Finance (Syamsul Bahri)
    {
      stepOrder: 14,
      stepKey: "finance_check",
      label: "Checked by Finance",
      approverRole: "Accounting & Asset (Input Kelompok & Nomor Aset)",
      specificEmployeeId: 990, // Syamsul Bahri
      approvalMode: "single",
      slaHours: 24,
      isActive: true,
    },
    // Step 15: File Capital Expenditure Request (Auto PDF Generation & Archive)
    {
      stepOrder: 15,
      stepKey: "file_cer",
      label: "File Capital Expenditure Request",
      approverRole: "Generate PDF Dokumen Resmi & Penomoran Aset",
      specificEmployeeId: null,
      approvalMode: "single",
      slaHours: 0,
      isActive: true,
    },
  ];

  for (const step of defaultSteps) {
    await db.insert(cerApprovalMatrixSteps).values({
      matrixId,
      stepOrder: step.stepOrder,
      stepKey: step.stepKey,
      label: step.label,
      approverRole: step.approverRole,
      specificEmployeeId: step.specificEmployeeId,
      approvalMode: step.approvalMode,
      slaHours: step.slaHours,
      isActive: step.isActive,
    });
  }

  console.log(`Successfully seeded ${defaultSteps.length} steps for matrix ID: ${matrixId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed default matrix:", err);
  process.exit(1);
});
