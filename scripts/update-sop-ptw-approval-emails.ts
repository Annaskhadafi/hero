import { db } from "../db";
import {
  sopWinApprovals,
  sopWinRequestApprovals,
  sopWinDepartmentWorkflows,
  ptwApprovals,
  hcContractReviewSettings,
} from "../db/schema/hero";
import { eq } from "drizzle-orm";

async function main() {
  const TARGET_EMAIL = "raihanaraya36@gmail.com";
  console.log(`Updating all SOP/WIN/POL and PTW approval targets to ${TARGET_EMAIL}...`);

  const updatedSopWinApprovals = await db
    .update(sopWinApprovals)
    .set({
      approverEmail: TARGET_EMAIL,
    })
    .returning({ id: sopWinApprovals.id });
  console.log(`Updated ${updatedSopWinApprovals.length} records in hero_sop_win_approvals`);

  const updatedSopWinReqApprovals = await db
    .update(sopWinRequestApprovals)
    .set({
      approverEmail: TARGET_EMAIL,
    })
    .returning({ id: sopWinRequestApprovals.id });
  console.log(`Updated ${updatedSopWinReqApprovals.length} records in hero_sop_win_request_approvals`);

  const updatedPtwApprovals = await db
    .update(ptwApprovals)
    .set({
      approverEmail: TARGET_EMAIL,
    })
    .returning({ id: ptwApprovals.id });
  console.log(`Updated ${updatedPtwApprovals.length} records in hero_ptw_approvals`);

  const workflows = await db.select().from(sopWinDepartmentWorkflows);
  let updatedWorkflowsCount = 0;
  for (const wf of workflows) {
    if (Array.isArray(wf.steps)) {
      const updatedSteps = (wf.steps as any[]).map((step: any) => ({
        ...step,
        approverEmail: TARGET_EMAIL,
      }));
      await db
        .update(sopWinDepartmentWorkflows)
        .set({
          steps: updatedSteps,
          updatedAt: new Date(),
        })
        .where(eq(sopWinDepartmentWorkflows.id, wf.id));
      updatedWorkflowsCount++;
    }
  }
  console.log(`Updated ${updatedWorkflowsCount} department workflows in hero_sop_win_department_workflows`);

  const [ptwSetting] = await db
    .select()
    .from(hcContractReviewSettings)
    .where(eq(hcContractReviewSettings.settingKey, "ptw_permit_workflow"))
    .limit(1);

  if (ptwSetting) {
    const val = (ptwSetting.settingValue as any) || {};
    const updatedVal = {
      ...val,
      approvalMatrix: {
        ...(val.approvalMatrix || {}),
        safetyOfficerEmail: TARGET_EMAIL,
        fieldPicEmail: TARGET_EMAIL,
        authorizedByEmail: TARGET_EMAIL,
        managerEmail: TARGET_EMAIL,
      },
    };
    await db
      .update(hcContractReviewSettings)
      .set({
        settingValue: updatedVal,
        updatedAt: new Date(),
      })
      .where(eq(hcContractReviewSettings.id, ptwSetting.id));
    console.log(`Updated ptw_permit_workflow in hero_hc_contract_review_settings`);
  }

  console.log("All SOP/WIN/POL and PTW approval targets successfully updated to " + TARGET_EMAIL);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error updating approval emails:", err);
  process.exit(1);
});
