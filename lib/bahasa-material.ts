import fs from "fs"
import path from "path"
import * as xlsx from "xlsx"

export type ParsedBahasaMaterialItem = {
  materialCode: string
  materialName: string
  notes: string
  pemakaian: string
  category: string
  uom: string
  valuationStockValue: string
  currency: string
  valuatedStock: string
  defaultQty?: string
  standardTime?: string
  smu?: string
}

export function parseBahasaMaterialExcel(filePath?: string): ParsedBahasaMaterialItem[] {
  const targetPath = filePath || path.join(process.cwd(), "public", "Bahasa Material.xlsx")
  if (!fs.existsSync(targetPath)) {
    return []
  }

  const fileBuffer = fs.readFileSync(targetPath)
  const workbook = xlsx.read(fileBuffer, { type: "buffer" })

  const itemsMap = new Map<string, ParsedBahasaMaterialItem>()

  // Process Sheet 1 (Code System, Catalog, Pemakaian)
  if (workbook.Sheets["Sheet1"]) {
    const s1: any[][] = xlsx.utils.sheet_to_json(workbook.Sheets["Sheet1"], { header: 1 })
    for (let i = 2; i < s1.length; i++) {
      const row = s1[i]
      if (!row || !row[1]) continue
      const code = String(row[1]).trim().toUpperCase()
      const catalog = row[2] ? String(row[2]).trim() : ""
      const pemakaian = row[3] ? String(row[3]).trim() : ""
      if (!code) continue

      itemsMap.set(code, {
        materialCode: code,
        materialName: catalog,
        notes: pemakaian ? `Pemakaian: ${pemakaian}` : "",
        pemakaian: pemakaian,
        category: "Material",
        uom: "PC",
        valuationStockValue: "",
        currency: "USD",
        valuatedStock: "",
        defaultQty: "",
        standardTime: "",
        smu: "",
      })
    }
  }

  // Process Sheet 2 (Code System, Catalog, Pemakaian, QTY, UOM, Category, SLoc, SLoc Description)
  if (workbook.Sheets["Sheet2"]) {
    const s2: any[][] = xlsx.utils.sheet_to_json(workbook.Sheets["Sheet2"], { header: 1 })
    for (let i = 1; i < s2.length; i++) {
      const row = s2[i]
      if (!row || !row[0]) continue
      const code = String(row[0]).trim().toUpperCase()
      const catalog = row[1] ? String(row[1]).trim() : ""
      const pemakaian = row[2] ? String(row[2]).trim() : ""
      const qty = row[3] !== undefined && row[3] !== null && String(row[3]).trim() !== "" ? String(row[3]).trim() : ""
      const uom = row[4] ? String(row[4]).trim().toUpperCase() : "PC"
      const category = row[5] ? String(row[5]).trim() : "Material"

      if (!code) continue

      const existing = itemsMap.get(code)
      if (existing) {
        if (catalog) existing.materialName = catalog
        if (pemakaian) {
          existing.pemakaian = pemakaian
          existing.notes = `Pemakaian: ${pemakaian}`
        }
        if (qty !== "") existing.valuationStockValue = qty
        if (uom) existing.uom = uom
        if (category) existing.category = category
      } else {
        itemsMap.set(code, {
          materialCode: code,
          materialName: catalog,
          notes: pemakaian ? `Pemakaian: ${pemakaian}` : "",
          pemakaian: pemakaian,
          category: category,
          uom: uom,
          valuationStockValue: qty,
          currency: "USD",
          valuatedStock: "",
          defaultQty: "",
          standardTime: "",
          smu: "",
        })
      }
    }
  }

  return Array.from(itemsMap.values())
}
