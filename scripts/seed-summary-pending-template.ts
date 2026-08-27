import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

async function main() {
  const code = 'apd_summary_pending_approval';
  const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.templateCode, code)).limit(1);
  
  if (existing.length > 0) {
    console.log('Template sudah ada, skip.');
    return;
  }

  await db.insert(emailTemplates).values({
    name: 'Summary Permintaan Barang - Menunggu Persetujuan',
    templateCode: code,
    templateType: 'Notification',
    deliveryChannel: 'email,bell',
    recipientScope: 'approver',
    ccEmail: '',
    subject: '[HERO] Review Summary {{summaryNumber}} - {{sectionName}}',
    htmlContent: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><div style="background:#2563eb;color:white;padding:20px;text-align:center;"><h1 style="margin:0;">Summary Permintaan Barang Safety</h1><p style="margin:10px 0 0;">Menunggu Persetujuan Anda</p></div><div style="padding:20px;background:#f9fafb;"><h2 style="color:#1f2937;">Detail Summary</h2><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px;color:#6b7280;width:150px;">Nomor</td><td style="padding:8px;color:#1f2937;font-weight:bold;">{{summaryNumber}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Section</td><td style="padding:8px;color:#1f2937;">{{sectionName}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Department</td><td style="padding:8px;color:#1f2937;">{{departmentName}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Diajukan oleh</td><td style="padding:8px;color:#1f2937;">{{generatedByName}}</td></tr><tr><td style="padding:8px;color:#6b7280;">Tahap Approval</td><td style="padding:8px;color:#1f2937;">{{approvalLevel}}</td></tr></table><div style="margin-top:20px;text-align:center;"><a href="{{approvalUrl}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Review &amp; Setujui</a></div></div><div style="padding:15px;text-align:center;color:#6b7280;font-size:12px;">Email ini dikirim otomatis oleh sistem HERO</div></div>',
    textContent: 'Summary Permintaan Barang Safety ({{summaryNumber}}) untuk section {{sectionName}} ({{departmentName}}) menunggu persetujuan Anda. Silakan login HERO untuk review dan approve.',
    description: 'Notifikasi ke Section Head / Dept Head saat summary perlu persetujuan mereka',
    isActive: true,
  });

  console.log('Template apd_summary_pending_approval berhasil ditambahkan!');
}

main().catch(console.error).finally(() => process.exit(0));
