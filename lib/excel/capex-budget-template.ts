import * as XLSX from 'xlsx'

export function generateCapexBudgetTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Template Data
  const templateHeaders = [
    'Tahun Anggaran',
    'Kode Anggaran',
    'Nama Anggaran',
    'Kategori Aset',
    'Site',
    'Departemen',
    'Total Pagu (Rp)',
    'Catatan',
  ]

  const currentYear = new Date().getFullYear()

  const sampleData = [
    templateHeaders,
    [
      currentYear,
      `CAPEX-${currentYear}-IT-001`,
      'Pengadaan Laptop Developer & Workstation',
      'IT Device',
      'Head Office Balikpapan',
      'IT',
      75000000,
      'Penyegaran unit perangkat kerja pengembang',
    ],
    [
      currentYear,
      `CAPEX-${currentYear}-OP-001`,
      'Peralatan Safety & Perkakas Mekanik',
      'Operational Equipment',
      'CK MHU',
      'Mining Operations',
      120000000,
      'Alokasi perkakas pit service dan workshop',
    ],
    [
      currentYear,
      `CAPEX-${currentYear}-VH-001`,
      'Pengadaan Forklift Workshop Sentral',
      'Vehicle / Alat Berat',
      '', // Global
      '', // Global
      350000000,
      'Pagu aset berlaku global seluruh site',
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(sampleData)

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // Tahun Anggaran
    { wch: 22 }, // Kode Anggaran
    { wch: 42 }, // Nama Anggaran
    { wch: 25 }, // Kategori Aset
    { wch: 26 }, // Site
    { wch: 24 }, // Departemen
    { wch: 18 }, // Total Pagu
    { wch: 45 }, // Catatan
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Template Pagu CapEx')

  // Sheet 2: Petunjuk & Referensi
  const instructions = [
    ['PANDUAN & ATURAN PENGISIAN IMPORT BUDGET CONTROLLER (CAPEX)'],
    [''],
    ['1. Kolom Wajib Diisi:'],
    ['   - Tahun Anggaran : Angka tahun (contoh: 2026).'],
    ['   - Kode Anggaran  : Kode unik pengenal akun anggaran (contoh: CAPEX-2026-IT-001).'],
    ['   - Nama Anggaran  : Uraian/deskripsi pos belanja modal.'],
    ['   - Total Pagu (Rp): Nominal pagu belanja dalam angka bulat tanpa Rp/titik/koma (contoh: 50000000).'],
    [''],
    ['2. Kategori Aset yang Didukung:'],
    ['   - IT Device'],
    ['   - Operational Equipment'],
    ['   - Vehicle / Alat Berat'],
    ['   - Tools & Workshop'],
    ['   - Office Facility'],
    ['   - Safety & Emergency'],
    ['   - Other'],
    [''],
    ['3. Kolom Opsional (Site & Departemen):'],
    ['   - Kolom Site dan Departemen dapat dikosongkan jika pagu berlaku umum/global.'],
    ['   - Nama Site dan Departemen dicocokkan secara fleksibel (tidak membedakan huruf besar/kecil).'],
    [''],
    ['4. Aturan Pembaruan (Upsert) & Keamanan Data:'],
    ['   - Jika Kode Anggaran sudah ada di sistem, sistem otomatis melakukan pembaruan (Update).'],
    ['   - Jika pagu sudah memiliki transaksi pemakaian (CER terealisasi), nilai pagu baru tidak boleh lebih kecil dari dana yang sudah terpakai.'],
  ]

  const wsGuide = XLSX.utils.aoa_to_sheet(instructions)
  wsGuide['!cols'] = [{ wch: 95 }]
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk & Referensi')

  return wb
}

export function downloadCapexBudgetTemplate(): void {
  const wb = generateCapexBudgetTemplateWorkbook()
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Template_Import_Budget_CapEx_${new Date().getFullYear()}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
