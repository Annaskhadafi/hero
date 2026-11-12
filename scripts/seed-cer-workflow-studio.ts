import { db } from "../db";
import {
  workflowTemplates,
  workflowTemplateVersions,
  workflowBranches,
  orgChartStructures,
  orgChartNodes,
  approvalMatrices,
  approvalMatrixSteps,
  employees,
} from "../db/schema/hero";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("=== Seeding CER into Workflow Studio Centralized Engine ===");

  const now = new Date();

  // 1. Ensure OrgChartStructure for CER
  let [structure] = await db
    .select()
    .from(orgChartStructures)
    .where(
      and(
        eq(orgChartStructures.scopeType, "workflow"),
        eq(orgChartStructures.scopeValue, "cer-request")
      )
    );

  if (!structure) {
    [structure] = await db
      .insert(orgChartStructures)
      .values({
        name: "Workflow Studio - CER (Capital Expenditure Request)",
        scopeType: "workflow",
        scopeValue: "cer-request",
        version: 1,
        effectiveFrom: now,
        isDefault: false,
        description: "Struktur hirarki persetujuan baku CER 15-tahap",
        isActive: true,
      })
      .returning();
    console.log(`Created OrgChartStructure ID: ${structure.id}`);
  } else {
    console.log(`Using existing OrgChartStructure ID: ${structure.id}`);
  }

  // Helper to ensure an org chart node exists
  async function ensureNode(
    code: string,
    label: string,
    role: string,
    employeeId: number | null,
    slaHours = 24
  ) {
    const [existing] = await db
      .select()
      .from(orgChartNodes)
      .where(
        and(
          eq(orgChartNodes.structureId, structure.id),
          eq(orgChartNodes.nodeCode, code)
        )
      );

    if (existing) {
      if (existing.employeeId !== employeeId || existing.label !== label) {
        await db
          .update(orgChartNodes)
          .set({ employeeId, label, approvalRole: role, slaHours, updatedAt: now })
          .where(eq(orgChartNodes.id, existing.id));
      }
      return existing.id;
    }

    const [created] = await db
      .insert(orgChartNodes)
      .values({
        structureId: structure.id,
        nodeCode: code,
        nodeType: employeeId ? "employee" : "role",
        approvalRole: role,
        employeeId,
        canApprove: true,
        canDelegate: true,
        slaHours,
        label,
        sortOrder: 1,
        isActive: true,
      })
      .returning();
    return created.id;
  }

  // Create nodes for our key actors and roles
  const nodeLeader1 = await ensureNode("cer:step:1:leader1", "Acknowledge Leader-1", "leader_1", null);
  const nodeLeader2 = await ensureNode("cer:step:2:leader2", "Acknowledge Leader-2", "leader_2", null);
  const nodeLeader = await ensureNode("cer:step:3:leader", "Acknowledge Leader", "leader", null);
  const nodeCoord = await ensureNode("cer:step:4:coord", "Acknowledge Coordinator", "coordinator", null);
  const nodeSpv1 = await ensureNode("cer:step:5:spv1", "Acknowledge Supervisor-1", "supervisor_1", null);
  const nodeSpv = await ensureNode("cer:step:6:spv", "Acknowledge Supervisor", "supervisor", null);
  const nodeBim = await ensureNode("cer:step:7:bim", "Acknowledge BIM Spv. (Arif Maulana Ghafar)", "bim_spv", 1016);
  const nodeMgr1 = await ensureNode("cer:step:8:mgr1", "Approval Manager-1", "manager_1", null);
  const nodeMgr = await ensureNode("cer:step:9:mgr", "Approval Manager", "manager", null);
  const nodeBvHead = await ensureNode("cer:step:10:bv_head", "Budget Validator (Amama Ira Amalia)", "budget_validator_head", 1341);
  const nodeBvFbp = await ensureNode("cer:step:10:bv_fbp", "Budget Validator (Febrian Dani)", "budget_validator_fbp", 960);
  const nodeGm = await ensureNode("cer:step:11:gm", "Approval General Manager (Person Sihaloho)", "general_manager", 940, 48);
  const nodeDir1 = await ensureNode("cer:step:12:dir1", "Approval Director-1", "director_1", null, 48);
  const nodeDir = await ensureNode("cer:step:13:dir", "Approval Director (Hidayat Rahman)", "director", 10, 48);
  const nodeFin = await ensureNode("cer:step:14:finance", "Checked by Finance (Syamsul Bahri)", "finance_check", 990);
  const nodeFile = await ensureNode("cer:step:15:file", "File Capital Expenditure Request", "file_cer", null);

  // 2. Ensure Workflow Template in Workflow Studio
  let [workflow] = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.templateKey, "cer-request"));

  if (!workflow) {
    [workflow] = await db
      .insert(workflowTemplates)
      .values({
        templateKey: "cer-request",
        name: "Pengadaan Aset (CER)",
        mode: "org_template",
        description: "Workflow Persetujuan Pengadaan Aset / CapEx (15 Tahapan Legacy Baku)",
        isActive: true,
      })
      .returning();
    console.log(`Created WorkflowTemplate ID: ${workflow.id}`);
  } else {
    await db
      .update(workflowTemplates)
      .set({
        name: "Pengadaan Aset (CER)",
        mode: "org_template",
        description: "Workflow Persetujuan Pengadaan Aset / CapEx (15 Tahapan Legacy Baku)",
        isActive: true,
        updatedAt: now,
      })
      .where(eq(workflowTemplates.id, workflow.id));
    console.log(`Updated WorkflowTemplate ID: ${workflow.id}`);
  }

  // Ensure version & branch for workflow studio
  let [version] = await db
    .select()
    .from(workflowTemplateVersions)
    .where(eq(workflowTemplateVersions.workflowTemplateId, workflow.id))
    .orderBy(sql`version_number DESC`)
    .limit(1);

  if (!version) {
    [version] = await db
      .insert(workflowTemplateVersions)
      .values({
        workflowTemplateId: workflow.id,
        versionNumber: 1,
        publishStatus: "published",
        effectiveFrom: now,
        notes: "Initial published master workflow version for CER",
      })
      .returning();
  }

  // 3. Ensure Master Approval Matrix in hero_approval_matrices
  let [matrix] = await db
    .select()
    .from(approvalMatrices)
    .where(
      and(
        eq(approvalMatrices.transactionType, "cer_request"),
        eq(approvalMatrices.isActive, true)
      )
    )
    .orderBy(sql`id DESC`)
    .limit(1);

  if (!matrix) {
    [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name: "Master Matrix - Pengadaan Aset (CER)",
        transactionType: "cer_request",
        structureId: structure.id,
        siteId: null,
        departmentId: null,
        description: "Master approval matrix CER dengan 15 tahapan legacy baku & dual parallel validator",
        isActive: true,
        effectiveFrom: now,
      })
      .returning();
    console.log(`Created ApprovalMatrix ID: ${matrix.id}`);
  } else {
    console.log(`Using existing ApprovalMatrix ID: ${matrix.id}`);
  }

  // 4. Populate 16 steps in hero_approval_matrix_steps
  // Delete existing steps for this matrix to guarantee alignment
  await db
    .delete(approvalMatrixSteps)
    .where(eq(approvalMatrixSteps.matrixId, matrix.id));

  const stepsToInsert = [
    { matrixId: matrix.id, stepOrder: 1, label: "Acknowledge Leader-1", nodeId: nodeLeader1, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 2, label: "Acknowledge Leader-2", nodeId: nodeLeader2, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 3, label: "Acknowledge Leader", nodeId: nodeLeader, approvalMode: "sequential", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 4, label: "Acknowledge Coordinator", nodeId: nodeCoord, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 5, label: "Acknowledge Supervisor-1", nodeId: nodeSpv1, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 6, label: "Acknowledge Supervisor", nodeId: nodeSpv, approvalMode: "sequential", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 7, label: "Acknowledge Business Innovation & Marketing Spv.", nodeId: nodeBim, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 8, label: "Approval Manager-1", nodeId: nodeMgr1, approvalMode: "sequential", slaHours: 24, isRequired: false },
    { matrixId: matrix.id, stepOrder: 9, label: "Approval Manager", nodeId: nodeMgr, approvalMode: "sequential", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 10, label: "Budget Validator (Head of Finance)", nodeId: nodeBvHead, approvalMode: "parallel_all", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 10, label: "Budget Validator (Finance BP Manager)", nodeId: nodeBvFbp, approvalMode: "parallel_all", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 11, label: "Approval General Manager", nodeId: nodeGm, approvalMode: "sequential", slaHours: 48, isRequired: true },
    { matrixId: matrix.id, stepOrder: 12, label: "Approval Director-1", nodeId: nodeDir1, approvalMode: "sequential", slaHours: 48, isRequired: false },
    { matrixId: matrix.id, stepOrder: 13, label: "Approval Director", nodeId: nodeDir, approvalMode: "sequential", slaHours: 48, isRequired: true },
    { matrixId: matrix.id, stepOrder: 14, label: "Checked by Finance", nodeId: nodeFin, approvalMode: "sequential", slaHours: 24, isRequired: true },
    { matrixId: matrix.id, stepOrder: 15, label: "File Capital Expenditure Request", nodeId: nodeFile, approvalMode: "sequential", slaHours: 24, isRequired: true },
  ];

  await db.insert(approvalMatrixSteps).values(stepsToInsert);
  console.log(`Inserted ${stepsToInsert.length} approvalMatrixSteps for Matrix ID: ${matrix.id}`);

  console.log("=== Seeding CER to Workflow Studio Complete! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
