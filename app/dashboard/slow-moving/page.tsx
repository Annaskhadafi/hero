"use client"

import * as React from "react"
import { toast } from "sonner"
import { AdminPageShell } from "@/components/admin-page-shell"
import { AdminTableCard } from "@/components/admin-table-card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const productStock = [
  {
    id: "pms-001",
    name: "Material A",
    rows: [
      {
        materialNumber: "MTR-001",
        description: "Separator Sheet",
        allQty: 120,
        less366: 76,
        more366: 44,
        unitPrice: 13500,
      },
      {
        materialNumber: "MTR-002",
        description: "Brake Pad",
        allQty: 58,
        less366: 42,
        more366: 16,
        unitPrice: 24750,
      },
    ],
  },
  {
    id: "pms-002",
    name: "Material B",
    rows: [
      {
        materialNumber: "MTR-010",
        description: "Hydraulic Fluid",
        allQty: 234,
        less366: 162,
        more366: 72,
        unitPrice: 7100,
      },
      {
        materialNumber: "MTR-011",
        description: "O-ring Set",
        allQty: 98,
        less366: 65,
        more366: 33,
        unitPrice: 5200,
      },
    ],
  },
  {
    id: "pms-003",
    name: "Material C",
    rows: [
      {
        materialNumber: "MTR-021",
        description: "Starter Motor",
        allQty: 14,
        less366: 9,
        more366: 5,
        unitPrice: 183000,
      },
      {
        materialNumber: "MTR-022",
        description: "Battery Pack",
        allQty: 22,
        less366: 15,
        more366: 7,
        unitPrice: 265000,
      },
    ],
  },
]

const columns = [
  "No",
  "Material Number",
  "Desc",
  "All Qty",
  "<366",
  ">=366",
  "Unit Price",
  "Total Value",
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function SlowMovingPage() {
  const [selectedProduct, setSelectedProduct] = React.useState(productStock[0]?.id ?? "")
  const [rows, setRows] = React.useState(productStock[0]?.rows ?? [])
  const [isImported, setIsImported] = React.useState(false)

  const selectedProductLabel = productStock.find((product) => product.id === selectedProduct)?.name

  const handleImport = () => {
    const product = productStock.find((item) => item.id === selectedProduct)
    if (!product) {
      toast.error("Pilih produk terlebih dahulu sebelum import.")
      return
    }

    setRows(product.rows)
    setIsImported(true)
    toast.success(`Data stock ${product.name} berhasil diimport.`)
  }

  const tableRows = rows.map((row, index) => {
    const totalValue = row.allQty * row.unitPrice
    return [
      `${index + 1}`,
      row.materialNumber,
      row.description,
      `${row.allQty}`,
      `${row.less366}`,
      `${row.more366}`,
      formatCurrency(row.unitPrice),
      formatCurrency(totalValue),
    ]
  })

  return (
    <AdminPageShell
      eyebrow="Stock Report"
      title="Slow Moving"
      description="Lihat data stock slow moving berdasarkan produk, import dan review jumlah stok serta nilai totalnya."
    >
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Pilih produk untuk import stock</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="min-w-[16rem]">
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                {productStock.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{selectedProductLabel ? `Selected: ${selectedProductLabel}` : "Produk belum dipilih"}</span>
          <Separator orientation="vertical" className="h-6" />
          <span>{isImported ? `Rows imported: ${rows.length}` : "Belum diimport"}</span>
        </div>
      </div>

      <AdminTableCard
        title="Slow Moving Stock"
        description="Daftar material stock yang lambat bergerak berdasarkan produk yang di-import."
        columns={columns}
        rows={tableRows}
      />
    </AdminPageShell>
  )
}
