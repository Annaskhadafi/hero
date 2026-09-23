import { getSummaryDetails } from '@/lib/summary-engine';
import { QTY_ONLY_COLUMNS, SAFETY_SHOES_COL } from '@/lib/summary-constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PrintSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ embed?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isEmbed = resolvedSearchParams?.embed === '1' || resolvedSearchParams?.embed === 'true';
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

  const grouped: Record<string, { name: string; sn: string; site: string; remarks: string; items: Record<string, any> }> = {};
  for (const item of data.items) {
    if (!grouped[item.employeeName]) {
      grouped[item.employeeName] = { name: item.employeeName, sn: item.employeeSn, site: formatSiteName(item.siteName), remarks: item.remarks || '', items: {} };
    }
    if (item.remarks && !grouped[item.employeeName].remarks) {
      grouped[item.employeeName].remarks = item.remarks;
    }
    if (item.itemName === 'Safety Shoes Size') {
      grouped[item.employeeName].items[item.itemName] = item.remarks || item.requestType || '';
    } else {
      grouped[item.employeeName].items[item.itemName] = (Number(grouped[item.employeeName].items[item.itemName]) || 0) + item.quantity;
    }
  }
  const emps = Object.values(grouped);

  const allCols = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];
  const totals: Record<string, number> = {};
  for (const col of allCols) {
    totals[col] = emps.reduce((s, e) => s + (Number(e.items[col]) || 0), 0);
  }

  const deptHead = data.approvals.find(a => a.level === 2);
  const sites = [...new Set(emps.map(e => e.site))];

  const th: React.CSSProperties = { border: '1px solid #000', padding: '3px 2px', fontSize: '7pt', background: '#f2f4f7', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.15' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '3px 2px', fontSize: '7pt', textAlign: 'center', lineHeight: '1.2' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left', paddingLeft: '4px' };
  const thVert: React.CSSProperties = { ...th, fontSize: '5.8pt', padding: '2px 0px', whiteSpace: 'nowrap', overflow: 'hidden', height: '90px' };

  const fmtDate = (d: Date) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Standard total rows: 10 rows to fill the page nicely without spilling
  const targetTotalRows = 10;
  const displayLimit = Math.max(emps.length, targetTotalRows);
  const emptyRowCount = Math.max(0, targetTotalRows - emps.length);

  return (
    <div className="print-page-wrapper" style={{ 
      fontFamily: 'Arial, sans-serif', 
      fontSize: '8pt', 
      padding: isEmbed ? '7mm 9mm' : '0', 
      margin: '0',
      overflow: 'hidden',
      background: '#fff',
      boxSizing: 'border-box',
      width: '100%',
      minHeight: isEmbed ? '210mm' : undefined,
    }}>
      <style>{`
        @page { 
          size: A4 landscape; 
          margin: 6mm 8mm; 
        }
        @media print {
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            height: 100% !important; 
            overflow: hidden !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-page-wrapper {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
            max-height: 194mm !important;
          }
        }
      `}</style>
      
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
            <th style={{ ...th, width: '110px' }} rowSpan={2}>Nama Karyawan</th>
            <th style={{ ...th, width: '42px' }} rowSpan={2}>SN</th>
            <th style={{ ...th, width: '46px' }} rowSpan={2}>Site</th>
            {QTY_ONLY_COLUMNS.map(c => (
              <th key={c} style={thVert} rowSpan={2}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: 'auto', maxHeight: '86px', fontSize: '5.8pt', whiteSpace: 'nowrap', lineHeight: '1' }}>
                  {c}
                </div>
              </th>
            ))}
            <th style={th} colSpan={2}>{SAFETY_SHOES_COL}</th>
            <th style={{ ...th, width: '85px' }} rowSpan={2}>Remarks</th>
          </tr>
          <tr>
            <th style={{ ...th, width: '22px' }}>QTY</th>
            <th style={{ ...th, width: '26px' }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {emps.slice(0, displayLimit).map((e, i) => (
            <tr key={i} style={{ height: '18px' }}>
              <td style={td}>{i + 1}</td>
              <td style={{ ...tdL, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</td>
              <td style={td}>{e.sn}</td>
              <td style={{ ...td, fontSize: '6.5pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.site}</td>
              {QTY_ONLY_COLUMNS.map(c => (
                <td key={c} style={td}>{e.items[c] || ''}</td>
              ))}
              <td style={td}>{e.items['Safety Shoes'] || ''}</td>
              <td style={td}>{e.items['Safety Shoes Size'] || ''}</td>
              <td style={{ ...tdL, fontSize: '6pt', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.remarks || '—'}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }).map((_, i) => (
            <tr key={`e${i}`} style={{ height: '18px' }}>
              <td style={td}>{emps.length + i + 1}</td>
              {Array.from({ length: QTY_ONLY_COLUMNS.length + 6 }).map((_, j) => (
                <td key={j} style={td}></td>
              ))}
            </tr>
          ))}
          <tr style={{ background: '#e5e7eb', fontWeight: 'bold', height: '19px' }}>
            <td style={td} colSpan={4}>Total Qty</td>
            {QTY_ONLY_COLUMNS.map(c => (
              <td key={c} style={td}>{totals[c] || ''}</td>
            ))}
            <td style={td}>{totals['Safety Shoes'] || ''}</td>
            <td style={td}>—</td>
            <td style={td}>—</td>
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: '12px', textAlign: 'center', marginTop: '6px' }}>
            {/* Diajukan Oleh */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diajukan Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}>
                  {data.submitterSignatureUrl && <img src={data.submitterSignatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
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
                    <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diperiksa Oleh,</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                      <div
                        id={`approver-cell-${idx + 1}`}
                        data-approver-id={appr.approverEmployeeId}
                        data-approver-name={appr.approverName}
                        data-approver-title={roleDisplay}
                        data-level={appr.level}
                        data-resolved={appr.signatureUrl ? 'true' : 'false'}
                        style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px', position: 'relative' }}
                      >
                        {appr.signatureUrl && <img src={appr.signatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
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
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Diperiksa Oleh,</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                  <div style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px' }}></div>
                </div>
                <div style={{ fontSize: '7.5pt', fontWeight: 'bold' }}>.............</div>
                <div style={{ fontSize: '6.5pt', color: '#444' }}>(Section Head — {data.sectionName})</div>
              </div>
            )}

            {/* Disetujui Oleh (Department Head) */}
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: 'bold', marginBottom: '3px' }}>Disetujui Oleh,</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '44px' }}>
                <div
                  id="approver-cell-dept"
                  data-approver-id={deptHead?.approverEmployeeId}
                  data-approver-name={deptHead?.approverName}
                  data-approver-title={deptHead?.approverJobTitle}
                  data-level={2}
                  data-resolved={deptHead?.signatureUrl ? 'true' : 'false'}
                  style={{ width: '130px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '2px', position: 'relative' }}
                >
                  {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{ maxHeight: '40px', maxWidth: '120px' }} />}
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

      <script dangerouslySetInnerHTML={{__html: `
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
              const img = document.createElement('img');
              img.src = dataUrl;
              img.alt = 'Live Preview';
              img.className = 'live-preview-sig';
              img.style.maxHeight = '40px';
              img.style.maxWidth = '120px';
              targetCell.appendChild(img);
            }
          }
        });
      `}} />
    </div>
  );
}
