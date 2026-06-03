import React from 'react'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getJsaById } from '@/app/dashboard/hse/jsa/actions'
import { PrintAction } from './print-action'

export default async function PrintJsaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getJsaById(id)
  if (!data) return notFound()

  const { steps = [] } = data
  const executorName = data.teamMembers?.split(',')[0]?.trim() || 'Operator'
  const equipmentUsed = Array.isArray(data.equipmentUsed) ? data.equipmentUsed : []
  const requirements = Array.isArray(data.requirements) ? data.requirements : []
  const permits = Array.isArray(data.permits) ? data.permits : []
  const ppeRequirements = Array.isArray(data.ppeRequirements) ? data.ppeRequirements : []
  const signatures = data.signatures as Partial<{
    executorUrl: string
    executorDate: string
    verifierName: string
    verifierDate: string
  }>
  const getCheckmark = (condition: boolean) => (condition ? '✓' : '')

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white flex justify-center overflow-x-auto">
      <PrintAction />
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      <div 
        className="pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] p-8 text-[10pt] font-sans mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header / Logo */}
        <div className="flex justify-between items-center mb-6">
          <div className="w-1/3">
            <Image src="/cp_logo-removebg-preview.png" alt="Logo" width={180} height={60} className="object-contain" />
          </div>
          <div className="w-2/3 text-center">
            <h1 className="text-2xl font-bold tracking-wider">JOB SAFETY ANALYSIS (JSA)</h1>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <table className="w-full border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black p-1 font-semibold w-1/3">Dibuat oleh</td>
                <td className="border border-black p-1">{executorName}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">Tanggal</td>
                <td className="border border-black p-1">{data.createdAt ? new Date(data.createdAt).toLocaleDateString() : ''}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">No. JSA</td>
                <td className="border border-black p-1">{data.jsaNumber}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse border border-black h-full">
            <tbody>
              <tr>
                <td className="border border-black p-1 font-semibold w-1/3">Penjelasan Pekerjaan</td>
                <td className="border border-black p-1" colSpan={2}>{data.jobDescription}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold">No. Peralatan (Bagian dari Plant)</td>
                <td className="border border-black p-1" colSpan={2}>{data.equipmentNumber}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-semibold bg-gray-100 text-center" colSpan={2}>Anggota Team JSA</td>
                <td className="border border-black p-1">{data.teamMembers}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Checkboxes Row */}
        <div className="flex flex-row justify-between gap-2 mb-6 text-[9pt]">
          {/* Box 1: Peralatan */}
          <div className="border border-black p-2 flex-1">
            <div className="text-center font-semibold border-b border-black pb-1 mb-2">Peralatan Yang dipergunakan</div>
            <table className="w-full">
              <tbody>
                {['Hand Tool Only', 'Dioperasikan dgn Batere/listrik', 'Power Tool', 'Oxy Set', 'Pengelasan', 'Pemotongan/Penggerindaan', 'Pisau/alat tajam', 'Gunting Pencabut', 'Forklift Truck man Cage', 'Scafolding', 'Tangga', 'Tangga Portable', 'Forklift', 'Crane', 'Genset Portable', 'Pompa Portable', 'Air Bertekanan', 'Lain-Lain'].map(item => (
                  <tr key={item}>
                    <td className="py-0.5">{item}</td>
                    <td className="border border-black w-6 text-center text-xs font-bold py-0.5">{getCheckmark(equipmentUsed.includes(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Box 2: Keperluan & Permit */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="border border-black p-2 flex-1">
              <div className="text-center font-semibold border-b border-black pb-1 mb-2">Keperluan</div>
              <table className="w-full">
                <tbody>
                  {['Jumlah Pekerja', 'Pemutusan Listrik', 'Pemutusan Instrument', 'Bypass trip/alarm sistem', 'Modifikasi'].map(item => (
                    <tr key={item}>
                      <td className="py-0.5">{item}</td>
                      <td className="border border-black w-6 text-center text-xs font-bold py-0.5">{getCheckmark(requirements.includes(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-black p-2 flex-1">
              <div className="text-center font-semibold border-b border-black pb-1 mb-2 bg-gray-200">Permit</div>
              <table className="w-full">
                <tbody>
                  {['Permit Hot Work', 'Permit Cold Work', 'Permit Confined Space', 'Permit Excavation', 'Permit electrical/machanical', 'Lain-lainnya'].map(item => (
                    <tr key={item}>
                      <td className="py-0.5">{item}</td>
                      <td className="border border-black w-6 text-center text-xs font-bold py-0.5">{getCheckmark(permits.includes(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 3: PPE & Resiko */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="border border-black p-2 flex-1">
              <div className="text-center font-semibold border-b border-black pb-1 mb-2">Keperluan PPE</div>
              <table className="w-full">
                <tbody>
                  {['Sarung Tangan', 'Goggle', 'Pelindung Muka', 'Proteksi Pendengaran', 'Masker', 'Safety Harness', 'PPE Pengelasan', 'Alat Bantu Pernafasan', 'Jas PVC', 'Sepatu Karet', 'Helm', 'Lainnya'].map(item => (
                    <tr key={item}>
                      <td className="py-0.5">{item}</td>
                      <td className="border border-black w-6 text-center text-xs font-bold py-0.5">{getCheckmark(ppeRequirements.includes(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-transparent p-2">
              <div className="text-center font-semibold pb-1 mb-2">Tingkat Resiko</div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-0.5">Resiko Tinggi</td>
                    <td className="font-bold w-6 text-right py-0.5">{data.riskLevel === 'H' ? '✓' : ''} H</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Resiko Menengah</td>
                    <td className="font-bold w-6 text-right py-0.5">{data.riskLevel === 'M' ? '✓' : ''} M</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Resiko Rendah</td>
                    <td className="font-bold w-6 text-right py-0.5">{data.riskLevel === 'L' ? '✓' : ''} L</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Steps Table */}
        <table className="w-full border-collapse border border-black text-[9pt] mb-8">
          <thead>
            <tr className="bg-gray-300 text-center">
              <th className="border border-black p-2 w-8">No</th>
              <th className="border border-black p-2">Urutan Pekerjaan</th>
              <th className="border border-black p-2">Bahaya</th>
              <th className="border border-black p-2">Konsekuensi dari Bahaya</th>
              <th className="border border-black p-2">Kontrol/Pencegahan</th>
              <th className="border border-black p-2 w-20">Tingkat Resiko Akhir</th>
              <th className="border border-black p-2 w-24">Pelaksana</th>
            </tr>
          </thead>
          <tbody>
            {steps.length > 0 ? (
              steps.map((step: any, index: number) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center align-top">{index + 1}</td>
                  <td className="border border-black p-2 align-top">{step.workStep}</td>
                  <td className="border border-black p-2 align-top">{step.hazard}</td>
                  <td className="border border-black p-2 align-top">{step.consequence}</td>
                  <td className="border border-black p-2 align-top">{step.control}</td>
                  <td className="border border-black p-2 text-center align-top font-bold">{step.residualRisk}</td>
                  <td className="border border-black p-2 text-center align-top">{step.pic}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="border border-black p-2 text-center italic text-gray-500">Tidak ada urutan pekerjaan</td>
              </tr>
            )}
            {/* Empty rows to fill space if needed */}
            {Array.from({ length: Math.max(0, 10 - steps.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="flex justify-between items-start gap-8">
          <div className="border border-black p-4 w-1/2">
            <p className="mb-4">Saya Telah membaca. Mengerti dan setuju dengan ketentuan dalam JSA ini</p>
            <div className="flex justify-between font-semibold mb-8">
              <span>Orang yang melaksanakan pekerjaan</span>
              <span>Tanggal</span>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <span className="w-4">1.</span>
              <div className="flex-1 flex flex-col items-center">
                {signatures.executorUrl ? (
                  <div className="h-16 w-32 relative">
                    <img src={signatures.executorUrl} alt="Signature" className="object-contain w-full h-full" />
                  </div>
                ) : (
                  <div className="h-16 border-b border-dotted border-black w-full" />
                )}
              </div>
              <span className="w-24 border-b border-dotted border-black h-8 leading-8 text-center">{signatures.executorDate ? new Date(signatures.executorDate).toLocaleDateString() : ''}</span>
            </div>
          </div>
          <div className="border border-black p-4 w-1/2 min-h-[160px]">
            <p className="font-semibold underline mb-8">Verifikasi ( Departement HSE )</p>
            <div className="mt-16">
              <p className="mb-1">Nama : {signatures.verifierName || '_________________________'}</p>
              <p>Tanggal : {signatures.verifierDate ? new Date(signatures.verifierDate).toLocaleDateString() : '_________________________'}</p>
            </div>
          </div>
        </div>

        {/* Footer Form Code */}
        <div className="text-right text-gray-500 text-[8pt] mt-8">
          F.HSE.SFT-014.01|1
        </div>

      </div>
    </div>
  )
}
