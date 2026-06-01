"use client"

import * as React from "react"
import { AlertTriangle, Eye, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminTableCard } from "@/components/admin-table-card"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"
import { toast } from "sonner"
import {
  IncidentFormDialog,
  IncidentDetailDialog,
} from "./incident-dialogs"
import { deleteIncidentRecord } from "./actions"

type Site = {
  id: number
  name: string
}

type IncidentRecord = {
  id: number
  title: string
  category: string
  severity: string
  description: string
  siteId: number | null
  investigationStatus: string
  incidentDate: Date
  picEmployeeId: number | null
  picName: string
  rootCauseAnalysis: string
  immediateCorrectiveAction: string
  documentationUrl: string
  createdAt: Date
  updatedAt: Date
}

interface ClientProps {
  data: IncidentRecord[]
  sites: Site[]
  access: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
  }
}

export function IncidentReportClient({ data, sites, access }: ClientProps) {
  const [incidents, setIncidents] = React.useState<IncidentRecord[]>(data)
  
  // Dialog States
  const [formOpen, setFormOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<IncidentRecord | null>(null)

  React.useEffect(() => {
    setIncidents(data)
  }, [data])

  const stats = React.useMemo(() => {
    let openCount = 0
    let invCount = 0
    let closedCount = 0

    incidents.forEach((item) => {
      if (item.investigationStatus === "Open") openCount++
      else if (item.investigationStatus === "Investigation") invCount++
      else if (item.investigationStatus === "Closed") closedCount++
    })

    return {
      totalItems: incidents.length,
      openCount,
      invCount,
      closedCount,
    }
  }, [incidents])

  const handleEdit = (item: IncidentRecord) => {
    setSelectedItem(item)
    setFormOpen(true)
  }

  const handleView = (item: IncidentRecord) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data laporan insiden ini?")) return

    try {
      const res = await deleteIncidentRecord(id)
      if (res.success) {
        setIncidents((prev) => prev.filter((item) => item.id !== id))
        toast.success("Laporan berhasil dihapus")
      } else {
        toast.error(res.error || "Gagal menghapus laporan")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem")
    }
  }

  const renderSeverityBadge = (severity: string) => {
    let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200"
    if (severity === "Low") badgeStyle = "bg-blue-50 text-blue-700 border-blue-200"
    if (severity === "Medium") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200"
    if (severity === "High") badgeStyle = "bg-orange-50 text-orange-700 border-orange-200"
    if (severity === "Critical") badgeStyle = "bg-rose-50 text-rose-700 border-rose-200"

    return (
      <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase select-none ${badgeStyle}`}>
        {severity}
      </Badge>
    )
  }

  const renderStatusBadge = (status: string) => {
    let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200"
    if (status === "Open") badgeStyle = "bg-blue-50 text-blue-700 border-blue-200"
    if (status === "Investigation") badgeStyle = "bg-purple-50 text-purple-700 border-purple-200"
    if (status === "Closed") badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200"

    return (
      <Badge variant="outline" className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase select-none ${badgeStyle}`}>
        {status}
      </Badge>
    )
  }

  const getSiteName = (siteId: number | null) => {
    if (!siteId) return "-"
    const site = sites.find((s) => s.id === siteId)
    return site ? site.name : "-"
  }

  const categoryOptions = [
    "Near Miss",
    "Minor Accident",
    "Medical Treatment",
    "Restricted Work",
    "Lost Time Injury",
    "Fatality",
    "Property Damage",
    "Environmental Incident",
    "Dangerous Occurrence",
  ]
  const severityOptions = ["Low", "Medium", "High", "Critical"]
  const statusOptions = ["Open", "Investigation", "Closed"]

  const rows = incidents.map((row, index) => {
    const incDateStr = new Date(row.incidentDate).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    })

    return [
      <span key={`index-${row.id}`} className="font-semibold text-muted-foreground">
        {index + 1}
      </span>,
      <div key={`info-${row.id}`} className="flex flex-col gap-0.5 min-w-[200px]">
        <span className="font-bold text-[#0f172a]">{row.title}</span>
        <span className="text-[10px] text-muted-foreground tracking-widest">{row.category}</span>
      </div>,
      <span key={`site-${row.id}`} className="font-medium">{getSiteName(row.siteId)}</span>,
      <span key={`date-${row.id}`} className="text-sm">{incDateStr}</span>,
      renderSeverityBadge(row.severity),
      renderStatusBadge(row.investigationStatus),
      <div key={`actions-${row.id}`} className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:bg-primary/10 hover:text-primary rounded-md border"
          onClick={() => handleView(row)}
          title="Lihat Detail & Cetak"
        >
          <Eye className="size-4 text-blue-600" />
        </Button>
        {access.canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-primary/10 hover:text-primary rounded-md border"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
            <Pencil className="size-4 text-emerald-600" />
          </Button>
        )}
        {access.canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-rose-50 hover:text-rose-600 rounded-md border"
            onClick={() => handleDelete(row.id)}
            title="Hapus"
          >
            <Trash2 className="size-4 text-rose-600" />
          </Button>
        )}
      </div>,
    ]
  })

  const rowAttributes = incidents.map((row) => ({
    "data-date-value": new Date(row.incidentDate).toISOString(),
    "data-filter-category": row.category,
    "data-filter-severity": row.severity,
    "data-filter-status": row.investigationStatus,
  }))

  const handleAddClick = () => {
    setSelectedItem(null)
    setFormOpen(true)
  }

  const columnOptions = [
    { key: "ID", label: "No" },
    { key: "title", label: "Nama Insiden" },
    { key: "category", label: "Kategori" },
    { key: "site", label: "Proyek/Lokasi" },
    { key: "date", label: "Waktu Kejadian" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
    { key: "picName", label: "PIC Investigasi" },
    { key: "description", label: "Deskripsi Kronologi" },
    { key: "rootCause", label: "Root Cause Analysis" },
    { key: "correctiveAction", label: "Tindakan Perbaikan" },
  ]

  return (
    <div className="space-y-4">
      <AdminTableCard
        title="Daftar Laporan Insiden HSE"
        description="Pantau dan kelola laporan insiden keselamatan, pelacakan proses investigasi, dan dokumentasi root cause analysis."
        columns={["No", "Informasi Kejadian", "Lokasi/Proyek", "Waktu Kejadian", "Severity", "Status", "Aksi"]}
        dateFilter={true}
        showImport={false}
        columnOptions={columnOptions}
        actions={
          access.canEdit ? (
            <Button onClick={handleAddClick} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="mr-1.5 size-4" />
              Lapor Insiden
            </Button>
          ) : undefined
        }
        filters={
          <>
            <TableMultiFilter
              label="kategori"
              filterKey="category"
              options={categoryOptions.map((cat) => ({ value: cat, label: cat }))}
            />
            <TableMultiFilter
              label="severity"
              filterKey="severity"
              options={severityOptions.map((s) => ({ value: s, label: s }))}
            />
            <TableMultiFilter
              label="status"
              filterKey="status"
              options={statusOptions.map((s) => ({ value: s, label: s }))}
            />
          </>
        }
        scorecards={[
          {
            label: "Total Laporan",
            value: stats.totalItems,
            icon: <FileSpreadsheet className="size-4 text-blue-600" />,
            tone: "info",
          },
          {
            label: "Kasus Open",
            value: stats.openCount,
            icon: <AlertTriangle className="size-4 text-amber-500" />,
            tone: "warning",
          },
          {
            label: "Dalam Investigasi",
            value: stats.invCount,
            icon: <Eye className="size-4 text-purple-600" />,
            tone: "info",
          },
        ]}
        rows={rows}
        rowAttributes={rowAttributes}
      />

      <IncidentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={selectedItem}
        sites={sites}
        onSuccess={() => {
          window.location.reload()
        }}
      />

      <IncidentDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={selectedItem}
        sites={sites}
        canEdit={access.canEdit}
        onEditClick={() => {
          setDetailOpen(false)
          if (selectedItem) handleEdit(selectedItem)
        }}
      />
    </div>
  )
}
