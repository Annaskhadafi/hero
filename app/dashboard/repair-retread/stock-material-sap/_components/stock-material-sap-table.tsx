"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Box, ChevronDown, ChevronUp, Download, Loader2, RefreshCcw, Search, TrendingUp } from "lucide-react"
import { format, isAfter, startOfDay, subDays } from "date-fns"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import * as XLSX from "xlsx"

import { ScoreCard } from "@/components/score-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { normalizeSloc } from "@/lib/sloc"

type StockMaterialSapItem = {
  stockId: number
  plantCode: string
  plantName: string
  materialNo: string
  oldMaterialNo: string
  materialDesc: string
  storLoc: string
  storLocDesc: string
  totalStock: number
  baseUnitOfMeasure: string
  valueStock: number
  currency: string
  extractedAt: string | null
  updatedAt: string | null
}

type StockMaterialSapResponse = {
  status: "OK" | "ERROR"
  result?: StockMaterialSapItem[]
  stats?: {
    totalCount: number
    outOfStockCount: number
    totalValue: number
  }
  pagination?: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  message?: string
}

type StockMaterialSapTableProps = {
  defaultRate: string
}

export function StockMaterialSapTable({ defaultRate }: StockMaterialSapTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [committedSearch, setCommittedSearch] = useState("")
  const [filterStorLocDesc, setFilterStorLocDesc] = useState("")
  const [sorting, setSorting] = useState<SortingState>([{ id: "totalStock", desc: true }])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(100)

  const parsedRate = useMemo(() => {
    const rate = parseFloat(defaultRate)
    return Number.isFinite(rate) ? rate : 16000
  }, [defaultRate])

  const safeNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const [responseData, setResponseData] = useState<StockMaterialSapResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: (pageIndex + 1).toString(),
        pageSize: pageSize.toString(),
        search: committedSearch,
        slocDesc: filterStorLocDesc,
        ts: Date.now().toString(),
      })
      const response = await fetch(`/api/stock-material-sap?${params.toString()}`, { cache: "no-store" })
      const result = (await response.json()) as StockMaterialSapResponse

      if (!response.ok || result.status !== "OK") {
        throw new Error(result.message || "Failed to fetch Repair Warehouse stock material SAP")
      }

      setResponseData(result)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch Repair Warehouse stock material SAP"))
    } finally {
      setIsLoading(false)
    }
  }, [committedSearch, filterStorLocDesc, pageIndex, pageSize])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const refetch = () => {
    void fetchData()
  }

  const data = useMemo(() => responseData?.result ?? [], [responseData])
  const pagination = responseData?.pagination
  const apiStats = responseData?.stats

  const updateStatus = useMemo(() => {
    if (data.length === 0) return null

    let latestDate = new Date(0)
    for (const item of data) {
      const dateStr = item.updatedAt || item.extractedAt
      if (!dateStr) continue
      const date = new Date(dateStr)
      if (date > latestDate) latestDate = date
    }

    if (latestDate.getTime() === 0) return null

    const yesterdayStart = startOfDay(subDays(new Date(), 1))
    const isUpdated = isAfter(latestDate, yesterdayStart) || latestDate.getTime() === yesterdayStart.getTime()

    return {
      dateStr: format(latestDate, "dd MMM yyyy, HH:mm"),
      isUpdated,
      message: isUpdated ? "Data sudah diperbarui" : "Data belum diperbarui",
    }
  }, [data])

  const columns = useMemo<ColumnDef<StockMaterialSapItem>[]>(
    () => [
      {
        accessorKey: "stockId",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">
            Stock ID
            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> : null}
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.stockId}</span>,
      },
      {
        accessorKey: "plantCode",
        header: "Plant",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.plantCode}</span>
            <span className="text-[10px] text-muted-foreground">{row.original.plantName}</span>
          </div>
        ),
      },
      {
        accessorKey: "materialNo",
        header: "Material",
      },
      {
        accessorKey: "oldMaterialNo",
        header: "Old Material",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.oldMaterialNo}</span>,
      },
      {
        accessorKey: "materialDesc",
        header: "Description",
        cell: ({ row }) => <span className="block max-w-[260px] truncate text-xs" title={row.original.materialDesc}>{row.original.materialDesc}</span>,
      },
      {
        accessorKey: "storLoc",
        header: "Storage Loc",
        cell: ({ row }) => <Badge variant="outline">{normalizeSloc(row.original.storLoc)}</Badge>,
      },
      {
        accessorKey: "storLocDesc",
        header: "Storage Loc Desc",
        cell: ({ row }) => <span className="block max-w-[180px] truncate text-xs italic text-muted-foreground" title={row.original.storLocDesc}>{row.original.storLocDesc}</span>,
      },
      {
        accessorKey: "totalStock",
        header: ({ column }) => (
          <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-mr-4 h-8">
              Qty
              {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> : null}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-right font-mono">{safeNumber(row.original.totalStock).toLocaleString("id-ID")}</div>,
      },
      {
        accessorKey: "baseUnitOfMeasure",
        header: "UoM",
        cell: ({ row }) => <span className="text-xs">{row.original.baseUnitOfMeasure}</span>,
      },
      {
        accessorKey: "valueStock",
        header: ({ column }) => (
          <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-mr-4 h-8">
              Value
              {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> : null}
            </Button>
          </div>
        ),
        cell: ({ row }) => <div className="text-right font-mono text-[10px]">{row.original.currency || "USD"} {safeNumber(row.original.valueStock).toLocaleString("id-ID")}</div>,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated At",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleString("id-ID")
              : row.original.extractedAt
                ? new Date(row.original.extractedAt).toLocaleString("id-ID")
                : "-"}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater
      setPageIndex(next.pageIndex)
      setPageSize(next.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
  })

  const stats = useMemo(() => ({
    totalItems: apiStats?.totalCount ?? 0,
    outOfStock: apiStats?.outOfStockCount ?? 0,
    totalValuationIdr: (apiStats?.totalValue ?? 0) * parsedRate,
  }), [apiStats, parsedRate])

  const handleExportExcel = () => {
    if (data.length === 0) return

    const exportRows = data.map((item) => ({
      "Stock ID": item.stockId,
      "Plant Code": item.plantCode,
      "Plant Name": item.plantName,
      "Material No": item.materialNo,
      "Old Material No": item.oldMaterialNo,
      "Material Description": item.materialDesc,
      "Storage Location": normalizeSloc(item.storLoc),
      "Storage Location Description": item.storLocDesc,
      "Total Stock": safeNumber(item.totalStock),
      UoM: item.baseUnitOfMeasure,
      "Value Stock": safeNumber(item.valueStock),
      Currency: item.currency,
      "Updated At": item.updatedAt ?? item.extractedAt ?? "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Material SAP")
    XLSX.writeFile(workbook, `stock-material-sap-repair-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-[520px] rounded-xl" />
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Fetching Repair Warehouse SAP stock...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-2 rounded-lg border bg-card/50 px-4 text-center">
        <p className="text-sm font-medium text-red-600">Failed to load Stock Material SAP</p>
        <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard
          title="Total Stock Items"
          value={stats.totalItems.toLocaleString("id-ID")}
          icon={Box}
          description="Stock units in Repair Warehouse plant 2002"
          gradient="from-blue-500/10 via-blue-400/5 to-indigo-500/10 border-blue-200/50 hover:shadow-lg"
          iconColor="text-blue-600"
          textColor="text-blue-900"
        />
        <ScoreCard
          title="Low / Out Stock Items"
          value={stats.outOfStock.toLocaleString("id-ID")}
          icon={AlertTriangle}
          description="Items with zero or negative quantity"
          gradient="from-amber-500/10 via-amber-400/5 to-orange-500/10 border-amber-200/50 hover:shadow-lg"
          iconColor="text-amber-600"
          textColor="text-amber-900"
        />
        <ScoreCard
          title="Total Valuation"
          value={`IDR ${stats.totalValuationIdr.toLocaleString("id-ID")}`}
          icon={TrendingUp}
          description={`Total inventory value (USD × ${parsedRate.toLocaleString("id-ID")})`}
          gradient="from-emerald-500/10 via-emerald-400/5 to-teal-500/10 border-emerald-200/50 hover:shadow-lg"
          iconColor="text-emerald-600"
          textColor="text-emerald-900"
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Repair Warehouse (2002)</div>
            {updateStatus ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Last update: {updateStatus.dateStr}</span>
                <Badge variant={updateStatus.isUpdated ? "secondary" : "destructive"} className={updateStatus.isUpdated ? "bg-emerald-100 text-emerald-800" : ""}>
                  {updateStatus.message}
                </Badge>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh DB Data
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search Material / SLoc</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by material or sloc... (press Enter)"
                className="pl-8"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setCommittedSearch(searchTerm.trim())
                    setPageIndex(0)
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">SLoc Description</label>
            <Input
              placeholder="Filter SLoc Desc..."
              value={filterStorLocDesc}
              onChange={(event) => {
                setFilterStorLocDesc(event.target.value)
                setPageIndex(0)
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("")
              setCommittedSearch("")
              setFilterStorLocDesc("")
              setPageIndex(0)
            }}
          >
            Reset Filter
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="h-[72vh] min-h-[620px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No records found for Repair Warehouse stock material SAP.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPageIndex(0)
            }}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {data.length.toLocaleString("id-ID")} of {(apiStats?.totalCount ?? 0).toLocaleString("id-ID")} Repair Warehouse records
      </div>
    </div>
  )
}
