import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const code = 'apd_summary_approved';
  
  const htmlContent = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
<div style="background:#059669;color:white;padding:24px;text-align:center;">
<h1 style="margin:0;font-size:20px;">Summary Permintaan Barang Safety</h1>
<p style="margin:8px 0 0;font-size:14px;">Sudah Disetujui</p>
</div>
<div style="padding:24px;background:#f9fafb;">
<p style="color:#374151;margin:0 0 20px;">Summary permintaan barang safety berikut sudah disetujui oleh Department Head dan siap diproses pemesanan barang ke vendor.</p>
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
<tr>
<td style="padding:10px 16px;color:#6b7280;">Di generate oleh</td>
<td style="padding:10px 16px;color:#1f2937;">{{generatedByName}}</td>
</tr>
</table>
<div style="margin-top:24px;text-align:center;">
<a href="{{printUrl}}" style="display:inline-block;background:#059669;color:white;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Lihat &amp; Print Summary</a>
</div>
</div>
<div style="padding:16px;text-align:center;color:#9ca3af;font-size:11px;">
Email ini dikirim otomatis oleh sistem HERO
</div>
</div>`;

  const textContent = `Summary Permintaan Barang Safety - Sudah Disetujui

Summary permintaan barang safety berikut sudah disetujui oleh Department Head dan siap diproses pemesanan barang ke vendor.

Nomor: {{summaryNumber}}
Section: {{sectionName}}
Department: {{departmentName}}
Di generate oleh: {{generatedByName}}

Silakan login HERO untuk melihat detail dan print summary.`;

  const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, code)).limit(1);
  if (!existing) {
    console.log('Template tidak ditemukan!');
    return;
  }

  await db.update(emailTemplates).set({
    htmlContent,
    textContent,
    name: 'Summary Permintaan Barang - Sudah Disetujui',
    description: 'Notifikasi ke HSE saat summary permintaan barang sudah disetujui oleh Dept Head',
  }).where(eq(emailTemplates.templateCode, code));

  console.log('Template apd_summary_approved berhasil diupdate!');
}

main().catch(console.error).finally(() => process.exit(0));
