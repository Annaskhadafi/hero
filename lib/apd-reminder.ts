import { db } from "@/db";
import { employeeAssets, employees } from "@/db/schema/hero";
import { and, eq, lte, inArray } from "drizzle-orm";
import { notifyWorkflowBellRecipients } from "./workflow-notification-center";
import { sendApdReplacementReminderEmail } from "./apd-email";
import { getApdNotificationConfigData } from "./hero-admin";

export async function runApdReminders() {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  // Find active Sepatu Safety that are due for replacement within the next 7 days
  const dueAssets = await db
    .select({
      id: employeeAssets.id,
      itemName: employeeAssets.itemName,
      nextReplacementDue: employeeAssets.nextReplacementDue,
      employeeEmail: employees.email,
      employeeName: employees.name,
    })
    .from(employeeAssets)
    .innerJoin(employees, eq(employeeAssets.employeeId, employees.id))
    .where(
      and(
        eq(employeeAssets.status, "ACTIVE"),
        eq(employeeAssets.itemName, "Sepatu Safety"),
        lte(employeeAssets.nextReplacementDue, nextWeek)
      )
    );

  // Fetch centralized config for APD Notifications
  const config = await getApdNotificationConfigData();
  
  // Parse emails (comma separated)
  const getEmails = (str: string) => str.split(',').map(e => e.trim()).filter(Boolean);
  
  const recipientEmails = getEmails(config.recipientEmails);
  const ccEmails = getEmails(config.ccEmails);
  
  const adminEmails = [...recipientEmails, ...ccEmails];

  let notifiedCount = 0;

  for (const asset of dueAssets) {
    if (adminEmails.length > 0) {
      await notifyWorkflowBellRecipients({
        recipientEmails: adminEmails,
        eventType: "apd.reminder.admin",
        category: "system", 
        title: "Pengingat Pergantian Sepatu Safety",
        body: `Waktu pergantian ${asset.itemName} untuk karyawan ${asset.employeeName} sudah dekat (Jadwal 8 Bulan).`,
        url: "/dashboard/apd/inventory/safety-shoes", 
      });

      // Send email if config is active
      if (config.isActive) {
        for (const adminEmail of adminEmails) {
          await sendApdReplacementReminderEmail({
            adminEmail,
            employeeName: asset.employeeName ?? "Karyawan",
            itemName: asset.itemName ?? "Sepatu Safety",
          }).catch(console.error);
        }
      }

      notifiedCount++;
    }
  }

  return { ok: true, notifiedCount };
}
