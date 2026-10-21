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
    verifierUrl?: string
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
  orientation?: 'portrait' | 'landscape'
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

export function JsaDocumentSheet({ data, orientation = 'portrait', className = '' }: JsaDocumentSheetProps) {
  const isLandscape = orientation === 'landscape'
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
    verifierUrl?: string
  }>

  const creatorName =
    signatures.creatorName ||
    data.teamMembers?.split(',')[0]?.trim() ||
    'Pelaksana Pekerjaan'

  const resolvedExecutorSignature = signatures.executorUrl
    ? resolveUploadUrl(signatures.executorUrl)
    : null

  const resolvedVerifierSignature = signatures.verifierUrl
    ? resolveUploadUrl(signatures.verifierUrl)
    : null

  const formattedDate = formatDateIndo(data.createdAt)
  const executorFormattedDate = signatures.executorDate ? formatDateIndo(signatures.executorDate) : formattedDate
  const verifierFormattedDate = signatures.verifierDate ? formatDateIndo(signatures.verifierDate) : formattedDate
  const riskLabel = getRiskLevelLabel(data.riskLevel)

  return (
    <div
      className={`pdf-wrapper bg-white shadow-xl print:shadow-none ${
        isLandscape
          ? 'w-[297mm] max-w-[297mm] min-h-[210mm] print:min-h-0 print:h-full p-6 print:p-0 text-[7.5pt]'
          : 'w-[210mm] max-w-[210mm] min-h-[297mm] print:min-h-0 print:h-full p-8 print:p-0 text-[8pt]'
      } font-sans mx-auto text-black box-border flex flex-col justify-between ${className}`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="flex-1 flex flex-col">
        {/* ============================================================== */}
        {/* KOP SURAT RESMI (LOGO CHITRA KIRI, JUDUL TENGAH, KODE KANAN)   */}
        {/* ============================================================== */}
        <div className={`flex items-center justify-between ${isLandscape ? 'pb-1.5 mb-1.5' : 'pb-2 mb-2'} border-b-2 border-black`}>
          {/* Logo Chitra di Kiri */}
          <div className="w-36 text-left shrink-0">
            <Image
              src="/cp_logo-removebg-preview.png"
              alt="Logo PT Chitra Paratama"
              width={140}
              height={42}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          {/* Judul & Subtitle di Tengah */}
          <div className="flex-1 text-center px-2">
            <h1 className="font-extrabold text-[11pt] uppercase tracking-wider text-black leading-tight">
              PT. CHITRA PARATAMA
            </h1>
            <h2 className="font-bold text-[12.5pt] uppercase tracking-wider text-black leading-tight mt-0.5">
              JOB SAFETY ANALYSIS (JSA)
            </h2>
            <p className="font-semibold text-[7pt] text-gray-700 tracking-wider uppercase mt-0.5">
              HEALTH, SAFETY & ENVIRONMENT DEPARTMENT
            </p>
          </div>

          {/* Kode Formulir di Kanan */}
          <div className="w-36 text-right shrink-0 flex justify-end">
            <div className="border border-black px-2 py-0.5 text-right bg-gray-50 rounded-sm">
              <div className="text-[6pt] uppercase font-bold text-gray-600">No. Formulir</div>
              <div className="font-mono font-bold text-[7.5pt] text-black">F.HSE.SFT-014.01|1</div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* INFORMASI DOKUMEN & DETAIL PEKERJAAN                           */}
        {/* ============================================================== */}
        <div className={`grid grid-cols-2 gap-2 ${isLandscape ? 'mb-1.5 text-[7pt]' : 'mb-2 text-[7.5pt]'}`}>
          {/* Kolom Kiri: Informasi Dokumen */}
          <table className="w-full border-collapse border border-black text-[7.5pt]">
            <tbody>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-black px-2 py-0.5 font-bold text-black uppercase text-[7pt] tracking-wider">
                  Informasi Dokumen
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50 w-32">
                  Dibuat Oleh
                </td>
                <td className="border border-black px-2 py-0.5 font-medium text-black">
                  {creatorName}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50">
                  Tanggal Pembuatan
                </td>
                <td className="border border-black px-2 py-0.5 font-medium text-black">
                  {formattedDate}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50">
                  Nomor JSA
                </td>
                <td className="border border-black px-2 py-0.5 font-bold text-black font-mono text-[8pt]">
                  {data.jsaNumber || '—'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kolom Kanan: Detail Pekerjaan */}
          <table className="w-full border-collapse border border-black text-[7.5pt]">
            <tbody>
              <tr className="bg-gray-100">
                <td colSpan={2} className="border border-black px-2 py-0.5 font-bold text-black uppercase text-[7pt] tracking-wider">
                  Detail Pekerjaan
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50 w-32">
                  Penjelasan Pekerjaan
                </td>
                <td className="border border-black px-2 py-0.5 font-medium text-black">
                  {data.jobDescription || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50">
                  No. Peralatan / Unit
                </td>
                <td className="border border-black px-2 py-0.5 font-medium text-black">
                  {data.equipmentNumber || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold text-gray-800 bg-gray-50">
                  Anggota Team JSA
                </td>
                <td className="border border-black px-2 py-0.5 font-medium text-black">
                  {data.teamMembers || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* PERSYARATAN KESELAMATAN (HANYA ITEM DICENTANG, FORMAL & BERSIH)*/}
        {/* ============================================================== */}
        <div className={`border border-black ${isLandscape ? 'mb-1.5 text-[7pt]' : 'mb-2 text-[7.5pt]'}`}>
          <div className="bg-gray-100 border-b border-black px-2 py-0.5 flex items-center justify-between">
            <span className="font-bold text-black uppercase text-[7pt] tracking-wide">
              Persyaratan Keselamatan & Pengendalian Risiko
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-[7pt] text-black">
              <span>Tingkat Risiko:</span>
              <span className="border border-black bg-white px-1.5 py-0.2 font-bold uppercase">
                {riskLabel}
              </span>
            </div>
          </div>

          {isLandscape ? (
            /* 4 Kolom Khusus Landscape: Rapi, Padat, Tidak Membuang Ruang Vertikal */
            <div className="grid grid-cols-4 divide-x divide-black text-[7pt]">
              {/* Kolom 1: Peralatan */}
              <div className="p-1.5 space-y-1">
                <div className="font-bold text-black text-[6.5pt] uppercase">
                  Peralatan yang Digunakan:
                </div>
                {equipmentUsed.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-0.5">
                    {equipmentUsed.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[6.5pt]">— Tidak ada peralatan khusus</p>
                )}
              </div>

              {/* Kolom 2: Keperluan Khusus */}
              <div className="p-1.5 space-y-1">
                <div className="font-bold text-black text-[6.5pt] uppercase">
                  Keperluan Khusus:
                </div>
                {requirements.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-0.5">
                    {requirements.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[6.5pt]">— Standar Umum</p>
                )}
              </div>

              {/* Kolom 3: APD / PPE */}
              <div className="p-1.5 space-y-1">
                <div className="font-bold text-black text-[6.5pt] uppercase">
                  Alat Pelindung Diri (APD) Wajib:
                </div>
                {ppeRequirements.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-0.5">
                    {ppeRequirements.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[6.5pt]">— APD Standar Umum</p>
                )}
              </div>

              {/* Kolom 4: Surat Izin Kerja (Permit) */}
              <div className="p-1.5 space-y-1">
                <div className="font-bold text-black text-[6.5pt] uppercase">
                  Surat Izin Kerja (Permit):
                </div>
                {permits.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5 text-black pl-0.5">
                    {permits.map((item, idx) => (
                      <li key={idx} className="font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-[6.5pt]">— Tidak ada permit khusus</p>
                )}
              </div>
            </div>
          ) : (
            /* 2 Kolom Standar Portrait */
            <div className="grid grid-cols-2 divide-x divide-black">
              {/* Bagian Kiri: Peralatan & Keperluan */}
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="font-bold text-black text-[7pt] uppercase mb-0.5">
                    Peralatan yang Digunakan:
                  </div>
                  {equipmentUsed.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7pt]">
                      {equipmentUsed.map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-[7pt]">— Tidak ada peralatan khusus yang dicentang</p>
                  )}
                </div>

                <div className="pt-1.5 border-t border-gray-300">
                  <div className="font-bold text-black text-[7pt] uppercase mb-0.5">
                    Keperluan Khusus:
                  </div>
                  {requirements.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7pt]">
                      {requirements.map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-[7pt]">— Standar / Tidak ada keperluan khusus</p>
                  )}
                </div>
              </div>

              {/* Bagian Kanan: APD/PPE & Permit */}
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="font-bold text-black text-[7pt] uppercase mb-0.5">
                    Alat Pelindung Diri (APD / PPE) Wajib:
                  </div>
                  {ppeRequirements.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7pt]">
                      {ppeRequirements.map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-[7pt]">— APD Standar Umum</p>
                  )}
                </div>

                <div className="pt-1.5 border-t border-gray-300">
                  <div className="font-bold text-black text-[7pt] uppercase mb-0.5">
                    Surat Izin Kerja (Work Permit):
                  </div>
                  {permits.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-black pl-1 text-[7pt]">
                      {permits.map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic text-[7pt]">— Tidak memerlukan izin kerja khusus (Permit)</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TABEL URUTAN PEKERJAAN (MONOCHROME & TAJAM)                    */}
        {/* ============================================================== */}
        <div className={isLandscape ? 'mb-1.5' : 'mb-2'}>
          <table className="w-full border-collapse border border-black text-[7pt]">
            <thead>
              <tr className="bg-gray-100 text-black font-bold uppercase text-center border-b border-black">
                <th className="border border-black p-1 w-6 text-center">No</th>
                <th className={`border border-black p-1 text-left ${isLandscape ? 'w-[22%]' : 'w-[23%]'}`}>Urutan Pekerjaan</th>
                <th className={`border border-black p-1 text-left ${isLandscape ? 'w-[19%]' : 'w-[18%]'}`}>Potensi Bahaya</th>
                <th className={`border border-black p-1 text-left ${isLandscape ? 'w-[19%]' : 'w-[18%]'}`}>Konsekuensi Bahaya</th>
                <th className={`border border-black p-1 text-left ${isLandscape ? 'w-[25%]' : 'w-[25%]'}`}>Tindakan Kontrol / Pencegahan</th>
                <th className={`border border-black p-1 text-center ${isLandscape ? 'w-12' : 'w-11'}`}>Risiko</th>
                <th className={`border border-black p-1 text-center ${isLandscape ? 'w-20' : 'w-14'}`}>Pelaksana</th>
              </tr>
            </thead>
            <tbody>
              {steps && steps.length > 0 ? (
                steps.map((step, index) => (
                  <tr key={index}>
                    <td className="border border-black p-1 text-center font-bold align-top">{index + 1}</td>
                    <td className="border border-black p-1 align-top font-medium leading-snug text-black">{step.workStep || '—'}</td>
                    <td className="border border-black p-1 align-top leading-snug text-gray-900">{step.hazard || '—'}</td>
                    <td className="border border-black p-1 align-top leading-snug text-gray-900">{step.consequence || '—'}</td>
                    <td className="border border-black p-1 align-top leading-snug text-gray-900">{step.control || '—'}</td>
                    <td className="border border-black p-1 text-center align-top font-bold">
                      <span className="inline-block border border-black px-1 py-0.2 text-[6.5pt] font-bold">
                        {(step.residualRisk || 'L').toUpperCase()}
                      </span>
                    </td>
                    <td className="border border-black p-1 text-center align-top font-medium text-black">{step.pic || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="border border-black p-3 text-center italic text-gray-500">
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
      <div className="mt-auto pt-1">
        <div className="border border-black mb-1.5">
          <div className="bg-gray-100 border-b border-black px-2 py-0.5 text-center">
            <p className="text-[6.5pt] text-gray-800 italic">
              &quot;Saya telah membaca, mengerti, dan setuju untuk mematuhi seluruh langkah kerja serta tindakan pengendalian risiko yang tertera dalam dokumen JSA ini.&quot;
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-black">
            {/* Box Kiri: Pelaksana Pekerjaan */}
            <div className="p-2 flex flex-col justify-between">
              <div className="text-center font-bold text-[7pt] text-black uppercase pb-0.5 border-b border-gray-300 mb-1">
                Pelaksana / Pembuat JSA
              </div>
              <div className="h-11 flex items-center justify-center my-0.5">
                {resolvedExecutorSignature ? (
                  <img
                    src={resolvedExecutorSignature}
                    alt="TTD Pelaksana"
                    className="max-h-11 max-w-[130px] object-contain grayscale"
                  />
                ) : (
                  <div className="w-32 border-b border-dotted border-black h-8 flex items-end justify-center pb-0.5 text-[6.5pt] text-gray-400 italic">
                    ( Tanda Tangan )
                  </div>
                )}
              </div>
              <div className="text-center pt-0.5 border-t border-gray-300">
                <p className="font-bold text-[7.5pt] text-black uppercase">{creatorName}</p>
                <p className="text-[6pt] text-gray-600">Tanggal: {executorFormattedDate}</p>
              </div>
            </div>

            {/* Box Kanan: Verifikasi Departemen HSE */}
            <div className="p-2 flex flex-col justify-between">
              <div className="text-center font-bold text-[7pt] text-black uppercase pb-0.5 border-b border-gray-300 mb-1">
                Verifikasi Departemen HSE / Pengawas
              </div>
              <div className="h-11 flex items-center justify-center my-0.5">
                {resolvedVerifierSignature ? (
                  <img
                    src={resolvedVerifierSignature}
                    alt="TTD Verifikasi HSE"
                    className="max-h-11 max-w-[130px] object-contain grayscale"
                  />
                ) : (
                  <div className="w-32 border-b border-dotted border-black h-8 flex items-end justify-center pb-0.5 text-[6.5pt] text-gray-400 italic">
                    ( Tanda Tangan )
                  </div>
                )}
              </div>
              <div className="text-center pt-0.5 border-t border-gray-300">
                <p className="font-bold text-[7.5pt] text-black uppercase">
                  {signatures.verifierName || 'HSE Officer / Pengawas Site'}
                </p>
                <p className="text-[6pt] text-gray-600">Tanggal: {verifierFormattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Dokumen */}
        <div className="flex justify-between items-center text-gray-600 text-[6pt] pt-0.5 border-t border-gray-300">
          <div>PT. Chitra Paratama — Health, Safety & Environment Management System</div>
          <div>Dokumen ini sah dan mengikat selama pekerjaan berlangsung</div>
          <div className="font-mono font-bold text-black">F.HSE.SFT-014.01|1</div>
        </div>
      </div>
    </div>
  )
}
