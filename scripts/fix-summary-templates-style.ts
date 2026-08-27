import { db } from '../db';
import { emailTemplates } from '../db/schema/hero';
import { eq } from 'drizzle-orm';

const WRAPPER_OPEN = `<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:28px 12px">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 22px 70px rgba(15,23,42,.16);border:1px solid #cbd5e1">`;

const FOOTER = `<tr><td style="padding:8px 28px 30px">
<div style="border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px 18px">
<p style="margin:0;color:#0f172a;font-size:13px;font-weight:800">PT Chitra Paratama</p>
<p style="margin:5px 0 0;color:#64748b;font-size:12px;line-height:1.6">Email ini dikirim otomatis oleh sistem HERO. Mohon tidak membalas langsung email ini.</p>
<p style="margin:10px 0 0;color:#94a3b8;font-size:11px;line-height:1.5">© 2026 PT Chitra Paratama. All rights reserved.</p>
</div></td></tr></table></td></tr></table></div>`;

const WRAPPER_CLOSE = ''; // already in FOOTER

function headerGreen(title: string, pillLabel: string) {
  return `<tr><td style="background:#0f172a;padding:0">
<div style="padding:26px 28px;background:linear-gradient(135deg,#020617 0%,#0f172a 52%,#166534 100%)">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="vertical-align:top">
<p style="margin:0;color:#86efac;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">PT Chitra Paratama</p>
<h1 style="margin:7px 0 0;color:#ffffff;font-size:28px;line-height:1.12;font-weight:800;letter-spacing:-.03em">${title}</h1>
<p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5">Hub for Employee Reporting &amp; Operations</p>
</td>
<td align="right" style="vertical-align:top">
<div style="display:inline-block;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 12px;color:#bbf7d0;background:rgba(255,255,255,.08);font-size:12px;font-weight:700">${pillLabel}</div>
</td>
</tr></table></div></td></tr>`;
}

function headerBlue(title: string, pillLabel: string) {
  return `<tr><td style="background:#0f172a;padding:0">
<div style="padding:26px 28px;background:linear-gradient(135deg,#020617 0%,#0f172a 52%,#1e3a8a 100%)">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
<td style="vertical-align:top">
<p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">PT Chitra Paratama</p>
<h1 style="margin:7px 0 0;color:#ffffff;font-size:28px;line-height:1.12;font-weight:800;letter-spacing:-.03em">${title}</h1>
<p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;line-height:1.5">Hub for Employee Reporting &amp; Operations</p>
</td>
<td align="right" style="vertical-align:top">
<div style="display:inline-block;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:8px 12px;color:#dbeafe;background:rgba(255,255,255,.08);font-size:12px;font-weight:700">${pillLabel}</div>
</td>
</tr></table></div></td></tr>`;
}

function detailTable(rows: [string, string, boolean][]) {
  let html = `<table style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">`;
  for (const [label, value, bold] of rows) {
    html += `<tr><td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:170px;vertical-align:top">${label}</td><td style="padding:11px 16px;color:#0f172a;font-size:13px;font-weight:${bold ? '800' : '500'};border-bottom:1px solid #f1f5f9">${value}</td></tr>`;
  }
  html += '</table>';
  return html;
}

async function main() {
  // ===== 1. apd_summary_pending_approval =====
  // Email ke atasan: meminta persetujuan
  const pendingHtml = WRAPPER_OPEN +
    headerBlue('Permintaan Persetujuan', 'Menunggu Review') +
    `<tr><td style="padding:28px 28px 10px">
<div style="display:inline-block;margin-bottom:14px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">⚠ Menunggu Persetujuan</div>
<h2 style="margin:0 0 10px;color:#0f172a;font-size:22px;line-height:1.28;font-weight:800;letter-spacing:-.02em">Review Summary Permintaan Barang Safety</h2>
<p style="margin:0 0 20px;color:#64748b;font-size:13px;line-height:1.6">Anda diminta untuk memeriksa dan menyetujui summary permintaan barang safety berikut.</p>
<div style="height:1px;background:linear-gradient(90deg,#1d4ed8,#e2e8f0);margin:0 0 22px"></div>
<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.75">Yth. <strong>{{approverName}}</strong>,</p>
<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.75">Berikut adalah summary permintaan barang safety yang memerlukan persetujuan Anda pada tahap <strong>{{approvalLevel}}</strong>:</p>
<div style="margin:20px 0;">
${detailTable([
  ['Nomor Summary', '{{summaryNumber}}', true],
  ['Section', '{{sectionName}}', false],
  ['Department', '{{departmentName}}', false],
  ['Diajukan Oleh', '{{generatedByName}}', false],
  ['Tahap Approval', '{{approvalLevel}}', true],
  ['Status', '<span style="color:#d97706;font-weight:800">MENUNGGU PERSETUJUAN</span>', false],
])}
</div>
<p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.6">Silakan klik tombol di bawah untuk melihat detail summary dan memberikan persetujuan:</p>
<div style="margin-top:20px;text-align:center">
<a href="{{approvalUrl}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;letter-spacing:.02em">Lihat &amp; Review</a>
</div>
</td></tr>` + FOOTER;

  await db.update(emailTemplates).set({
    htmlContent: pendingHtml,
    textContent: `Permintaan Persetujuan Summary Barang Safety\n\nYth. {{approverName}},\n\nBerikut adalah summary permintaan barang safety yang memerlukan persetujuan Anda pada tahap {{approvalLevel}}:\n\nNomor: {{summaryNumber}}\nSection: {{sectionName}}\nDepartment: {{departmentName}}\nDiajukan oleh: {{generatedByName}}\nTahap: {{approvalLevel}}\nStatus: MENUNGGU PERSETUJUAN\n\nSilakan login HERO untuk melihat detail dan menyetujui.`,
    name: 'Summary Permintaan Barang - Menunggu Persetujuan',
    description: 'Notifikasi ke Section Head / Dept Head untuk review dan menyetujui summary permintaan barang',
  }).where(eq(emailTemplates.templateCode, 'apd_summary_pending_approval'));
  console.log('apd_summary_pending_approval updated');

  // ===== 2. apd_summary_approved =====
  // Email ke HSE: summary sudah disetujui semua
  const approvedHtml = WRAPPER_OPEN +
    headerGreen('Summary Telah Disetujui', 'Approved') +
    `<tr><td style="padding:28px 28px 10px">
<div style="display:inline-block;margin-bottom:14px;border-radius:999px;background:#ecfdf5;color:#15803d;border:1px solid #bbf7d0;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">✓ Disetujui</div>
<h2 style="margin:0 0 10px;color:#0f172a;font-size:22px;line-height:1.28;font-weight:800;letter-spacing:-.02em">Summary Permintaan Barang Safety</h2>
<p style="margin:0 0 20px;color:#64748b;font-size:13px;line-height:1.6">Summary permintaan barang safety telah disetujui dan siap diproses pemesanan ke vendor.</p>
<div style="height:1px;background:linear-gradient(90deg,#166534,#e2e8f0);margin:0 0 22px"></div>
<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.75">Summary permintaan barang safety berikut sudah <strong>disetujui</strong> oleh Department Head. Silakan lakukan pemesanan barang ke vendor.</p>
<div style="margin:20px 0;">
${detailTable([
  ['Nomor Summary', '{{summaryNumber}}', true],
  ['Section', '{{sectionName}}', false],
  ['Department', '{{departmentName}}', false],
  ['Di Generate Oleh', '{{generatedByName}}', false],
  ['Status', '<span style="color:#15803d;font-weight:800">DISETUJUI</span>', false],
])}
</div>
<div style="margin-top:24px;text-align:center">
<a href="{{printUrl}}" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;letter-spacing:.02em">Lihat &amp; Print Summary</a>
</div>
</td></tr>` + FOOTER;

  await db.update(emailTemplates).set({
    htmlContent: approvedHtml,
    textContent: `Summary Permintaan Barang Safety - Sudah Disetujui\n\nSummary ({{summaryNumber}}) untuk section {{sectionName}} ({{departmentName}}) sudah disetujui oleh Department Head.\n\nNomor: {{summaryNumber}}\nSection: {{sectionName}}\nDepartment: {{departmentName}}\nDi generate oleh: {{generatedByName}}\nStatus: DISETUJUI\n\nSilakan login HERO untuk melihat detail dan melakukan pemesanan barang ke vendor.`,
    name: 'Summary Permintaan Barang - Sudah Disetujui',
    description: 'Notifikasi ke HSE saat summary permintaan barang sudah disetujui oleh Dept Head',
  }).where(eq(emailTemplates.templateCode, 'apd_summary_approved'));
  console.log('apd_summary_approved updated');

  console.log('Done!');
}

main().catch(console.error).finally(() => process.exit(0));
