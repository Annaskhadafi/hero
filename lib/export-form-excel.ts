import ExcelJS from 'exceljs'
import type { FormExportData } from '@/lib/form-export-service'

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  if (typeof window !== 'undefined') {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim()
  return cleaned.slice(0, 31) || 'Respon Formulir'
}

export async function exportFormResponsesToExcel(data: FormExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HERO Portal - PT Chitra Paratama'
  workbook.created = new Date()

  const sheetName = sanitizeSheetName(data.templateName)
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  })

  // 1. Header Banner Atas (Title Block)
  worksheet.addRow(['SISTEM FORM & KUESIONER RESMI - PT CHITRA PARATAMA'])
  worksheet.addRow([data.templateName])
  worksheet.addRow([
    `Kategori: ${data.category || 'Survei'} | Total Respon: ${data.totalSubmissions} Responden | Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
  ])
  worksheet.addRow([]) // Row 4 Blank

  // Style Title Block
  const brandSubRow = worksheet.getRow(1)
  brandSubRow.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF64748B' } }
  brandSubRow.height = 18

  const titleRow = worksheet.getRow(2)
  titleRow.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0753E7' } }
  titleRow.height = 24

  const metaRow = worksheet.getRow(3)
  metaRow.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } }
  metaRow.height = 18

  // 2. Header Kolom Tabel (Row 5)
  const headerLabels = data.columns.map((c) => c.label)
  const headerRow = worksheet.addRow(headerLabels)
  headerRow.height = 32

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0753E7' }, // HERO Brand Blue
    }
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF023599' } },
      left: { style: 'thin', color: { argb: 'FF023599' } },
      bottom: { style: 'medium', color: { argb: 'FF023599' } },
      right: { style: 'thin', color: { argb: 'FF023599' } },
    }
  })

  // 3. Baris Data (Row 6 onwards)
  data.rows.forEach((rowItem, index) => {
    const rowValues = data.columns.map((c) => {
      const val = rowItem[c.key]
      if (val === undefined || val === null) return '-'
      return val
    })

    const dataRow = worksheet.addRow(rowValues)
    dataRow.height = 24

    const isOdd = index % 2 === 1
    const rowBgColor = isOdd ? 'FFF8FAFC' : 'FFFFFFFF'

    dataRow.eachCell((cell, colIndex) => {
      const colDef = data.columns[colIndex - 1]

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor },
      }

      cell.font = {
        name: 'Segoe UI',
        size: 9.5,
        color: { argb: 'FF0F172A' },
      }

      // Border halus
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      // Perataan dinamis berdasarkan tipe data
      if (
        ['id', 'respondentPhone', 'submittedAt', 'duration'].includes(colDef?.key || '') ||
        ['number', 'star_rating', 'slider', 'nps'].includes(colDef?.fieldType || '')
      ) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: false,
        }
      } else {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true,
        }
      }
    })
  })

  // 4. Hitung Dynamic Column Widths
  data.columns.forEach((col, idx) => {
    let maxLen = col.label ? col.label.length : 10

    // Cek sampel baris data
    for (let r = 0; r < Math.min(data.rows.length, 100); r++) {
      const cellVal = data.rows[r][col.key]
      if (cellVal !== undefined && cellVal !== null) {
        const strLen = String(cellVal).length
        if (strLen > maxLen) {
          maxLen = strLen
        }
      }
    }

    // Set kolom width: min 14, max 50
    const colWidth = Math.min(Math.max(maxLen + 4, 14), 50)
    worksheet.getColumn(idx + 1).width = colWidth
  })

  // 5. Tambahkan Filter Header
  if (data.columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: data.columns.length },
    }
  }

  // 6. Unduh File
  const dateStr = new Date().toISOString().split('T')[0]
  const cleanSlug = (data.slug || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `Respon_${cleanSlug}_${dateStr}.xlsx`

  await downloadWorkbook(workbook, filename)
}
