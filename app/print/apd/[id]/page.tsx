import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchApdRequestById } from '@/lib/apd-data';
import { PrintAction } from '@/app/print/jsa/[id]/print-action';
import { getS3ObjectReadUrl } from '@/lib/s3-storage';
import { parseApprovalNoteEntries } from '@/lib/approval-notes';

export default async function PrintApdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchApdRequestById(parseInt(id, 10));
  if (!data) return notFound();

  // Convert S3 keys to presigned URLs for approver signatures
  const approvalHistory = await Promise.all(
    (data.approvalHistory ?? []).map(async (step) => ({
      ...step,
      signatureUrl: step.signatureUrl ? await getS3ObjectReadUrl(step.signatureUrl) : null,
    }))
  );

  const isApd = data.requestCategory === 'APD';
  const isMaterial = data.requestCategory === 'MATERIAL';
  const isTools = data.requestCategory === 'TOOLS';

  // Dynamic title based on category
  const formTitle = isApd
    ? 'FORM PERMINTAAN ALAT PELINDUNG DIRI (APD)'
    : isMaterial
      ? 'FORM PERMINTAAN MATERIAL'
      : 'FORM PERMINTAAN TOOLS'

  // Dynamic table headers based on category
  const tableHeaders = isApd
    ? ['Jenis Item', 'Permintaan', 'Qty', 'Keterangan']
    : isMaterial
      ? ['Nama Material', 'Spesifikasi', 'Qty', 'Keterangan']
      : ['Nama Tools', 'Merek/Type', 'Qty', 'Keterangan']

  // Dynamic notes based on category
  const notes = isApd
    ? [
        'Bagi Karyawan yang akan menukar APD diwajibkan membawa bukti fisik APD yang rusak.',
        'Kehilangan APD yang disebabkan oleh kelalaian pekerja, menjadi tanggung jawab sepenuhnya karyawan yang bersangkutan.',
      ]
    : isMaterial
      ? [
          'Pengajuan material harus sesuai dengan kebutuhan proyek.',
          'Material yang sudah dikeluarkan tidak dapat dikembalikan tanpa persetujuan atasan.',
        ]
      : [
          'Pengajuan tools harus sesuai dengan kebutuhan pekerjaan.',
          'Tools yang sudah dikeluarkan menjadi tanggung jawab karyawan yang bersangkutan.',
        ]

  // Parse step labels from routeSnapshot of the first approval
  const routeSnapshot = approvalHistory?.[0]?.routeSnapshot ? (() => {
    try { return JSON.parse(approvalHistory[0].routeSnapshot) as { steps?: Array<{ stepOrder: number; label: string }> } } catch { return null }
  })() : null;
  const stepLabelByOrder = new Map<number, string>()
  if (routeSnapshot?.steps) {
    for (const s of routeSnapshot.steps) stepLabelByOrder.set(s.stepOrder, s.label)
  }

  // Default labels based on category
  function getStepLabel(level: number) {
    return stepLabelByOrder.get(level) ?? (isApd ? 'Approver' : level === 1 ? 'PJO / Atasan Site' : 'Section Head')
  }

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white flex justify-center overflow-x-auto">
      <PrintAction />
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-wrapper {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table, tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}} />

      <div 
        className="pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] px-6 pt-8 pb-4 text-[9pt] font-sans mx-auto flex flex-col print:px-[10mm] print:pt-[12mm] print:pb-[8mm] print:min-h-0 print:h-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header / Logo */}
        <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
          <div className="w-1/4">
            <Image src="/cp_logo-removebg-preview.png" alt="Logo" width={180} height={60} className="object-contain" />
          </div>
          <div className="w-3/4 text-center pr-12">
            <h1 className="text-lg font-bold tracking-wider">{formTitle}</h1>
            <p className="text-sm font-semibold">PT. CHITRA PARATAMA</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mb-2">
          <div className="flex items-start">
            <span className="w-32 font-semibold">No. Tiket</span>
            <span>: {data.requestNumber}</span>
          </div>
          <div className="flex items-start">
            <span className="w-32 font-semibold">Tanggal</span>
            <span>: {data.requestDate ? new Date(data.requestDate).toLocaleDateString("id-ID") : ''}</span>
          </div>
          <div className="flex items-start">
            <span className="w-32 font-semibold">Nama Karyawan</span>
            <span>: {data.employeeName}</span>
          </div>
          <div className="flex items-start">
            <span className="w-32 font-semibold">NIK / SN</span>
            <span>: {data.employeeSn}</span>
          </div>
          <div className="flex items-start">
            <span className="w-32 font-semibold">Departemen</span>
            <span>: {data.departmentName || '-'}</span>
          </div>
          <div className="flex items-start">
            <span className="w-32 font-semibold">Lokasi Site</span>
            <span>: {data.siteName || '-'}</span>
          </div>
          <div className="flex items-start col-span-2 mt-2">
            <span className="w-32 font-semibold">Alasan Pemintaan</span>
            <span className="flex-1">: {data.notes || '-'}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-black mb-2">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 w-10 text-center">No</th>
              {tableHeaders.map((header, i) => (
                <th key={i} className="border border-black p-2 text-left">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.length > 0 ? (
              data.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2 font-semibold">{item.itemType}</td>
                  <td className="border border-black p-2 capitalize">{item.requestType}</td>
                  <td className="border border-black p-2 text-center font-bold">{item.quantity}</td>
                  <td className="border border-black p-2">{item.notes || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-black p-4 text-center italic">Belum ada item permintaan.</td>
              </tr>
            )}
            
            {/* Empty fill rows if needed */}
            {Array.from({ length: Math.max(0, 10 - data.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
                <td className="border border-black p-4"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        <div className="mt-2 mb-auto">
          <p className="text-[8pt] italic mb-1 font-semibold">Catatan:</p>
          <ul className="list-disc pl-5 text-[8pt] italic">
            {notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>

        {/* Signatures - Dynamic based on approval history */}
        {(() => {
          const approverCount = approvalHistory.length
          const totalCols = 1 + approverCount // Pemohon + approvers
          const colWidth = `${100 / totalCols}%`
          const notesMap = new Map<number, ReturnType<typeof parseApprovalNoteEntries>>()
          for (const step of approvalHistory) {
            notesMap.set(step.id, step.decisionNote ? parseApprovalNoteEntries(step.decisionNote, step.approverName || 'System') : [])
          }
          return (
            <div className="break-inside-avoid">
              <table className="w-full border-collapse border border-black text-center mt-0">
                <thead>
                  <tr>
                    <th className="border border-black p-1 text-[8pt]" style={{ width: colWidth }}>Pemohon</th>
                    {approvalHistory.map((step, i) => (
                      <th key={step.id} className="border border-black p-1 text-[8pt]" style={{ width: colWidth }}>{getStepLabel(step.level)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* Pemohon cell */}
                    <td className="border border-black p-2 h-[140px] relative">
                      {data.signatureUrl && (
                        <div className="absolute inset-x-0 top-1 flex justify-center">
                          <img src={data.signatureUrl} alt="Signature" className="object-contain h-[55px] w-auto" />
                        </div>
                      )}
                      <div className="absolute bottom-1 inset-x-1 text-center">
                        <div className="font-bold underline text-[8pt]">{data.employeeName}</div>
                        <div className="text-[6pt] text-gray-600">Karyawan</div>
                        <div className="text-[6pt] text-gray-500">Waktu TTD: {data.requestDate ? new Date(data.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(data.requestDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                      </div>
                    </td>
                    {/* Dynamic approver cells */}
                    {approvalHistory.map((step, i) => {
                      const notes = notesMap.get(step.id) ?? []
                      const lastNote = notes[notes.length - 1]
                      const isResolved = step.status === 'approved' || step.status === 'proses_order'
                      return (
                        <td key={step.id} className="border border-black p-2 h-[140px] relative" id={`approver-cell-${i + 1}`}>
                          {isResolved && (
                            step.signatureUrl ? (
                              <div className="absolute inset-x-0 top-1 flex justify-center">
                                <img src={step.signatureUrl} alt="Signature" className="object-contain h-[55px] w-auto" />
                              </div>
                            ) : (
                              <div className="absolute inset-x-0 top-4 flex justify-center">
                                <span className="text-green-600/20 text-xl font-bold -rotate-12 border-2 border-green-600/20 rounded p-1">APPROVED</span>
                              </div>
                            )
                          )}
                          <div className="absolute bottom-1 inset-x-1 text-center">
                            <div className="font-bold underline text-[8pt]">{step.approverName || "_______________________"}</div>
                            <div className="text-[6pt] text-gray-600">{getStepLabel(step.level)}</div>
                            {step.reviewedAt && (
                              <div className="text-[6pt] text-gray-500">Waktu TTD: {step.reviewedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, {step.reviewedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                            )}
                            {lastNote?.message && (
                              <div className="text-[6pt] text-gray-600 italic">Catatan: {lastNote.message}</div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })()}
        
        <div className="text-right text-gray-500 text-[8pt] mt-2">
          {isApd ? 'F.HSE.APD-01.00|1' : isMaterial ? 'F.HSE.MAT-01.00|1' : 'F.HSE.TLS-01.00|1'}
        </div>

      </div>
      <script dangerouslySetInnerHTML={{__html: `
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'previewSignature') {
            const dataUrl = event.data.dataUrl;
            // Find first approver cell without APPROVED stamp or signature image
            let targetCell = null;
            for (let i = 1; i <= 10; i++) {
              const cell = document.getElementById('approver-cell-' + i);
              if (cell && !cell.innerHTML.includes('APPROVED') && !cell.querySelector('img')) {
                targetCell = cell;
                break;
              }
            }
            
            if (targetCell) {
              const existingPreview = targetCell.querySelector('.live-preview-sig');
              if (existingPreview) {
                existingPreview.remove();
              }
              if (dataUrl) {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'absolute inset-0 flex items-center justify-center p-2 live-preview-sig';
                imgDiv.innerHTML = '<img src="' + dataUrl + '" alt="Live Preview" class="object-contain w-32 h-24" />';
                targetCell.appendChild(imgDiv);
              }
            }
          }
        });
      `}} />
    </div>
  );
}
