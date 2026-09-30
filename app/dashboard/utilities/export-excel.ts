import type { UtilitiesDashboardData } from '@/lib/utilities-dashboard'

export async function exportUtilitiesToExcel(data: UtilitiesDashboardData, fileName?: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Rekapitulasi per Tanggal (Persis lembar referensi Excel) ──
  const dateHeaders = ['TGL', 'HARI', ...data.activityColumns, 'DURASI (JAM)', 'TOTAL OUTPUT']
  const dateRows: any[][] = []

  for (const row of data.dateMatrix.rows) {
    const r: any[] = [
      row.dateLabel,
      row.dayName,
      ...data.activityColumns.map((col) => row.counts[col] || 0),
      row.totalRowDurationHours,
      row.totalRowOutput,
    ]
    dateRows.push(r)
  }

  // Baris Total / SUM di bawah persis format Excel
  const sumRow: any[] = [
    'SUM',
    'TOTAL',
    ...data.activityColumns.map((col) => data.dateMatrix.summaryRow.counts[col] || 0),
    data.dateMatrix.summaryRow.totalDurationHours,
    data.dateMatrix.summaryRow.totalOutput,
  ]
  dateRows.push(sumRow)

  const dateWs = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI UTILITIES OPERASIONAL SITE: ${data.currentSite.name.toUpperCase()}`],
    [`PERIODE: ${data.startDate} s/d ${data.endDate}`],
    [],
    dateHeaders,
    ...dateRows,
  ])
  XLSX.utils.book_append_sheet(wb, dateWs, 'Rekap per Tanggal')

  // ── Sheet 2: Rekapitulasi per Teknisi / Karyawan ──
  const techHeaders = ['NAMA TEKNISI', 'EMPLOYEE SN', 'JABATAN', ...data.activityColumns, 'TOTAL DURASI (JAM)', 'TOTAL OUTPUT']
  const techRows: any[][] = []

  for (const t of data.technicianMatrix.rows) {
    const r: any[] = [
      t.employeeName,
      t.employeeSn,
      t.jobTitle,
      ...data.activityColumns.map((col) => t.counts[col] || 0),
      t.totalRowDurationHours,
      t.totalRowOutput,
    ]
    techRows.push(r)
  }

  const techWs = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI OUTPUT TEKNISI UTILITIES: ${data.currentSite.name.toUpperCase()}`],
    [`PERIODE: ${data.startDate} s/d ${data.endDate}`],
    [],
    techHeaders,
    ...techRows,
  ])
  XLSX.utils.book_append_sheet(wb, techWs, 'Rekap per Teknisi')

  // ── Sheet 3: Rekapitulasi per Unit Operasional ──
  const unitHeaders = ['NOMOR UNIT', ...data.activityColumns, 'TOTAL DURASI (JAM)', 'TOTAL OUTPUT PEKERJAAN']
  const unitRows: any[][] = []

  for (const u of data.unitMatrix.rows) {
    const r: any[] = [
      u.unitNumber,
      ...data.activityColumns.map((col) => u.counts[col] || 0),
      u.totalRowDurationHours,
      u.totalRowOutput,
    ]
    unitRows.push(r)
  }

  const unitWs = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI UNIT OPERASIONAL UTILITIES: ${data.currentSite.name.toUpperCase()}`],
    [`PERIODE: ${data.startDate} s/d ${data.endDate}`],
    [],
    unitHeaders,
    ...unitRows,
  ])
  XLSX.utils.book_append_sheet(wb, unitWs, 'Rekap per Unit')

  const cleanSiteName = data.currentSite.name.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const defaultFileName = `Utilities_Site_${cleanSiteName}_${data.startDate}_sd_${data.endDate}.xlsx`
  XLSX.writeFile(wb, fileName || defaultFileName)
}

export function exportUtilitiesToCsv(data: UtilitiesDashboardData, fileName?: string) {
  const headers = ['Tanggal', 'Hari', ...data.activityColumns, 'Durasi_Jam', 'Total_Output']
  const rows = data.dateMatrix.rows.map((row) => [
    `"${row.dateLabel}"`,
    `"${row.dayName}"`,
    ...data.activityColumns.map((col) => row.counts[col] || 0),
    row.totalRowDurationHours,
    row.totalRowOutput,
  ])

  // Summary row
  rows.push([
    '"SUM"',
    '"TOTAL"',
    ...data.activityColumns.map((col) => data.dateMatrix.summaryRow.counts[col] || 0),
    data.dateMatrix.summaryRow.totalDurationHours,
    data.dateMatrix.summaryRow.totalOutput,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const cleanSiteName = data.currentSite.name.replace(/[^a-zA-Z0-9_\-]/g, '_')
  a.download = fileName || `Utilities_Site_${cleanSiteName}_${data.startDate}_sd_${data.endDate}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
