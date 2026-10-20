import React from 'react';
import { fetchMaritalStatusRequestById } from '@/lib/marital-status-data';
import { formatMaritalStatus } from '@/lib/marital-status-constants';
import { PrintAction } from '@/app/print/jsa/[id]/print-action';
import { getS3ObjectReadUrl } from '@/lib/s3-storage';
import { MaritalStatusPrintListener } from './print-listener';
import { getCurrentEmployee } from '@/lib/get-current-employee';
import { db } from '@/db';
import { employees, masterDepartments, masterSections, sites } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDisplayNote(note?: string | null): string {
  if (!note) return '-';
  const trimmed = note.trim();
  if (!trimmed) return '-';
  const lower = trimmed.toLowerCase().replace(/\.$/, '');
  if (
    lower === 'disetujui' ||
    lower === 'pengajuan disetujui' ||
    lower === 'approve' ||
    lower === 'approve all via inbox'
  ) {
    return '-';
  }
  return trimmed;
}

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

  if (id === 'draft') {
    let empName = 'Draft Karyawan';
    let empSn = '—';
    let empJobTitle = '—';
    let deptName = 'Central Services';
    let secName = 'Service Operation';
    let siteName = '—';
    let currentMaritalStatus = 'Single On Site';
    let submitterSigUrl: string | null = null;

    try {
      const currentEmployee = await getCurrentEmployee();
      if (currentEmployee) {
        const [empProfile] = await db
          .select({
            id: employees.id,
            name: employees.name,
            employeeSn: employees.employeeSn,
            jobTitle: employees.jobTitle,
            maritalStatus: employees.maritalStatus,
            departmentName: masterDepartments.name,
            sectionName: masterSections.name,
            siteName: sites.name,
            signatureDataUrl: employees.signatureDataUrl,
          })
          .from(employees)
          .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
          .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
          .leftJoin(sites, eq(employees.siteId, sites.id))
          .where(eq(employees.id, currentEmployee.id))
          .limit(1);

        if (empProfile) {
          if (empProfile.name) empName = empProfile.name;
          if (empProfile.employeeSn) empSn = empProfile.employeeSn;
          if (empProfile.jobTitle) empJobTitle = empProfile.jobTitle;
          if (empProfile.departmentName) deptName = empProfile.departmentName;
          if (empProfile.sectionName) secName = empProfile.sectionName;
          if (empProfile.siteName) siteName = empProfile.siteName;
          if (empProfile.maritalStatus) currentMaritalStatus = empProfile.maritalStatus;
          if (empProfile.signatureDataUrl) submitterSigUrl = empProfile.signatureDataUrl;
        }
      }
    } catch (err) {
      console.error('[PrintMaritalStatusPage] Error loading draft employee session:', err);
    }

    data = {
      id: 0,
      requestNumber: 'MAR-DRAFT',
      employeeId: 0,
      employeeName: empName,
      employeeSn: empSn,
      employeeJobTitle: empJobTitle,
      departmentName: deptName,
      sectionName: secName,
      siteName: siteName,
      currentMaritalStatus: currentMaritalStatus,
      targetMaritalStatus: 'Married On Site',
      reason: '',
      requestDate: new Date(),
      status: 'draft',
      signatureUrl: submitterSigUrl,
      approver1Id: 0,
      approver2Id: 0,
      approver3Id: 0,
      approver1Name: 'PJO / HSE / Leader',
      approver2Name: 'Atasan Langsung',
      approver3Name: 'Human Resources',
      approvalHistory: [],
    } as any;
  } else if (!isNaN(reqId) && reqId > 0) {
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
  const level3Approval = approvalHistory.find((h) => h.level === 3);

  const reqDateFormatted = data.requestDate
    ? new Date(data.requestDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      })
    : '-';

  const level2DateFormatted =
    level2Approval?.status === 'approved' && level2Approval?.reviewedAt
      ? new Date(level2Approval.reviewedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
        })
      : '';

  const level3DateFormatted =
    level3Approval?.status === 'approved' && level3Approval?.reviewedAt
      ? new Date(level3Approval.reviewedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
        })
      : '';

  return (
    <div
      className={
        isEmbed
          ? 'bg-white w-full h-full min-h-screen p-0 m-0 overflow-hidden flex justify-center items-start'
          : 'bg-gray-100 min-h-screen py-4 print:py-0 print:bg-white flex justify-center overflow-x-auto'
      }
    >
      {!isEmbed && <PrintAction />}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        ${
          isEmbed
            ? `
          html, body {
            overflow: hidden !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
          }
        `
            : ''
        }
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
            padding: 10mm 12mm 10mm 12mm !important;
            transform: none !important;
          }
        }
      `,
        }}
      />

      <div
        className="pdf-wrapper relative bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] text-[9.5pt] font-sans mx-auto flex flex-col box-border overflow-hidden p-6 shrink-0"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header Logo & Date */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-10 w-auto" />
          </div>
          <div className="text-right text-[9.5pt] font-medium text-black">
            Tanggal : <span className="border-b border-black px-4 font-semibold">{reqDateFormatted}</span>
          </div>
        </div>

        {/* Outer Form Container Box with Double Border */}
        <div className="border-[3px] border-double border-black p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Form Title Banner */}
            <div className="bg-black text-white text-center py-1 px-3 font-bold text-[10pt] tracking-wider uppercase mb-3 -mx-4 -mt-4">
              PERMOHONAN PERUBAHAN STATUS PERNIKAHAN DI LOKASI
            </div>

            {/* Employee Details Section */}
            <div className="space-y-1.5 mb-4 text-[9.5pt] text-black">
              <div className="text-black mb-1 font-normal">Yang bertanda tangan di bawah ini</div>

              <div className="grid grid-cols-[140px_1fr_60px_160px] gap-x-1 items-center">
                <span>Nama</span>
                <span id="preview-emp-name" className="border-b border-black font-semibold">: {data.employeeName}</span>
                <span className="font-normal text-right">S.N</span>
                <span id="preview-emp-sn" className="border-b border-black font-semibold text-center">{data.employeeSn}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] gap-x-1 items-center">
                <span>Jabatan</span>
                <span id="preview-emp-job" className="border-b border-black font-medium">: {data.employeeJobTitle || '-'}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] gap-x-1 items-center">
                <span>Dept/Section</span>
                <span id="preview-emp-dept-sec" className="border-b border-black font-medium">: {data.departmentName || 'Central Services'}/{data.sectionName || 'Service Operation'}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] gap-x-1 items-center">
                <span>Lokasi Bekerja</span>
                <span id="preview-emp-site" className="border-b border-black font-medium">: {data.siteName || '-'}</span>
              </div>

              <div className="grid grid-cols-[140px_1fr] gap-x-1 items-center">
                <span>Status Pernikahan</span>
                <span id="preview-current-status" className="border-b border-black font-semibold">: {formatMaritalStatus(data.currentMaritalStatus)}</span>
              </div>
            </div>

            {/* Request & Reason Section */}
            <div className="space-y-2 mb-4 text-[9.5pt] text-black">
              <div className="grid grid-cols-[390px_1fr] gap-x-1 items-center">
                <span>Dengan Ini Mengajukan Permohonan Pergantian Status Pernikahan Menjadi</span>
                <span id="preview-target-status" className="border-b border-black font-semibold text-center">: {data.targetMaritalStatus}</span>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-end">
                  <span>Alasan Saya Mengajukan Perubahan Status Ini</span>
                  <span className="ml-8 pr-1">:</span>
                </div>
                <div id="preview-reason" className="border-b border-black min-h-[22px] pb-0.5 font-medium">
                  {data.reason || '-'}
                </div>
                <div className="border-b border-black h-5"></div>
                <div className="border-b border-black h-5"></div>
              </div>
            </div>

            {/* Top Signatures Block (Mengetahui & Diajukan Oleh) */}
            <div className="grid grid-cols-2 gap-4 my-4 text-[9pt] text-black">
              {/* Left: Mengetahui */}
              <div className="flex flex-col items-center text-center">
                <div className="font-semibold whitespace-nowrap mb-1">Mengetahui,</div>
                <div id="mengetahui-sig-container" className="h-[50px] flex items-end justify-center pb-1 min-w-[180px]">
                  {level1Approval?.status === 'approved' && level1Approval?.signatureUrl ? (
                    <img src={level1Approval.signatureUrl} alt="Signature PJO/HSE/Leader" className="max-h-[45px] object-contain" />
                  ) : (
                    <div className="text-black text-[8pt] italic">(Belum TTD)</div>
                  )}
                </div>
                <div id="preview-approver1-name" className="border-b border-black w-full min-w-[180px] max-w-[220px] text-center font-semibold text-[9pt] pb-0.5">
                  {level1Approval?.approverName || (data as any).approver1Name || 'PJO / HSE / Leader'}
                </div>
                <div id="preview-approver1-job" className="text-[8.5pt] text-center mt-0.5">
                  {level1Approval?.approverJobTitle || (data as any).approver1Job || 'PJO / HSE / Leader'}
                </div>
              </div>

              {/* Right: Diajukan Oleh */}
              <div className="flex flex-col items-center text-center">
                <div className="font-semibold whitespace-nowrap mb-1">Diajukan Oleh,</div>
                <div id="preview-submitter-sig" className="h-[50px] flex items-end justify-center pb-1 min-w-[180px]">
                  {submitterSignatureUrl ? (
                    <img src={submitterSignatureUrl} alt="Signature Karyawan" className="max-h-[45px] object-contain" />
                  ) : (
                    <div className="text-black text-[8pt] italic">(Tanda Tangan)</div>
                  )}
                </div>
                <div className="border-b border-black w-full min-w-[180px] max-w-[220px] text-center font-semibold text-[9pt] pb-0.5">
                  {data.employeeName}
                </div>
                <div id="preview-submitter-job" className="text-[8.5pt] text-center mt-0.5">
                  {data.employeeJobTitle || 'Karyawan'}
                </div>
              </div>
            </div>

            {/* Separator 1: DIISI OLEH ATASAN LANGSUNG */}
            <div className="flex items-center gap-3 my-3 -mx-4">
              <div className="flex-1 border-t border-dashed border-black"></div>
              <span className="font-bold text-[8.5pt] text-black uppercase tracking-wider whitespace-nowrap">
                DIISI OLEH ATASAN LANGSUNG
              </span>
              <div className="flex-1 border-t border-dashed border-black"></div>
            </div>

            {/* Section 1: Atasan Langsung (2-Column Stamp Layout) */}
            <div className="grid grid-cols-[1fr_240px] gap-4 text-[9.5pt] text-black items-start mb-4">
              {/* Left Column: Catatan & Decision Checkboxes */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-bold text-black mb-0.5">Catatan :</div>
                  <div className="border-b border-black min-h-[22px] pb-0.5">
                    <span id="preview-catatan-atasan" className="font-medium italic text-black">
                      {formatDisplayNote(level2Approval?.decisionNote) !== '-' ? formatDisplayNote(level2Approval?.decisionNote) : ''}
                    </span>
                  </div>
                  <div className="border-b border-black h-5"></div>
                  <div className="border-b border-black h-5"></div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="font-bold text-black">Menyetujui / Tidak Menyetujui Permohonan Ini :</div>

                  <div className="flex items-center gap-6 text-[9.5pt] pt-1">
                    <div className="flex items-center gap-2">
                      <span
                        id="preview-atasan-check-approved"
                        className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold"
                      >
                        {level2Approval?.status === 'approved' ? '✓' : ''}
                      </span>
                      <span className="font-bold">MENYETUJUI</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        id="preview-atasan-check-rejected"
                        className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold"
                      >
                        {level2Approval?.status === 'rejected' ? '✓' : ''}
                      </span>
                      <span className="font-bold">TIDAK MENYETUJUI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Approval Stamp Card Box */}
              <div className="border border-slate-300 rounded-lg p-3 flex flex-col items-center justify-between text-center bg-white min-h-[145px]">
                <div id="preview-atasan-date" className="text-[8.5pt] font-semibold text-black">
                  {level2DateFormatted || '—'}
                </div>
                <div className="text-[8.5pt] font-bold text-black">Atasan Langsung</div>

                <div id="atasan-sig-container" className="h-[45px] flex items-center justify-center my-1">
                  {level2Approval?.status === 'approved' && level2Approval?.signatureUrl ? (
                    <img id="preview-atasan-sig" src={level2Approval.signatureUrl} alt="TTD Atasan" className="max-h-[40px] object-contain" />
                  ) : (
                    <div className="text-[8pt] text-slate-400 italic">(Belum TTD)</div>
                  )}
                </div>

                <div className="w-full border-t border-slate-200 my-1"></div>
                <div id="preview-atasan-name" className="text-[8.5pt] font-bold text-slate-900 leading-tight">
                  {level2Approval?.approverName || (data as any).approver2Name || '—'}
                </div>
                <div id="preview-atasan-job" className="text-[7.5pt] text-slate-600 leading-tight">
                  {level2Approval?.approverJobTitle || (data as any).approver2Job || 'Atasan Langsung'}
                </div>
              </div>
            </div>

            {/* Separator 2: DIISI OLEH HUMAN RESOURCES */}
            <div className="flex items-center gap-3 my-3 -mx-4">
              <div className="flex-1 border-t border-dashed border-black"></div>
              <span className="font-bold text-[8.5pt] text-black uppercase tracking-wider whitespace-nowrap">
                DIISI OLEH HUMAN RESOURCES
              </span>
              <div className="flex-1 border-t border-dashed border-black"></div>
            </div>

            {/* Section 2: Human Resources (2-Column Stamp Layout) */}
            <div className="grid grid-cols-[1fr_240px] gap-4 text-[9.5pt] text-black items-start">
              {/* Left Column: Catatan & Decision Checkboxes */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="font-bold text-black mb-0.5">Catatan :</div>
                  <div className="border-b border-black min-h-[22px] pb-0.5">
                    <span id="preview-catatan-hr" className="font-medium italic text-black">
                      {formatDisplayNote(level3Approval?.decisionNote) !== '-' ? formatDisplayNote(level3Approval?.decisionNote) : ''}
                    </span>
                  </div>
                  <div className="border-b border-black h-5"></div>
                  <div className="border-b border-black h-5"></div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="font-bold text-black">Menyetujui / Tidak Menyetujui Permohonan Ini :</div>

                  <div className="flex items-center gap-6 text-[9.5pt] pt-1">
                    <div className="flex items-center gap-2">
                      <span
                        id="preview-hr-check-approved"
                        className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold"
                      >
                        {level3Approval?.status === 'approved' ? '✓' : ''}
                      </span>
                      <span className="font-bold">MENYETUJUI</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        id="preview-hr-check-rejected"
                        className="w-4 h-4 border border-black inline-flex items-center justify-center text-[10px] font-bold"
                      >
                        {level3Approval?.status === 'rejected' ? '✓' : ''}
                      </span>
                      <span className="font-bold">TIDAK MENYETUJUI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Approval Stamp Card Box */}
              <div className="border border-slate-300 rounded-lg p-3 flex flex-col items-center justify-between text-center bg-white min-h-[145px]">
                <div id="preview-hr-date" className="text-[8.5pt] font-semibold text-black">
                  {level3DateFormatted || '—'}
                </div>
                <div className="text-[8.5pt] font-bold text-black">Human Resources</div>

                <div id="hr-sig-container" className="h-[45px] flex items-center justify-center my-1">
                  {level3Approval?.status === 'approved' && level3Approval?.signatureUrl ? (
                    <img id="preview-hr-sig" src={level3Approval.signatureUrl} alt="TTD HR" className="max-h-[40px] object-contain" />
                  ) : (
                    <div className="text-[8pt] text-slate-400 italic">(Belum TTD)</div>
                  )}
                </div>

                <div className="w-full border-t border-slate-200 my-1"></div>
                <div id="preview-hr-name" className="text-[8.5pt] font-bold text-slate-900 leading-tight">
                  {level3Approval?.approverName || (data as any).approver3Name || '—'}
                </div>
                <div id="preview-hr-job" className="text-[7.5pt] text-slate-600 leading-tight">
                  {level3Approval?.approverJobTitle || (data as any).approver3Job || 'Human Resources'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Document Code Outside Outer Box */}
        <div className="pt-2 flex justify-end items-center text-black text-[8.5pt]">
          <span className="font-bold tracking-tight">F.HR.STD.001 00</span>
        </div>
      </div>

      <MaritalStatusPrintListener
        isEmbed={isEmbed}
        hasExistingSignature={Boolean(
          (level2Approval?.status === 'approved' && level2Approval?.signatureUrl) ||
          (level3Approval?.status === 'approved' && level3Approval?.signatureUrl)
        )}
      />
    </div>
  );
}

