import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function main() {
  // Update reminder
  await db
    .update(emailTemplates)
    .set({
      name: '5R Audit Pengingat Approval (Reminder)',
      subject: '[HERO 5R] Pengingat Approval Laporan 5R: {{reportNumber}} - {{picAreaName}}',
      description: 'Pengingat otomatis kepada approver yang belum memproses verifikasi laporan 5R.',
      updatedAt: new Date(),
    })
    .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_reminder'))

  // Update overdue
  await db
    .update(emailTemplates)
    .set({
      name: '5R Audit Jatuh Tempo (Overdue)',
      subject: '[HERO 5R] Batas Waktu Approval 5R Terlewati: {{reportNumber}} - {{picAreaName}}',
      description: 'Pemberitahuan saat batas waktu SLA persetujuan laporan 5R telah terlewati.',
      updatedAt: new Date(),
    })
    .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_overdue'))

  // Add 5R Audit Ditolak Permanen (Rejected)
  const [existingRejected] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_rejected'))
    .limit(1)

  const rejectedHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
<div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:24px;border-radius:10px 10px 0 0">
  <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
  <p style="color:#fecaca;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Quality Management System – Laporan 5R Ditolak</p>
</div>
<div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
  <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>{{auditorName}}</strong> & PIC Area,</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
    Laporan audit 5R <strong>{{reportNumber}}</strong> (Area: {{picAreaName}}) dinyatakan <strong style="color:#dc2626">DITOLAK PERMANEN</strong> oleh approver.
  </p>
  <div style="background:#fef2f2;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #dc2626">
    <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
      <tr><td width="140" style="color:#991b1b">No. Laporan:</td><td style="font-weight:600;color:#0f172a">{{reportNumber}}</td></tr>
      <tr><td style="color:#991b1b">Area:</td><td style="font-weight:600;color:#0f172a">{{picAreaName}}</td></tr>
      <tr><td style="color:#991b1b">Ditolak Oleh:</td><td>{{rejectedBy}}</td></tr>
      <tr><td style="color:#991b1b">Alasan Penolakan:</td><td><strong style="color:#dc2626">{{decisionNote}}</strong></td></tr>
    </table>
  </div>
  <div style="text-align:center;margin:28px 0">
    <a href="{{actionUrl}}" style="background:#dc2626;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Arsip Laporan</a>
  </div>
  <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
    Continuous Process Improvement (CPI) & Quality Management • PT Chitra Paratama
  </p>
</div>
</div>`

  const rejectedText = `Yth. {{auditorName}} & PIC Area,

Laporan audit 5R {{reportNumber}} (Area: {{picAreaName}}) dinyatakan DITOLAK PERMANEN.

No. Laporan: {{reportNumber}}
Area: {{picAreaName}}
Ditolak Oleh: {{rejectedBy}}
Alasan Penolakan: {{decisionNote}}

Lihat arsip laporan: {{actionUrl}}

Quality Management / CPI - PT Chitra Paratama`

  if (!existingRejected) {
    await db.insert(emailTemplates).values({
      name: '5R Audit Ditolak Permanen (Rejected)',
      templateCode: 'workflow_five_r_report_rejected',
      templateType: 'Approval',
      deliveryChannel: 'email,pwa_push',
      recipientScope: 'requester',
      subject: '[HERO 5R] Laporan 5R Ditolak: {{reportNumber}} - {{picAreaName}}',
      description: 'Notifikasi email saat Laporan Audit 5R ditolak permanen oleh approver.',
      htmlContent: rejectedHtml,
      textContent: rejectedText,
      isActive: true,
      origin: 'Workflow',
      feature: 'Custom',
    })
    console.log('✅ Created workflow_five_r_report_rejected')
  } else {
    await db
      .update(emailTemplates)
      .set({
        name: '5R Audit Ditolak Permanen (Rejected)',
        subject: '[HERO 5R] Laporan 5R Ditolak: {{reportNumber}} - {{picAreaName}}',
        description: 'Notifikasi email saat Laporan Audit 5R ditolak permanen oleh approver.',
        htmlContent: rejectedHtml,
        textContent: rejectedText,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_rejected'))
    console.log('✅ Updated workflow_five_r_report_rejected')
  }

  console.log('🎉 All 5R templates aligned!')
}

main().then(() => process.exit(0)).catch(console.error)
