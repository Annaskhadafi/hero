import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import {
  generateCapexBudgetTemplateWorkbook,
} from '@/lib/excel/capex-budget-template'

describe('Budget Controller Excel Import & Template Integration', () => {
  it('generates valid template workbook with 2 sheets and correct columns', () => {
    const wb = generateCapexBudgetTemplateWorkbook()
    expect(wb.SheetNames).toContain('Template Pagu CapEx')
    expect(wb.SheetNames).toContain('Petunjuk & Referensi')

    const sheet = wb.Sheets['Template Pagu CapEx']
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

    expect(data.length).toBeGreaterThanOrEqual(4) // 1 header + 3 sample rows
    const headers = data[0]

    expect(headers).toContain('Tahun Anggaran')
    expect(headers).toContain('Kode Anggaran')
    expect(headers).toContain('Nama Anggaran')
    expect(headers).toContain('Kategori Aset')
    expect(headers).toContain('Site')
    expect(headers).toContain('Departemen')
    expect(headers).toContain('Total Pagu (Rp)')
    expect(headers).toContain('Catatan')

    // Sample row checks
    const sampleRow1 = data[1]
    expect(sampleRow1[1]).toMatch(/^CAPEX-\d{4}-IT-001$/)
    expect(sampleRow1[3]).toBe('IT Device')
    expect(Number(sampleRow1[6])).toBe(75000000)
  })

  it('includes asset category reference guidelines in instructions sheet', () => {
    const wb = generateCapexBudgetTemplateWorkbook()
    const sheet = wb.Sheets['Petunjuk & Referensi']
    const text = XLSX.utils.sheet_to_csv(sheet)

    expect(text).toContain('IT Device')
    expect(text).toContain('Operational Equipment')
    expect(text).toContain('Vehicle / Alat Berat')
    expect(text).toContain('Tools & Workshop')
    expect(text).toContain('Office Facility')
    expect(text).toContain('Safety & Emergency')
    expect(text).toContain('Kode Anggaran')
    expect(text).toContain('Upsert')
  })

  it('declares importCapexBudgetsAction in budget-controller actions', () => {
    const actionsPath = path.join(
      process.cwd(),
      'app/dashboard/assets/budget-controller/actions.ts'
    )
    const content = fs.readFileSync(actionsPath, 'utf8')

    expect(content).toContain('export async function importCapexBudgetsAction')
    expect(content).toContain('ImportCapexBudgetItem')
    expect(content).toContain('ImportCapexBudgetResult')
    expect(content).toContain('VALID_ASSET_CATEGORIES')
    expect(content).toContain('cerCapexBudgets.budgetCode')
    expect(content).toContain('revalidatePath(\'/dashboard/assets/budget-controller\')')
    expect(content).toContain('revalidatePath(\'/dashboard/assets/cer\')')
  })

  it('wires Import Excel button and BudgetImportDialog into BudgetControllerView', () => {
    const viewPath = path.join(
      process.cwd(),
      'app/dashboard/assets/budget-controller/components/budget-controller-view.tsx'
    )
    const content = fs.readFileSync(viewPath, 'utf8')

    expect(content).toContain('import { BudgetImportDialog }')
    expect(content).toContain('isImportOpen')
    expect(content).toContain('setIsImportOpen(true)')
    expect(content).toContain('Import Excel')
    expect(content).toContain('<BudgetImportDialog')
  })

  it('provides BudgetImportDialog with template download, parser, and result summary', () => {
    const dialogPath = path.join(
      process.cwd(),
      'app/dashboard/assets/budget-controller/components/budget-import-dialog.tsx'
    )
    const content = fs.readFileSync(dialogPath, 'utf8')

    expect(content).toContain('downloadCapexBudgetTemplate')
    expect(content).toContain('importCapexBudgetsAction')
    expect(content).toContain('XLSX.read')
    expect(content).toContain('XLSX.utils.sheet_to_json')
    expect(content).toContain('Download Template (.xlsx)')
    expect(content).toContain('Pratinjau Data (5 Baris Pertama)')
    expect(content).toContain('Pagu Baru Ditambahkan')
    expect(content).toContain('Pagu Diperbarui')
    expect(content).toContain('Baris Dilewati')
  })
})
