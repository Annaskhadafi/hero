import { db } from "../db";
import { sopWinRequests, sopWinRequestApprovals, sopWinDepartmentWorkflows } from "../db/schema/hero";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function repairSopWinApprovals() {
  console.log("Starting SOP/WIN request approvals repair...");

  const requests = await db.select().from(sopWinRequests);
  const departmentWorkflows = await db.select().from(sopWinDepartmentWorkflows);
  const workflowMap = new Map(departmentWorkflows.map((d) => [d.departmentCode.toUpperCase(), d.steps]));

  for (const req of requests) {
    const textToScan = `${req.requesterDepartment || ""} ${req.requestedDocTitleAndNumber || ""} ${req.procedureName || ""}`.toUpperCase();

    let dept = "CPI";
    if (/\b(SOP|WIN|POL)[\/._\s]?CPI[\/._\s]/i.test(textToScan) || textToScan.includes("/CPI") || textToScan.includes(".CPI.")) {
      dept = "CPI";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?HSE[\/._\s]/i.test(textToScan) || textToScan.includes("/HSE") || textToScan.includes(".HSE.")) {
      dept = "HSE";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?HR[\/._\s]/i.test(textToScan) || textToScan.includes("/HR") || textToScan.includes(".HR.")) {
      dept = "HR";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?GA[\/._\s]/i.test(textToScan) || textToScan.includes("/GA") || textToScan.includes(".GA.")) {
      dept = "GA";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?TEC[\/._\s]/i.test(textToScan) || textToScan.includes("/TEC") || textToScan.includes("TECHNICAL")) {
      dept = "TECHNICAL";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?LGL[\/._\s]/i.test(textToScan) || textToScan.includes("/LGL") || textToScan.includes("LEGAL")) {
      dept = "LEGAL";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?ERM[\/._\s]/i.test(textToScan) || textToScan.includes("/ERM.") || textToScan.includes(".ERM.")) {
      dept = "ERM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?BIM[\/._\s]/i.test(textToScan) || textToScan.includes("BIMA")) {
      dept = "BIMA";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?FAM[\/._\s]/i.test(textToScan) || textToScan.includes("FACILITY")) {
      dept = "FAM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?(TC|TRC)[\/._\s]/i.test(textToScan) || textToScan.includes("TRAINING")) {
      dept = "TC";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?(EXM|EXI)[\/._\s]/i.test(textToScan) || textToScan.includes("EXM") || textToScan.includes("EXIM")) {
      dept = "SC EXIM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?(LOG|SCD\.LOG)[\/._\s]/i.test(textToScan) || textToScan.includes("SC LOG")) {
      dept = "SC LOG";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?SVC[\/._\s]/i.test(textToScan) || textToScan.includes("SERVICE")) {
      dept = "SERVICE";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?REP[\/._\s]/i.test(textToScan) || textToScan.includes("REPAIR")) {
      dept = "REPAIR";
    } else {
      const explicit = (req.requesterDepartment || "").trim().toUpperCase();
      if (explicit.includes("REPAIR")) dept = "REPAIR";
      else if (explicit.includes("SERVICE")) dept = "SERVICE";
      else if (explicit.includes("CPI")) dept = "CPI";
      else if (explicit.includes("HSE")) dept = "HSE";
      else if (explicit.includes("HR")) dept = "HR";
      else if (explicit.includes("GA")) dept = "GA";
      else if (explicit.includes("LEGAL")) dept = "LEGAL";
      else if (explicit.includes("ERM")) dept = "ERM";
      else dept = explicit || "CPI";
    }

    const steps = workflowMap.get(dept) as Array<{ stepOrder: number; stepLabel: string; approverName: string; approverEmail: string; approverRole: string }> | undefined;
    if (!steps || steps.length === 0) {
      console.log(`Skipping REQ #${req.id} (${req.requestNumber}): No steps found for dept ${dept}`);
      continue;
    }

    await db.delete(sopWinRequestApprovals).where(eq(sopWinRequestApprovals.requestId, req.id));

    const toInsert = steps.map((s, idx) => ({
      requestId: req.id,
      stepOrder: idx + 1,
      stepLabel: s.stepLabel,
      approvalToken: `step_${idx + 1}_${randomUUID().replace(/-/g, "")}`,
      approverName: s.approverName || "Approver",
      approverEmail: s.approverEmail || "testing@chitraparatama.com",
      approverRole: s.approverRole || "Approver",
      status: (idx === 0 ? "submitted" : idx === 1 ? "pending" : "waiting") as "submitted" | "pending" | "waiting",
    }));

    await db.insert(sopWinRequestApprovals).values(toInsert);

    // Update request department code if needed
    if (req.requesterDepartment !== dept) {
      await db.update(sopWinRequests).set({ requesterDepartment: dept }).where(eq(sopWinRequests.id, req.id));
    }

    console.log(`✅ Repaired REQ #${req.id} (${req.requestNumber || req.accessToken}): Department=${dept}, Steps=${toInsert.length}`);
  }

  console.log("All SOP/WIN request approvals repaired successfully!");
}

repairSopWinApprovals().catch(console.error);
