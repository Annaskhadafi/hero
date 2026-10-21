import * as React from 'react'
import Image from 'next/image'
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

function getRiskLevelLabel(riskLevel?: string | null): string {
  const norm = (riskLevel || '').trim().toUpperCase()
  if (norm === 'H' || norm === 'HIGH' || norm === 'TINGGI') {
    return 'TINGGI (HIGH / H)'
  }
  if (norm === 'M' || norm === 'MEDIUM' || norm === 'MENENGAH') {
    return 'MENENGAH (MEDIUM / M)'
  }
  return 'RENDAH (LOW / L)'
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
  const riskLabel = getRiskLevelLabel(data.riskLevel)

  return (
    <div
      className={`pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] max-w-[210mm] min-h-[297mm] p-8 text-[8.5pt] font-sans mx-auto text-black box-border flex flex-col justify-between ${className}`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="flex-1 flex flex-col">
        {/* ============================================================== */}
        {/* KOP SURAT RESMI (LOGO CHITRA KIRI, JUDUL TENGAH, KODE KANAN)   */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
          {/* Logo Chitra di Kiri */}
          <div className="w-36 text-left shrink-0">
            <Image
              src="/cp_logo-removebg-preview.png"
              alt="Logo PT Chitra Paratama"
              width={140}
              height={46}
              className="h-11 w-auto object-contain"
              priority
            />
          </div>

          {/* Judul & Subtitle di Tengah */}
          <div className="flex-1 text-center px-3">
            <h1 className="font-extrabold text-[12pt] uppercase tracking-wider text-black leading-tight">
              PT. CHITRA PARATAMA
            </h1>
            <h2 className="font-bold text-[13.5pt] uppercase tracking-wider text-black leading-tight mt-0.5">
              JOB SAFETY ANALYSIS (JSA)
            </h2>
            <p className="font-semibold text-[7.5pt] text-gray-700 tracking-wider uppercase mt-0.5">
              HEALTH, SAFETY & ENVIRONMENT DEPARTMENT
            </p>
          </div>

          {/* Kode Formulir di Kanan */}
          <div className="w-36 text-right shrink-0 flex justify-end">
            <div className="border border-black px-2.5 py-1 text-right bg-gray-50 rounded-sm">
              <div className="text-[6.5pt] uppercase font-bold text-gray-600">No. Formulir</div>
              <div className="font-mono font-bold text-[8pt] text-black">F.HSE.SFT-014.01|1</div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* INFORMASI DOKUMEN & DETAIL PEKERJAAN                           */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-[8pt]">
          {/* Kolom Kiri: Informasi Dokumen */}
          <table className="w-full border-collapse border border-black text-[8pt]">
            <tbody>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-black px-2 py-1 font-bold text-black uppercase text-[7.5pt] tracking-wider">
                  Informasi Dokumen
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50 w-36">
                  Dibuat Oleh
                </td>
                <td className="border border-black px-2 py-1 font-medium text-black">
                  {creatorName}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50">
                  Tanggal Pembuatan
                </td>
                <td className="border border-black px-2 py-1 font-medium text-black">
                  {formattedDate}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50">
                  Nomor JSA
                </td>
                <td className="border border-black px-2 py-1 font-bold text-black font-mono text-[8.5pt]">
                  {data.jsaNumber || '—'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kolom Kanan: Detail Pekerjaan */}
          <table className="w-full border-collapse border border-black text-[8pt]">
            <tbody>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-black px-2 py-1 font-bold text-black uppercase text-[7.5pt] tracking-wider">
                  Detail Pekerjaan
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50 w-36">
                  Penjelasan Pekerjaan
                </td>
                <td className="border border-black px-2 py-1 font-medium text-black">
                  {data.jobDescription || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50">
                  No. Peralatan / Unit
                </td>
                <td className="border border-black px-2 py-1 font-medium text-black">
                  {data.equipmentNumber || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold text-gray-800 bg-gray-50">
                  Anggota Team JSA
                </td>
                <td className="border border-black px-2 py-1 font-medium text-black">
                  {data.teamMembers || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* PERSYARATAN KESELAMATAN (HANYA ITEM DICENTANG, FORMAL & BERSIH)*/}
        {/* ============================================================== */}
        <div className="border border-black mb-3 text-[8pt]">
          <div className="bg-gray-100 border-b border-black px-2.5 py-1 flex items-center justify-between">
            <span className="font-bold text-black uppercase text-[7.5pt] tracking-wide">
              Persyaratan Keselamatan & Pengendalian Risiko
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-[7.5pt] text-black">
              <span>Tingkat Risiko:</span>
              <span className="border border-black bg-white px-2 py-0.5 font-bold uppercase">
                {riskLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-black">
            {/* Bagian Kiri: Peralatan & Keperluan */}
            <div className="p-2.5 space-y-2">
              <div>
                <div className="font-bold text-black text-[7.5pt] uppercase mb-1">
                  Peralatan yang Digunakan:
                </div>
                {equipmentUsed.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7.5pt]">
                    {equipmentUsed.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[7.5pt]">— Tidak ada peralatan khusus yang dicentang</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-300">
                <div className="font-bold text-black text-[7.5pt] uppercase mb-1">
                  Keperluan Khusus:
                </div>
                {requirements.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7.5pt]">
                    {requirements.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[7.5pt]">— Standar / Tidak ada keperluan khusus</p>
                )}
              </div>
            </div>

            {/* Bagian Kanan: APD/PPE & Permit */}
            <div className="p-2.5 space-y-2">
              <div>
                <div className="font-bold text-black text-[7.5pt] uppercase mb-1">
                  Alat Pelindung Diri (APD / PPE) Wajib:
                </div>
                {ppeRequirements.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7.5pt]">
                    {ppeRequirements.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[7.5pt]">— APD Standar Umum</p>
                )}
              </div>

              <div className="pt-2 border-t border-gray-300">
                <div className="font-bold text-black text-[7.5pt] uppercase mb-1">
                  Surat Izin Kerja (Work Permit):
                </div>
                {permits.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7.5pt]">
                    {permits.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[7.5pt]">— Tidak memerlukan izin kerja khusus (Permit)</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TABEL URUTAN PEKERJAAN (MONOCHROME & TAJAM)                    */}
        {/* ============================================================== */}
        <div className="mb-3">
          <table className="w-full border-collapse border border-black text-[7.5pt]">
            <thead>
              <tr className="bg-gray-100 text-black font-bold uppercase text-center border-b border-black">
                <th className="border border-black p-1.5 w-7 text-center">No</th>
                <th className="border border-black p-1.5 w-[23%] text-left">Urutan Pekerjaan</th>
                <th className="border border-black p-1.5 w-[18%] text-left">Potensi Bahaya</th>
                <th className="border border-black p-1.5 w-[18%] text-left">Konsekuensi Bahaya</th>
                <th className="border border-black p-1.5 w-[25%] text-left">Tindakan Kontrol / Pencegahan</th>
                <th className="border border-black p-1.5 w-12 text-center">Risiko</th>
                <th className="border border-black p-1.5 w-16 text-center">Pelaksana</th>
              </tr>
            </thead>
            <tbody>
              {steps && steps.length > 0 ? (
                steps.map((step, index) => (
                  <tr key={index}>
                    <td className="border border-black p-1.5 text-center font-bold align-top">{index + 1}</td>
                    <td className="border border-black p-1.5 align-top font-medium leading-relaxed text-black">{step.workStep || '—'}</td>
                    <td className="border border-black p-1.5 align-top leading-relaxed text-gray-900">{step.hazard || '—'}</td>
                    <td className="border border-black p-1.5 align-top leading-relaxed text-gray-900">{step.consequence || '—'}</td>
                    <td className="border border-black p-1.5 align-top leading-relaxed text-gray-900">{step.control || '—'}</td>
                    <td className="border border-black p-1.5 text-center align-top font-bold">
                      <span className="inline-block border border-black px-1.5 py-0.5 text-[7.5pt] font-bold">
                        {(step.residualRisk || 'L').toUpperCase()}
                      </span>
                    </td>
                    <td className="border border-black p-1.5 text-center align-top font-medium text-black">{step.pic || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border border-black p-4 text-center italic text-gray-500">
                    Tidak ada rincian urutan langkah pekerjaan yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SIGNATURES / LEMBAR PENGESAHAN (FORMAL & MONOCHROME)           */}
      {/* ============================================================== */}
      <div className="mt-auto pt-2">
        <div className="border border-black mb-2">
          <div className="bg-gray-100 border-b border-black px-2.5 py-1 text-center">
            <p className="text-[7pt] text-gray-800 italic">
              &quot;Saya telah membaca, mengerti, dan setuju untuk mematuhi seluruh langkah kerja serta tindakan pengendalian risiko yang tertera dalam dokumen JSA ini.&quot;
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-black">
            {/* Box Kiri: Pelaksana Pekerjaan */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="text-center font-bold text-[7.5pt] text-black uppercase pb-1 border-b border-gray-300 mb-1.5">
                Pelaksana / Pembuat JSA
              </div>
              <div className="h-14 flex items-center justify-center my-1">
                {resolvedExecutorSignature ? (
                  <img
                    src={resolvedExecutorSignature}
                    alt="TTD Pelaksana"
                    className="max-h-14 max-w-[140px] object-contain grayscale"
                  />
                ) : (
                  <div className="w-36 border-b border-dotted border-black h-10 flex items-end justify-center pb-1 text-[7pt] text-gray-400 italic">
                    ( Tanda Tangan )
                  </div>
                )}
              </div>
              <div className="text-center pt-1 border-t border-gray-300">
                <p className="font-bold text-[8pt] text-black uppercase">{creatorName}</p>
                <p className="text-[6.5pt] text-gray-600">Tanggal: {executorFormattedDate}</p>
              </div>
            </div>

            {/* Box Kanan: Verifikasi Departemen HSE */}
            <div className="p-2.5 flex flex-col justify-between">
              <div className="text-center font-bold text-[7.5pt] text-black uppercase pb-1 border-b border-gray-300 mb-1.5">
                Verifikasi Departemen HSE / Pengawas
              </div>
              <div className="h-14 flex items-center justify-center my-1">
                <div className="border border-black bg-gray-50 px-3 py-1 text-center">
                  <div className="text-[7pt] font-bold text-black font-mono tracking-wider">[ TERVERIFIKASI SISTEM ]</div>
                  <div className="text-[6pt] text-gray-600 uppercase font-semibold">Pengawas / HSE Site</div>
                </div>
              </div>
              <div className="text-center pt-1 border-t border-gray-300">
                <p className="font-bold text-[8pt] text-black uppercase">
                  {signatures.verifierName || 'HSE Officer / Pengawas Site'}
                </p>
                <p className="text-[6.5pt] text-gray-600">Tanggal: {verifierFormattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Dokumen */}
        <div className="flex justify-between items-center text-gray-600 text-[6.5pt] pt-1 border-t border-gray-300">
          <div>PT. Chitra Paratama — Health, Safety & Environment Management System</div>
          <div>Dokumen ini sah dan mengikat selama pekerjaan berlangsung</div>
          <div className="font-mono font-bold text-black">F.HSE.SFT-014.01|1</div>
        </div>
      </div>
    </div>
  )
}
