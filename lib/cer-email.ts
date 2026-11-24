import { db } from '@/db'
import { cerNotificationConfigs, cerWorkflowConfigs } from '@/db/schema/cer'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getPublicAppUrl } from '@/lib/auth-config'
import type { EmailAttachment } from '@/lib/email-delivery'

export interface CerNotificationConfigData {
  procurementEmail: string
  procurementSiteOverrides: Record<string, string>
  evoDwiEmail: string
  gaAdilaEmail: string
  gaBagasEmail: string
  itBimaEmail: string
  budgetValidatorEmail: string
  isActive: boolean
}

export async function getCerNotificationConfig(): Promise<CerNotificationConfigData> {
  try {
    const [cfg] = await db.select().from(cerNotificationConfigs).limit(1)
    if (cfg) {
      return {
        procurementEmail: cfg.procurementEmail || 'procurement@chitraparatama.com',
        procurementSiteOverrides: cfg.procurementSiteOverrides || {},
        evoDwiEmail: cfg.evoDwiEmail || 'evo.dwi@chitraparatama.com',
        gaAdilaEmail: cfg.gaAdilaEmail || 'adila@chitraparatama.com',
        gaBagasEmail: cfg.gaBagasEmail || 'bagas@chitraparatama.com',
        itBimaEmail: cfg.itBimaEmail || 'bima@chitraparatama.com',
        budgetValidatorEmail: cfg.budgetValidatorEmail || 'budget.controller@chitraparatama.com',
        isActive: cfg.isActive ?? true,
      }
    }
  } catch (err) {
    console.error('[cer-email] Failed to get CER notification config:', err)
  }

  return {
    procurementEmail: 'procurement@chitraparatama.com',
    procurementSiteOverrides: {},
    evoDwiEmail: 'evo.dwi@chitraparatama.com',
    gaAdilaEmail: 'adila@chitraparatama.com',
    gaBagasEmail: 'bagas@chitraparatama.com',
    itBimaEmail: 'bima@chitraparatama.com',
    budgetValidatorEmail: 'budget.controller@chitraparatama.com',
    isActive: true,
  }
}

export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount == null) return '0'
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('id-ID').format(num)
}

import { resolveAssetTestingEmail } from '@/lib/asset-testing-guard'

// =========================================================================
// TESTING GUARDRAIL (Sesuai instruksi user):
// Selama proses pengetesan, semua notifikasi hingga PDF dialihkan ke:
// Gilang Suryo Wirawan (gilang.suryo@chitraparatama.co.id)
// =========================================================================
export const CER_TESTING_RECIPIENT_OVERRIDE = 'gilang.suryo@chitraparatama.co.id'

async function resolveTargetRecipients(originalRecipients: string | string[] | undefined): Promise<{
  to: string[]
  note: string
}> {
  return await resolveAssetTestingEmail(originalRecipients)
}

export interface SendCerSubmittedEmailParams {
  approverEmail: string
  approverName: string
  approverJobTitle?: string | null
  cerNumber: string
  subject: string
  applicantName: string
  applicantSn?: string | null
  applicantJobTitle?: string | null
  siteName: string
  departmentName: string
  assetCategory?: string | null
  purchaseType?: string | null
  dateRequired?: string | null
  vendorName?: string | null
  budgetSource?: string | null
  budgetCode?: string | null
  budgetName?: string | null
  purchasePurpose?: string | null
  items?: Array<{
    description: string
    qty: number
    pricePerUnit: number | string
    totalPrice: number | string
    allocation?: string | null
    holderName?: string | null
  }>
  totalEstimatedPrice: number | string
  approvalStep: string
  approvalUrl?: string
  cc?: string | string[]
}

export function buildCerSubmittedEmailHtml(params: SendCerSubmittedEmailParams, approvalLink: string): string {
  const effectiveJobTitle = params.approverJobTitle || params.approvalStep
  const isDirectorStep =
    Boolean(effectiveJobTitle && effectiveJobTitle.toLowerCase().includes('director')) ||
    Boolean(params.approverName && params.approverName.toLowerCase().includes('director'))
  const hasBoardSecretaryCc =
    isDirectorStep ||
    (Array.isArray(params.cc) ? params.cc.some((c) => c.includes('freshya')) : Boolean(params.cc?.includes('freshya')))

  const isAssetTaggingStep =
    Boolean(effectiveJobTitle && (effectiveJobTitle.toLowerCase().includes('tagging') || effectiveJobTitle.toLowerCase().includes('nomor aset'))) ||
    Boolean(params.approverName && params.approverName.toLowerCase().includes('syamsul'))
  const hasAssetTaggingEvoCc =
    isAssetTaggingStep ||
    (Array.isArray(params.cc) ? params.cc.some((c) => c.includes('evo')) : Boolean(params.cc?.includes('evo')))

  const renderedItemRows =
    params.items && params.items.length > 0
      ? params.items
          .map(
            (it, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 1 ? 'background:#fcfcfc;' : ''}">
          <td style="padding:8px 10px;text-align:center;color:#64748b">${idx + 1}</td>
          <td style="padding:8px 10px;font-weight:600;color:#0f172a">${it.description}</td>
          <td style="padding:8px 10px;text-align:center;color:#334155">${it.qty}</td>
          <td style="padding:8px 10px;text-align:right;color:#334155">Rp ${formatRupiah(it.pricePerUnit)}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700;color:#0f172a">Rp ${formatRupiah(it.totalPrice)}</td>
          <td style="padding:8px 10px;font-size:10px;color:#475569">
            ${it.allocation ? `<span style="display:inline-block;padding:2px 5px;background:#ecfdf5;color:#065f46;border-radius:3px;font-weight:600">${it.allocation}</span>` : '-'}
            ${it.holderName ? `<div style="margin-top:2px;color:#1e40af">&bull; ${it.holderName}</div>` : ''}
          </td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="6" style="padding:14px;text-align:center;color:#94a3b8">Tidak ada rincian item.</td></tr>`

  return `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#1e3a8a 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#93c5fd;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Formulir Pengadaan Aset (CER)</h1>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:6px 12px;color:#dbeafe;background:rgba(255,255,255,.1);font-size:11px;font-weight:700">CapEx Approval</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px">
              <!-- Judul Form & Dokumen Info (Clean & Focused) -->
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.cerNumber}
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  ${params.subject}
                </h2>
                <div style="font-size:12px;color:#64748b">
                  Job Title: <strong style="color:#2563eb">${effectiveJobTitle}</strong>
                  ${hasBoardSecretaryCc ? ` &bull; <strong style="color:#4338ca">CC &amp; Co-Approval: Freshya Ochtovita (Board Secretary)</strong>` : ''}
                  ${hasAssetTaggingEvoCc ? ` &bull; <strong style="color:#d97706">CC &amp; Co-Approval: Evo Dwi Yulianti (Finance Tagging)</strong>` : ''}
                </div>
              </div>

              <!-- Metadata Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#334155;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;border:1px solid #e2e8f0">
                <tr>
                  <td style="padding:6px 0;width:140px;color:#64748b;font-weight:600">Pemohon</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.applicantName} ${params.applicantSn ? `(${params.applicantSn})` : ''} ${params.applicantJobTitle ? `&bull; ${params.applicantJobTitle}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Departemen / Site</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.departmentName} &bull; ${params.siteName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Kategori / Jenis</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.assetCategory || 'IT Device'} &bull; ${params.purchaseType || 'Baru'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Tgl. Dibutuhkan</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.dateRequired || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemasok / Vendor</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.vendorName || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Sumber Anggaran</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.budgetSource || 'Anggaran'} ${params.budgetCode ? `(${params.budgetCode} - ${params.budgetName})` : ''}</td>
                </tr>
              </table>

              <!-- Tujuan / Justifikasi Pembelian -->
              ${
                params.purchasePurpose
                  ? `
              <div style="margin-bottom:20px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:6px">Tujuan &amp; Justifikasi Pembelian:</div>
                <div style="padding:10px 14px;background:#f1f5f9;border-left:3px solid #2563eb;border-radius:4px;font-size:12px;line-height:1.6;color:#1e293b">
                  ${params.purchasePurpose}
                </div>
              </div>`
                  : ''
              }

              <!-- Rincian Unit Barang / CapEx Items Table -->
              <div style="margin-bottom:20px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:8px">Rincian Unit Barang (CapEx Items):</div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:11px;width:100%;border:1px solid #e2e8f0">
                  <thead>
                    <tr style="background:#0f172a;color:#ffffff;text-align:left">
                      <th style="padding:8px 10px;width:30px;text-align:center">No</th>
                      <th style="padding:8px 10px">Deskripsi Barang</th>
                      <th style="padding:8px 10px;text-align:center;width:40px">Qty</th>
                      <th style="padding:8px 10px;text-align:right;width:100px">Harga Satuan</th>
                      <th style="padding:8px 10px;text-align:right;width:110px">Total Harga</th>
                      <th style="padding:8px 10px">Alokasi &amp; Holder</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderedItemRows}
                  </tbody>
                  <tfoot>
                    <tr style="background:#f8fafc;font-weight:700;border-top:2px solid #cbd5e1">
                      <td colspan="4" style="padding:10px;text-align:right;font-size:12px;color:#0f172a">TOTAL ESTIMASI BIAYA:</td>
                      <td style="padding:10px;text-align:right;font-size:13px;color:#059669;font-weight:800">Rp ${formatRupiah(params.totalEstimatedPrice)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Action Button & CTA -->
              <div style="text-align:center;margin:28px 0 16px">
                <a href="${approvalLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;box-shadow:0 4px 10px rgba(37,99,235,0.25)">
                  Buka Inbox Approval &amp; Review Dokumen &rarr;
                </a>
              </div>
              <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#64748b">
                Tautan langsung: <a href="${approvalLink}" style="color:#2563eb;word-break:break-all">${approvalLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center">
              Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama. Mohon tidak membalas langsung email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`
}

export interface SendCerRevisionRequestedEmailParams {
  applicantEmail: string
  applicantName: string
  applicantSn?: string | null
  cerNumber: string
  subject: string
  revertedByName: string
  revertedByJobTitle?: string | null
  revertNote: string
  cerId: number
  departmentName?: string | null
  siteName?: string | null
  assetCategory?: string | null
  purchaseType?: string | null
  vendorName?: string | null
  totalEstimatedPrice?: number | string | null
  items?: Array<{
    description: string
    qty: number
    pricePerUnit: number | string
    totalPrice: number | string
    allocation?: string | null
    holderName?: string | null
  }>
}

export function buildCerRevisionRequestedEmailHtml(
  params: SendCerRevisionRequestedEmailParams,
  editLink: string
): string {
  const effectiveReverter = params.revertedByJobTitle
    ? `${params.revertedByName} (${params.revertedByJobTitle})`
    : params.revertedByName

  const renderedItemRows =
    params.items && params.items.length > 0
      ? params.items
          .map(
            (it, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9;${idx % 2 === 1 ? 'background:#fcfcfc;' : ''}">
          <td style="padding:8px 10px;text-align:center;color:#64748b">${idx + 1}</td>
          <td style="padding:8px 10px;font-weight:600;color:#0f172a">${it.description}</td>
          <td style="padding:8px 10px;text-align:center;color:#334155">${it.qty}</td>
          <td style="padding:8px 10px;text-align:right;color:#334155">Rp ${formatRupiah(it.pricePerUnit)}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700;color:#0f172a">Rp ${formatRupiah(it.totalPrice)}</td>
          <td style="padding:8px 10px;font-size:10px;color:#475569">
            ${it.allocation ? `<span style="display:inline-block;padding:2px 5px;background:#ecfdf5;color:#065f46;border-radius:3px;font-weight:600">${it.allocation}</span>` : '-'}
            ${it.holderName ? `<div style="margin-top:2px;color:#1e40af">&bull; ${it.holderName}</div>` : ''}
          </td>
        </tr>`
          )
          .join('')
      : `<tr><td colspan="6" style="padding:14px;text-align:center;color:#94a3b8">Tidak ada rincian item.</td></tr>`

  return `
<div style="margin:0;padding:0;background:#e5e7eb;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e5e7eb;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.1);border:1px solid #cbd5e1">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#020617 0%,#0f172a 60%,#78350f 100%);padding:22px 28px">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;color:#fde68a;font-size:11px;letter-spacing:.25em;text-transform:uppercase;font-weight:700">PT CHITRA PARATAMA</p>
                    <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em">Formulir Pengadaan Aset (CER)</h1>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;border:1px solid rgba(245,158,11,.35);border-radius:6px;padding:6px 12px;color:#fef3c7;background:rgba(245,158,11,.15);font-size:11px;font-weight:700">Permintaan Revisi</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:24px 28px">
              <!-- Judul Form & Dokumen Info -->
              <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e2e8f0">
                <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;margin-bottom:6px">
                  ${params.cerNumber} &bull; Perlu Revisi
                </span>
                <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;line-height:1.35;font-weight:800">
                  ${params.subject}
                </h2>
                <div style="font-size:12px;color:#64748b">
                  Dikembalikan oleh: <strong style="color:#b45309">${effectiveReverter}</strong>
                </div>
              </div>

              <!-- Revert Reason Callout Box (Prominent) -->
              <div style="margin-bottom:22px;background:#fffbeb;border-left:4px solid #d97706;border-radius:8px;padding:14px 18px;border-top:1px solid #fde68a;border-right:1px solid #fde68a;border-bottom:1px solid #fde68a">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#92400e;margin-bottom:6px;letter-spacing:.05em">
                  ⚠️ Catatan Revisi / Instruksi Perbaikan dari Approver:
                </div>
                <div style="font-size:13px;line-height:1.6;color:#78350f;font-weight:600;font-style:italic">
                  &ldquo;${params.revertNote}&rdquo;
                </div>
                <div style="margin-top:8px;font-size:11px;color:#b45309">
                  Oleh: <strong>${params.revertedByName}</strong> ${params.revertedByJobTitle ? `&bull; ${params.revertedByJobTitle}` : ''}
                </div>
              </div>

              <!-- Metadata Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#334155;margin-bottom:20px;background:#f8fafc;border-radius:8px;padding:12px 16px;border:1px solid #e2e8f0">
                <tr>
                  <td style="padding:6px 0;width:140px;color:#64748b;font-weight:600">Pemohon</td>
                  <td style="padding:6px 0;font-weight:700;color:#0f172a">: ${params.applicantName} ${params.applicantSn ? `(${params.applicantSn})` : ''}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Departemen / Site</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.departmentName || '-'} &bull; ${params.siteName || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Kategori / Jenis</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.assetCategory || 'IT Device'} &bull; ${params.purchaseType || 'Baru'}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Pemasok / Vendor</td>
                  <td style="padding:6px 0;color:#0f172a">: ${params.vendorName || '-'}</td>
                </tr>
                ${
                  params.totalEstimatedPrice
                    ? `
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600">Estimasi Total Nilai</td>
                  <td style="padding:6px 0;font-weight:700;color:#059669">: Rp ${formatRupiah(params.totalEstimatedPrice)}</td>
                </tr>`
                    : ''
                }
              </table>

              <!-- Rincian Unit Barang (CapEx Items) jika ada -->
              ${
                params.items && params.items.length > 0
                  ? `
              <div style="margin-bottom:20px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:8px">Rincian Unit Barang Saat Ini:</div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:11px;width:100%;border:1px solid #e2e8f0">
                  <thead>
                    <tr style="background:#0f172a;color:#ffffff;text-align:left">
                      <th style="padding:8px 10px;width:30px;text-align:center">No</th>
                      <th style="padding:8px 10px">Deskripsi Barang</th>
                      <th style="padding:8px 10px;text-align:center;width:40px">Qty</th>
                      <th style="padding:8px 10px;text-align:right;width:100px">Harga Satuan</th>
                      <th style="padding:8px 10px;text-align:right;width:110px">Total Harga</th>
                      <th style="padding:8px 10px">Alokasi &amp; Holder</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderedItemRows}
                  </tbody>
                  ${
                    params.totalEstimatedPrice
                      ? `
                  <tfoot>
                    <tr style="background:#f8fafc;font-weight:700;border-top:2px solid #cbd5e1">
                      <td colspan="4" style="padding:10px;text-align:right;font-size:12px;color:#0f172a">TOTAL ESTIMASI BIAYA:</td>
                      <td style="padding:10px;text-align:right;font-size:13px;color:#059669;font-weight:800">Rp ${formatRupiah(params.totalEstimatedPrice)}</td>
                      <td></td>
                    </tr>
                  </tfoot>`
                      : ''
                  }
                </table>
              </div>`
                  : ''
              }

              <!-- Action Button & CTA -->
              <div style="text-align:center;margin:28px 0 16px">
                <a href="${editLink}" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;box-shadow:0 4px 10px rgba(217,119,6,0.25)">
                  Perbaiki &amp; Revisi Formulir CER &rarr;
                </a>
              </div>
              <p style="text-align:center;margin:0 0 16px;font-size:11px;color:#64748b">
                Tautan langsung: <a href="${editLink}" style="color:#d97706;word-break:break-all">${editLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center">
              Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama. Mohon tidak membalas langsung email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`
}

/**
 * 1. Notifikasi Permohonan CER Baru Membutuhkan Approval
 */
export async function sendCerSubmittedEmail(params: SendCerSubmittedEmailParams) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`
  const target = await resolveTargetRecipients(params.approverEmail)

  const effectiveJobTitle = params.approverJobTitle || params.approvalStep
  const isDirectorStep =
    Boolean(effectiveJobTitle && effectiveJobTitle.toLowerCase().includes('director')) ||
    Boolean(params.approverName && params.approverName.toLowerCase().includes('director'))

  // If Director step, ensure Freshya Ochtovita (Board Secretary) is CC'ed
  let resolvedCc = params.cc
  if (isDirectorStep) {
    const freshyaEmail = 'freshya.ochtovita@chitraparatama.co.id'
    if (Array.isArray(resolvedCc)) {
      if (!resolvedCc.includes(freshyaEmail)) resolvedCc = [...resolvedCc, freshyaEmail]
    } else if (typeof resolvedCc === 'string') {
      if (!resolvedCc.includes(freshyaEmail)) resolvedCc = [resolvedCc, freshyaEmail]
    } else {
      resolvedCc = [freshyaEmail]
    }
  }

  const cleanSubject = `${target.note}[CER Approval] ${params.cerNumber} - ${params.subject} (${effectiveJobTitle})`
  const emailHtml = buildCerSubmittedEmailHtml({ ...params, cc: resolvedCc }, approvalLink)

  // Send Workflow Email with Full HTML Content
  await sendWorkflowEmail({
    to: target.to,
    cc: CER_TESTING_RECIPIENT_OVERRIDE ? undefined : resolvedCc,
    templateCode: 'cer_request_submitted',
    templateName: 'Pengajuan CER Baru Membutuhkan Approval',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      applicantSn: params.applicantSn || '',
      applicantJobTitle: params.applicantJobTitle || '',
      siteName: params.siteName,
      departmentName: params.departmentName,
      assetCategory: params.assetCategory || 'IT Device',
      purchaseType: params.purchaseType || 'Baru',
      dateRequired: params.dateRequired || '-',
      vendorName: params.vendorName || '-',
      budgetSource: params.budgetSource || 'Anggaran',
      budgetCode: params.budgetCode || '',
      budgetName: params.budgetName || '',
      totalEstimatedPrice: formatRupiah(params.totalEstimatedPrice),
      approvalStep: effectiveJobTitle,
      approverJobTitle: effectiveJobTitle,
      approvalLink,
    },
    fallbackSubject: cleanSubject,
    fallbackHtml: emailHtml,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) oleh ${params.applicantName} membutuhkan persetujuan Anda (${effectiveJobTitle}). Total: Rp ${formatRupiah(params.totalEstimatedPrice)}. Buka link: ${approvalLink}`,
  })

  // Bell Notification to primary approver
  await notifyWorkflowBellRecipients({
    recipientEmails: [CER_TESTING_RECIPIENT_OVERRIDE || params.approverEmail],
    eventType: 'cer.approval_needed',
    category: 'approval_requests',
    title: `Persetujuan CER: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" dari ${params.applicantName} memerlukan persetujuan Anda (${effectiveJobTitle}).`,
    url: approvalLink,
  })

  // Bell Notification to Freshya if Director step
  if (isDirectorStep) {
    await notifyWorkflowBellRecipients({
      recipientEmails: [CER_TESTING_RECIPIENT_OVERRIDE || 'freshya.ochtovita@chitraparatama.co.id'],
      eventType: 'cer.approval_needed',
      category: 'approval_requests',
      title: `Persetujuan CER (Director): ${params.cerNumber}`,
      body: `Permohonan CER "${params.subject}" dari ${params.applicantName} memerlukan persetujuan Director. Sebagai Board Secretary, Anda di-CC dan memiliki akses untuk menyetujui dokumen ini.`,
      url: approvalLink,
    }).catch((err) => console.error('[cer] Bell notify Board Secretary error:', err))
  }
}

/**
 * 2. Notifikasi Pengajuan CER Perlu Revisi (Reverted) ke Pemohon
 */
export async function sendCerRevisionRequestedEmail(
  params: SendCerRevisionRequestedEmailParams
) {
  const baseUrl = getPublicAppUrl()
  const editLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}&action=edit`
  const target = await resolveTargetRecipients(params.applicantEmail)
  const emailHtml = buildCerRevisionRequestedEmailHtml(params, editLink)

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'cer_revision_requested',
    templateName: 'Pengajuan CER Perlu Revisi',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      applicantSn: params.applicantSn || '',
      departmentName: params.departmentName || '',
      siteName: params.siteName || '',
      totalEstimatedPrice: formatRupiah(params.totalEstimatedPrice),
      revertedByName: params.revertedByName,
      revertedByJobTitle: params.revertedByJobTitle || '',
      revertNote: params.revertNote,
      editLink,
    },
    fallbackSubject: `${target.note}[CER Revisi] ${params.cerNumber} - ${params.subject}`,
    fallbackHtml: emailHtml,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) dikembalikan untuk revisi oleh ${params.revertedByName} (${params.revertedByJobTitle || 'Approver'}) dengan catatan: "${params.revertNote}". Silakan perbarui: ${editLink}`,
  })

  // Ensure BOTH applicant and any override recipient receive in-app Notification Center / Header Bell
  const bellRecipients = Array.from(
    new Set([params.applicantEmail, CER_TESTING_RECIPIENT_OVERRIDE].filter(Boolean))
  )

  await notifyWorkflowBellRecipients({
    recipientEmails: bellRecipients,
    eventType: 'cer.revision_needed',
    category: 'approval_requests',
    title: `Revisi CER: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" dikembalikan oleh ${params.revertedByName}: "${params.revertNote}".`,
    url: editLink,
  })
}

/**
 * 3. Notifikasi Pengajuan CER Telah Diperbaiki (Resubmitted) ke Approver Peminta Revisi
 */
export async function sendCerResubmittedEmail(params: {
  approverEmail: string
  approverName: string
  cerNumber: string
  subject: string
  applicantName: string
  approvalUrl?: string
}) {
  const baseUrl = getPublicAppUrl()
  const approvalLink = params.approvalUrl || `${baseUrl}/dashboard/approval`
  const target = await resolveTargetRecipients(params.approverEmail)

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'cer_resubmitted',
    templateName: 'Pengajuan CER Telah Diperbaiki (Resubmitted)',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      approvalLink,
    },
    fallbackSubject: `${target.note}[CER Resubmitted] ${params.cerNumber} - ${params.subject}`,
    fallbackText: `Pemohon ${params.applicantName} telah memperbaiki dan mengirimkan kembali permohonan CER ${params.cerNumber}. Silakan periksa di: ${approvalLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [CER_TESTING_RECIPIENT_OVERRIDE || params.approverEmail],
    eventType: 'cer.resubmitted',
    category: 'approval_requests',
    title: `CER Diperbaiki: ${params.cerNumber}`,
    body: `Pemohon ${params.applicantName} telah memperbarui form CER "${params.subject}". Siap ditinjau kembali.`,
    url: approvalLink,
  })
}

/**
 * 4. Notifikasi Pengajuan CER Full Approved (Dokumen Resmi Terbit)
 * Kirim ke Procurement & Pemohon, CC Evo Dwi
 */
export async function sendCerFullApprovedEmail(params: {
  applicantEmail: string
  applicantName: string
  cerNumber: string
  subject: string
  siteId?: number | null
  siteName: string
  totalEstimatedPrice: number | string
  vendorName: string
  pdfBuffer?: Buffer | Uint8Array
  pdfUrl?: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const config = await getCerNotificationConfig()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  // Sesuai requirement resmi:
  // Kirim ke Pemohon CER & Tim Procurement:
  // - Sofyan Darmawan (sofyan.darmawan@chitraparatama.co.id)
  // - Nico Saputra (nico.saputra@chitraparatama.co.id)
  // - Abdul Rajab (abdul.rajab@chitraparatama.co.id)
  // CC: Evo Dwi (Finance) & Aulia Riski Walidina
  const procurementEmails = [
    'sofyan.darmawan@chitraparatama.co.id',
    'nico.saputra@chitraparatama.co.id',
    'abdul.rajab@chitraparatama.co.id',
  ]
  const primaryRecipients = [
    params.applicantEmail,
    ...procurementEmails,
  ].filter(Boolean)

  const ccEmails = [
    'evo.yulianti@chitraparatama.co.id',
    'aulia.walidina@chitraparatama.co.id',
  ].filter(Boolean)

  const target = await resolveTargetRecipients(primaryRecipients)

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer) {
    attachments.push({
      filename: `${params.cerNumber.replace(/\//g, '_')}_APPROVED.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  await sendWorkflowEmail({
    to: target.to,
    cc: CER_TESTING_RECIPIENT_OVERRIDE ? undefined : ccEmails,
    templateCode: 'cer_full_approved',
    templateName: 'Pengajuan CER Full Approved (Dokumen Resmi Terbit)',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      siteName: params.siteName,
      totalEstimatedPrice: formatRupiah(params.totalEstimatedPrice),
      vendorName: params.vendorName || '-',
      pdfDownloadUrl: params.pdfUrl || viewLink,
      viewLink,
    },
    fallbackSubject: `${target.note}[CER Full Approved] ${params.cerNumber} - ${params.subject} (Dokumen Terbit)`,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) telah disetujui penuh (Full Approved) dan nomor aset telah diregistrasi oleh Finance. Dokumen terlampir. Tautan: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  // Sinkronkan ke Notification Center HERO (Bell):
  // Notifikasi in-app untuk pemohon dan tim procurement (Sofyan, Nico, Rajab)
  const bellRecipients = [
    params.applicantEmail,
    'sofyan.darmawan@chitraparatama.co.id',
    'nico.saputra@chitraparatama.co.id',
    'abdul.rajab@chitraparatama.co.id',
  ].filter(Boolean)

  await notifyWorkflowBellRecipients({
    recipientEmails: bellRecipients,
    eventType: 'cer.full_approved',
    category: 'approval_requests',
    title: `CER Full Approved: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" telah disetujui penuh & diregistrasi oleh Finance. Dokumen resmi telah terbit.`,
    url: viewLink,
  })
}

/**
 * 4b. Notifikasi Pengajuan CER Ditolak (Rejected)
 */
export async function sendCerRejectedEmail(params: {
  applicantEmail: string
  applicantName: string
  cerNumber: string
  subject: string
  rejectedByName: string
  rejectReason: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`
  const target = await resolveTargetRecipients(params.applicantEmail)

  await sendWorkflowEmail({
    to: target.to,
    templateCode: 'cer_rejected',
    templateName: 'Pengajuan CER Ditolak',
    variables: {
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      rejectedByName: params.rejectedByName,
      rejectReason: params.rejectReason,
      viewLink,
    },
    fallbackSubject: `${target.note}[CER Ditolak] Permohonan ${params.cerNumber} - ${params.subject}`,
    fallbackText: `Permohonan CER ${params.cerNumber} (${params.subject}) telah ditolak oleh ${params.rejectedByName} dengan alasan: "${params.rejectReason}". Anggaran terkait telah dibebaskan kembali. Buka tautan: ${viewLink}`,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: [CER_TESTING_RECIPIENT_OVERRIDE || params.applicantEmail],
    eventType: 'cer.rejected',
    category: 'approval_requests',
    title: `CER Ditolak: ${params.cerNumber}`,
    body: `Permohonan CER "${params.subject}" ditolak oleh ${params.rejectedByName}: "${params.rejectReason}".`,
    url: viewLink,
  })
}

/**
 * 5. Notifikasi Konfirmasi Penerimaan Fisik Aset & BAST CER
 * Kirim ke Finance Tagging (Syamsul Bahri & Evo Dwi) & CC Pemohon + Procurement
 */
export async function sendCerAssetReceivedEmail(params: {
  applicantName: string
  applicantEmail?: string | null
  cerNumber: string
  subject: string
  siteId?: number | null
  siteName: string
  receivedDate: string
  receiverNotes?: string
  cerId: number
  bastNumber?: string | null
  bastPdfUrl?: string | null
  pdfBuffer?: Buffer | Uint8Array | null
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  // Sesuai requirement: Kirim ke Syamsul Bahri & Evo Dwi (Finance Asset Tagging)
  const financeTaggingEmails = [
    'syamsul.bahri@chitraparatama.co.id',
    'evo.yulianti@chitraparatama.co.id',
  ]

  const ccEmails = [
    params.applicantEmail,
    'sofyan.darmawan@chitraparatama.co.id',
    'nico.saputra@chitraparatama.co.id',
    'abdul.rajab@chitraparatama.co.id',
  ].filter(Boolean) as string[]

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer && params.bastNumber) {
    attachments.push({
      filename: `${params.bastNumber.replace(/\//g, '_')}.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  await sendWorkflowEmail({
    to: financeTaggingEmails,
    cc: ccEmails,
    templateCode: 'cer_asset_received',
    templateName: 'Konfirmasi Penerimaan Fisik Aset & BAST CER',
    variables: {
      cerNumber: params.cerNumber,
      bastNumber: params.bastNumber || '-',
      subject: params.subject,
      applicantName: params.applicantName,
      siteName: params.siteName,
      receivedDate: params.receivedDate,
      receiverNotes: params.receiverNotes || 'Barang diterima lengkap dan sesuai spesifikasi.',
      pdfDownloadUrl: params.bastPdfUrl || viewLink,
      viewLink,
    },
    fallbackSubject: `[Aset Diterima & BAST] ${params.bastNumber ? `${params.bastNumber} - ` : ''}${params.cerNumber} - ${params.subject} di ${params.siteName}`,
    fallbackText: `Pemohon ${params.applicantName} telah mengonfirmasi penerimaan fisik barang dan menandatangani BAST untuk CER ${params.cerNumber} di ${params.siteName}. Dokumen BAST resmi telah terbit. Detail: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  // Bell notification ke Syamsul, Evo, dan Pemohon
  const bellRecipients = [
    ...financeTaggingEmails,
    params.applicantEmail,
  ].filter(Boolean) as string[]

  await notifyWorkflowBellRecipients({
    recipientEmails: bellRecipients,
    eventType: 'cer.asset_received',
    category: 'info',
    title: `Aset Diterima & BAST Terbit: ${params.cerNumber}`,
    body: `Pemohon ${params.applicantName} telah menerima fisik aset dan menerbitkan BAST untuk CER "${params.subject}".`,
    url: viewLink,
  })
}

/**
 * 6. Notifikasi BAST Serah Terima Selesai Diterbitkan
 * Kirim ke Syamsul Bahri & Evo Dwi (Finance Tagging), CC Pemohon & Tim Procurement
 */
export async function sendCerBastCompletedEmail(params: {
  applicantEmail: string
  applicantName: string
  bastNumber: string
  cerNumber: string
  subject: string
  gaName?: string | null
  handoverDate: string
  pdfBuffer?: Buffer | Uint8Array
  pdfUrl?: string
  cerId: number
}) {
  const baseUrl = getPublicAppUrl()
  const viewLink = `${baseUrl}/dashboard/assets/cer?id=${params.cerId}`

  // Sesuai requirement: Notifikasi BAST dikirimkan ke Syamsul & Evo
  const financeTaggingEmails = [
    'syamsul.bahri@chitraparatama.co.id',
    'evo.yulianti@chitraparatama.co.id',
  ]

  const ccEmails = [
    params.applicantEmail,
    'sofyan.darmawan@chitraparatama.co.id',
    'nico.saputra@chitraparatama.co.id',
    'abdul.rajab@chitraparatama.co.id',
  ].filter(Boolean) as string[]

  const attachments: EmailAttachment[] = []
  if (params.pdfBuffer) {
    attachments.push({
      filename: `${params.bastNumber.replace(/\//g, '_')}.pdf`,
      content: Buffer.from(params.pdfBuffer),
      contentType: 'application/pdf',
    })
  }

  await sendWorkflowEmail({
    to: financeTaggingEmails,
    cc: ccEmails,
    templateCode: 'cer_bast_completed',
    templateName: 'BAST Serah Terima Aset Selesai Diterbitkan',
    variables: {
      bastNumber: params.bastNumber,
      cerNumber: params.cerNumber,
      subject: params.subject,
      applicantName: params.applicantName,
      handoverDate: params.handoverDate,
      pdfDownloadUrl: params.pdfUrl || viewLink,
      viewLink,
    },
    fallbackSubject: `[BAST Aset] Berita Acara Serah Terima ${params.bastNumber} - ${params.cerNumber}`,
    fallbackText: `Dokumen BAST ${params.bastNumber} untuk CER ${params.cerNumber} telah ditandatangani dan diterbitkan. Detail: ${viewLink}`,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  await notifyWorkflowBellRecipients({
    recipientEmails: financeTaggingEmails.concat(params.applicantEmail).filter(Boolean) as string[],
    eventType: 'cer.bast_completed',
    category: 'info',
    title: `BAST Diterbitkan: ${params.bastNumber}`,
    body: `Berita Acara Serah Terima Aset "${params.subject}" telah selesai diterbitkan dan aset telah diterima oleh ${params.applicantName}.`,
    url: viewLink,
  })
}
