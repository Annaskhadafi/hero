"use client"

import * as React from "react"
import { Eye, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HiradcEntryRow, HiradcRegisterRow } from "@/lib/hiradc/queries"
import { HiradcDetailDialog } from "./hiradc-detail-dialog"
import { HiradcEntryFormDialog } from "./hiradc-entry-form"
import { deleteHiradcEntryAction } from "@/app/dashboard/hse/hiradc/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type HiradcEntryWithRegister = HiradcEntryRow & {
  register: HiradcRegisterRow | null
}

interface HiradcClientTableProps {
  data: HiradcEntryWithRegister[]
  registers: HiradcRegisterRow[]
  canEdit: boolean
}

export function HiradcClientTable({ data, registers, canEdit }: HiradcClientTableProps) {
  const [filter, setFilter] = React.useState<"ALL" | "EXTREME" | "HIGH" | "MODERATE" | "LOW">("ALL")
  const [search, setSearch] = React.useState("")
  const [pageSize, setPageSize] = React.useState("10")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("ALL")

  // Form states
  const [formOpen, setFormOpen] = React.useState(false)
  const [selectedEntry, setSelectedEntry] = React.useState<HiradcEntryWithRegister | null>(null)

  const uniqueDepartments = React.useMemo(() => {
    const deps = new Set(data.map(d => d.department))
    return Array.from(deps).filter(Boolean).sort()
  }, [data])

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      // Risk filter
      if (filter !== "ALL" && item.riskLevelBefore !== filter) return false
      
      // Department filter
      if (departmentFilter !== "ALL" && item.department !== departmentFilter) return false
      
      // Search filter
      if (search) {
        const q = search.toLowerCase()
        if (
          !item.activityName?.toLowerCase().includes(q) &&
          !item.hazardDetails?.toLowerCase().includes(q) &&
          !item.riskConsequence?.toLowerCase().includes(q) &&
          !item.department?.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [data, filter, search, departmentFilter])

  // Group by Activity Name
  const groupedData = React.useMemo(() => {
    const groups = new Map<string, HiradcEntryWithRegister[]>()
    filteredData.forEach(item => {
      const key = item.activityName || "Unknown Activity"
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })
    return Array.from(groups.values())
  }, [filteredData])

  const totalPages = Math.ceil(groupedData.length / Number(pageSize))
  const paginatedGroups = groupedData.slice(
    (currentPage - 1) * Number(pageSize),
    currentPage * Number(pageSize)
  )

  const handleAdd = () => {
    setSelectedEntry(null)
    setFormOpen(true)
  }

  const handleEdit = (entry: HiradcEntryWithRegister) => {
    setSelectedEntry(entry)
    setFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm(`Apakah Anda yakin ingin menghapus baris HIRADC ini?`)) {
      const formData = new FormData()
      formData.append("id", id.toString())
      
      try {
        const res = await deleteHiradcEntryAction({ ok: false, message: "" }, formData)
        if (res.ok) {
          toast.success(res.message || "Baris HIRADC berhasil dihapus")
        } else {
          toast.error(res.message || "Gagal menghapus baris HIRADC")
        }
      } catch (err) {
        console.error(err)
        toast.error("Terjadi kesalahan saat menghapus data")
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight italic">HIRADC & RISK MANAGEMENT</h2>
          <p className="text-sm text-slate-500">Identifikasi Bahaya, Penilaian Risiko, dan Penetapan Kontrol</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(["ALL", "EXTREME", "HIGH", "MODERATE", "LOW"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f as any); setCurrentPage(1) }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  filter === f
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button onClick={handleAdd} className="bg-[#1a2332] text-white hover:bg-[#1a2332]/90 rounded-lg">
              + HIRADC Baru
            </Button>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show</span>
          <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[70px] h-8 bg-white">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>activities</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Department:</span>
            <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-[180px] h-8 bg-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {uniqueDepartments.map(dep => (
                  <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Search:</span>
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-8 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider w-[250px]">ACTIVITY</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider w-[180px]">DEPARTMENT</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider w-[300px]">HAZARD & CONSEQUENCE</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider text-center">LIKELIHOOD</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider text-center">SEVERITY</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider text-center">SCORE</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider text-center">RISK LEVEL</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs tracking-wider text-center w-[200px]">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No entries found.
                </TableCell>
              </TableRow>
            )}
            {paginatedGroups.map((group, groupIndex) => {
              return group.map((row, rowIndex) => (
                <TableRow key={row.id} className={cn(rowIndex === group.length - 1 && "border-b-[3px] border-slate-200")}>
                  {rowIndex === 0 && (
                    <>
                      <TableCell rowSpan={group.length} className="align-top bg-slate-50/30 border-r border-slate-100">
                        <div className="space-y-2">
                          <p className="font-bold text-slate-800 text-sm leading-snug">{row.activityName}</p>
                          <p className="text-[10px] text-blue-500 font-bold">ID: {row.id}</p>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                            HAZARDS: {group.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell rowSpan={group.length} className="align-top bg-slate-50/30 border-r border-slate-100">
                        <div className="space-y-3">
                          <span className="px-2 py-1 bg-slate-800 text-white rounded text-[10px] font-bold uppercase block w-fit">
                            {row.department || "UNKNOWN"}
                          </span>
                          {row.register && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full mt-2 h-7 text-[10px] bg-white px-2"
                              onClick={() => window.open(`/print/hiradc/${row.register!.id}?print=1`, "_blank")}
                            >
                              🖨️ Cetak PDF
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <p className="text-sm font-bold text-slate-800 mb-1">
                      {row.hazardCategory || "Hazard"}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {row.hazardDetails || "-"}
                    </p>
                    {row.riskConsequence && (
                      <p className="text-[11px] text-slate-500 mt-1 italic leading-tight">
                        Dampak: {row.riskConsequence}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold text-blue-600">{row.likelihoodBefore || "-"}</TableCell>
                  <TableCell className="text-center font-bold text-blue-600">{row.severityBefore || "-"}</TableCell>
                  <TableCell className="text-center font-black text-lg text-slate-800">{row.scoreBefore || "-"}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black tracking-widest inline-flex items-center gap-1.5",
                      row.riskLevelBefore === "EXTREME" ? "bg-slate-900 text-white" :
                      row.riskLevelBefore === "HIGH" ? "bg-red-100 text-red-600" :
                      row.riskLevelBefore === "MODERATE" ? "bg-yellow-100 text-yellow-600" :
                      "bg-green-100 text-green-600"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", 
                        row.riskLevelBefore === "EXTREME" ? "bg-red-500" : "bg-current"
                      )} />
                      {row.riskLevelBefore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <HiradcDetailDialog entry={row as any}>
                        <Button size="icon" variant="outline" title="Lihat Detail" className="h-8 w-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </HiradcDetailDialog>
                      {canEdit && (
                        <>
                          <Button size="icon" variant="outline" title="Edit Hazard" onClick={() => handleEdit(row)} className="h-8 w-8 bg-lime-50 text-lime-600 border-lime-200 hover:bg-lime-100">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" title="Hapus Hazard" onClick={() => handleDelete(row.id)} className="h-8 w-8 bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
        <p>Showing {(currentPage - 1) * Number(pageSize) + (paginatedGroups.length > 0 ? 1 : 0)} to {Math.min(currentPage * Number(pageSize), groupedData.length)} of {groupedData.length} activities</p>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
      
      {/* Note */}
      <div className="bg-blue-50/50 p-4 m-4 rounded-xl border border-blue-100 flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
          <span className="text-blue-500 font-bold">💡</span>
        </div>
        <div>
          <p className="text-blue-800 font-bold text-sm tracking-wide uppercase mb-1">RISK INTELLIGENCE NOTE</p>
          <p className="text-xs text-blue-600/80 leading-relaxed">
            Sistem menghitung Risk Score dengan rumus **Likelihood x Severity**. Skor &gt; 15 dianggap **Extreme Risk** dan memerlukan kontrol teknis (Engineering) segera sebelum pekerjaan dimulai. Pastikan setiap poin HIRADC telah disosialisasikan kepada pekerja di lapangan.
          </p>
        </div>
      </div>
      <HiradcEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={selectedEntry}
        registers={registers}
        canEdit={canEdit}
      />
    </div>
  )
}
