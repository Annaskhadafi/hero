"use server";

import { db } from "@/db";
import { apdRequests, apdRequestItems, approvals, employees } from "@/db/schema/hero";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { resolveApprovalRouteForActivity } from "@/lib/approval-engine";
import { sendApdRequestSubmittedEmail } from "@/lib/apd-email";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitApdRequest(formData: FormData) {
  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) {
    throw new Error("Unauthorized");
  }
  
  const rawItems = formData.get("items") as string;
  if (!rawItems) {
    throw new Error("Items are required");
  }
  
  const items = JSON.parse(rawItems) as Array<{
    itemType: string;
    requestType: string;
    photoUrl?: string;
    quantity: number;
    notes: string;
  }>;
  
  const notes = (formData.get("notes") as string) || "";
  const signatureUrl = formData.get("signatureUrl") as string;

  // Use a transaction
  return await db.transaction(async (tx) => {
    // Generate request number
    const countRes = await tx.$count(apdRequests);
    const requestNumber = `APD-${new Date().getFullYear()}-${String(countRes + 1).padStart(4, "0")}`;

    // 1. Insert apdRequests
    const [request] = await tx
      .insert(apdRequests)
      .values({
        requestNumber,
        employeeId: currentEmployee.id,
        siteId: currentEmployee.siteId ?? 0,
        status: "pending",
        notes,
        signatureUrl,
      })
      .returning();

    // 2. Insert items
    if (items.length > 0) {
      await tx.insert(apdRequestItems).values(
        items.map((item) => ({
          requestId: request.id,
          itemType: item.itemType,
          requestType: item.requestType,
          photoUrl: item.photoUrl,
          quantity: item.quantity,
          notes: item.notes,
        }))
      );
    }

    // 3. Resolve approval route
    const route = await resolveApprovalRouteForActivity({
      employeeId: currentEmployee.id,
      activityType: "apd-request",
      priority: "Normal",
      overtimeMinutes: 0,
      transactionType: "apd-request",
      at: new Date(),
    });

    if (route.steps.length > 0) {
      const firstStep = route.steps.find((s) => s.stepOrder === 1);
      
      const payloadSnapshot = JSON.stringify({
        title: `Permintaan APD ${requestNumber}`,
        reason: notes,
        items,
      });
      
      const previewSnapshot = JSON.stringify({
        title: `Permintaan APD ${requestNumber}`,
        summary: `Diminta oleh ${currentEmployee.name}`,
      });

      // 4. Insert approval tracking
      await tx.insert(approvals).values({
        apdRequestId: request.id,
        level: 1,
        status: "pending",
        approverName: firstStep?.approverName ?? "System",
        approverEmployeeId: firstStep?.approverEmployeeId,
        approvalStepId: firstStep?.approvalMatrixStepId,
        resolutionSource: firstStep?.resolutionSource ?? "system",
        routeSnapshot: JSON.stringify(route),
        payloadSnapshot,
        previewSnapshot,
        decisionNote: "",
        submittedAt: new Date(),
      });

      // 5. Send Email if there is an approver
      if (firstStep?.approverEmployeeId) {
        const [approverEmailRec] = await tx.select({ email: employees.email }).from(employees).where(eq(employees.id, firstStep.approverEmployeeId));
        if (approverEmailRec?.email) {
          await sendApdRequestSubmittedEmail({
             employeeName: currentEmployee.name,
             requestNumber,
             approverEmail: approverEmailRec.email,
             approverName: firstStep.approverName
          }).catch(console.error);
        }
      }
    } else {
      // Auto approve if no route? Or leave it pending?
      // Leaving pending for now.
    }

    revalidatePath("/dashboard/apd");
    return { success: true, requestId: request.id };
  });
}
