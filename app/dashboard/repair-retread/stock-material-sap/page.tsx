import { Database } from "lucide-react"

import { StockMaterialSapTable } from "./_components/stock-material-sap-table"

export default function StockMaterialSapPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 lg:p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Database className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Repair & Retread Operation</div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Material SAP</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Data material SAP khusus Repair Warehouse dari plant 2002.
          </p>
        </div>
        <span className="ml-auto self-start rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Repair Warehouse 2002
        </span>
      </div>

      <StockMaterialSapTable defaultRate="16000" />
    </div>
  )
}
