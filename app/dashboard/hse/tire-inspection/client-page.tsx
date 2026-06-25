"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { useVirtualizer } from "@tanstack/react-virtual"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { EnterpriseActionButtons } from "@/components/ui/enterprise-table-kit"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Plus, Camera, Activity, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { updateInspectionStatus } from "./actions"

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy")
}

function formatStatus(value: unknown) {
  return String(value || "draft").replace(/_/g, " ")
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Moderate"
  return "High Risk"
}

export function TireInspectionClient({ data, access, basePath = "/dashboard/hse/tire-inspection", isMobile = false }: { data: any[], access: any, basePath?: string, isMobile?: boolean }) {
  const router = useRouter()

  const columns = [
    {
      accessorKey: "inspectionDate",
      header: "Tanggal",
      cell: ({ row }: any) => formatDate(row.original.inspectionDate),
    },
    {
      accessorKey: "siteName",
      header: "Site",
    },
    {
      accessorKey: "customerName",
      header: "Customer",
    },
    {
      accessorKey: "shift",
      header: "Shift",
    },
    {
      accessorKey: "totalScore",
      header: "Skor",
      cell: ({ row }: any) => {
        const score = Number(row.original.totalScore || 0)
        let variant = "default" as any
        let label = scoreLabel(score)
        if (score >= 85) { variant = "success" }
        else if (score >= 70) { variant = "secondary"; label = "Good" }
        else if (score >= 50) { variant = "warning"; label = "Moderate" }
        else { variant = "destructive"; label = "High Risk" }
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold">{Number(score).toFixed(1)}</span>
            <Badge variant={variant}>{label}</Badge>
          </div>
        )
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const handleStatusChange = async (newStatus: string) => {
          try {
            await updateInspectionStatus(row.original.id, newStatus)
            toast.success("Status berhasil diubah")
          } catch (err: any) {
            toast.error(err.message || "Gagal mengubah status")
          }
        }
        
        if (!access.canEdit) {
          return <Badge variant="outline">{formatStatus(row.original.status)}</Badge>
        }
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className="cursor-pointer hover:bg-slate-50 transition-colors group">
                {formatStatus(row.original.status)}
                <ChevronDown className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {["draft", "in_review", "approved", "rejected", "report_generated"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="capitalize">
                  {formatStatus(s)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <EnterpriseActionButtons
          onView={() => router.push(`${basePath}/detail/${row.original.id}`)}
          access={access}
          onEdit={() => router.push(`${basePath}/edit/${row.original.id}`)}
        />
      ),
    },
  ]

  const scorecards = [
    {
      label: "Total Inspeksi",
      value: data.length.toString(),
      description: "Semua laporan inspeksi",
      icon: <Camera className="size-5 text-[#082033]" />,
    },
    {
      label: "Rata-rata Skor",
      value: (data.length ? (data.reduce((acc, curr) => acc + Number(curr.totalScore || 0), 0) / data.length).toFixed(1) : 0).toString(),
      description: "Skor kesehatan site",
      icon: <Activity className="size-5 text-[#082033]" />,
    },
  ]

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approx height of TableRow with standard padding
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()
  const before = items.length > 0 ? items[0].start : 0
  const after = items.length > 0 ? virtualizer.getTotalSize() - items[items.length - 1].end : 0

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Total</p>
            <p className="mt-2 text-2xl font-black">{data.length}</p>
            <p className="text-[11px] font-semibold text-white/70">Inspeksi</p>
          </div>
          <div className="rounded-[1.2rem] bg-white p-4 text-[#082033] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]/60">Avg Score</p>
            <p className="mt-2 text-2xl font-black">{scorecards[1].value}</p>
            <p className="text-[11px] font-semibold text-[#486275]">Site health</p>
          </div>
        </div>

        {access.canEdit ? (
          <Button className="h-12 w-full rounded-[1rem] bg-[#003f78] text-white shadow-[0_14px_28px_rgba(0,63,120,0.18)]" onClick={() => router.push(`${basePath}/create`)}>
            <Plus className="size-4" /> Inspeksi Baru
          </Button>
        ) : null}

        <section className="grid gap-3">
          {data.map((row: any, index: number) => {
            const score = Number(row.totalScore || 0)
            return (
              <article key={row.id || index} className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100/80 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-[#082033]">{row.siteName || "-"}</p>
                    <p className="mt-1 text-xs font-semibold text-[#486275]">{row.customerName || "-"} • {formatDate(row.inspectionDate)}</p>
                  </div>
                  {access.canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Badge variant="outline" className="shrink-0 rounded-full capitalize cursor-pointer hover:bg-slate-50 group">
                          {formatStatus(row.status)}
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {["draft", "in_review", "approved", "rejected", "report_generated"].map((s) => (
                          <DropdownMenuItem 
                            key={s} 
                            onClick={async () => {
                              try {
                                await updateInspectionStatus(row.id, s)
                                toast.success("Status berhasil diubah")
                              } catch (err: any) {
                                toast.error(err.message || "Gagal mengubah status")
                              }
                            }} 
                            className="capitalize"
                          >
                            {formatStatus(s)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="outline" className="shrink-0 rounded-full capitalize">{formatStatus(row.status)}</Badge>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-[#486275]">
                  <div className="rounded-[0.9rem] bg-[#f3faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#486275]/60">Score</p>
                    <p className="mt-1 text-lg font-black text-[#082033]">{score.toFixed(1)}</p>
                  </div>
                  <div className="rounded-[0.9rem] bg-[#f3faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#486275]/60">Risk</p>
                    <p className="mt-1 truncate text-sm font-black text-[#082033]">{scoreLabel(score)}</p>
                  </div>
                  <div className="rounded-[0.9rem] bg-[#f3faff] p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#486275]/60">Shift</p>
                    <p className="mt-1 truncate text-sm font-black text-[#082033]">{row.shift || "-"}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10 rounded-xl hover:bg-slate-50" onClick={() => router.push(`${basePath}/detail/${row.id}`)}><Eye className="size-4" /> Detail</Button>
                  {access.canEdit ? <Button variant="outline" className="h-10 rounded-xl hover:bg-slate-50" onClick={() => router.push(`${basePath}/edit/${row.id}`)}><Pencil className="size-4" /> Edit</Button> : null}
                </div>
              </article>
            )
          })}
          {data.length === 0 ? (
            <div className="rounded-[1.2rem] bg-white p-6 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
              Belum ada data inspeksi.
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <MinimalTableShell
      label="inspeksi site"
      fileName="tire-inspection-report"
      searchPlaceholder="Cari berdasarkan site atau customer..."
      scorecards={scorecards}
      access={access}
      primaryAction={
        access.canEdit && (
          <Button onClick={() => router.push(`${basePath}/create`)}>
            <Plus className="mr-2 h-4 w-4" />
            Inspeksi Baru
          </Button>
        )
      }
    >
      <div className="rounded-md border bg-card overflow-hidden">
        <div ref={parentRef} className="h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-accent relative">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
              <TableRow className="hover:bg-transparent">
                {columns.map((col: any) => (
                  <TableHead key={col.accessorKey || col.id} className="font-semibold text-slate-700">
                    {col.header || ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {before > 0 && (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={columns.length} style={{ height: `${before}px` }} className="p-0 border-0" />
                </TableRow>
              )}
              {items.map((virtualRow) => {
                const row = data[virtualRow.index]
                return (
                  <TableRow 
                    key={row.id || virtualRow.index} 
                    data-index={virtualRow.index} 
                    ref={virtualizer.measureElement}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    {columns.map((col: any) => (
                      <TableCell key={col.accessorKey || col.id} className="py-3">
                        {col.cell ? col.cell({ row: { original: row } }) : row[col.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
              {after > 0 && (
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={columns.length} style={{ height: `${after}px` }} className="p-0 border-0" />
                </TableRow>
              )}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                    Belum ada data inspeksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MinimalTableShell>
  )
}
