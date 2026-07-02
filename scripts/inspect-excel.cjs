const XLSX = require('xlsx');

const filePath = 'D:\\DATA SERVICE\\UPDATE ROOSTER TOOLS 2026.xlsx';
const wb = XLSX.readFile(filePath);

wb.SheetNames.forEach((sheetName, idx) => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  // Find header row (look for row with NO ASSET or asset-related column headers)
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    const rowStr = JSON.stringify(row).toLowerCase();
    if (rowStr.includes('no asset') || rowStr.includes('location') || rowStr.includes('sn')) {
      headerRow = i;
      break;
    }
  }
  
  console.log(`\n=== SHEET: ${sheetName} (${data.length} rows, header at row ${headerRow}) ===`);
  if (headerRow >= 0) {
    console.log('HEADERS:', JSON.stringify(data[headerRow]));
    if (data[headerRow + 1]) console.log('ROW 1:', JSON.stringify(data[headerRow + 1]));
    if (data[headerRow + 2]) console.log('ROW 2:', JSON.stringify(data[headerRow + 2]));
  } else {
    console.log('First rows:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`  [${i}]:`, JSON.stringify(data[i]));
    }
  }
});
