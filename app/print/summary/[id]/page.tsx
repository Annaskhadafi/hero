import { getSummaryDetails } from '@/lib/summary-engine';

const QTY_ONLY_COLUMNS = [
  'Helmet', 'Safety Glasses', 'Masker Kain', 'Ear Plug',
  '3M Cartridge', 'Hand Glove (Kabel)', 'Hand Glove (Knit)',
  'Respirator Fullset', 'Hand Glove (Cotton)', 'Tool Box', 'Neck Guard',
  'Head Gear', 'Hard Helmet',
];
const SAFETY_SHOES_COL = 'Safety Shoes';

export default async function PrintSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summaryId = Number(id);
  const data = await getSummaryDetails(summaryId);

  if (!data) {
    return <html><body><div style={{textAlign:'center',padding:'50px'}}>Summary tidak ditemukan</div></body></html>;
  }

  const grouped: Record<string, {name:string;sn:string;site:string;items:Record<string,number>}> = {};
  for (const item of data.items) {
    if (!grouped[item.employeeName]) {
      grouped[item.employeeName] = { name: item.employeeName, sn: item.employeeSn, site: item.siteName, items: {} };
    }
    grouped[item.employeeName].items[item.itemName] = (grouped[item.employeeName].items[item.itemName] || 0) + item.quantity;
  }
  const emps = Object.values(grouped);

  const allCols = [...QTY_ONLY_COLUMNS, SAFETY_SHOES_COL];
  const totals: Record<string, number> = {};
  for (const col of allCols) {
    totals[col] = emps.reduce((s, e) => s + (e.items[col] || 0), 0);
  }
  const totalQty = Object.values(totals).reduce((s, v) => s + v, 0);

  const secHead = data.approvals.find(a => a.level === 1);
  const deptHead = data.approvals.find(a => a.level === 2);
  const sites = [...new Set(emps.map(e => e.site))];

  const th: React.CSSProperties = { border: '1px solid #000', padding: '2px 3px', fontSize: '7pt', background: '#f0f0f0', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.2' };
  const td: React.CSSProperties = { border: '1px solid #000', padding: '2px 3px', fontSize: '7pt', textAlign: 'center' };
  const tdL: React.CSSProperties = { ...td, textAlign: 'left' };
  const thVert: React.CSSProperties = { ...th, fontSize: '6pt', padding: '2px 1px', whiteSpace: 'nowrap', overflow: 'hidden', minWidth: '14px' };

  const fmtDate = (d: Date) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      fontSize: '8pt', 
      padding: '8mm 10mm', 
      overflow: 'hidden',
      background: '#fff',
      minHeight: '210mm',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @page { size: A4 landscape; margin: 8mm 10mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" style={{ height: '40px', width: 'auto' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Summary Permintaan Barang Safety
              {data.targetSite === 'VALE' && <span style={{ color: '#ea580c' }}> (Khusus VALE)</span>}
              {data.targetSite === 'GABUNGAN' && <span style={{ color: '#2563eb' }}> (Gabungan Site)</span>}
            </div>
            <div style={{ fontSize: '9pt', fontWeight: 'bold', marginTop: '2px' }}>{data.sectionName}</div>
          </div>
        </div>

        <div style={{ fontSize: '7.5pt', marginBottom: '6px', lineHeight: '1.4' }}>
          <div><strong>Tanggal Pengajuan:</strong> {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div>
          <div><strong>Department &amp; Lokasi:</strong> {data.departmentName} — {sites.join(', ')}</div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...th, writingMode: undefined, transform: undefined }} rowSpan={2}>No</th>
              <th style={{ ...th, width: '90px', writingMode: undefined, transform: undefined }} rowSpan={2}>Nama Karyawan</th>
              <th style={{ ...th, writingMode: undefined, transform: undefined }} rowSpan={2}>SN</th>
              <th style={{ ...th, writingMode: undefined, transform: undefined }} rowSpan={2}>Site</th>
              {QTY_ONLY_COLUMNS.map(c => (
                <th key={c} style={thVert} rowSpan={2}>{c}</th>
              ))}
              <th style={th} colSpan={3}>{SAFETY_SHOES_COL}</th>
            </tr>
            <tr>
              <th style={th}>QTY</th>
              <th style={th}>Size</th>
              <th style={th}>Masa Pakai</th>
            </tr>
          </thead>
          <tbody>
            {emps.slice(0, 10).map((e, i) => (
              <tr key={i}>
                <td style={td}>{i + 1}</td>
                <td style={tdL}>{e.name}</td>
                <td style={td}>{e.sn}</td>
                <td style={{ ...td, fontSize: '5.5pt' }}>{e.site}</td>
                {QTY_ONLY_COLUMNS.map(c => (
                  <td key={c} style={td}>{e.items[c] || ''}</td>
                ))}
                <td style={td}>{e.items['Safety Shoes'] || ''}</td>
                <td style={td}>{e.items['Safety Shoes Size'] || ''}</td>
                <td style={td}>{e.items['Safety Shoes Masa Pakai'] || ''}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 10 - emps.length) }).map((_, i) => (
              <tr key={`e${i}`}>
                <td style={td}>{emps.length + i + 1}</td>
                {Array.from({ length: QTY_ONLY_COLUMNS.length + 6 }).map((_, j) => (
                  <td key={j} style={td}></td>
                ))}
              </tr>
            ))}
            <tr style={{ background: '#e0e0e0', fontWeight: 'bold' }}>
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

        {/* Signatures — compact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center', marginTop: '8px' }}>
          {/* Diajukan Oleh */}
          <div>
            <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '4px' }}>Diajukan Oleh,</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '40px' }}>
              <div style={{ width: '140px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px' }}>
                {data.submitterSignatureUrl && <img src={data.submitterSignatureUrl} alt="TTD" style={{ maxHeight: '35px', maxWidth: '120px' }} />}
              </div>
            </div>
            <div style={{ fontSize: '7pt', fontWeight: 'bold' }}>{data.generatedByName}</div>
            <div style={{ fontSize: '6pt', color: '#666' }}>({data.sectionName} Admin)</div>
            {data.generatedAt && (
              <div style={{ fontSize: '5.5pt', color: '#999', marginTop: '1px' }}>{fmtDate(data.generatedAt)}</div>
            )}
          </div>
          {/* Diperiksa Oleh */}
          <div>
            <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '4px' }}>Diperiksa Oleh,</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '40px' }}>
              <div id="approver-cell-1" data-resolved={secHead?.signatureUrl ? 'true' : 'false'} style={{ width: '140px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', position: 'relative' }}>
                {secHead?.signatureUrl && <img src={secHead.signatureUrl} alt="TTD" style={{ maxHeight: '35px', maxWidth: '120px' }} />}
              </div>
            </div>
            <div style={{ fontSize: '7pt', fontWeight: 'bold' }}>{secHead?.approverName || '.............'}</div>
            <div style={{ fontSize: '6pt', color: '#666' }}>(Section Head — {data.sectionName})</div>
            {secHead?.reviewedAt && (
              <div style={{ fontSize: '5.5pt', color: '#999', marginTop: '1px' }}>{fmtDate(secHead.reviewedAt)}</div>
            )}
            {secHead?.decisionNote && (
              <div style={{ fontSize: '5.5pt', color: '#999', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {secHead.decisionNote}</div>
            )}
          </div>
          {/* Disetujui Oleh */}
          <div>
            <div style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '4px' }}>Disetujui Oleh,</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3px', height: '40px' }}>
              <div id="approver-cell-2" data-resolved={deptHead?.signatureUrl ? 'true' : 'false'} style={{ width: '140px', borderBottom: '1px solid #000', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '3px', position: 'relative' }}>
                {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{ maxHeight: '35px', maxWidth: '120px' }} />}
              </div>
            </div>
            <div style={{ fontSize: '7pt', fontWeight: 'bold' }}>{deptHead?.approverName || '.............'}</div>
            <div style={{ fontSize: '6pt', color: '#666' }}>(Department Head — {data.departmentName})</div>
            {deptHead?.reviewedAt && (
              <div style={{ fontSize: '5.5pt', color: '#999', marginTop: '1px' }}>{fmtDate(deptHead.reviewedAt)}</div>
            )}
            {deptHead?.decisionNote && (
              <div style={{ fontSize: '5.5pt', color: '#999', marginTop: '1px', fontStyle: 'italic' }}>Catatan: {deptHead.decisionNote}</div>
            )}
          </div>

        </div>

        <script dangerouslySetInnerHTML={{__html: `
          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'previewSignature') {
              const dataUrl = event.data.dataUrl;
              let targetCell = null;
              for (let i = 1; i <= 2; i++) {
                const cell = document.getElementById('approver-cell-' + i);
                if (cell && cell.getAttribute('data-resolved') !== 'true') {
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
                  const img = document.createElement('img');
                  img.src = dataUrl;
                  img.alt = 'Live Preview';
                  img.className = 'live-preview-sig';
                  img.style.maxHeight = '35px';
                  img.style.maxWidth = '120px';
                  targetCell.appendChild(img);
                }
              }
            }
          });
        `}} />
    </div>
  );
}
