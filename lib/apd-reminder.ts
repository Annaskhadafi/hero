import { db } from "@/db";
import { employeeAssets, employees, masterSections, masterDepartments } from "@/db/schema/hero";
import { and, eq, lte, ilike } from "drizzle-orm";
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
      employeeId: employees.id,
      employeeEmail: employees.email,
      employeeName: employees.name,
      employeeDepartment: employees.department,
      employeeSection: employees.section,
      sectionId: employees.sectionId,
      departmentId: employees.departmentId,
      sectionName: masterSections.name,
      sectionCode: masterSections.code,
      departmentName: masterDepartments.name,
    })
    .from(employeeAssets)
    .innerJoin(employees, eq(employeeAssets.employeeId, employees.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(
      and(
        eq(employeeAssets.status, "ACTIVE"),
        ilike(employeeAssets.itemName, "%sepatu%"),
        lte(employeeAssets.nextReplacementDue, nextWeek)
      )
    );

  // Fetch centralized config for APD Notifications
  const config = await getApdNotificationConfigData();

  // Parse emails (comma separated)
  const getEmails = (str?: string) => (str || '').split(',').map(e => e.trim()).filter(Boolean);

  const serviceEmails = getEmails(config.serviceReminderEmail || config.serviceCcEmail);
  const repairEmails = getEmails(config.repairReminderEmail || config.repairCcEmail);
  const teEmails = getEmails(config.teReminderEmail || config.teCcEmail);
  const globalCcEmails = getEmails(config.ccEmails);
  const fallbackEmails = getEmails(config.recipientEmails);

  let notifiedCount = 0;

  for (const asset of dueAssets) {
    // Determine division stream
    const sec = ((asset.sectionName || '') + ' ' + (asset.employeeSection || '') + ' ' + (asset.sectionCode || '')).toLowerCase();
    const dept = ((asset.departmentName || '') + ' ' + (asset.employeeDepartment || '')).toLowerCase();
    const combined = `${sec} ${dept}`;

    let streamRecipients: string[] = [];
    if (combined.includes('repair') || combined.includes('retread') || combined.includes('factory') || combined.includes('workshop')) {
      streamRecipients = repairEmails;
    } else if (combined.includes('tech') || combined.includes(' te') || combined.includes('cpi') || combined.includes('engineer')) {
      streamRecipients = teEmails;
    } else if (combined.includes('service') || combined.includes('operation') || combined.includes('srv') || combined.includes('mvc')) {
      streamRecipients = serviceEmails;
    }

    if (streamRecipients.length === 0) {
      streamRecipients = fallbackEmails;
    }

    const allAdminEmails = Array.from(new Set([...streamRecipients, ...globalCcEmails])).filter(Boolean);

    if (allAdminEmails.length > 0) {
      await notifyWorkflowBellRecipients({
        recipientEmails: allAdminEmails,
        eventType: "apd.reminder.admin",
        category: "hse_alerts",
        title: "Pengingat Pergantian Sepatu Safety",
        body: `Waktu pergantian ${asset.itemName} untuk karyawan ${asset.employeeName} sudah dekat (Jadwal 8 Bulan).`,
        url: "/dashboard/apd/inventory/safety-shoes",
      });

      // Send email if config is active
      if (config.isActive) {
        for (const adminEmail of allAdminEmails) {
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
