import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  hcFlightRouteChangeApprovals,
  hcFlightRouteChangeItems,
  hcFlightRouteChangeRequests,
} from '@/db/schema/hero'
import { asc, eq } from 'drizzle-orm'
import { generateFlightRoutePdf } from '@/lib/flight-route-pdf'
import { resolveUploadUrl } from '@/lib/s3-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function formatDateIndonesian(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return dateStr
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const requestId = parseInt(params.id, 10)
    if (isNaN(requestId)) {
      return new NextResponse('ID permohonan tidak valid', { status: 400 })
    }

    const [req] = await db
      .select()
      .from(hcFlightRouteChangeRequests)
      .where(eq(hcFlightRouteChangeRequests.id, requestId))
      .limit(1)

    if (!req) {
      return new NextResponse('Dokumen tidak ditemukan', { status: 404 })
    }

    const items = await db
      .select()
      .from(hcFlightRouteChangeItems)
      .where(eq(hcFlightRouteChangeItems.requestId, requestId))
      .orderBy(asc(hcFlightRouteChangeItems.sortOrder))

    const approvals = await db
      .select()
      .from(hcFlightRouteChangeApprovals)
      .where(eq(hcFlightRouteChangeApprovals.requestId, requestId))
      .orderBy(asc(hcFlightRouteChangeApprovals.stepOrder))

    const isDownload = request.nextUrl.searchParams.get('download') === '1'
    const format = request.nextUrl.searchParams.get('format')

    // Optional HTML view if explicitly requested with ?format=html
    if (format === 'html') {
      const appMap = new Map(approvals.map((a) => [a.stepOrder, a]))
      const step1 = appMap.get(1)
      const step2 = appMap.get(2)
      const step3 = appMap.get(3)
      const step4 = appMap.get(4)
      const step5 = appMap.get(5)

      const renderSignature = (step?: typeof step1) => {
        if (step?.status === 'approved' && step.signatureDataUrl) {
          const url = resolveUploadUrl(step.signatureDataUrl)
          return `<div style="height: 60px; display: flex; align-items: center; justify-content: center;"><img src="${url}" style="max-height: 54px; max-width: 140px; object-fit: contain;" /></div>`
        }
        if (step?.status === 'approved') {
          return `<div style="height: 60px; display: flex; align-items: center; justify-content: center; color: #166534; font-weight: bold; font-size: 11px; border: 1px dashed #bbf7d0; border-radius: 4px; background: #f0fdf4; padding: 4px;">✔ SIGNED<br/><span style="font-size: 9px; font-weight: normal; color: #15803d;">${step.signedAt ? formatDateIndonesian(step.signedAt.toISOString()) : ''}</span></div>`
        }
        return `<div style="height: 60px;"></div>`
      }

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Permohonan Perubahan Rute Penerbangan - ${req.requestNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 20mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 190mm;
      margin: 0 auto;
      padding: 10px;
    }
    .title {
      font-weight: bold;
      margin-bottom: 20px;
      font-size: 11pt;
    }
    .recipient {
      font-weight: bold;
      margin-bottom: 15px;
    }
    .identity-table {
      margin-left: 30px;
      margin-bottom: 15px;
      border-collapse: collapse;
    }
    .identity-table td {
      padding: 2px 8px;
      vertical-align: top;
    }
    .identity-table td.label {
      font-weight: bold;
      width: 120px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .items-table th, .items-table td {
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    }
    .items-table th {
      background-color: #333;
      color: #fff;
      font-weight: bold;
      font-size: 10pt;
    }
    .clause-text {
      text-align: justify;
      margin: 15px 0;
      font-size: 10.5pt;
    }
    .date-location {
      font-weight: bold;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    .sig-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .sig-grid td {
      width: 33.33%;
      vertical-align: top;
      padding: 8px 12px;
    }
    .sig-box {
      text-align: left;
    }
    .sig-title {
      font-weight: bold;
      margin-bottom: 6px;
    }
    .sig-name {
      font-weight: bold;
      text-decoration: underline;
      margin-top: 4px;
    }
    .sig-role {
      font-size: 9.5pt;
      color: #333;
    }
    .footer-stamp {
      margin-top: 40px;
      text-align: center;
      font-size: 8.5pt;
      color: #eab308;
    }
    @media print {
      body { background: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<div class="no-print" style="background: #f1f5f9; padding: 12px; text-align: center; border-b: 1px solid #cbd5e1; margin-bottom: 15px;">
  <a href="?download=1" style="background: #0284c7; color: white; border: none; padding: 8px 20px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block;">
    📥 Unduh Dokumen PDF
  </a>
</div>

<div class="container">
  <div class="title">Perihal : Permohonan Perubahan Rute Penerbangan</div>

  <div class="recipient">
    Kepada Yth :<br />
    Human Resources & General Affair PT. Chitra Paratama<br />
    Di – <u>Tempat</u>
  </div>

  <div>
    Dengan hormat,<br />
    Saya yang bertanda tangan di bawah ini :
  </div>

  <table class="identity-table">
    <tr>
      <td class="label">N a m a</td>
      <td>: <strong>${req.requestorName}</strong></td>
    </tr>
    <tr>
      <td class="label">SN</td>
      <td>: <strong>${req.employeeSn || '-'}</strong></td>
    </tr>
    <tr>
      <td class="label">Section</td>
      <td>: ${req.sectionName}</td>
    </tr>
    <tr>
      <td class="label">Lokasi Kerja</td>
      <td>: ${req.siteName}</td>
    </tr>
  </table>

  <div>
    Dengan ini saya mengajukan permohonan untuk perubahan rute penerbangan perjalanan Offsite & Onsite dengan detail sebagai berikut :
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40px;">No</th>
        <th style="width: 140px;">Tanggal</th>
        <th>Rute Penerbangan</th>
        <th style="width: 140px;">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${
        items.length > 0
          ? items
              .map(
                (it, idx) => `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>${formatDateIndonesian(it.flightDate)}</td>
          <td><strong>${it.flightRoute}</strong></td>
          <td>${it.remark}</td>
        </tr>`
              )
              .join('')
          : `<tr><td colspan="4" style="color: #666;">Tidak ada detail rute.</td></tr>`
      }
    </tbody>
  </table>

  <div class="clause-text">
    Adapun jika ada selisih harga tiket penerbangan yang saya ajukan tersebut, saya bersedia menjadi tanggungan pribadi yang akan di potong melalui gaji dikarenakan rute tersebut merupakan diluar tujuan POH (Point of Hire) yang seharusnya yaitu di <strong>${req.pohLocation}</strong>.
  </div>

  <div class="clause-text">
    Demikian surat permohonan ini saya buat dan saya mengucapkan banyak terima kasih.
  </div>

  <div class="date-location">
    ${req.originLocation}, ${formatDateIndonesian(req.requestDate)}
  </div>

  <table class="sig-grid">
    <tr>
      <td>
        <div class="sig-box">
          <div class="sig-title">Diajukan Oleh,</div>
          ${renderSignature(step1)}
          <div class="sig-name">${step1?.approverName || req.requestorName}</div>
          <div class="sig-role">${step1?.approverTitle || req.jobTitle || 'Pemohon'}</div>
        </div>
      </td>
      <td>
        <div class="sig-box">
          <div class="sig-title">Mengetahui,</div>
          ${renderSignature(step2)}
          <div class="sig-name">${step2?.approverName || 'PJO Leader'}</div>
          <div class="sig-role">${step2?.approverTitle || 'PJO'}</div>
        </div>
      </td>
      <td>
        <div class="sig-box">
          <div class="sig-title">Mengetahui,</div>
          ${renderSignature(step3)}
          <div class="sig-name">${step3?.approverName || 'Supervisor'}</div>
          <div class="sig-role">${step3?.approverTitle || 'Service Operation SPV'}</div>
        </div>
      </td>
    </tr>
    <tr style="height: 20px;"></tr>
    <tr>
      <td>
        <div class="sig-box">
          <div class="sig-title">Mengetahui,</div>
          ${renderSignature(step4)}
          <div class="sig-name">${step4?.approverName || 'HR GA Leader'}</div>
          <div class="sig-role">${step4?.approverTitle || 'HR GA Leader'}</div>
        </div>
      </td>
      <td>
        <div class="sig-box">
          <div class="sig-title">Menyetujui,</div>
          ${renderSignature(step5)}
          <div class="sig-name">${step5?.approverName || 'Central Services Manager'}</div>
          <div class="sig-role">${step5?.approverTitle || 'Central Services Manager'}</div>
        </div>
      </td>
      <td></td>
    </tr>
  </table>

  <div class="footer-stamp">
    Internal information - Yellow - Mahadasha Group
  </div>
</div>

</body>
</html>`

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    // Standard & Default: Generate pure binary PDF via pdf-lib
    const pdfBytes = await generateFlightRoutePdf({
      requestNumber: req.requestNumber,
      requestDate: req.requestDate,
      originLocation: req.originLocation,
      pohLocation: req.pohLocation,
      requestorName: req.requestorName,
      employeeSn: req.employeeSn,
      jobTitle: req.jobTitle,
      sectionName: req.sectionName,
      siteName: req.siteName,
      items: items.map((it) => ({
        flightDate: it.flightDate,
        flightRoute: it.flightRoute,
        remark: it.remark,
      })),
      approvals: approvals.map((a) => ({
        stepOrder: a.stepOrder,
        stepKey: a.stepKey,
        roleLabel: a.roleLabel,
        approverTitle: a.approverTitle,
        approverName: a.approverName,
        status: a.status,
        signatureDataUrl: a.signatureDataUrl,
        signedAt: a.signedAt,
      })),
    })

    const disposition = isDownload ? 'attachment' : 'inline'
    const fileName = `Permohonan_Perubahan_Rute_Penerbangan_${req.requestNumber}.pdf`

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('[FlightRouteChangePDF] Error generating PDF:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
