import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { eq, or } from 'drizzle-orm'

async function main() {
  console.log('--- UPDATING 5R EMAIL TEMPLATES IN DATABASE ---')

  // 1. Template: 5R Audit Approved (Disetujui Final)
  const approvedHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
<div style="background:linear-gradient(135deg,#064e3b,#059669);padding:24px;border-radius:10px 10px 0 0">
  <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
  <p style="color:#a7f3d0;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Quality Management System – 5R Audit Disetujui</p>
</div>
<div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
  <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. Rekan Kerja,</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
    Laporan audit 5R untuk area <strong>{{picAreaName}}</strong> telah <strong>DISETUJUI PENUH (FINAL APPROVED)</strong> oleh seluruh jajaran approver.
  </p>
  <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #059669">
    <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
      <tr><td width="140" style="color:#64748b">No. Laporan:</td><td style="font-weight:600;color:#0f172a">{{reportNumber}}</td></tr>
      <tr><td style="color:#64748b">Area:</td><td style="font-weight:600;color:#0f172a">{{picAreaName}}</td></tr>
      <tr><td style="color:#64748b">Auditor:</td><td>{{auditorName}}</td></tr>
      <tr><td style="color:#64748b">Nilai Akhir:</td><td><strong style="color:#059669;font-size:15px">{{totalScore}}</strong> / 100</td></tr>
      <tr><td style="color:#64748b">Disetujui Oleh:</td><td>{{approvedBy}}</td></tr>
      <tr><td style="color:#64748b">Catatan:</td><td>{{notes}}</td></tr>
    </table>
  </div>
  <div style="text-align:center;margin:28px 0">
    <a href="{{viewLink}}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Lihat Dokumen Laporan 5R</a>
  </div>
  <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
    Continuous Process Improvement (CPI) & Quality Management • PT Chitra Paratama
  </p>
</div>
</div>`

  const approvedText = `Yth. Rekan Kerja,

Laporan audit 5R untuk area {{picAreaName}} telah DISETUJUI PENUH (FINAL APPROVED).

No. Laporan: {{reportNumber}}
Area: {{picAreaName}}
Auditor: {{auditorName}}
Nilai Akhir: {{totalScore}} / 100
Disetujui Oleh: {{approvedBy}}
Catatan: {{notes}}

Lihat dokumen: {{viewLink}}

Quality Management / CPI - PT Chitra Paratama`

  await db
    .update(emailTemplates)
    .set({
      name: '5R Audit Disetujui (Approved)',
      subject: '[HERO 5R] Laporan Audit 5R Disetujui: {{reportNumber}} - {{picAreaName}}',
      description: 'Notifikasi email saat Laporan Audit 5R telah disetujui final oleh seluruh approver.',
      htmlContent: approvedHtml,
      textContent: approvedText,
      updatedAt: new Date(),
    })
    .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_approved'))

  console.log('✅ Updated workflow_five_r_report_approved')

  // 2. Template: 5R Audit Dikembalikan untuk Revisi (Needs Revision)
  const revisionHtml = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:20px">
<div style="background:linear-gradient(135deg,#92400e,#d97706);padding:24px;border-radius:10px 10px 0 0">
  <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
  <p style="color:#fef3c7;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Quality Management System – Catatan Revisi 5R</p>
</div>
<div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
  <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Yth. <strong>{{auditorName}}</strong> & PIC Area,</p>
  <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
    Laporan audit 5R <strong>{{reportNumber}}</strong> (Area: {{picAreaName}}) <strong style="color:#b45309">DIKEMBALIKAN UNTUK REVISI / PERBAIKAN</strong>.
  </p>
  <div style="background:#fffbeb;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #d97706">
    <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
      <tr><td width="140" style="color:#78350f">No. Laporan:</td><td style="font-weight:600;color:#0f172a">{{reportNumber}}</td></tr>
      <tr><td style="color:#78350f">Area:</td><td style="font-weight:600;color:#0f172a">{{picAreaName}}</td></tr>
      <tr><td style="color:#78350f">Direvisi Oleh:</td><td>{{rejectedBy}}</td></tr>
      <tr><td style="color:#78350f">Catatan Revisi:</td><td><strong style="color:#b45309">{{decisionNote}}</strong></td></tr>
    </table>
  </div>
  <p style="color:#475569;font-size:13px;line-height:1.5">
    Silakan perbaiki temuan/foto yang diminta pada laporan, lalu lakukan <strong>Ajukan Ulang</strong>. Dokumen akan langsung menuju kembali ke tahap approver yang meminta revisi.
  </p>
  <div style="text-align:center;margin:28px 0">
    <a href="{{actionUrl}}" style="background:#d97706;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Buka & Perbaiki Laporan</a>
  </div>
  <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
    Continuous Process Improvement (CPI) & Quality Management • PT Chitra Paratama
  </p>
</div>
</div>`

  const revisionText = `Yth. {{auditorName}} & PIC Area,

Laporan audit 5R {{reportNumber}} (Area: {{picAreaName}}) DIKEMBALIKAN UNTUK REVISI.

No. Laporan: {{reportNumber}}
Area: {{picAreaName}}
Direvisi Oleh: {{rejectedBy}}
Catatan Revisi: {{decisionNote}}

Silakan perbaiki temuan/foto yang diminta pada laporan:
{{actionUrl}}

Quality Management / CPI - PT Chitra Paratama`

  await db
    .update(emailTemplates)
    .set({
      name: '5R Audit Dikembalikan untuk Revisi (Needs Revision)',
      subject: '[HERO 5R] Laporan 5R Memerlukan Revisi: {{reportNumber}} - {{picAreaName}}',
      description: 'Notifikasi email saat Laporan Audit 5R dikembalikan oleh approver untuk perbaikan temuan/skor.',
      htmlContent: revisionHtml,
      textContent: revisionText,
      updatedAt: new Date(),
    })
    .where(eq(emailTemplates.templateCode, 'workflow_five_r_report_returned_rejected'))

  console.log('✅ Updated workflow_five_r_report_returned_rejected')

  // 3. Remove redundant duplicate templates so table only has clean, distinct templates:
  // workflow_five_r_report_submitted is redundant with five_r_approval_request
  // five_r_status_update is redundant now that we separated into approved & returned_rejected
  await db
    .delete(emailTemplates)
    .where(or(
      eq(emailTemplates.templateCode, 'workflow_five_r_report_submitted'),
      eq(emailTemplates.templateCode, 'five_r_status_update')
    ))

  console.log('✅ Cleaned up redundant templates (workflow_five_r_report_submitted & five_r_status_update)')

  console.log('🎉 5R Email templates updated perfectly in database!')
}

main().then(() => process.exit(0)).catch(console.error)
