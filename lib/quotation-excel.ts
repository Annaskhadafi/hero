import * as XLSX from 'xlsx'
import { getQuotationById } from '@/app/actions/service360'

const THIN = { style: 'thin' as const, color: { rgb: '000000' } }
const B = { top: THIN, bottom: THIN, left: THIN, right: THIN }
const NB = {} // no border
const CALIBRI = { name: 'Calibri' }

function enc(c: number) {
  let r = ''
  while (c >= 0) { r = String.fromCharCode(65 + (c % 26)) + r; c = Math.floor(c / 26) - 1 }
  return r
}
function ref(r: number, c: number) { return `${enc(c)}${r + 1}` }

const TEAL = '0D9488'
const DARK = '0F172A'
const WHITE = 'FFFFFF'

function tealFill() { return { fgColor: { rgb: TEAL } } }
function tealFont(sz = 10) { return { bold: true, sz, color: { rgb: WHITE }, ...CALIBRI } }
function boldDark(sz = 10) { return { bold: true, sz, color: { rgb: DARK }, ...CALIBRI } }
function normal() { return { sz: 10, ...CALIBRI } }
function muted() { return { sz: 9, color: { rgb: '64748B' }, ...CALIBRI } }

const C = { horizontal: 'center' as const, vertical: 'center' as const }
const L = { horizontal: 'left' as const, vertical: 'center' as const, wrapText: true }
const R = { horizontal: 'right' as const, vertical: 'center' as const }

function hdrCell() { return { font: tealFont(), fill: tealFill(), alignment: C, border: B } }
function numCell() { return { numFmt: '#,##0', alignment: R, border: B, font: normal() } }
function boldNum() { return { numFmt: '#,##0', alignment: R, border: B, font: boldDark() } }
function boldRight() { return { alignment: R, border: B, font: boldDark() } }
function centerCell() { return { alignment: C, border: B, font: normal() } }
function leftCell() { return { alignment: L, border: B, font: normal() } }
function boxTitle() { return { font: tealFont(8), fill: tealFill(), alignment: C, border: B } }
function boxLabel() { return { font: { bold: true, sz: 9, ...CALIBRI }, alignment: L, border: NB } }
function boxValue() { return { font: { sz: 9, ...CALIBRI }, alignment: L, border: NB } }

export async function generateQuotationExcel(id: number): Promise<Buffer> {
  const q = await getQuotationById(id)
  if (!q) throw new Error(`Quotation ${id} not found`)

  const showLv = q.showLevel !== false
  const showQty = q.showQty === true

  // Table columns: always A-G (7 cols), D=Level, E=Qty when shown
  const TBL_COLS = 7
  const colNo = 0, colMo = 1, colDesc = 2, colLv = 3, colQty = 4, colPrice = 5, colTotal = 6
  const colPriceL = enc(colPrice)  // F
  const colTotalL = enc(colTotal)  // G
  const colQtyL = enc(colQty)      // E

  // --- BUILD ROWS ---
  const R: any[][] = []

  function row(vals: any[]) {
    while (vals.length < 11) vals.push('')
    R.push(vals)
  }

  // Row 0: Company name
  row(['PT. CHITRA PARATAMA'])
  // Row 1: empty
  row([])
  // Row 2: empty
  row([])

  // --- INFO BOXES (rows 3-6) ---
  // Box 1: Customer Details (cols A-C)
  // Box 2: Project Details (cols E-G)
  // Box 3: Quotation ref (cols I-K)
  const dateStr = new Date(q.quotationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  // Row 3: Box titles
  const r3 = Array(11).fill('')
  r3[0] = 'CUSTOMER DETAILS'; r3[4] = 'PROJECT DETAILS'; r3[8] = 'QUOTATION'
  row(r3)

  // Row 4: To / From / QUOTATION title
  const r4a = Array(11).fill('')
  r4a[0] = 'To'; r4a[2] = q.customer?.customerName || '-'
  r4a[4] = 'From'; r4a[6] = q.fromName || '-'
  row(r4a)

  // Row 5: Attn / Subject / Ref
  const r5a = Array(11).fill('')
  r5a[0] = 'Attn'; r5a[2] = q.attn || '-'
  r5a[4] = 'Subject'; r5a[6] = q.subject || '-'
  r5a[8] = 'Ref:'; r5a[9] = q.quotationNumber
  row(r5a)

  // Row 6: Cc / PO Num / Date
  const r6a = Array(11).fill('')
  r6a[0] = 'Cc'; r6a[2] = q.cc || '-'
  r6a[4] = 'PO Num'; r6a[6] = q.poNumber || '-'
  r6a[8] = 'Date:'; r6a[9] = dateStr
  row(r6a)

  // Row 7: empty
  row([])

  // Row 8: Intro or empty (keep row count consistent)
  if (q.showIntro !== false) {
    const intro = q.customIntro || `Dear Mr. ${q.attn || '-'} / Mr. ${q.cc || '-'},\nAs you are aware, Tire Maintenance is performing services at ${q.projectName || '[Project]'}. We are pleased to quote you the labor price for our Tire Maintenance services as follows:`
    row([intro])
  } else {
    row([])
  }

  // Row 9: empty
  row([])

  // --- TABLE HEADER (row 10) ---
  const hdrRowIdx = R.length
  const hdr: any[] = ['No', 'Month Period', 'Description']
  while (hdr.length < TBL_COLS) hdr.push('')
  hdr[colLv] = showLv ? 'Level' : ''
  hdr[colQty] = showQty ? 'Qty' : ''
  hdr[colPrice] = 'Price/Month'
  hdr[colTotal] = 'Total (IDR)'
  row(hdr)

  // --- ITEMS ---
  const dataStart = R.length
  let itemNo = 0

  for (const { quotationItem: qi, item } of q.items) {
    itemNo++
    const desc = qi.customDescription || item?.name || ''
    const qty = Number(qi.quantity)
    const price = Number(qi.price)
    const period = qi.monthPeriod || ''

    // Primary row
    const dr = Array(11).fill('')
    dr[colNo] = itemNo
    dr[colMo] = period
    dr[colDesc] = desc
    if (showLv) dr[colLv] = qi.level || ''
    if (showQty) dr[colQty] = qty
    dr[colPrice] = price
    // colTotal: formula set later
    row(dr)

    // Backup row
    if (qi.isBackup && !q.hideBackupDate) {
      const br = Array(11).fill('')
      br[colNo] = ''
      br[colMo] = qi.backupMonthPeriod || ''
      br[colDesc] = qi.backupDescription || 'Backup'
      if (showLv) br[colLv] = qi.backupLevel || ''
      if (showQty) br[colQty] = qty
      br[colPrice] = Number(qi.backupPrice)
      row(br)
    }
  }

  const dataEnd = R.length - 1
  const hasItems = dataStart <= dataEnd

  // --- TOTAL BOX (cols I-J, below items) ---
  function mkRow(label: string) {
    const r = Array(11).fill('')
    r[8] = label
    return r
  }

  row([]) // spacer

  const subRow = R.length
  row(mkRow('Sub Total'))

  const nonVatRow = R.length
  row(mkRow('Total (Non VAT)'))

  const vatRow = R.length
  row(mkRow(`VAT (${Number(q.taxRate)}%)`))

  const gtRow = R.length
  row(mkRow('GRAND TOTAL'))

  // --- NOTES ---
  if (q.notes) {
    row([])
    const noteR = Array(11).fill('')
    noteR[0] = 'Notes:'
    row(noteR)
    const noteB = Array(11).fill('')
    noteB[0] = q.notes
    row(noteB)
  }

  // --- SIGNATURES ---
  row([])
  row([])
  const sigRow = R.length
  const sig = Array(11).fill('')
  sig[0] = 'Prepared By:'
  sig[8] = 'Acknowledged By:'
  row(sig)
  row([])
  const sigName = Array(11).fill('')
  sigName[0] = q.fromName || ''
  sigName[8] = q.attn || ''
  row(sigName)
  const sigDept = Array(11).fill('')
  sigDept[0] = 'PT. Chitra Paratama'
  sigDept[8] = q.customer?.customerName || ''
  row(sigDept)

  // --- BUILD WORKSHEET ---
  const ws = XLSX.utils.aoa_to_sheet(R)

  // --- COLUMN WIDTHS ---
  const widths = [6, 24, 42, 8, 7, 18, 20, 3, 16, 20, 16]
  ws['!cols'] = widths.map(w => ({ wch: w }))

  // --- MERGES ---
  ws['!merges'] = [
    // Title
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    // Customer box title
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } },
    // Project box title
    { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: 6 } },
    // Quotation box
    { s: { r: 3, c: 8 }, e: { r: 4, c: 10 } },
    { s: { r: 5, c: 9 }, e: { r: 5, c: 10 } },
    { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },
    // Intro
    { s: { r: 8, c: 0 }, e: { r: 8, c: 10 } },
    // Total box labels
    { s: { r: subRow, c: 8 }, e: { r: subRow, c: 8 } },
    { s: { r: nonVatRow, c: 8 }, e: { r: nonVatRow, c: 8 } },
    { s: { r: vatRow, c: 8 }, e: { r: vatRow, c: 8 } },
    { s: { r: gtRow, c: 8 }, e: { r: gtRow, c: 8 } },
  ]

  // --- STYLES ---
  // Title row
  ws[ref(0, 0)] = { v: 'PT. CHITRA PARATAMA', s: { font: { bold: true, sz: 18, ...CALIBRI, color: { rgb: DARK } }, alignment: C, border: NB } }

  // Box titles
  ws[ref(3, 0)] = { v: 'CUSTOMER DETAILS', s: boxTitle() }
  ws[ref(3, 4)] = { v: 'PROJECT DETAILS', s: boxTitle() }
  ws[ref(3, 8)] = { v: 'QUOTATION', s: { font: { bold: true, sz: 14, ...CALIBRI, color: { rgb: TEAL } }, alignment: C, border: NB } }

  // Box labels & values (rows 4-6)
  for (let rr = 4; rr <= 6; rr++) {
    ws[ref(rr, 0)] = { v: ws[ref(rr, 0)]?.v ?? '', s: boxLabel() }
    ws[ref(rr, 2)] = { v: ws[ref(rr, 2)]?.v ?? '', s: boxValue() }
    ws[ref(rr, 4)] = { v: ws[ref(rr, 4)]?.v ?? '', s: boxLabel() }
    ws[ref(rr, 6)] = { v: ws[ref(rr, 6)]?.v ?? '', s: boxValue() }
  }
  ws[ref(5, 8)] = { v: 'Ref:', s: boxLabel() }
  ws[ref(5, 9)] = { v: q.quotationNumber, s: boxValue() }
  ws[ref(6, 8)] = { v: 'Date:', s: boxLabel() }
  ws[ref(6, 9)] = { v: dateStr, s: boxValue() }

  // Intro text
  if (q.showIntro !== false) {
    ws[ref(8, 0)] = { v: ws[ref(8, 0)]?.v ?? '', s: { font: { sz: 9, ...CALIBRI, color: { rgb: '475569' } }, alignment: { ...L, wrapText: true }, border: NB } }
  }

  // Table header
  for (let c = 0; c < TBL_COLS; c++) {
    const val = (c === colLv && !showLv) || (c === colQty && !showQty) ? '' : hdr[c]
    ws[ref(hdrRowIdx, c)] = { v: val, s: hdrCell() }
  }

  // Data rows - formulas + styles
  for (let r = dataStart; r <= dataEnd; r++) {
    const er = r + 1

    // Total = Qty*Price or Price if no qty col
    const formula = showQty ? `${colQtyL}${er}*${colPriceL}${er}` : `${colPriceL}${er}`
    ws[ref(r, colTotal)] = { f: formula, s: numCell() }

    // Qty: number format
    if (showQty) {
      ws[ref(r, colQty)] = { v: ws[ref(r, colQty)]?.v ?? '', s: { ...numCell(), numFmt: '#,##0.00' } }
    }
    // Price: number format
    ws[ref(r, colPrice)] = { v: ws[ref(r, colPrice)]?.v ?? '', s: numCell() }

    // Style other columns
    for (let c = 0; c < TBL_COLS; c++) {
      if (c === colTotal || c === colPrice || (showQty && c === colQty)) continue
      const val = ws[ref(r, c)]?.v ?? ''
      if (c === colNo || c === colMo || (showLv && c === colLv)) {
        ws[ref(r, c)] = { v: val, s: centerCell() }
      } else {
        ws[ref(r, c)] = { v: val, s: leftCell() }
      }
    }

    // Alternate row shading
    if ((r - dataStart) % 2 === 0) {
      for (let c = 0; c < TBL_COLS; c++) {
        const cell = ws[ref(r, c)]
        if (cell?.s) cell.s.fill = { fgColor: { rgb: 'F8FAFC' } }
      }
    }
  }

  // --- TOTAL BOX FORMULAS ---
  const subER = subRow + 1
  const vatER = vatRow + 1
  const sumRange = hasItems ? `${colTotalL}${dataStart + 1}:${colTotalL}${dataEnd + 1}` : null
  const taxPct = Number(q.taxRate) / 100
  const TJ = 9 // total box value column (J)

  // Sub Total
  ws[ref(subRow, TJ)] = hasItems
    ? { f: `=SUM(${sumRange})`, s: boldNum() }
    : { v: 0, s: boldNum() }
  ws[ref(subRow, 8)] = { v: 'Sub Total', s: boldRight() }

  // Total (Non VAT) - same as subtotal
  ws[ref(nonVatRow, TJ)] = hasItems
    ? { f: `=SUM(${sumRange})`, s: numCell() }
    : { v: 0, s: numCell() }
  ws[ref(nonVatRow, 8)] = { v: 'Total (Non VAT)', s: { alignment: R, border: B, font: normal() } }

  // VAT
  ws[ref(vatRow, TJ)] = { f: `=ROUND(${enc(TJ)}${subER}*${taxPct},0)`, s: numCell() }
  ws[ref(vatRow, 8)] = { v: `VAT (${Number(q.taxRate)}%)`, s: { alignment: R, border: B, font: normal() } }

  // Grand Total
  ws[ref(gtRow, TJ)] = { f: `=${enc(TJ)}${subER}+${enc(TJ)}${vatER}`, s: { numFmt: '#,##0', font: tealFont(11), fill: tealFill(), alignment: R, border: B } }
  ws[ref(gtRow, 8)] = { v: 'GRAND TOTAL', s: { font: tealFont(11), fill: tealFill(), alignment: L, border: B } }

  // Total box separator lines (top border for each row)
  for (const rIdx of [subRow, nonVatRow, vatRow, gtRow]) {
    for (let c = 8; c <= 9; c++) {
      const cell = ws[ref(rIdx, c)]
      if (cell?.s) {
        cell.s.border = B
      }
    }
  }

  // Notes styling
  if (q.notes) {
    const noteStart = gtRow + 2 // label row (spacer=gtRow+1, label=gtRow+2, body=gtRow+3)
    ws[ref(noteStart, 0)] = { v: 'Notes:', s: boxLabel() }
    ws[ref(noteStart + 1, 0)] = { v: q.notes, s: { font: muted(), alignment: L, border: NB } }
  }

  // Signatures styling
  ws[ref(sigRow, 0)] = { v: 'Prepared By:', s: { font: { bold: true, sz: 9, ...CALIBRI, color: { rgb: '94A3B8' } }, alignment: C, border: NB } }
  ws[ref(sigRow, 8)] = { v: 'Acknowledged By:', s: { font: { bold: true, sz: 9, ...CALIBRI, color: { rgb: '94A3B8' } }, alignment: C, border: NB } }
  // Name rows with dashed underline
  ws[ref(sigRow + 2, 0)] = { v: q.fromName || '', s: { font: boldDark(11), alignment: C, border: { bottom: { style: 'dashed', color: { rgb: '94A3B8' } } } } }
  ws[ref(sigRow + 2, 8)] = { v: q.attn || '', s: { font: boldDark(11), alignment: C, border: { bottom: { style: 'dashed', color: { rgb: '94A3B8' } } } } }
  ws[ref(sigRow + 3, 0)] = { v: 'PT. Chitra Paratama', s: { font: muted(), alignment: C, border: NB } }
  ws[ref(sigRow + 3, 8)] = { v: q.customer?.customerName || '', s: { font: muted(), alignment: C, border: NB } }

  // --- Row heights ---
  ws['!rows'] = []
  ws['!rows'][0] = { hpt: 30 }
  ws['!rows'][8] = { hpt: 40 } // intro row

  // --- WORKBOOK ---
  const wb = XLSX.utils.book_new()
  const sn = q.quotationNumber.replace(/[\\\/\*\?\[\]:]/g, '-').substring(0, 31) || 'Quotation'
  XLSX.utils.book_append_sheet(wb, ws, sn)

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
