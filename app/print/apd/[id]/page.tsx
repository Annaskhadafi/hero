import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchApdRequestById } from '@/lib/apd-data';
import { PrintAction } from '@/app/print/jsa/[id]/print-action';
import { getS3ObjectReadUrl } from '@/lib/s3-storage';

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

  // Get approval history steps
  const firstApprover = approvalHistory?.[0]; // Usually Level 1 / Site Manager
  const secondApprover = approvalHistory?.[1]; // Usually Section Head if any

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
        className="pdf-wrapper bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] p-8 text-[10pt] font-sans mx-auto flex flex-col"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header / Logo */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
          <div className="w-1/4">
            <Image src="/cp_logo-removebg-preview.png" alt="Logo" width={180} height={60} className="object-contain" />
          </div>
          <div className="w-3/4 text-center pr-12">
            <h1 className="text-xl font-bold tracking-wider">FORM PERMINTAAN ALAT PELINDUNG DIRI (APD)</h1>
            <p className="text-sm font-semibold">PT. CHITRA PARATAMA</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
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
        <table className="w-full border-collapse border border-black mb-8">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 w-10 text-center">No</th>
              <th className="border border-black p-2 text-left">Jenis Item</th>
              <th className="border border-black p-2 text-left">Permintaan</th>
              <th className="border border-black p-2 w-16 text-center">Qty</th>
              <th className="border border-black p-2 text-left">Keterangan</th>
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
        <div className="mb-auto">
          <p className="text-[9pt] italic mb-1 font-semibold">Catatan:</p>
          <ul className="list-disc pl-5 text-[9pt] italic mb-8">
            <li>Bagi Karyawan yang akan menukar APD diwajibkan membawa bukti fisik APD yang rusak.</li>
            <li>Kehilangan APD yang disebabkan oleh kelalaian pekerja, menjadi tanggung jawab sepenuhnya karyawan yang bersangkutan.</li>
          </ul>
        </div>

        {/* Signatures */}
        <table className="w-full border-collapse border border-black text-center mt-8">
          <thead>
            <tr>
              <th className="border border-black p-2 w-1/3">Pemohon</th>
              <th className="border border-black p-2 w-1/3">Disetujui Oleh</th>
              <th className="border border-black p-2 w-1/3">Diketahui Oleh (HSE)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 align-bottom h-32 relative">
                {data.signatureUrl && (
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <img src={data.signatureUrl} alt="Signature" className="object-contain w-32 h-24" />
                  </div>
                )}
                <div className="mt-20 font-bold underline relative z-10">{data.employeeName}</div>
                <div className="text-[8pt] text-gray-600 relative z-10">Karyawan</div>
              </td>
              <td className="border border-black p-2 align-bottom h-32 relative" id="approver-cell-1">
                {firstApprover && firstApprover.status === 'approved' && (
                  firstApprover.signatureUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <img src={firstApprover.signatureUrl} alt="Signature" className="object-contain w-32 h-24" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-green-600/30 text-5xl font-bold -rotate-12 border-4 border-green-600/30 rounded p-2">APPROVED</span>
                    </div>
                  )
                )}
                <div className="mt-20 font-bold underline relative z-10">{firstApprover ? firstApprover.approverName : "_______________________"}</div>
                <div className="text-[8pt] text-gray-600 relative z-10">PJO / Atasan Site</div>
              </td>
              <td className="border border-black p-2 align-bottom h-32 relative" id="approver-cell-2">
                {secondApprover && secondApprover.status === 'approved' && (
                  secondApprover.signatureUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <img src={secondApprover.signatureUrl} alt="Signature" className="object-contain w-32 h-24" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-green-600/30 text-5xl font-bold -rotate-12 border-4 border-green-600/30 rounded p-2">APPROVED</span>
                    </div>
                  )
                )}
                <div className="mt-20 font-bold underline relative z-10">{secondApprover ? secondApprover.approverName : "_______________________"}</div>
                <div className="text-[8pt] text-gray-600 relative z-10">Section Head</div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div className="text-right text-gray-500 text-[8pt] mt-4">
          F.HSE.APD-01.00|1
        </div>

      </div>
      <script dangerouslySetInnerHTML={{__html: `
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'previewSignature') {
            const dataUrl = event.data.dataUrl;
            // Target the correct cell based on the pending level. We'll just target cell 1 for now if it's empty, or cell 2.
            // Since we know the admin page only previews the CURRENT pending approval, we can just find the first cell without an APPROVED stamp.
            const cell1 = document.getElementById('approver-cell-1');
            const cell2 = document.getElementById('approver-cell-2');
            
            let targetCell = null;
            if (cell1 && !cell1.innerHTML.includes('APPROVED') && !cell1.innerHTML.includes('img')) {
              targetCell = cell1;
            } else if (cell2 && !cell2.innerHTML.includes('APPROVED') && !cell2.innerHTML.includes('img')) {
              targetCell = cell2;
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
