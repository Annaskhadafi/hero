import React from 'react';
import { notFound } from 'next/navigation';
import { fetchMaritalStatusRequestById } from '@/lib/marital-status-data';
import { formatMaritalStatus } from '@/lib/marital-status-constants';
import { PrintAction } from '@/app/print/jsa/[id]/print-action';
import { getS3ObjectReadUrl } from '@/lib/s3-storage';
import { MaritalStatusPrintListener } from './print-listener';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrintMaritalStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ embed?: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isEmbed = resolvedSearchParams?.embed === '1' || resolvedSearchParams?.embed === 'true';
  
  const reqId = parseInt(id, 10);
  let data: Awaited<ReturnType<typeof fetchMaritalStatusRequestById>> = null;

  if (!isNaN(reqId) && reqId > 0) {
    try {
      data = await fetchMaritalStatusRequestById(reqId);
    } catch (err) {
      console.error('[PrintMaritalStatusPage] Error fetching marital status request:', err);
    }
  }

  if (!data) {
    return (
      <div className="bg-white min-h-[300px] p-8 text-center text-slate-500 font-sans flex flex-col items-center justify-center border border-slate-200 rounded-xl m-4">
        <p className="font-bold text-slate-700 text-sm">Dokumen Status Pernikahan Tidak Ditemukan</p>
        <p className="text-xs text-slate-400 mt-1">Pengajuan dengan ID #{id || '—'} tidak ditemukan atau belum tersedia.</p>
      </div>
    );
  }

  // Convert submitter signature URL if stored on S3
  const submitterSignatureUrl = data.signatureUrl
    ? await getS3ObjectReadUrl(data.signatureUrl)
    : null;

  const approvalHistory = await Promise.all(
    (data.approvalHistory ?? []).map(async (step) => ({
      ...step,
      signatureUrl: step.signatureUrl ? await getS3ObjectReadUrl(step.signatureUrl) : null,
    }))
  );

  const level1Approval = approvalHistory.find((h) => h.level === 1);
  const level2Approval = approvalHistory.find((h) => h.level === 2);

  const reqDateFormatted = data.requestDate
    ? new Date(data.requestDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  const level2DateFormatted =
    level2Approval?.status === 'approved' && level2Approval?.reviewedAt
      ? new Date(level2Approval.reviewedAt).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  return (
    <div
      className={
        isEmbed
          ? 'bg-white w-[210mm] h-[297mm] p-0 m-0 overflow-hidden flex justify-center'
          : 'bg-gray-100 min-h-screen py-4 print:py-0 print:bg-white flex justify-center overflow-x-auto'
      }
    >
      {!isEmbed && <PrintAction />}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
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
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            padding: 12mm 14mm 12mm 14mm !important;
          }
        }
      `,
        }}
      />

      <div
        className="pdf-wrapper relative bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] text-[9.5pt] font-sans mx-auto flex flex-col justify-start box-border overflow-hidden p-8"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header Logo & Date */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-10 w-auto" />
          </div>
          <div className="text-right text-[9pt] font-semibold text-black">
            Tanggal : <span className="underline">{reqDateFormatted}</span>
          </div>
        </div>

        {/* Form Title Banner */}
        <div className="bg-black text-white text-center py-1.5 px-3 font-bold text-[10.5pt] tracking-wide uppercase mb-4">
          PERMOHONAN PERUBAHAN STATUS PERNIKAHAN DI LOKASI
        </div>

        {/* Employee Details Section */}
        <div className="space-y-1.5 mb-4 text-[9.5pt] text-black">
          <div className="text-black italic mb-1">Yang bertanda tangan di bawah ini</div>
          
          <div className="grid grid-cols-[140px_1fr_120px_1fr] gap-x-2 items-center">
            <span className="font-medium">Nama</span>
            <span className="border-b border-black font-semibold">: {data.employeeName}</span>
            <span className="font-semibold text-right">S.N :</span>
            <span className="border-b border-black font-semibold text-center">{data.employeeSn}</span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-x-2 items-center">
            <span className="font-medium">Jabatan</span>
            <span className="border-b border-black">: {data.employeeJobTitle || '-'}</span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-x-2 items-center">
            <span className="font-medium">Dept./Section</span>
            <span className="border-b border-black">: {data.departmentName || 'Central Services'} / {data.sectionName || 'Service Operation'}</span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-x-2 items-center">
            <span className="font-medium">Lokasi Bekerja</span>
            <span className="border-b border-black">: {data.siteName || '-'}</span>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-x-2 items-center">
            <span className="font-medium">Status Pernikahan</span>
            <span className="border-b border-black font-semibold">: {formatMaritalStatus(data.currentMaritalStatus)}</span>
          </div>
        </div>

        {/* Request & Reason Section */}
        <div className="space-y-2 mb-6 text-[9.5pt] text-black">
          <div className="grid grid-cols-[380px_1fr] gap-x-2 items-center">
            <span>Dengan Ini Mengajukan Permohonan Pergantian Status Pernikahan Menjadi</span>
            <span className="border-b-2 border-black font-bold text-center text-[10pt] uppercase">: {data.targetMaritalStatus}</span>
          </div>

          <div className="mt-2">
            <div>Alasan Saya Mengajukan Perubahan Status Ini :</div>
            <div className="mt-1 border-b border-black py-1 font-medium italic min-h-[24px]">
              {data.reason || '-'}
            </div>
            <div className="border-b border-black h-6"></div>
            <div className="border-b border-black h-6"></div>
          </div>
        </div>

        {/* Top Signatures Block (Mengetahui & Diajukan Oleh) */}
        <div className="grid grid-cols-2 gap-8 text-center mb-6 text-black">
          {/* Mengetahui (PJO / HSE / Leader) */}
          <div className="flex flex-col items-center justify-between h-[120px]">
            <div className="font-semibold text-black">Mengetahui,</div>
            <div className="h-[60px] flex items-center justify-center">
              {level1Approval?.status === 'approved' && level1Approval?.signatureUrl ? (
                <img src={level1Approval.signatureUrl} alt="Signature PJO/HSE/Leader" className="max-h-[55px] object-contain" />
              ) : (
                <div className="text-black text-[8pt] italic">(Belum TTD)</div>
              )}
            </div>
            <div className="border-t border-black w-48 font-bold pt-0.5 text-[9pt]">
              {level1Approval?.approverName || 'PJO / HSE / Leader'}
            </div>
          </div>

          {/* Diajukan Oleh (Karyawan) */}
          <div className="flex flex-col items-center justify-between h-[120px]">
            <div className="font-semibold text-black">Diajukan Oleh,</div>
            <div className="h-[60px] flex items-center justify-center">
              {submitterSignatureUrl ? (
                <img src={submitterSignatureUrl} alt="Signature Karyawan" className="max-h-[55px] object-contain" />
              ) : (
                <div className="text-black text-[8pt] italic">(Tanda Tangan)</div>
              )}
            </div>
            <div className="border-t border-black w-48 font-bold pt-0.5 text-[9pt]">
              {data.employeeName}
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t-2 border-dashed border-black my-4 text-center relative">
          <span className="bg-white px-3 font-bold text-[8.5pt] tracking-widest text-black absolute -top-3 left-1/2 -translate-x-1/2">
            DIISI OLEH ATASAN LANGSUNG
          </span>
        </div>

        {/* Direct Manager Approval Section */}
        <div className="space-y-3 mt-4 text-[9.5pt] text-black">
          <div className="grid grid-cols-[1fr_220px] gap-6 items-start">
            {/* Left Column: Catatan & Checkbox Options */}
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Catatan :</span>
                <div id="preview-catatan-atasan" className="mt-1 border-b border-black py-1 font-medium italic text-black min-h-[22px]">
                  {level2Approval?.decisionNote || '-'}
                </div>
                <div className="border-b border-black h-5"></div>
              </div>

              <div>
                <span className="font-semibold block mb-1">Menyetujui / Tidak Menyetujui Permohonan Ini :</span>
                <div className="flex items-center gap-6 mt-1.5 text-[9.5pt] font-semibold">
                  <div className="flex items-center gap-2">
                    <span id="box-menyetujui" className="inline-flex items-center justify-center w-4 h-4 border border-black text-[10pt] leading-none font-bold bg-white">
                      {level2Approval?.status === 'approved' || data.status === 'approved' ? '✓' : ''}
                    </span>
                    <span>MENYETUJUI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span id="box-tidak-menyetujui" className="inline-flex items-center justify-center w-4 h-4 border border-black text-[10pt] leading-none font-bold bg-white">
                      {level2Approval?.status === 'rejected' || level2Approval?.status === 'reverted' || data.status === 'rejected' ? '✓' : ''}
                    </span>
                    <span>TIDAK MENYETUJUI</span>
                  </div>
                </div>
                <div
                  id="status-proses-text"
                  className={`text-[8.5pt] text-black italic mt-1 font-medium ${(level2Approval?.status || data.status !== 'pending_approval') ? 'hidden' : ''}`}
                >
                  (Dalam Proses Persetujuan)
                </div>
              </div>
            </div>

            {/* Right Column: Stacked Signature Box for Atasan Langsung */}
            <div className="flex flex-col items-center justify-between text-center min-h-[145px] border border-black rounded p-2.5 bg-white">
              <div id="preview-atasan-date" className="text-[8.5pt] font-semibold text-black min-h-[18px]">
                {level2DateFormatted}
              </div>
              <div className="font-semibold text-black text-[9pt] mt-1">
                Atasan Langsung,
              </div>
              <div id="atasan-sig-container" className="h-[50px] flex items-center justify-center my-1">
                {level2Approval?.status === 'approved' && level2Approval?.signatureUrl ? (
                  <img id="preview-atasan-sig" src={level2Approval.signatureUrl} alt="Signature Atasan" className="max-h-[48px] object-contain" />
                ) : (
                  <div id="preview-atasan-sig-placeholder" className="text-black text-[8pt] italic">(Belum TTD)</div>
                )}
              </div>
              <div className="border-t border-black w-full font-bold pt-0.5 text-[9pt]">
                {level2Approval?.approverName || '_______________________'}
              </div>
              <div className="text-[8pt] text-black">
                {level2Approval?.approverJobTitle || 'Section Head / Manager'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Document Note */}
        <div className="mt-auto pt-6 flex justify-between items-center text-black text-[7pt]">
          <span>Dokumen dicetak otomatis via HERO System</span>
          <span className="font-mono font-semibold">F.CS.MS-01.00|1</span>
        </div>
      </div>

      <MaritalStatusPrintListener
        hasExistingSignature={Boolean(level2Approval?.status === 'approved' && level2Approval?.signatureUrl)}
      />
    </div>
  );
}
