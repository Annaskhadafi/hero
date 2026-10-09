'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FilePenLine,
  FileText,
  Loader2,
  Maximize2,
  Printer,
  Trash2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitSummaryAction, deleteSummaryDraftAction } from '@/app/dashboard/summary/actions';
import { SummaryApprovalDialog } from './summary-approval-dialog';
import { ApdRequestDetailModal } from './apd-request-detail-modal';
import { QTY_ONLY_COLUMNS, SAFETY_SHOES_COL, buildDynamicApdColumns } from '@/lib/summary-constants';

type SummaryData = {
  id: number;
  summaryNumber: string;
  status: string;
  generatedAt: Date | null;
  approvedAt: Date | null;
  sectionName: string;
  departmentName: string;
  generatedByName: string;
  generatedByJobTitle?: string;
  targetSite?: string;
  submitterSignatureUrl: string | null;
  masterCatalog?: Array<{
    name: string;
    hasSize?: boolean;
    isQtyOnly?: boolean;
    isShoe?: boolean;
  }>;
  items: Array<{
    employeeName: string;
    employeeSn: string;
    siteName: string;
    itemName: string;
    quantity: number;
    requestType: string;
    remarks?: string;
    apdRequestId?: number | null;
  }>;
  approvals: Array<{
    id?: number;
    level: number;
    approverEmployeeId?: number;
    approverName: string;
    approverJobTitle?: string;
    approverSectionName?: string | null;
    status: string;
    signatureUrl: string | null;
    decisionNote: string | null;
    reviewedAt: Date | null;
  }>;
};

export function SummaryPreview({ data }: { data: SummaryData }) {
  const router = useRouter();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const handlePrintInPlace = () => {
    setPrinting(true);
    const existing = document.getElementById('summary-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'summary-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = `/print/summary/${data.id}`;

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error('Failed to print iframe:', err);
        } finally {
          setPrinting(false);
        }
      }, 500);
    };

    document.body.appendChild(iframe);
  };

  const handleDeleteDraft = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus draft summary ini? Pengajuan yang terkait akan dikembalikan ke antrean.')) {
      return;
    }
    setDeleting(true);
    const toastId = toast.loading('Menghapus draft summary...');
    try {
      const res = await deleteSummaryDraftAction(data.id);
      if (res.success) {
        toast.success('Summary berhasil dihapus', { id: toastId });
        router.push('/dashboard/summary');
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menghapus draft summary', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem', { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const formatSiteName = (site?: string | null) => {
    if (!site) return '';
    const trimmed = site.trim();
    if (/^vale/i.test(trimmed)) return 'Vale';
    return trimmed;
  };

  // Group items by employee
  const groupedByEmployee = data.items.reduce((acc, item) => {
    if (!acc[item.employeeName]) {
      acc[item.employeeName] = {
        name: item.employeeName,
        sn: item.employeeSn,
        site: formatSiteName(item.siteName),
        remarks: item.remarks || '',
        apdRequestId: item.apdRequestId || null,
        items: {} as Record<string, any>,
      };
    }
    if (item.apdRequestId && !acc[item.employeeName].apdRequestId) {
      acc[item.employeeName].apdRequestId = item.apdRequestId;
    }
    if (item.remarks && !acc[item.employeeName].remarks) {
      acc[item.employeeName].remarks = item.remarks;
    }
    if (item.itemName === 'Safety Shoes Size') {
      const isReqTypeSize = item.requestType && item.requestType !== 'baru' && item.requestType !== 'pergantian';
      const sizeVal = isReqTypeSize
        ? item.requestType
        : (item.remarks && item.remarks !== acc[item.employeeName].remarks ? item.remarks : item.requestType || '');
      acc[item.employeeName].items[item.itemName] = sizeVal;
    } else {
      acc[item.employeeName].items[item.itemName] = (Number(acc[item.employeeName].items[item.itemName]) || 0) + item.quantity;
    }
    return acc;
  }, {} as Record<string, { name: string; sn: string; site: string; remarks: string; apdRequestId?: number | null; items: Record<string, any> }>);

  const employees = Object.values(groupedByEmployee);
  const sites = [...new Set(employees.map(e => e.site))];

  const masterList = data.masterCatalog && data.masterCatalog.length > 0
    ? data.masterCatalog.map(m => ({ name: m.name, hasSize: !!(m as any).isShoe || !!m.hasSize }))
    : undefined;

  const dynamicQtyCols = masterList
    ? Array.from(
        new Set([
          ...buildDynamicApdColumns(masterList).qtyOnlyCols,
          ...data.items
            .map((i) => i.itemName)
            .filter((name) => name !== 'Safety Shoes' && name !== 'Safety Shoes Size'),
        ])
      )
    : Array.from(
        new Set([
          ...QTY_ONLY_COLUMNS,
          ...data.items
            .map((i) => i.itemName)
            .filter((name) => name !== 'Safety Shoes' && name !== 'Safety Shoes Size'),
        ])
      );

  const allCols = [...dynamicQtyCols, SAFETY_SHOES_COL];
  const totals: Record<string, number> = {};
  for (const col of allCols) {
    totals[col] = employees.reduce((s, e) => s + (Number(e.items[col]) || 0), 0);
  }

  const deptHead = data.approvals.find(a => a.level === 2);

  const handleSubmit = async (signatureUrl: string) => {
    try {
      const result = await submitSummaryAction(data.id, signatureUrl);
      if (result.success) {
        toast.success('Summary berhasil disubmit ke approval flow!');
        router.push('/dashboard/summary');
      } else {
        toast.error(result.error || 'Gagal submit summary');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal submit summary');
    }
  };

  const getStatusBadge = () => {
    switch (data.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="size-3.5 text-amber-600" />
            Draft (Belum Disubmit)
          </span>
        );
      case 'pending':
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="size-3.5 text-blue-600" />
            Menunggu Persetujuan
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Disetujui (Approved)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {data.status}
          </span>
        );
    }
  };

  const empCount = employees.length;
  const colCount = dynamicQtyCols.length;
  const isDense = empCount > 9;
  const isUltraDense = empCount > 15;
  const isWideTable = colCount > 20;

  const thFontSize = isWideTable ? '5.2pt' : isUltraDense ? '5.8pt' : isDense ? '6.2pt' : '7pt';
  const tdFontSize = isWideTable ? '5pt' : isUltraDense ? '5.5pt' : isDense ? '6pt' : '7pt';
  const itemHeaderFontSize = isWideTable ? '4.2pt' : isUltraDense ? '4.8pt' : isDense ? '5.2pt' : '5.5pt';
  const padV = isUltraDense ? '1px' : isDense ? '1.5px' : '3px';
  const padH = isWideTable ? '0.5px' : isUltraDense ? '1.5px' : isDense ? '2px' : '2px';
  const remarksFontSize = isWideTable ? '4.8pt' : isUltraDense ? '5.2pt' : isDense ? '5.8pt' : '6.5pt';

  const sigContainerHeight = isUltraDense ? '32px' : isDense ? '38px' : '44px';
  const sigImgHeight = isUltraDense ? '28px' : isDense ? '34px' : '40px';

  const th: React.CSSProperties = { border: '1px solid #000', paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH, fontSize: thFontSize, background: '#f2f4f7', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.1' };
  const td: React.CSSProperties = { border: '1px solid #000', paddingTop: padV, paddingBottom: padV, paddingLeft: padH, paddingRight: padH, fontSize: tdFontSize, textAlign: 'center', lineHeight: '1.1' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', paddingLeft: '3px' };
  const thItem: React.CSSProperties = { ...th, fontSize: itemHeaderFontSize, paddingTop: '1px', paddingBottom: '1px', paddingLeft: '1px', paddingRight: '1px', lineHeight: '1.05', wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'middle' };

  const fmtDate = (d: Date) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Standard total rows: 10 rows if <= 9 items; exact count if > 9 items to fit single page
  const targetTotalRows = isDense ? empCount : 10;
  const displayLimit = Math.max(employees.length, targetTotalRows);
  const emptyRowCount = Math.max(0, targetTotalRows - employees.length);

  // Renders the document sheet (identical to print document)
  const renderDocumentContent = (isForExport = false) => (
    <div
      className={`bg-white text-black select-none ${
        isForExport ? 'w-[1050px] p-5' : 'w-full p-6 sm:p-8 min-w-[950px]'
      }`}
      style={{
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        ...(isForExport
          ? {
              width: '1050px',
              padding: '16px 24px',
            }
          : {}),
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" style={{ height: '38px', width: 'auto' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2' }}>
            Summary Permintaan Barang Safety
            {data.targetSite === 'VALE' && <span style={{ color: '#ea580c' }}> (Vale)</span>}
            {data.targetSite === 'GABUNGAN' && <span style={{ color: '#2563eb' }}> (Gabungan Site)</span>}
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 'bold', marginTop: '2px', color: '#333' }}>{data.sectionName}</div>
        </div>
      </div>

      <div style={{ fontSize: '7.5pt', marginBottom: '8px', lineHeight: '1.3', color: '#111' }}>
        <div><strong>Tanggal Pengajuan:</strong> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
        <div><strong>Department &amp; Lokasi:</strong> {data.departmentName} — {sites.join(', ')}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...th, width: '24px' }} rowSpan={2}>No</th>
            <th style={{ ...th, width: '105px' }} rowSpan={2}>Nama Karyawan</th>
            <th style={{ ...th, width: '38px' }} rowSpan={2}>SN</th>
            <th style={{ ...th, width: '70px' }} rowSpan={2}>Site</th>
            {dynamicQtyCols.map(c => (
              <th key={c} style={thItem} rowSpan={2}>
                {c}
              </th>
            ))}
            <th style={th} colSpan={2}>{SAFETY_SHOES_COL}</th>
            <th style={{ ...th, width: '65px' }} rowSpan={2}>Remarks</th>
            <th style={{ ...th, width: '60px' }} className="print:hidden" rowSpan={2}>Dokumen</th>
          </tr>
          <tr>
            <th style={{ ...th, width: '22px' }}>QTY</th>
            <th style={{ ...th, width: '26px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {employees.slice(0, displayLimit).map((e, i) => (
            <tr key={i} style={{ height: '18px' }}>
              <td style={td}>{i + 1}</td>
              <td style={{ ...tdL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</td>
              <td style={td}>{e.sn}</td>
              <td style={{ ...td, fontSize: '6pt', lineHeight: '1.1', overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'break-word', padding: '1px 2px' }}>{e.site}</td>
              {dynamicQtyCols.map(c => (
                <td key={c} style={td}>{e.items[c] || ''}</td>
              ))}
              <td style={td}>{e.items['Safety Shoes'] || ''}</td>
              <td style={td}>{e.items['Safety Shoes Size'] || ''}</td>
              <td style={{ ...tdL, fontSize: remarksFontSize, padding: '1px 2px', lineHeight: '1.1' }} title={e.remarks}>
                <div style={{
                  maxHeight: isUltraDense ? '22px' : isDense ? '28px' : '36px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: isUltraDense ? 2 : isDense ? 3 : 4,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}>
                  {e.remarks || '—'}
                </div>
              </td>
              <td style={{ ...td, padding: '1px' }} className="print:hidden">
                {e.apdRequestId ? (
                  <button
                    type="button"
                    onClick={() => setSelectedRequestId(e.apdRequestId || null)}
                    className="inline-flex items-center justify-center gap-1 text-[8px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded shadow-2xs cursor-pointer w-full"
                    title="Lihat Dokumen Request Karyawan"
                  >
                    <FileText className="size-2.5 text-blue-600" />
                    <span>Dokumen</span>
                  </button>
                ) : (
                  <span className="text-slate-400 text-[8px]">—</span>
                )}
              </td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`e${i}`} style={{ height: '18px' }}>
              <td style={td}>{employees.length + i + 1}</td>
              {Array.from({ length: dynamicQtyCols.length + 6 }).map((_, j) => (
                <td key={j} style={td}></td>
              ))}
              <td style={td} className="print:hidden"></td>
            </tr>
          ))}
          <tr style={{ background: '#e5e7eb', fontWeight: 'bold', height: '19px' }}>
            <td style={td} colSpan={4}>Total Qty</td>
            {dynamicQtyCols.map(c => (
              <td key={c} style={td}>{totals[c] || ''}</td>
            ))}
            <td style={td}>{totals['Safety Shoes'] || ''}</td>
            <td style={td}>—</td>
            <td style={td}>—</td>
            <td style={td} className="print:hidden">—</td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      {(() => {
        const level1Approvals = data.approvals.filter(a => a.level === 1);
        const hasMultipleL1 = level1Approvals.length > 1;
        const colCount = hasMultipleL1 ? 4 : 3;

        const isAutoDefaultNote = (msg?: string | null) => {
          if (!msg) return true;
          const lower = msg.trim().toLowerCase();
          return (
            lower === '' ||
            lower === '-' ||
            lower === '—' ||
            lower === 'keputusan approve' ||
            lower === 'keputusan approve.' ||
            lower === 'apd disetujui.' ||
            lower === 'apd disetujui' ||
            lower === 'pengajuan disetujui.' ||
            lower === 'pengajuan disetujui' ||
            lower === 'approved' ||
            lower === 'disetujui' ||
            lower === 'ok' ||
            (lower.startsWith('keputusan ') && lower.endsWith('approve'))
          );
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: '8px', textAlign: 'center', marginTop: isUltraDense ? '2px' : isDense ? '4px' : '6px', flexShrink: 0 }}>
            {/* Diajukan Oleh */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diajukan Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {data.submitterSignatureUrl && <img src={data.submitterSignatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{data.generatedByName}</div>
              <div style={{ fontSize: '6.5pt', color: '#444' }}>Pembuat Dokumen ({data.sectionName})</div>
              {data.generatedAt && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(data.generatedAt)}</div>
              )}
            </div>

            {/* Diperiksa Oleh (Parallel Level 1 Approvers) */}
            {level1Approvals.length > 0 ? (
              level1Approvals.map((appr, idx) => {
                const roleDisplay = (() => {
                  if (appr.approverJobTitle?.toLowerCase().includes('mvc') || appr.approverSectionName?.toLowerCase().includes('mvc')) {
                    return 'Section Head Service MVC';
                  }
                  if (appr.approverJobTitle?.toLowerCase().includes('others') || appr.approverSectionName?.toLowerCase().includes('others')) {
                    return 'Section Head Service Others';
                  }
                  const isServiceRole =
                    appr.approverJobTitle?.toLowerCase().includes('section head service') ||
                    appr.approverJobTitle?.toLowerCase().includes('head section service');
                  return isServiceRole
                    ? appr.approverJobTitle
                    : `${appr.approverJobTitle || 'Section Head'}${appr.approverSectionName ? ` (${appr.approverSectionName})` : ` (${data.sectionName})`}`;
                })();
                return (
                  <div key={appr.id || idx}>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diperiksa Oleh,</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                      <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                        {appr.signatureUrl && <img src={appr.signatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{appr.approverName || '.............'}</div>
                    <div style={{ fontSize: '6.5pt', color: '#444' }}>{roleDisplay}</div>
                    {appr.reviewedAt && (
                      <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(appr.reviewedAt)}</div>
                    )}
                    {appr.decisionNote && !isAutoDefaultNote(appr.decisionNote) && (
                      <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {appr.decisionNote}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diperiksa Oleh,</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                  <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}></div>
                </div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>.............</div>
                <div style={{ fontSize: '6.5pt', color: '#444' }}>(Section Head — {data.sectionName})</div>
              </div>
            )}

            {/* Disetujui Oleh (Department Head) */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Disetujui Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>{deptHead?.approverName || '.............'}</div>
              <div style={{ fontSize: '6.5pt', color: '#444' }}>({deptHead?.approverJobTitle || 'Department Head'} — {data.departmentName})</div>
              {deptHead?.reviewedAt && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px' }}>{fmtDate(deptHead.reviewedAt)}</div>
              )}
              {deptHead?.decisionNote && !isAutoDefaultNote(deptHead.decisionNote) && (
                <div style={{ fontSize: '5.5pt', color: '#777', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {deptHead.decisionNote}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/summary')}
            className="h-9 gap-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Daftar Summary</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-900">{data.summaryNumber}</span>
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cetak PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintInPlace}
            disabled={printing}
            className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer shadow-2xs"
          >
            {printing ? (
              <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            ) : (
              <Printer className="size-3.5 text-emerald-600" />
            )}
            <span>Cetak PDF</span>
          </Button>

          {/* Hapus Draft / Pending */}
          {(data.status === 'draft' || data.status === 'pending' || data.status === 'pending_approval') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteDraft}
              disabled={deleting}
              className="h-9 gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-xl shadow-2xs cursor-pointer"
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              <span>Hapus Summary</span>
            </Button>
          )}

          {/* Submit Approval */}
          {data.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => setShowApprovalDialog(true)}
              className="h-9 gap-1.5 text-xs font-bold bg-[#003461] text-white hover:bg-[#00274a] rounded-xl shadow-xs cursor-pointer"
            >
              <FilePenLine className="size-3.5" />
              <span>Tanda Tangan &amp; Submit</span>
            </Button>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoomLevel(1);
              setIsZoomModalOpen(true);
            }}
            className="h-9 px-2.5 text-slate-500 hover:text-slate-900 rounded-xl"
            title="Tampilkan Ukuran Penuh"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main Document Paper Sheet */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-x-auto">
        {renderDocumentContent(false)}
      </div>

      {/* Fullscreen Zoom Lightbox Dialog */}
      {isZoomModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/90 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Preview Dokumen</span>
              <span className="text-xs font-mono font-bold">{data.summaryNumber}</span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z: number) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="min-w-12 text-center text-xs font-mono font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z: number) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                100%
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsZoomModalOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 hover:bg-rose-600 text-white transition cursor-pointer"
              title="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Scrollable Viewport */}
          <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                width: '297mm',
                transition: 'transform 0.1s ease-out',
              }}
              className="rounded-xl shadow-2xl bg-white overflow-hidden my-4"
            >
              {renderDocumentContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <SummaryApprovalDialog
          summaryId={data.id}
          summaryNumber={data.summaryNumber}
          onSubmit={handleSubmit}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}

      {/* APD Request Detail Modal */}
      <ApdRequestDetailModal
        isOpen={Boolean(selectedRequestId)}
        onClose={() => setSelectedRequestId(null)}
        requestId={selectedRequestId}
      />
    </div>
  );
}
