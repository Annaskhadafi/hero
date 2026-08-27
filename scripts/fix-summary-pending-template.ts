import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const code = 'apd_summary_pending_approval';
  
  const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
<div style="background:#2563eb;color:white;padding:24px;text-align:center;">
<h1 style="margin:0;font-size:20px;">Summary Permintaan Barang Safety</h1>
<p style="margin:8px 0 0;font-size:14px;">Menunggu Persetujuan Anda</p>
</div>
<div style="padding:24px;background:#f9fafb;">
<p style="color:#374151;margin:0 0 16px;">Yth. <strong>{{approverName}}</strong>,</p>
<p style="color:#374151;margin:0 0 20px;">Ada summary permintaan barang safety yang memerlukan persetujuan Anda pada tahap <strong>{{approvalLevel}}</strong>.</p>
<table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:10px 16px;color:#6b7280;width:160px;">Nomor</td>
<td style="padding:10px 16px;color:#1f2937;font-weight:bold;">{{summaryNumber}}</td>
</tr>
<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:10px 16px;color:#6b7280;">Section</td>
<td style="padding:10px 16px;color:#1f2937;">{{sectionName}}</td>
</tr>
<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:10px 16px;color:#6b7280;">Department</td>
<td style="padding:10px 16px;color:#1f2937;">{{departmentName}}</td>
</tr>
<tr style="border-bottom:1px solid #e5e7eb;">
<td style="padding:10px 16px;color:#6b7280;">Diajukan oleh</td>
<td style="padding:10px 16px;color:#1f2937;">{{generatedByName}}</td>
</tr>
<tr>
<td style="padding:10px 16px;color:#6b7280;">Tahap Approval</td>
<td style="padding:10px 16px;color:#1f2937;font-weight:bold;">{{approvalLevel}}</td>
</tr>
</table>
<div style="margin-top:24px;text-align:center;">
<a href="{{approvalUrl}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Lihat &amp; Review</a>
</div>
</div>
<div style="padding:16px;text-align:center;color:#9ca3af;font-size:11px;">
Email ini dikirim otomatis oleh sistem HERO
</div>
</div>`;

  const textContent = `Summary Permintaan Barang Safety - Menunggu Persetujuan Anda

Yth. {{approverName}},

Ada summary permintaan barang safety yang memerlukan persetujuan Anda pada tahap {{approvalLevel}}.

Nomor: {{summaryNumber}}
Section: {{sectionName}}
Department: {{departmentName}}
Diajukan oleh: {{generatedByName}}
Tahap Approval: {{approvalLevel}}

Silakan login HERO untuk review dan approve.`;

  // Update htmlContent and textContent
  const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, code)).limit(1);
  if (!existing) {
    console.log('Template tidak ditemukan!');
    return;
  }

  await db.update(emailTemplates).set({
    htmlContent,
    textContent,
    description: 'Notifikasi ke Section Head / Dept Head saat summary perlu persetujuan mereka',
    name: 'Summary Permintaan Barang - Menunggu Persetujuan',
  }).where(eq(emailTemplates.templateCode, code));

  console.log('Template apd_summary_pending_approval berhasil diupdate!');
}

main().catch(console.error).finally(() => process.exit(0));
