import { getSummaryDetails } from '@/lib/summary-engine';
import { QTY_ONLY_COLUMNS, SAFETY_SHOES_COL, buildDynamicApdColumns, formatApdItemColHeader } from '@/lib/summary-constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrintSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ embed?: string; autoPrint?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isEmbed = resolvedSearchParams?.embed === '1' || resolvedSearchParams?.embed === 'true';
  const autoPrint = resolvedSearchParams?.autoPrint === '1' || resolvedSearchParams?.autoPrint === 'true';
  const summaryId = Number(id);
  const data = await getSummaryDetails(summaryId);

  if (!data) {
    return <html><body><div style={{ textAlign: 'center', padding: '50px' }}>Summary tidak ditemukan</div></body></html>;
  }

  const formatSiteName = (site?: string | null) => {
    if (!site) return '';
    const trimmed = site.trim();
    if (/^vale/i.test(trimmed)) return 'Vale';
    return trimmed;
  };

  const grouped: Record<string, { name: string; sn: string; site: string; remarks: string; apdRequestId?: number | null; items: Record<string, any> }> = {};
  for (const item of data.items) {
    if (!grouped[item.employeeName]) {
      grouped[item.employeeName] = { 
        name: item.employeeName, 
        sn: item.employeeSn, 
        site: formatSiteName(item.siteName), 
        remarks: item.remarks || '', 
        apdRequestId: item.apdRequestId || null,
        items: {} 
      };
    }
    if (item.apdRequestId && !grouped[item.employeeName].apdRequestId) {
      grouped[item.employeeName].apdRequestId = item.apdRequestId;
    }
    if (item.remarks && !grouped[item.employeeName].remarks) {
      grouped[item.employeeName].remarks = item.remarks;
    }
    if (item.itemName === 'Safety Shoes Size') {
      const isReqTypeSize = item.requestType && item.requestType !== 'baru' && item.requestType !== 'pergantian';
      const sizeVal = isReqTypeSize
        ? item.requestType
        : (item.remarks && item.remarks !== grouped[item.employeeName].remarks ? item.remarks : item.requestType || '');
      grouped[item.employeeName].items[item.itemName] = sizeVal;
    } else if (item.itemName === 'Safety Shoes Masa Pakai') {
      grouped[item.employeeName].items[item.itemName] = item.remarks || item.requestType || '';
    } else {
      grouped[item.employeeName].items[item.itemName] = (Number(grouped[item.employeeName].items[item.itemName]) || 0) + item.quantity;
    }
  }
  const emps = Object.values(grouped).sort((a, b) => {
    const siteCmp = (a.site || '').localeCompare(b.site || '', 'id-ID', { sensitivity: 'base' });
    if (siteCmp !== 0) return siteCmp;
    return (a.name || '').localeCompare(b.name || '', 'id-ID', { sensitivity: 'base' });
  });

  const masterList = data.masterCatalog && data.masterCatalog.length > 0
    ? data.masterCatalog.map(m => ({ name: m.name, hasSize: !!m.hasSize }))
    : undefined;

  const dynamicQtyCols = masterList
    ? Array.from(
        new Set([
          ...buildDynamicApdColumns(masterList).qtyOnlyCols,
          ...data.items
            .map((i) => i.itemName)
            .filter((name) => name !== 'Safety Shoes' && name !== 'Safety Shoes Size' && name !== 'Safety Shoes Masa Pakai'),
        ])
      )
    : Array.from(
        new Set([
          ...QTY_ONLY_COLUMNS,
          ...data.items
            .map((i) => i.itemName)
            .filter((name) => name !== 'Safety Shoes' && name !== 'Safety Shoes Size' && name !== 'Safety Shoes Masa Pakai'),
        ])
      );

  const allCols = [...dynamicQtyCols, SAFETY_SHOES_COL];
  const totals: Record<string, number> = {};
  for (const col of allCols) {
    totals[col] = emps.reduce((s, e) => s + (Number(e.items[col]) || 0), 0);
  }

  const deptHead = data.approvals.find(a => a.level === 2);
  const sites = [...new Set(emps.map(e => e.site))];

  const empCount = emps.length;
  const colCount = dynamicQtyCols.length;
  const isDense = empCount > 9;
  const isUltraDense = empCount > 17;
  const isExtremeDense = empCount > 23;

  // Calibrated font sizing — prevents microscopic text while fitting within A4 Landscape
  const thFontSize = isExtremeDense ? '6.8pt' : isUltraDense ? '7pt' : '7.5pt';
  const itemHeaderFontSize = isExtremeDense ? '5.4pt' : isUltraDense ? '5.8pt' : isDense ? '6.2pt' : '6.8pt';
  const qtyFontSize = isExtremeDense ? '7.5pt' : isUltraDense ? '8pt' : '8.5pt';
  const textFontSize = isExtremeDense ? '7pt' : isUltraDense ? '7.2pt' : '7.5pt';
  const remarksFontSize = isExtremeDense ? '6.2pt' : isUltraDense ? '6.5pt' : '7pt';

  const padV = isExtremeDense ? '1px' : isUltraDense ? '1.5px' : isDense ? '2px' : '3px';
  const padH = '1px';
  const rowHeight = isExtremeDense ? '15px' : isUltraDense ? '17px' : isDense ? '19px' : '22px';

  const sigContainerHeight = isExtremeDense ? '28px' : isUltraDense ? '32px' : '38px';
  const sigImgHeight = isExtremeDense ? '24px' : isUltraDense ? '28px' : '34px';

  const th: React.CSSProperties = { 
    border: '1px solid #000', 
    paddingTop: padV, 
    paddingBottom: padV, 
    paddingLeft: padH, 
    paddingRight: padH, 
    fontSize: thFontSize, 
    background: '#f1f5f9', 
    textAlign: 'center', 
    fontWeight: 'bold', 
    lineHeight: '1.15',
    boxSizing: 'border-box'
  };
  const td: React.CSSProperties = { 
    border: '1px solid #000', 
    paddingTop: padV, 
    paddingBottom: padV, 
    paddingLeft: padH, 
    paddingRight: padH, 
    fontSize: qtyFontSize, 
    textAlign: 'center', 
    lineHeight: '1.15',
    boxSizing: 'border-box'
  };
  const tdL: React.CSSProperties = { 
    ...td, 
    textAlign: 'left', 
    paddingLeft: '3px',
    fontSize: textFontSize 
  };
  const thItem: React.CSSProperties = { 
    ...th, 
    fontSize: itemHeaderFontSize, 
    paddingTop: '2px', 
    paddingBottom: '2px', 
    paddingLeft: '1px', 
    paddingRight: '1px', 
    lineHeight: '1.05', 
    wordBreak: 'break-word', 
    overflowWrap: 'break-word',
    hyphens: 'auto',
    whiteSpace: 'normal', 
    verticalAlign: 'middle' 
  };

  const fmtDate = (d: Date) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Standard total rows: 10 rows if <= 9 items; exact count if > 9 items
  const targetTotalRows = isDense ? empCount : 10;
  const displayLimit = Math.max(emps.length, targetTotalRows);
  const emptyRowCount = Math.max(0, targetTotalRows - emps.length);

  // Column width allocations (calibrated for A4 Landscape ~281mm printable width)
  const colWidthName = isExtremeDense ? '90px' : isUltraDense ? '95px' : '105px';
  const colWidthSite = isExtremeDense ? '44px' : isUltraDense ? '48px' : '55px';
  const colWidthRemarks = isExtremeDense ? '65px' : isUltraDense ? '70px' : '80px';

  return (
    <div className="print-page-wrapper" style={{ 
      fontFamily: 'Arial, sans-serif', 
      fontSize: '8pt', 
      padding: isEmbed ? '4mm 6mm' : '0', 
      margin: '0 auto',
      background: '#fff',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      minHeight: isEmbed ? '210mm' : undefined,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <style>{`
        @page { 
          size: A4 landscape; 
          margin: 5mm 7mm; 
        }
        @media print {
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important; 
            background: #fff !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-hidden,
          .print\\:hidden {
            display: none !important;
            width: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          table {
            page-break-after: auto;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExtremeDense ? '4px' : '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" style={{ height: isExtremeDense ? '30px' : '34px', width: 'auto' }} />
        </div>
        <div style={{ textAlign: 'right', paddingRight: '2px' }}>
          <div style={{ fontSize: isExtremeDense ? '10.5pt' : '11.5pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: '1.2' }}>
            Summary Permintaan Barang Safety
            {data.targetSite === 'VALE' && <span style={{ color: '#ea580c' }}> (Vale)</span>}
            {data.targetSite === 'GABUNGAN' && <span style={{ color: '#2563eb' }}> (Gabungan Site)</span>}
          </div>
          <div style={{ fontSize: isExtremeDense ? '8.5pt' : '9pt', fontWeight: 'bold', marginTop: '1px', color: '#333' }}>{data.sectionName}</div>
        </div>
      </div>

      <div style={{ fontSize: isExtremeDense ? '6.8pt' : '7.2pt', marginBottom: isExtremeDense ? '4px' : '6px', lineHeight: '1.25', color: '#111' }}>
        <div><strong>Tanggal Pengajuan:</strong> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
        {data.periodStart && data.periodEnd && (
          <div>
            <strong>Periode Pengajuan:</strong>{' '}
            {new Date(data.periodStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} s/d{' '}
            {new Date(data.periodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
        <div><strong>Department &amp; Lokasi:</strong> {data.departmentName} — {sites.join(', ')}</div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: isExtremeDense ? '4px' : '6px', tableLayout: 'fixed', boxSizing: 'border-box' }}>
        <colgroup>
          <col style={{ width: '22px' }} />
          <col style={{ width: colWidthName }} />
          <col style={{ width: '36px' }} />
          {dynamicQtyCols.map((c) => (
            <col key={c} />
          ))}
          <col style={{ width: '22px' }} />
          <col style={{ width: '26px' }} />
          <col style={{ width: '38px' }} />
          <col style={{ width: colWidthSite }} />
          <col style={{ width: colWidthRemarks }} />
          <col style={{ width: '50px' }} className="print-hidden print:hidden" />
        </colgroup>
        <thead>
          <tr>
            <th style={th} rowSpan={2}>No</th>
            <th style={th} rowSpan={2}>Nama Karyawan</th>
            <th style={th} rowSpan={2}>SN</th>
            {dynamicQtyCols.map(c => (
              <th key={c} style={thItem} rowSpan={2} title={c}>
                {formatApdItemColHeader(c)}
              </th>
            ))}
            <th style={th} colSpan={3}>{SAFETY_SHOES_COL}</th>
            <th style={th} rowSpan={2}>Site</th>
            <th style={th} rowSpan={2}>Remarks</th>
            <th style={th} className="print-hidden print:hidden" rowSpan={2}>Dokumen</th>
          </tr>
          <tr>
            <th style={{ ...th, fontSize: '6.5pt', padding: '1px' }}>QTY</th>
            <th style={{ ...th, fontSize: '6.5pt', padding: '1px' }}>Size</th>
            <th style={{ ...th, fontSize: '6.5pt', padding: '1px' }}>Masa Pakai</th>
          </tr>
        </thead>
        <tbody>
          {emps.slice(0, displayLimit).map((e, i) => (
            <tr key={i} style={{ height: rowHeight }}>
              <td style={{ ...td, fontSize: textFontSize }}>{i + 1}</td>
              <td style={{ ...tdL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</td>
              <td style={{ ...td, fontSize: textFontSize }}>{e.sn}</td>
              {dynamicQtyCols.map(c => (
                <td key={c} style={{ ...td, fontWeight: 'bold' }}>{e.items[c] || ''}</td>
              ))}
              <td style={{ ...td, fontWeight: 'bold' }}>{e.items['Safety Shoes'] || ''}</td>
              <td style={{ ...td, fontSize: textFontSize }}>{e.items['Safety Shoes Size'] || ''}</td>
              <td style={{ ...td, fontSize: isExtremeDense ? '6.2pt' : '6.8pt', padding: '1px' }}>
                {e.items['Safety Shoes'] ? (e.items['Safety Shoes Masa Pakai'] || '—') : '—'}
              </td>
              <td style={{ ...td, fontSize: isExtremeDense ? '6.2pt' : '6.8pt', lineHeight: '1.1', overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'break-word', padding: '1px 2px' }}>{e.site}</td>
              <td style={{ ...tdL, fontSize: remarksFontSize, padding: '1px 2px', lineHeight: '1.1' }} title={e.remarks}>
                <div style={{
                  maxHeight: isExtremeDense ? '20px' : isUltraDense ? '24px' : isDense ? '28px' : '36px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: isExtremeDense ? 1 : isUltraDense ? 2 : isDense ? 3 : 4,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}>
                  {e.remarks || '—'}
                </div>
              </td>
              <td style={{ ...td, padding: '1px' }} className="print-hidden print:hidden">
                {e.apdRequestId ? (
                  <a
                    href={`/print/apd/${e.apdRequestId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-apd-request-id={e.apdRequestId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: '#1d4ed8',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    title="Lihat Dokumen Request Karyawan"
                  >
                    Dokumen
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>—</span>
                )}
              </td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`e${i}`} style={{ height: rowHeight }}>
              <td style={{ ...td, fontSize: textFontSize }}>{emps.length + i + 1}</td>
              {Array.from({ length: dynamicQtyCols.length + 7 }).map((_, j) => (
                <td key={j} style={td}></td>
              ))}
              <td style={td} className="print-hidden print:hidden"></td>
            </tr>
          ))}
          <tr style={{ background: '#e2e8f0', fontWeight: 'bold', height: rowHeight }}>
            <td style={{ ...td, fontSize: textFontSize, fontWeight: 'bold' }} colSpan={3}>Total Qty</td>
            {dynamicQtyCols.map(c => (
              <td key={c} style={{ ...td, fontWeight: 'bold' }}>{totals[c] || ''}</td>
            ))}
            <td style={{ ...td, fontWeight: 'bold' }}>{totals['Safety Shoes'] || ''}</td>
            <td style={{ ...td, fontSize: textFontSize }}>—</td>
            <td style={{ ...td, fontSize: textFontSize }}>—</td>
            <td style={{ ...td, fontSize: textFontSize }}>—</td>
            <td style={{ ...td, fontSize: textFontSize }}>—</td>
            <td style={{ ...td, fontSize: textFontSize }} className="print-hidden print:hidden">—</td>
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
          <div suppressHydrationWarning style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: '8px', textAlign: 'center', marginTop: isExtremeDense ? '2px' : isDense ? '4px' : '6px', flexShrink: 0 }}>
            {/* Diajukan Oleh */}
            <div suppressHydrationWarning>
              <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diajukan Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {data.submitterSignatureUrl && <img src={data.submitterSignatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold' }}>{data.generatedByName}</div>
              <div style={{ fontSize: isExtremeDense ? '6.2pt' : '6.5pt', color: '#444' }}>Pembuat Dokumen ({data.sectionName})</div>
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
                  <div key={appr.id || idx} suppressHydrationWarning>
                    <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diperiksa Oleh,</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                      <div
                        id={`approver-cell-${idx + 1}`}
                        data-approver-id={appr.approverEmployeeId}
                        data-approver-name={appr.approverName}
                        data-approver-title={roleDisplay}
                        data-level={appr.level}
                        data-resolved={appr.signatureUrl ? 'true' : 'false'}
                        suppressHydrationWarning
                        style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px', position: 'relative' }}
                      >
                        {appr.signatureUrl && <img src={appr.signatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold' }}>{appr.approverName || '.............'}</div>
                    <div style={{ fontSize: isExtremeDense ? '6.2pt' : '6.5pt', color: '#444' }}>{roleDisplay}</div>
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
                <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Diperiksa Oleh,</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                  <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}></div>
                </div>
                <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold' }}>.............</div>
                <div style={{ fontSize: isExtremeDense ? '6.2pt' : '6.5pt', color: '#444' }}>(Section Head — {data.sectionName})</div>
              </div>
            )}

            {/* Disetujui Oleh (Department Head) */}
            <div suppressHydrationWarning>
              <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold', marginBottom: '2px' }}>Disetujui Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px', height: sigContainerHeight }}>
                <div
                  id="approver-cell-dept"
                  data-approver-id={deptHead?.approverEmployeeId}
                  data-approver-name={deptHead?.approverName}
                  data-approver-title={deptHead?.approverJobTitle}
                  data-level={2}
                  data-resolved={deptHead?.signatureUrl ? 'true' : 'false'}
                  suppressHydrationWarning
                  style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px', position: 'relative' }}
                >
                  {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{ maxHeight: sigImgHeight, maxWidth: '120px' }} />}
                </div>
              </div>
              <div style={{ fontSize: isExtremeDense ? '7pt' : '7.5pt', fontWeight: 'bold' }}>{deptHead?.approverName || '.............'}</div>
              <div style={{ fontSize: isExtremeDense ? '6.2pt' : '6.5pt', color: '#444' }}>({deptHead?.approverJobTitle || 'Department Head'} — {data.departmentName})</div>
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

      <script async dangerouslySetInnerHTML={{__html: `
        if (new URLSearchParams(window.location.search).get('autoPrint') === '1') {
          window.addEventListener('load', function() {
            setTimeout(function() { window.print(); }, 350);
          });
        }

        document.addEventListener('click', function(e) {
          const target = e.target;
          const link = target ? target.closest('a[data-apd-request-id]') : null;
          if (link) {
            const reqId = link.getAttribute('data-apd-request-id');
            if (reqId && window.parent && window.parent !== window) {
              e.preventDefault();
              window.parent.postMessage({ type: 'openApdDocument', requestId: Number(reqId) }, '*');
            }
          }
        });

        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'previewSignature') {
            const dataUrl = event.data.dataUrl;
            const approverId = event.data.approverEmployeeId ? String(event.data.approverEmployeeId).trim() : '';
            const approverName = event.data.approverName ? String(event.data.approverName).trim().toLowerCase() : '';
            const level = event.data.level ? Number(event.data.level) : null;

            const allCells = Array.from(document.querySelectorAll('[data-approver-id], [id^="approver-cell"]'));

            // Remove any previous live preview from ALL cells first
            allCells.forEach(function(c) {
              const p = c.querySelector('.live-preview-sig');
              if (p) p.remove();
            });

            if (!dataUrl) return;

            let targetCell = null;

            // 1. Match by approver ID
            if (approverId) {
              for (let i = 0; i < allCells.length; i++) {
                const c = allCells[i];
                if (c.getAttribute('data-approver-id') === approverId && c.getAttribute('data-resolved') !== 'true') {
                  targetCell = c;
                  break;
                }
              }
            }

            // 2. Match by approver name
            if (!targetCell && approverName) {
              for (let i = 0; i < allCells.length; i++) {
                const c = allCells[i];
                const cellName = (c.getAttribute('data-approver-name') || '').toLowerCase().trim();
                if (cellName && (cellName.includes(approverName) || approverName.includes(cellName)) && c.getAttribute('data-resolved') !== 'true') {
                  targetCell = c;
                  break;
                }
              }
            }

            // 3. Match by level
            if (!targetCell && level !== null) {
              for (let i = 0; i < allCells.length; i++) {
                const c = allCells[i];
                if (Number(c.getAttribute('data-level')) === level && c.getAttribute('data-resolved') !== 'true') {
                  targetCell = c;
                  break;
                }
              }
            }

            // 4. Fallback to first unresolved cell
            if (!targetCell) {
              for (let i = 0; i < allCells.length; i++) {
                const c = allCells[i];
                if (c.getAttribute('data-resolved') !== 'true') {
                  targetCell = c;
                  break;
                }
              }
            }

            if (targetCell) {
              setTimeout(function() {
                const img = document.createElement('img');
                img.src = dataUrl;
                img.alt = 'Live Preview';
                img.className = 'live-preview-sig';
                img.style.maxHeight = '40px';
                img.style.maxWidth = '120px';
                targetCell.appendChild(img);
              }, 0);
            }
          }
        });
      `}} />
    </div>
  );
}
