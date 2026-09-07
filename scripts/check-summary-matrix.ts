import { db } from '../db';
import { masterSections, approvalMatrices, approvalMatrixSteps, masterDepartments, employees } from '../db/schema/hero';
import { eq, inArray, asc } from 'drizzle-orm';

async function main() {
  console.log('--- Updating masterSections headEmployeeId in DB ---');
  
  // Central Services Sections
  await db.update(masterSections).set({ headEmployeeId: 996 }).where(eq(masterSections.id, 29)); // Repair / Retread -> Ary Maulana
  await db.update(masterSections).set({ headEmployeeId: 955 }).where(eq(masterSections.id, 33)); // Service Operation MVC -> Apriyanto
  await db.update(masterSections).set({ headEmployeeId: 15 }).where(eq(masterSections.id, 34)); // Service Operation Others -> Junaidi
  await db.update(masterSections).set({ headEmployeeId: 1094 }).where(eq(masterSections.id, 37)); // Technical Operation -> Muhammad Abian Husain
  await db.update(masterSections).set({ headEmployeeId: 996 }).where(eq(masterSections.id, 27)); // Product Accessories -> Ary Maulana

  console.log('masterSections headEmployeeId updated.');

  const csSections = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
      departmentId: masterSections.departmentId,
      headEmployeeId: masterSections.headEmployeeId,
      headName: employees.name,
      jobTitle: employees.jobTitle,
    })
    .from(masterSections)
    .leftJoin(employees, eq(masterSections.headEmployeeId, employees.id))
    .where(eq(masterSections.departmentId, 2))
    .orderBy(asc(masterSections.id));

  console.log('--- Central Services Sections Updated ---');
  console.log(csSections);

  console.log('--- Upserting email template apd_summary_approved ---');
  const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, 'apd_summary_approved'));
  if (existing) {
    await db.update(emailTemplates).set({
      name: 'Summary Permintaan APD Approved',
      recipientScope: 'submitter',
      ccEmail: 'hse.cp@chitraparatama.co.id',
      subject: '[HERO] Summary Permintaan APD {{summaryNumber}} - {{sectionName}} Sudah Disetujui',
      description: 'Notifikasi ke submitter dan HSE saat summary permintaan APD selesai disetujui oleh Dept Head',
      isActive: true,
    }).where(eq(emailTemplates.id, existing.id));
    console.log('Template updated.');
  } else {
    await db.insert(emailTemplates).values({
      name: 'Summary Permintaan APD Approved',
      templateCode: 'apd_summary_approved',
      templateType: 'Notification',
      deliveryChannel: 'email,bell',
      recipientScope: 'submitter',
      ccEmail: 'hse.cp@chitraparatama.co.id',
      subject: '[HERO] Summary Permintaan APD {{summaryNumber}} - {{sectionName}} Sudah Disetujui',
      htmlContent: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;"><div style="background:#059669;padding:16px 20px;border-radius:8px 8px 0 0;"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Summary APD Disetujui</h2><p style="color:#a7f3d0;margin:4px 0 0;font-size:12px;">Persetujuan Pengadaan APD</p></div><div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;"><p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">Summary Permintaan APD (<b>{{summaryNumber}}</b>) untuk section <b>{{sectionName}}</b> ({{departmentName}}) telah <b>SELESAI DISETUJUI</b> oleh Department Head.</p><table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;"><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;">No. Summary</td><td style="padding:8px 0;font-weight:700;color:#0f172a;">{{summaryNumber}}</td></tr><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;color:#64748b;">Section</td><td style="padding:8px 0;">{{sectionName}}</td></tr><tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Departemen</td><td style="padding:8px 0;">{{departmentName}}</td></tr></table><div style="text-align:center;margin:28px 0 16px 0;"><a href="{{printUrl}}" style="background-color:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(5,150,105,0.25);">Cetak / Lihat Dokumen Summary &rarr;</a></div></div></div>`,
      textContent: 'Summary Permintaan APD ({{summaryNumber}}) untuk section {{sectionName}} ({{departmentName}}) sudah disetujui penuh oleh Department Head.\n\nSilakan login ke HERO untuk melihat detail dan proses pengadaan:\n{{printUrl}}',
      description: 'Notifikasi ke submitter dan HSE saat summary permintaan APD selesai disetujui oleh Dept Head',
      isActive: true,
    });
    console.log('Template inserted.');
  }
}

import { emailTemplates } from '../db/schema/hero';
main().catch(console.error).finally(() => process.exit(0));

