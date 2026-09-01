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

  // Convert S3 keys to presigned URLs for submitter & approver signatures
  const submitterSignatureUrl = data.signatureUrl
    ? await getS3ObjectReadUrl(data.signatureUrl)
    : null;

  const approvalHistory = await Promise.all(
    (data.approvalHistory ?? []).map(async (step) => ({
      ...step,
      signatureUrl: step.signatureUrl ? await getS3ObjectReadUrl(step.signatureUrl) : null,
    }))
  );

  function parsePhotoUrls(raw: string | null | undefined): string[] {
    if (!raw || !raw.trim()) return [];
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
        }
      } catch {}
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    return [trimmed];
  }

  // Convert item photo URLs (supporting multiple photos per item)
  const itemsWithPhotos = await Promise.all(
    data.items.map(async (item) => {
      const rawUrls = parsePhotoUrls(item.photoUrl);
      const photoUrls = (
        await Promise.all(rawUrls.map((u) => getS3ObjectReadUrl(u)))
      ).filter(Boolean) as string[];

      return {
        ...item,
        photoUrls,
        photoUrl: photoUrls[0] || null,
      };
    })
  );

  const isApd = data.requestCategory === 'APD';
  const isMaterial = data.requestCategory === 'MATERIAL';
  const isTools = data.requestCategory === 'TOOLS';

  // APD strictly uses only 1 approver (PJO / Atasan Site), removing obsolete HSE / Section Head column
  const effectiveApprovalHistory = isApd
    ? approvalHistory.filter((step) => step.level === 1)
    : approvalHistory;

  // Dynamic title based on category
  const formTitle = isApd
    ? 'FORM PERMINTAAN ALAT PELINDUNG DIRI (APD)'
    : isMaterial
      ? 'FORM PERMINTAAN MATERIAL'
      : 'FORM PERMINTAAN TOOLS';

  // Dynamic table headers based on category
  const tableHeaders = isApd
    ? ['Jenis Item', 'Permintaan', 'Qty', 'Foto Bukti (Pergantian)', 'Keterangan']
    : isMaterial
      ? ['Nama Material', 'Spesifikasi', 'Qty', 'Keterangan']
      : ['Nama Tools', 'Merek/Type', 'Qty', 'Keterangan'];

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
        ];

  // Parse step labels
  const routeSnapshot = effectiveApprovalHistory?.[0]?.routeSnapshot ? (() => {
    try { return JSON.parse(effectiveApprovalHistory[0].routeSnapshot) as { steps?: Array<{ stepOrder: number; label: string }> } } catch { return null }
  })() : null;
  const stepLabelByOrder = new Map<number, string>();
  if (routeSnapshot?.steps) {
    for (const s of routeSnapshot.steps) stepLabelByOrder.set(s.stepOrder, s.label);
  }

  function getStepLabel(level: number) {
    if (isApd) return 'Disetujui Oleh (PJO / HSE Site / Atasan Site)';
    return stepLabelByOrder.get(level) ?? (level === 1 ? 'Disetujui Oleh (PJO / HSE Site / Atasan Site)' : 'Disetujui Oleh (Section Head)');
  }

  return (
    <div className="bg-gray-100 min-h-screen py-4 print:py-0 print:bg-white flex justify-center overflow-x-auto">
      <PrintAction />
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            height: 100%;
            max-height: 100%;
            overflow: hidden;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-wrapper {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 284mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            padding: 0 !important;
          }
        }
      `}} />

      <div 
        className="pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] max-h-[297mm] min-h-[297mm] px-6 pt-5 pb-4 text-[8.5pt] font-sans mx-auto flex flex-col justify-between print:px-0 print:pt-1 print:pb-0 print:min-h-0 print:max-h-[284mm] print:h-[284mm]"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <div>
          {/* Header / Logo */}
          <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
            <div className="w-1/4">
              <Image src="/cp_logo-removebg-preview.png" alt="Logo" width={160} height={50} className="object-contain" />
            </div>
            <div className="w-3/4 text-center pr-10">
              <h1 className="text-base font-bold tracking-wider uppercase">{formTitle}</h1>
              <p className="text-xs font-semibold tracking-wide text-gray-800">PT. CHITRA PARATAMA</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-2.5 text-[8.5pt]">
            <div className="flex items-start">
              <span className="w-32 font-semibold">No. Tiket</span>
              <span>: {data.requestNumber}</span>
            </div>
            <div className="flex items-start">
              <span className="w-32 font-semibold">Tanggal</span>
              <span>: {data.requestDate ? new Date(data.requestDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'numeric', year: 'numeric' }) : ''}</span>
            </div>
            <div className="flex items-start">
              <span className="w-32 font-semibold">Nama Karyawan</span>
              <span className="font-medium">: {data.employeeName}</span>
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
            <div className="flex items-start col-span-2 mt-0.5">
              <span className="w-32 font-semibold">Alasan Permintaan</span>
              <span className="flex-1">: {data.notes || '-'}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse border border-black mb-2 text-[8pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black py-1.5 px-2 w-8 text-center">No</th>
                {tableHeaders.map((header, i) => (
                  <th key={i} className={`border border-black py-1.5 px-2 ${header === 'Qty' || header.includes('Foto') ? 'text-center' : 'text-left'}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemsWithPhotos.length > 0 ? (
                itemsWithPhotos.map((item, index) => {
                  const isPergantian = item.requestType.toLowerCase().includes('ganti') || item.requestType.toLowerCase().includes('pergantian');
                  return (
                    <tr key={index} className="h-8">
                      <td className="border border-black py-1 px-2 text-center font-medium">{index + 1}</td>
                      <td className="border border-black py-1 px-2 font-semibold">{item.itemType}</td>
                      <td className="border border-black py-1 px-2 capitalize">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-semibold ${isPergantian ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-blue-900'}`}>
                          {item.requestType}
                        </span>
                      </td>
                      <td className="border border-black py-1 px-2 text-center font-bold">{item.quantity}</td>
                      {isApd && (
                        <td className="border border-black py-1 px-1.5 text-center align-middle">
                          {item.photoUrls && item.photoUrls.length > 0 ? (
                            <div className="flex items-center justify-center gap-1 py-0.5">
                              {item.photoUrls.slice(0, 3).map((url, pIdx) => (
                                <img
                                  key={pIdx}
                                  src={url}
                                  alt={`Bukti ${item.itemType} ${pIdx + 1}`}
                                  className="h-7 w-7 object-cover rounded border border-gray-400 shadow-xs"
                                />
                              ))}
                              {item.photoUrls.length > 3 && (
                                <span className="text-[6pt] text-gray-500 font-bold">+{item.photoUrls.length - 3}</span>
                              )}
                            </div>
                          ) : isPergantian ? (
                            <span className="text-[7pt] text-gray-400 italic">(Tanpa Foto)</span>
                          ) : (
                            <span className="text-[7pt] text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="border border-black py-1 px-2 text-gray-700">{item.notes || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isApd ? 6 : 5} className="border border-black p-3 text-center italic">Belum ada item permintaan.</td>
                </tr>
              )}
              
              {/* Empty fill rows for layout balance */}
              {Array.from({ length: Math.max(0, Math.min(3, 4 - itemsWithPhotos.length)) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-6">
                  <td className="border border-black p-1 text-center text-gray-300">-</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  {isApd && <td className="border border-black p-1"></td>}
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Notes */}
          <div className="mt-1 mb-2">
            <p className="text-[7.5pt] italic mb-0.5 font-bold text-gray-800">Catatan:</p>
            <ul className="list-disc pl-4 text-[7pt] text-gray-700 space-y-0.5 italic leading-tight">
              {notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Signatures - 2 Columns for APD (Pemohon & PJO Site) */}
        <div>
          {(() => {
            const approverCount = effectiveApprovalHistory.length;
            const totalCols = 1 + approverCount; // Pemohon + PJO
            const colWidth = `${100 / totalCols}%`;
            const notesMap = new Map<number, ReturnType<typeof parseApprovalNoteEntries>>();
            for (const step of effectiveApprovalHistory) {
              notesMap.set(step.id, step.decisionNote ? parseApprovalNoteEntries(step.decisionNote, step.approverName || 'System') : []);
            }
            return (
              <div className="break-inside-avoid">
                <table className="w-full border-collapse border border-black text-center mt-1">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black py-1 px-2 text-[7.5pt] font-bold" style={{ width: colWidth }}>
                        Diajukan Oleh (Pemohon)
                      </th>
                      {effectiveApprovalHistory.map((step) => (
                        <th key={step.id} className="border border-black py-1 px-2 text-[7.5pt] font-bold" style={{ width: colWidth }}>
                          {getStepLabel(step.level)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Pemohon cell */}
                      <td className="border border-black p-1.5 h-[105px] relative align-bottom">
                        {submitterSignatureUrl && (
                          <div className="absolute inset-x-0 top-1.5 flex justify-center">
                            <img src={submitterSignatureUrl} alt="Signature" className="object-contain h-[45px] w-auto max-w-[85%]" />
                          </div>
                        )}
                        <div className="text-center pt-12">
                          <div className="font-bold underline text-[8pt] text-gray-900 leading-tight">{data.employeeName}</div>
                          <div className="text-[6.5pt] text-gray-600 font-medium">Karyawan</div>
                          <div className="text-[6pt] text-gray-500 font-mono mt-0.5">
                            {data.requestDate ? new Date(data.requestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(data.requestDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </div>
                        </div>
                      </td>

                      {/* Dynamic approver cell (PJO / Atasan Site) */}
                      {effectiveApprovalHistory.map((step, i) => {
                        const stepNotes = notesMap.get(step.id) ?? [];
                        const lastNote = stepNotes[stepNotes.length - 1];
                        const isResolved = step.status === 'approved' || step.status === 'proses_order';
                        return (
                          <td key={step.id} className="border border-black p-1.5 h-[105px] relative align-bottom" id={`approver-cell-${i + 1}`}>
                            {isResolved && (
                              step.signatureUrl ? (
                                <div className="absolute inset-x-0 top-1.5 flex justify-center">
                                  <img src={step.signatureUrl} alt="Signature" className="object-contain h-[45px] w-auto max-w-[85%]" />
                                </div>
                              ) : (
                                <div className="absolute inset-x-0 top-3 flex justify-center">
                                  <span className="text-emerald-700/30 text-base font-bold -rotate-12 border border-emerald-700/30 rounded px-2 py-0.5">APPROVED</span>
                                </div>
                              )
                            )}
                            <div className="text-center pt-12">
                              <div className="font-bold underline text-[8pt] text-gray-900 leading-tight">
                                {step.approverName || "_______________________"}
                              </div>
                              <div className="text-[6.5pt] text-gray-600 font-medium">{isApd ? 'PJO / HSE Site / Atasan Site' : getStepLabel(step.level)}</div>
                              {step.reviewedAt ? (
                                <div className="text-[6pt] text-gray-500 font-mono mt-0.5">
                                  {step.reviewedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, {step.reviewedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ) : (
                                <div className="text-[6pt] text-gray-400 italic mt-0.5">(Menunggu Persetujuan)</div>
                              )}
                              {lastNote?.message && (
                                <div className="text-[5.5pt] text-gray-600 italic truncate max-w-[180px] mx-auto">Catatan: {lastNote.message}</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
          
          <div className="flex justify-between items-center text-gray-500 text-[7pt] mt-1.5">
            <span>Dokumen dicetak otomatis via HERO System</span>
            <span className="font-mono font-semibold">{isApd ? 'F.HSE.APD-01.00|1' : isMaterial ? 'F.HSE.MAT-01.00|1' : 'F.HSE.TLS-01.00|1'}</span>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'previewSignature') {
            const dataUrl = event.data.dataUrl;
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
                imgDiv.innerHTML = '<img src="' + dataUrl + '" alt="Live Preview" class="object-contain w-28 h-16" />';
                targetCell.appendChild(imgDiv);
              }
            }
          }
        });
      `}} />
    </div>
  );
}
