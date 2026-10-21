import * as React from 'react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

export interface JsaDocumentData {
  id?: string
  jsaNumber?: string | null
  jobDescription?: string | null
  equipmentNumber?: string | null
  teamMembers?: string | null
  equipmentUsed?: string[] | null
  requirements?: string[] | null
  permits?: string[] | null
  ppeRequirements?: string[] | null
  riskLevel?: string | null
  signatures?: Partial<{
    creatorName?: string
    executorUrl?: string
    executorDate?: string
    verifierName?: string
    verifierDate?: string
  }> | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  steps?: Array<{
    stepOrder?: number
    workStep?: string
    hazard?: string
    consequence?: string
    control?: string
    residualRisk?: string
    pic?: string
  }> | null
}

interface JsaDocumentSheetProps {
  data: JsaDocumentData
  className?: string
}

function formatDateIndo(val: string | Date | null | undefined): string {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

function renderRiskBadge(riskLevel?: string | null) {
  const norm = (riskLevel || '').trim().toUpperCase()
  if (norm === 'H' || norm === 'HIGH' || norm === 'TINGGI') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[7.5pt] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        TINGGI (HIGH / H)
      </span>
    )
  }
  if (norm === 'M' || norm === 'MEDIUM' || norm === 'MENENGAH') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[7.5pt] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        MENENGAH (MEDIUM / M)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[7.5pt] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      RENDAH (LOW / L)
    </span>
  )
}

function renderResidualRiskBadge(risk?: string | null) {
  const norm = (risk || '').trim().toUpperCase()
  if (norm === 'H' || norm === 'HIGH') {
    return <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[7.5pt]">H</span>
  }
  if (norm === 'M' || norm === 'MEDIUM') {
    return <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-[7.5pt]">M</span>
  }
  return <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-[7.5pt]">L</span>
}

export function JsaDocumentSheet({ data, className = '' }: JsaDocumentSheetProps) {
  const { steps = [] } = data
  const equipmentUsed = Array.isArray(data.equipmentUsed) ? data.equipmentUsed.filter(Boolean) : []
  const requirements = Array.isArray(data.requirements) ? data.requirements.filter(Boolean) : []
  const permits = Array.isArray(data.permits) ? data.permits.filter(Boolean) : []
  const ppeRequirements = Array.isArray(data.ppeRequirements) ? data.ppeRequirements.filter(Boolean) : []
  const signatures = (data.signatures || {}) as Partial<{
    creatorName?: string
    executorUrl?: string
    executorDate?: string
    verifierName?: string
    verifierDate?: string
  }>

  const creatorName =
    signatures.creatorName ||
    data.teamMembers?.split(',')[0]?.trim() ||
    'Pelaksana Pekerjaan'

  const resolvedExecutorSignature = signatures.executorUrl
    ? resolveUploadUrl(signatures.executorUrl)
    : null

  const formattedDate = formatDateIndo(data.createdAt)
  const executorFormattedDate = signatures.executorDate ? formatDateIndo(signatures.executorDate) : formattedDate
  const verifierFormattedDate = signatures.verifierDate ? formatDateIndo(signatures.verifierDate) : formattedDate

  return (
    <div
      className={`pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] max-w-[210mm] min-h-[297mm] p-6 text-[8.5pt] font-sans mx-auto text-slate-900 box-border flex flex-col justify-between ${className}`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="flex-1 flex flex-col">
        {/* ============================================================== */}
        {/* HEADER FORMULIR JSA (NETRAL / TANPA BRANDING SPESIFIK)         */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-slate-900">
          <div className="flex-1 text-left">
            <h1 className="font-extrabold text-[14pt] uppercase tracking-wider text-slate-950 leading-tight">
              JOB SAFETY ANALYSIS (JSA)
            </h1>
            <p className="font-semibold text-[7.5pt] text-slate-600 tracking-wider uppercase mt-0.5">
              HEALTH, SAFETY & ENVIRONMENT • ANALISIS KESELAMATAN & KESEHATAN KERJA
            </p>
          </div>
          <div className="text-right flex justify-end items-center">
            <div className="border border-slate-900 px-2.5 py-1 text-right bg-slate-50 rounded-sm">
              <div className="text-[6.5pt] uppercase font-semibold text-slate-500">Kode Formulir</div>
              <div className="font-mono font-bold text-[8pt] text-slate-900">F.HSE.SFT-014.01|1</div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* METADATA GRID (INFO UMUM & DETAIL PEKERJAAN)                   */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 gap-2.5 mb-2.5 text-[8pt]">
          {/* Kolom Kiri: Informasi Dokumen */}
          <table className="w-full border-collapse border border-slate-800 text-[8pt]">
            <tbody>
              <tr className="bg-slate-100">
                <td colSpan={2} className="border border-slate-800 px-2 py-0.5 font-bold text-slate-900 uppercase text-[7.5pt] tracking-wider">
                  Informasi Dokumen
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70 w-36">
                  Dibuat Oleh
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {creatorName}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70">
                  Tanggal Pembuatan
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {formattedDate}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70">
                  Nomor JSA
                </td>
                <td className="border border-slate-800 px-2 py-1 font-bold text-slate-950 font-mono text-[8.5pt]">
                  {data.jsaNumber || '—'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kolom Kanan: Detail Pekerjaan */}
          <table className="w-full border-collapse border border-slate-800 text-[8pt]">
            <tbody>
              <tr className="bg-slate-100">
                <td colSpan={2} className="border border-slate-800 px-2 py-0.5 font-bold text-slate-900 uppercase text-[7.5pt] tracking-wider">
                  Detail Pekerjaan
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70 w-36">
                  Penjelasan Pekerjaan
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {data.jobDescription || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70">
                  No. Peralatan / Unit
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {data.equipmentNumber || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-800 px-2 py-1 font-semibold text-slate-700 bg-slate-50/70">
                  Anggota Team JSA
                </td>
                <td className="border border-slate-800 px-2 py-1 font-medium text-slate-900">
                  {data.teamMembers || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* PERSYARATAN KESELAMATAN & PENGENDALIAN (ONLY CHECKED ITEMS)   */}
        {/* ============================================================== */}
        <div className="border border-slate-800 rounded-sm mb-2.5 overflow-hidden text-[7.5pt]">
          <div className="bg-slate-100 border-b border-slate-800 px-2.5 py-1 flex items-center justify-between">
            <span className="font-bold text-slate-900 uppercase text-[7.5pt] tracking-wide">
              Persyaratan Keselamatan & Pengendalian Risiko
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[7pt] font-semibold text-slate-600">Tingkat Risiko Pekerjaan:</span>
              {renderRiskBadge(data.riskLevel)}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-800">
            {/* Bagian Kiri: Peralatan & Keperluan */}
            <div className="p-2 space-y-1.5">
              <div>
                <div className="font-bold text-slate-800 text-[7.5pt] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Peralatan yang Digunakan:
                </div>
                {equipmentUsed.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {equipmentUsed.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-medium text-[7pt]"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[7pt]">— Tidak ada peralatan khusus yang dicentang</p>
                )}
              </div>

              <div className="pt-1.5 border-t border-slate-200">
                <div className="font-bold text-slate-800 text-[7.5pt] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Keperluan Khusus:
                </div>
                {requirements.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {requirements.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-medium text-[7pt]"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[7pt]">— Standar / Tidak ada keperluan khusus</p>
                )}
              </div>
            </div>

            {/* Bagian Kanan: APD/PPE & Permit */}
            <div className="p-2 space-y-1.5">
              <div>
                <div className="font-bold text-slate-800 text-[7.5pt] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Alat Pelindung Diri (APD / PPE) Wajib:
                </div>
                {ppeRequirements.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {ppeRequirements.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-300 text-blue-900 font-semibold text-[7pt]"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[7pt]">— APD Standar Umum</p>
                )}
              </div>

              <div className="pt-1.5 border-t border-slate-200">
                <div className="font-bold text-slate-800 text-[7.5pt] mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                  Surat Izin Kerja (Permit):
                </div>
                {permits.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {permits.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-400 text-emerald-900 font-semibold text-[7pt]"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[7pt]">— Tidak memerlukan izin kerja khusus (Permit)</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TABEL URUTAN PEKERJAAN (NO EMPTY ROWS)                         */}
        {/* ============================================================== */}
        <div className="mb-3">
          <table className="w-full border-collapse border border-slate-900 text-[7.5pt]">
            <thead>
              <tr className="bg-slate-200 text-slate-950 font-bold uppercase text-center border-b border-slate-900">
                <th className="border border-slate-900 p-1.5 w-7 text-center">No</th>
                <th className="border border-slate-900 p-1.5 w-[23%] text-left">Urutan Pekerjaan</th>
                <th className="border border-slate-900 p-1.5 w-[18%] text-left">Potensi Bahaya</th>
                <th className="border border-slate-900 p-1.5 w-[18%] text-left">Konsekuensi Bahaya</th>
                <th className="border border-slate-900 p-1.5 w-[25%] text-left">Tindakan Kontrol / Pencegahan</th>
                <th className="border border-slate-900 p-1.5 w-12 text-center">Risiko Akhir</th>
                <th className="border border-slate-900 p-1.5 w-16 text-center">Pelaksana</th>
              </tr>
            </thead>
            <tbody>
              {steps && steps.length > 0 ? (
                steps.map((step, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="border border-slate-900 p-1.5 text-center font-bold align-top">{index + 1}</td>
                    <td className="border border-slate-900 p-1.5 align-top font-medium leading-relaxed">{step.workStep || '—'}</td>
                    <td className="border border-slate-900 p-1.5 align-top leading-relaxed text-slate-800">{step.hazard || '—'}</td>
                    <td className="border border-slate-900 p-1.5 align-top leading-relaxed text-slate-800">{step.consequence || '—'}</td>
                    <td className="border border-slate-900 p-1.5 align-top leading-relaxed text-slate-800">{step.control || '—'}</td>
                    <td className="border border-slate-900 p-1.5 text-center align-top font-bold">
                      {renderResidualRiskBadge(step.residualRisk)}
                    </td>
                    <td className="border border-slate-900 p-1.5 text-center align-top font-medium">{step.pic || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border border-slate-900 p-4 text-center italic text-slate-500">
                    Tidak ada rincian urutan langkah pekerjaan yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SIGNATURES / LEMBAR PENGESAHAN (OFFICIAL SPL/DAILY STYLE)      */}
      {/* ============================================================== */}
      <div className="mt-auto pt-2">
        <div className="border border-slate-800 rounded-sm overflow-hidden mb-2">
          <div className="bg-slate-100 border-b border-slate-800 px-2.5 py-1 text-center">
            <p className="text-[7pt] text-slate-700 italic">
              &quot;Saya telah membaca, mengerti, dan setuju untuk mematuhi seluruh langkah kerja serta tindakan pengendalian risiko yang tertera dalam dokumen JSA ini.&quot;
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-800">
            {/* Box Kiri: Pelaksana Pekerjaan */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="text-center font-bold text-[7.5pt] text-slate-900 uppercase pb-1 border-b border-slate-200 mb-1.5">
                Pelaksana / Pembuat JSA
              </div>
              <div className="h-14 flex items-center justify-center my-1">
                {resolvedExecutorSignature ? (
                  <img
                    src={resolvedExecutorSignature}
                    alt="TTD Pelaksana"
                    className="max-h-14 max-w-[140px] object-contain"
                  />
                ) : (
                  <div className="w-36 border-b border-dotted border-slate-400 h-10 flex items-end justify-center pb-1 text-[7pt] text-slate-400 italic">
                    ( Tanda Tangan )
                  </div>
                )}
              </div>
              <div className="text-center pt-1 border-t border-slate-200">
                <p className="font-bold text-[8pt] text-slate-950 uppercase">{creatorName}</p>
                <p className="text-[6.5pt] text-slate-500">Tanggal: {executorFormattedDate}</p>
              </div>
            </div>

            {/* Box Kanan: Verifikasi Departemen HSE */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="text-center font-bold text-[7.5pt] text-slate-900 uppercase pb-1 border-b border-slate-200 mb-1.5">
                Verifikasi Departemen HSE / Pengawas
              </div>
              <div className="h-14 flex items-center justify-center my-1">
                <div className="border border-dashed border-emerald-600/60 bg-emerald-50/50 rounded px-3 py-1.5 text-center">
                  <div className="text-[6.5pt] font-bold text-emerald-800 uppercase tracking-wide">✓ TERVERIFIKASI SISTEM</div>
                  <div className="text-[6pt] text-emerald-700">Departemen HSE Site</div>
                </div>
              </div>
              <div className="text-center pt-1 border-t border-slate-200">
                <p className="font-bold text-[8pt] text-slate-950 uppercase">
                  {signatures.verifierName || 'HSE Officer / Pengawas Site'}
                </p>
                <p className="text-[6.5pt] text-slate-500">Tanggal: {verifierFormattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Dokumen */}
        <div className="flex justify-between items-center text-slate-500 text-[6.5pt] pt-1 border-t border-slate-300">
          <div>Health, Safety & Environment Management System</div>
          <div>Dokumen ini sah dan mengikat selama pekerjaan berlangsung</div>
          <div className="font-mono font-semibold">F.HSE.SFT-014.01|1</div>
        </div>
      </div>
    </div>
  )
}
