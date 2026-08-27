const fs = require('fs');
const content = `import { getSummaryDetails, APD_ITEM_COLUMNS } from '@/lib/summary-engine';

export default async function PrintSummaryPage({ params }: { params: { id: string } }) {
  const summaryId = Number(params.id);
  const data = await getSummaryDetails(summaryId);

  if (!data) {
    return <div style={{textAlign:'center',padding:'50px'}}>Summary tidak ditemukan</div>;
  }

  const grouped: Record<string, {name:string;sn:string;site:string;items:Record<string,number>}> = {};
  for (const item of data.items) {
    if (!grouped[item.employeeName]) {
      grouped[item.employeeName] = { name: item.employeeName, sn: item.employeeSn, site: item.siteName, items: {} };
    }
    grouped[item.employeeName].items[item.itemName] = (grouped[item.employeeName].items[item.itemName] || 0) + item.quantity;
  }
  const emps = Object.values(grouped);

  const totals: Record<string, number> = {};
  for (const col of APD_ITEM_COLUMNS) {
    const t = emps.reduce((s, e) => s + (e.items[col] || 0), 0);
    if (t > 0) totals[col] = t;
  }

  const cols1 = APD_ITEM_COLUMNS.slice(0, 7);
  const cols2 = APD_ITEM_COLUMNS.slice(7);
  const secHead = data.approvals.find(a => a.level === 1);
  const deptHead = data.approvals.find(a => a.level === 2);

  const th: React.CSSProperties = {border:'1px solid #000',padding:'4px 6px',fontSize:'8pt',background:'#f0f0f0',textAlign:'center'};
  const td: React.CSSProperties = {border:'1px solid #000',padding:'4px 6px',fontSize:'8pt',textAlign:'center'};
  const tdL: React.CSSProperties = {...td, textAlign:'left'};

  return (
    <html>
      <head><title>Summary {data.summaryNumber}</title></head>
      <body style={{fontFamily:'Arial',fontSize:'10pt',margin:0,padding:'15mm'}}>
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <h1 style={{fontSize:'14pt',margin:'0 0 5px'}}>SUMMARY PERMINTAAN BARANG SAFETY</h1>
          <h2 style={{fontSize:'12pt',margin:'0 0 5px',fontWeight:'normal'}}>Section: {data.sectionName}</h2>
          <p style={{margin:'2px 0'}}>Department: {data.departmentName}</p>
          <p style={{margin:'2px 0'}}>Tanggal: {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString('id-ID') : '-'}</p>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'15px'}}>
          <thead><tr>
            <th style={th}>No</th><th style={{...th,width:'120px'}}>Nama</th><th style={th}>SN</th><th style={{...th,width:'80px'}}>Site</th>
            {cols1.map(c => <th key={c} style={th}>{c}</th>)}
          </tr></thead>
          <tbody>
            {emps.slice(0,10).map((e,i) => (
              <tr key={i}>
                <td style={td}>{i+1}</td><td style={tdL}>{e.name}</td><td style={td}>{e.sn}</td><td style={tdL}>{e.site}</td>
                {cols1.map(c => <td key={c} style={td}>{e.items[c]||'-'}</td>)}
              </tr>
            ))}
            {Array.from({length:Math.max(0,10-emps.length)}).map((_,i)=>(
              <tr key={'e'+i}>
                <td style={td}>{emps.length+i+1}</td><td style={td}></td><td style={td}></td><td style={td}></td>
                {cols1.map(c=><td key={c} style={td}></td>)}
              </tr>
            ))}
            <tr style={{background:'#e0e0e0',fontWeight:'bold'}}>
              <td style={td} colSpan={4}>Total Qty</td>
              {cols1.map(c=><td key={c} style={td}>{totals[c]||0}</td>)}
            </tr>
          </tbody>
        </table>

        {cols2.length > 0 && (
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'15px'}}>
            <thead><tr>
              <th style={th}>No</th><th style={{...th,width:'120px'}}>Nama</th><th style={th}>SN</th><th style={{...th,width:'80px'}}>Site</th>
              {cols2.map(c => <th key={c} style={th}>{c}</th>)}
            </tr></thead>
            <tbody>
              {emps.slice(0,10).map((e,i) => (
                <tr key={i}>
                  <td style={td}>{i+1}</td><td style={tdL}>{e.name}</td><td style={td}>{e.sn}</td><td style={tdL}>{e.site}</td>
                  {cols2.map(c => <td key={c} style={td}>{e.items[c]||'-'}</td>)}
                </tr>
              ))}
              {Array.from({length:Math.max(0,10-emps.length)}).map((_,i)=>(
                <tr key={'e'+i}>
                  <td style={td}>{emps.length+i+1}</td><td style={td}></td><td style={td}></td><td style={td}></td>
                  {cols2.map(c=><td key={c} style={td}></td>)}
                </tr>
              ))}
              <tr style={{background:'#e0e0e0',fontWeight:'bold'}}>
                <td style={td} colSpan={4}>Total Qty</td>
                {cols2.map(c=><td key={c} style={td}>{totals[c]||0}</td>)}
              </tr>
            </tbody>
          </table>
        )}

        <div style={{marginTop:'20px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px',textAlign:'center'}}>
            <div>
              <div style={{fontSize:'9pt',marginBottom:'5px'}}>Diajukan Oleh:</div>
              <div style={{borderBottom:'1px solid #000',height:'40px',margin:'5px 0'}}></div>
              <div style={{fontSize:'9pt',fontWeight:'bold'}}>{data.generatedByName}</div>
              <div style={{fontSize:'8pt',color:'#666'}}>Admin</div>
            </div>
            <div>
              <div style={{fontSize:'9pt',marginBottom:'5px'}}>Diperiksa Oleh:</div>
              <div style={{borderBottom:'1px solid #000',height:'40px',margin:'5px 0'}}>
                {secHead?.signatureUrl && <img src={secHead.signatureUrl} alt="TTD" style={{maxHeight:'35px'}} />}
              </div>
              <div style={{fontSize:'9pt',fontWeight:'bold'}}>{secHead?.approverName || '.............'}</div>
              <div style={{fontSize:'8pt',color:'#666'}}>Section Head</div>
            </div>
            <div>
              <div style={{fontSize:'9pt',marginBottom:'5px'}}>Disetujui Oleh:</div>
              <div style={{borderBottom:'1px solid #000',height:'40px',margin:'5px 0'}}>
                {deptHead?.signatureUrl && <img src={deptHead.signatureUrl} alt="TTD" style={{maxHeight:'35px'}} />}
              </div>
              <div style={{fontSize:'9pt',fontWeight:'bold'}}>{deptHead?.approverName || '.............'}</div>
              <div style={{fontSize:'8pt',color:'#666'}}>Department Head</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
`;
fs.writeFileSync('app/print/summary/[id]/page.tsx', content);
console.log('Print page rewritten');
