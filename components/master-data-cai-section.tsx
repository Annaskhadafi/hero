"use client"

import { useMemo, useState } from "react"
import { Building2, Copy, Database, Download, Search, Tag, Check } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type KpcCaiItem = {
  size: string
  brand: string
  cai: string
}

export type OtherCustomerCaiItem = {
  size: string
  cai: string
}

export const KPC_CAI_DATA: KpcCaiItem[] = [
  { size: "53/80R63", brand: "BRIDGESTONE", cai: "615163A101" },
  { size: "53/80R63", brand: "MICHELIN", cai: "610163A101" },
  { size: "53/80R63", brand: "GOOD YEAR", cai: "611163A101" },
  { size: "33.00R51", brand: "GOOD YEAR", cai: "611151B101" },
  { size: "33.00R51", brand: "BRIDGESTONE", cai: "615151B101" },
  { size: "37.00R57", brand: "BRIDGESTONE", cai: "615157A101" },
  { size: "37.00R57", brand: "MICHELIN", cai: "610157A101" },
  { size: "37.00R57", brand: "GOOD YEAR", cai: "611157A101" },
]

export const OTHER_CUSTOMER_CAI_DATA: OtherCustomerCaiItem[] = [
  { size: "27.00 R 49", cai: "699149C101" },
  { size: "24.00 R 35", cai: "699135Z101" },
  { size: "12.00 R 24", cai: "699224F201" },
  { size: "11.00 R 20", cai: "699120G201" },
  { size: "12.00 R 20", cai: "699120B201" },
  { size: "18.00 R 25", cai: "699124B102" },
  { size: "20.5 R 25", cai: "699125H101" },
  { size: "18.5 R 25", cai: "699325F103" },
  { size: "23.5 R 25", cai: "699125J101" },
  { size: "29.5 R 25", cai: "699125M101" },
  { size: "325/94 R 24", cai: "699124B101" },
  { size: "33.00 R 51", cai: "699151B101" },
  { size: "37.00 R 57", cai: "699457A101" },
  { size: "45/65 R 45", cai: "699145A101" },
  { size: "29.5 R 29", cai: "699229B101" },
]

export function MasterDataCaiSection() {
  const [activeTab, setActiveTab] = useState("all")
  const [query, setQuery] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredKpc = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KPC_CAI_DATA
    return KPC_CAI_DATA.filter(
      (item) =>
        item.size.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.cai.toLowerCase().includes(q) ||
        `${item.size}${item.brand}`.toLowerCase().includes(q)
    )
  }, [query])

  const filteredOther = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return OTHER_CUSTOMER_CAI_DATA
    return OTHER_CUSTOMER_CAI_DATA.filter(
      (item) => item.size.toLowerCase().includes(q) || item.cai.toLowerCase().includes(q)
    )
  }, [query])

  const handleCopyCai = (caiCode: string) => {
    void navigator.clipboard.writeText(caiCode)
    setCopiedCode(caiCode)
    toast.success(`Kode CAI '${caiCode}' berhasil disalin!`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx")

    const kpcRows = KPC_CAI_DATA.map((item) => ({
      Customer: "PT Kaltim Prima Coal",
      Type: "Tire Repair",
      SIZE: item.size,
      BRAND: item.brand,
      Merge: `${item.size}${item.brand}`,
      CAI: item.cai,
    }))

    const otherRows = OTHER_CUSTOMER_CAI_DATA.map((item) => ({
      Customer: "OTHER CUSTOMER",
      Type: "Tire Repair",
      SIZE: item.size,
      BRAND: "-",
      Merge: item.size,
      CAI: item.cai,
    }))

    const wb = XLSX.utils.book_new()
    const wsKpc = XLSX.utils.json_to_sheet(kpcRows)
    const wsOther = XLSX.utils.json_to_sheet(otherRows)

    XLSX.utils.book_append_sheet(wb, wsKpc, "KPC CAI")
    XLSX.utils.book_append_sheet(wb, wsOther, "Other Customer CAI")

    XLSX.writeFile(wb, `Master_Data_CAI_Tire_Repair_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm mt-8">
      <CardHeader className="border-b bg-slate-50/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 font-semibold text-xs">
                Type: Tire Repair
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Master Data Referensi CAI
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-violet-600" />
              Master Data CAI
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daftar pemetaan Kode CAI berdasarkan Ukuran Ban (Size) &amp; Brand untuk <strong>PT Kaltim Prima Coal</strong> dan <strong>Other Customer</strong>.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel CAI
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Search & Tabs Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Size, Brand, atau Kode CAI..."
              className="h-10 rounded-xl pl-9 text-xs"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="h-10 rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-4">
                Semua ({filteredKpc.length + filteredOther.length})
              </TabsTrigger>
              <TabsTrigger value="kpc" className="rounded-lg text-xs font-semibold px-4">
                PT Kaltim Prima Coal ({filteredKpc.length})
              </TabsTrigger>
              <TabsTrigger value="other" className="rounded-lg text-xs font-semibold px-4">
                Other Customer ({filteredOther.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Views */}
        <div className="space-y-6">
          {(activeTab === "all" || activeTab === "kpc") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-600" />
                  Customer: PT Kaltim Prima Coal
                  <Badge variant="secondary" className="rounded-full text-xs ml-1">
                    {filteredKpc.length} record
                  </Badge>
                </h4>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="w-[160px]">SIZE</TableHead>
                      <TableHead className="w-[180px]">BRAND</TableHead>
                      <TableHead className="w-[260px]">Merge (Size + Brand)</TableHead>
                      <TableHead className="w-[180px]">Kode CAI</TableHead>
                      <TableHead className="w-20 text-center">Salin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {filteredKpc.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                          Tidak ada data CAI PT Kaltim Prima Coal yang cocok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKpc.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/70">
                          <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-900 font-mono">{row.size}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">
                              {row.brand}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-slate-600">{`${row.size}${row.brand}`}</TableCell>
                          <TableCell>
                            <span className="font-mono font-extrabold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200 text-xs inline-block">
                              {row.cai}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyCai(row.cai)}
                              title="Salin Kode CAI"
                              className="h-7 w-7 text-slate-500 hover:text-violet-600"
                            >
                              {copiedCode === row.cai ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {(activeTab === "all" || activeTab === "other") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  OTHER CUSTOMER
                  <Badge variant="secondary" className="rounded-full text-xs ml-1">
                    {filteredOther.length} record
                  </Badge>
                </h4>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="w-[240px]">SIZE</TableHead>
                      <TableHead className="w-[240px]">Kode CAI</TableHead>
                      <TableHead className="w-20 text-center">Salin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {filteredOther.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                          Tidak ada data CAI Other Customer yang cocok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOther.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-50/70">
                          <TableCell className="text-center font-semibold text-slate-500">{idx + 1}</TableCell>
                          <TableCell className="font-bold text-slate-900 font-mono text-xs">{row.size}</TableCell>
                          <TableCell>
                            <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs inline-block">
                              {row.cai}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyCai(row.cai)}
                              title="Salin Kode CAI"
                              className="h-7 w-7 text-slate-500 hover:text-emerald-600"
                            >
                              {copiedCode === row.cai ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
