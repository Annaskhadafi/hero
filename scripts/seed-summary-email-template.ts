import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, 'apd_summary_approved')).limit(1);
  
  if (existing.length > 0) {
    console.log('Template apd_summary_approved sudah ada, skip.');
    return;
  }

  await db.insert(emailTemplates).values({
    name: 'Summary Permintaan Barang Approved',
    templateCode: 'apd_summary_approved',
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: '[HERO] Summary {{summaryNumber}} - {{sectionName}} Sudah Disetujui',
    htmlContent: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#059669;color:white;padding:20px;text-align:center;"><h1 style="margin:0;">Summary Permintaan Barang Safety</h1><p style="margin:10px 0 0;">Sudah Disetujui</p></div><div style="padding:20px;background:#f9fafb;"><h2 style="color:#1f2937;">Detail Summary</h2><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px;color:#6b7280;width:150px;">Nomor</td><td style="padding:8px;color:#1f2937;font-weight:bold;">{{summaryNumber}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Section</td><td style="padding:8px;color:#1f2937;">{{sectionName}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Department</td><td style="padding:8px;color:#1f2937;">{{departmentName}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Di generate oleh</td><td style="padding:8px;color:#1f2937;">{{generatedByName}}</td></tr></table><div style="margin-top:20px;text-align:center;"><a href="{{printUrl}}" style="display:inline-block;background:#059669;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Lihat &amp; Print Summary</a></div></div><div style="padding:15px;text-align:center;color:#6b7280;font-size:12px;">Email ini dikirim otomatis oleh sistem HERO</div></div>',
    textContent: 'Summary Permintaan Barang Safety ({{summaryNumber}}) untuk section {{sectionName}} ({{departmentName}}) sudah disetujui. Silakan login HERO untuk melihat detail dan melakukan pemesanan barang ke vendor.',
    description: 'Notifikasi ke HSE saat summary permintaan barang sudah disetujui oleh Dept Head',
    isActive: true,
  });

  console.log('Template apd_summary_approved berhasil ditambahkan!');
}

main().catch(console.error).finally(() => process.exit(0));
