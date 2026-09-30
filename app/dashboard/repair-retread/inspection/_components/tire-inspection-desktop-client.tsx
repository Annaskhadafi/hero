"use client"

import * as React from "react"
import { useState, useTransition, useMemo, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import * as XLSX from "xlsx"
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Eye,
  Camera,
  Check,
  X,
  AlertTriangle,
  Building2,
  Pencil,
  Trash2,
  ZoomIn,
  FileText,
  FileCheck,
  FilePlus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Calendar,
  User,
  Wrench,
  Layers,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  getTireRepairInspectionsAction,
  createTireRepairInspectionAction,
  updateTireRepairInspectionAction,
  deleteTireRepairInspectionAction,
} from "@/app/actions/tire-repair-actions"
import { TireRepairSearchableSelect } from "@/components/mobile/tire-repair-searchable-select"
import { TireInspectionImportDialog } from "./tire-inspection-import-dialog"
import {
  STANDARD_TIRE_SIZES,
  STANDARD_TIRE_BRANDS,
  REPAIR_LOCATIONS,
  DEFAULT_CUSTOMERS,
  DEFAULT_CUSTOMER_SITES,
  DEFAULT_CHITRA_INSPECTORS,
  DURATION_CONFIG,
  type DurationTag,
  type TireRepairInspectionRecord,
} from "@/lib/tire-repair-constants"

const PHOTO_AREAS = [
  "Serial Number",
  "Area Sidewall",
  "Area Shoulder",
  "Area Tread",
  "Area Bead",
  "Area Inner Linner",
  "Area Chaffer",
] as const

interface MasterData {
  customers: string[]
  sites: string[]
  locations: string[]
  sizes: string[]
  brands: string[]
  patterns: string[]
  userDefaultLocation?: string
  userDefaultName?: string
  inspectors?: string[]
}

interface TireInspectionDesktopClientProps {
  initialInspections: TireRepairInspectionRecord[]
  masterData: MasterData
}

export function TireInspectionDesktopClient({
  initialInspections = [],
  masterData,
}: TireInspectionDesktopClientProps) {
  const [inspections, setInspections] = useState<TireRepairInspectionRecord[]>(initialInspections)
  const [isPending, startTransition] = useTransition()

  // Master lists
  const [customerOptions, setCustomerOptions] = useState<string[]>(
    masterData?.customers?.length ? masterData.customers : DEFAULT_CUSTOMERS
  )
  const [siteOptions, setSiteOptions] = useState<string[]>(
    masterData?.sites?.length ? masterData.sites : DEFAULT_CUSTOMER_SITES
  )
  const [locationOptions, setLocationOptions] = useState<string[]>(
    masterData?.locations?.length ? masterData.locations : REPAIR_LOCATIONS
  )
  const [sizeOptions, setSizeOptions] = useState<string[]>(
    masterData?.sizes?.length ? masterData.sizes : STANDARD_TIRE_SIZES
  )
  const [brandOptions, setBrandOptions] = useState<string[]>(
    masterData?.brands?.length ? masterData.brands : STANDARD_TIRE_BRANDS
  )
  const [inspectorOptions, setInspectorOptions] = useState<string[]>(
    masterData?.inspectors?.length
      ? masterData.inspectors
      : masterData?.userDefaultName
      ? [masterData.userDefaultName, ...DEFAULT_CHITRA_INSPECTORS]
      : DEFAULT_CHITRA_INSPECTORS
  )

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedSize, setSelectedSize] = useState("ALL")
  const [selectedLocation, setSelectedLocation] = useState("ALL")

  // Modals
  const [selectedItem, setSelectedItem] = useState<TireRepairInspectionRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TireRepairInspectionRecord | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null)
  const [photoErrorMap, setPhotoErrorMap] = useState<Record<string, boolean>>({})

  const handlePhotoError = (url: string) => {
    setPhotoErrorMap((prev) => ({ ...prev, [url]: true }))
  }

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > 40
    const isRightSwipe = distance < -40

    const itemPhotos = selectedItem?.photos || []
    if (itemPhotos.length > 1) {
      if (isLeftSwipe) {
        setActivePhotoIndex((prev) => (prev < itemPhotos.length - 1 ? prev + 1 : 0))
      } else if (isRightSwipe) {
        setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : itemPhotos.length - 1))
      }
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  React.useEffect(() => {
    if (!isDetailOpen || !selectedItem) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const itemPhotos = selectedItem.photos || []
      if (itemPhotos.length <= 1) return
      if (e.key === "ArrowLeft") {
        setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : itemPhotos.length - 1))
      } else if (e.key === "ArrowRight") {
        setActivePhotoIndex((prev) => (prev < itemPhotos.length - 1 ? prev + 1 : 0))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDetailOpen, selectedItem])

  // Manual Add Modals inside New Form
  const [customSizeModalOpen, setCustomSizeModalOpen] = useState(false)
  const [newCustomSizeInput, setNewCustomSizeInput] = useState("")
  const [customBrandModalOpen, setCustomBrandModalOpen] = useState(false)
  const [newCustomBrandInput, setNewCustomBrandInput] = useState("")
  const [customCustomerModalOpen, setCustomCustomerModalOpen] = useState(false)
  const [newCustomCustomerInput, setNewCustomCustomerInput] = useState("")
  const [customSiteModalOpen, setCustomSiteModalOpen] = useState(false)
  const [newCustomSiteInput, setNewCustomSiteInput] = useState("")

  // Form State (Exact match with mobile form)
  const [inspectLocation, setInspectLocation] = useState(
    masterData?.userDefaultLocation || locationOptions[0] || "Workshop Sangatta"
  )
  const [dateInspect, setDateInspect] = useState(() => new Date().toISOString().split("T")[0])
  const [reportBy, setReportBy] = useState(
    masterData?.userDefaultName || inspectorOptions[0] || ""
  )
  const [repairDuration, setRepairDuration] = useState<DurationTag>("R1")
  const [cargoManifestNo, setCargoManifestNo] = useState("")
  const [rtd1, setRtd1] = useState("")
  const [rtd2, setRtd2] = useState("")
  const [remarks, setRemarks] = useState("")

  // Multi-Area Photo State
  const [selectedPhotoAreas, setSelectedPhotoAreas] = useState<string[]>([PHOTO_AREAS[0]])
  const [photos, setPhotos] = useState<Array<{ id: string; photoArea: string; photoUrl: string }>>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const togglePhotoArea = (area: string) => {
    setSelectedPhotoAreas((prev) => {
      if (prev.includes(area)) {
        if (prev.length === 1) return prev
        return prev.filter((a) => a !== area)
      }
      return [...prev, area]
    })
  }

  const [tireSize, setTireSize] = useState("27.00R49")
  const [serialNumber, setSerialNumber] = useState("")
  const [brand, setBrand] = useState("MICHELIN")
  const [typeConstruction, setTypeConstruction] = useState("RADIAL")
  const [pattern, setPattern] = useState("E4")
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().split("T")[0])
  const defaultCust = customerOptions.find((c) => c.toLowerCase().includes("kaltim prima coal")) || customerOptions[0] || "PT Kaltim Prima Coal"
  const defaultSite = siteOptions.find((s) => s.toLowerCase().includes("sangatta kpc")) || siteOptions.find((s) => s.toLowerCase().includes("sangatta")) || siteOptions[0] || "Sangatta KPC"

  const [customer, setCustomer] = useState(defaultCust)
  const [customerSite, setCustomerSite] = useState(defaultSite)
  const [status, setStatus] = useState<"Repair" | "Retread" | "Reject">("Repair")

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refresh handler
  const handleRefresh = (silent = false) => {
    startTransition(async () => {
      const res = await getTireRepairInspectionsAction()
      if (res?.success && Array.isArray(res.data)) {
        setInspections(res.data)
        if (!silent) {
          toast.success("Data berhasil diperbarui")
        }
      } else if (!silent) {
        toast.error("Gagal memuat data")
      }
    })
  }

  // Auto-refresh data when page mounts
  React.useEffect(() => {
    handleRefresh(true)
  }, [])

  // Filtered List
  const filteredInspections = useMemo(() => {
    return (inspections || []).filter((item) => {
      if (!item) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSn = item.serialNumber?.toLowerCase().includes(q)
        const matchCust = item.customer?.toLowerCase().includes(q)
        const matchLoc = item.inspectLocation?.toLowerCase().includes(q)
        const matchBrand = item.brand?.toLowerCase().includes(q)
        const matchInspector = item.reportBy?.toLowerCase().includes(q)
        const matchCargo = item.cargoManifestNo?.toLowerCase().includes(q)
        if (!matchSn && !matchCust && !matchLoc && !matchBrand && !matchInspector && !matchCargo) {
          return false
        }
      }
      if (selectedCustomer !== "ALL" && item.customer !== selectedCustomer) return false
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) return false
      if (selectedSize !== "ALL" && item.tireSize !== selectedSize) return false
      if (selectedLocation !== "ALL" && item.inspectLocation !== selectedLocation) return false
      return true
    })
  }, [inspections, searchQuery, selectedCustomer, selectedStatus, selectedSize, selectedLocation])

  // KPIs
  const kpis = useMemo(() => {
    const list = inspections || []
    const total = list.length
    const readyRepair = list.filter((i) => (i.status || "").toLowerCase().includes("repair")).length
    const readyRetread = list.filter((i) => (i.status || "").toLowerCase().includes("retread")).length
    const reject = list.filter((i) => (i.status || "").toLowerCase().includes("reject") || (i.status || "").toLowerCase().includes("scrap")).length
    const r1 = list.filter((i) => i.repairDuration === "R1").length
    const r2 = list.filter((i) => i.repairDuration === "R2").length
    const r3 = list.filter((i) => i.repairDuration === "R3").length
    const r4 = list.filter((i) => i.repairDuration === "R4").length
    return { total, readyRepair, readyRetread, reject, r1, r2, r3, r4 }
  }, [inspections])

  // Export Excel (KPC Format)
  const handleExportExcel = (itemsOrEvent?: TireRepairInspectionRecord[] | React.MouseEvent) => {
    if (itemsOrEvent && 'preventDefault' in itemsOrEvent && typeof itemsOrEvent.preventDefault === 'function') {
      itemsOrEvent.preventDefault()
    }
    try {
      const dataToExport = Array.isArray(itemsOrEvent)
        ? itemsOrEvent
        : filteredInspections.length > 0
        ? filteredInspections
        : inspections

      const rows: any[][] = []

      // Row 0: Empty
      rows.push([])

      // Row 1: KPC Header Title
      const titleRow = new Array(21).fill("")
      titleRow[4] = "TYRE INSPECTION REPORT CP-KPC"
      rows.push(titleRow)

      // Row 2: Date / Metadata
      const metaRow = new Array(21).fill("")
      metaRow[4] = new Date().toISOString().split("T")[0]
      rows.push(metaRow)

      // Row 3: KPC Standard Headers
      rows.push([
        "NO",
        "ID",
        "Removal Reason",
        "Scrap - Reason",
        "Status",
        "Priority",
        "Deffectex-repair",
        "Size",
        "Vehicle",
        "Wheel Position",
        "Hours",
        "Hours Since Last Repair",
        "Rtd",
        "Specification",
        "Foto1",
        "Foto2",
        "Foto3",
        "Foto4",
        "Foto5",
        "Pit Location",
        "Marking",
      ])

      // Data rows (Row 4+)
      if (dataToExport.length > 0) {
        dataToExport.forEach((item, idx) => {
          let statusVal = "A"
          const s = (item.status || "").toLowerCase()
          if (s.includes("reject") || s.includes("scrap")) {
            statusVal = "C"
          } else if (s.includes("retread")) {
            statusVal = "Retread"
          } else {
            statusVal = "A"
          }

          const rtdVal = (item.rtd1 || item.rtd2) ? ` ${item.rtd1 || 0}:${item.rtd2 || 0}` : ""
          const specVal = `${item.brand || "MICHELIN"}, ${item.tireSize || "27.00R49"}, ${item.pattern || "E4"}, MC4, **`
          const photos = item.photos || []

          rows.push([
            idx + 1,
            item.serialNumber,
            item.status === "Reject" ? "" : item.remarks || "",
            item.status === "Reject" ? item.remarks || "" : "",
            statusVal,
            item.repairDuration || "R1",
            item.status === "Reject" ? "" : "NEW DEFFECT",
            item.tireSize,
            "",
            "",
            "",
            "",
            rtdVal,
            specVal,
            photos[0]?.photoUrl || "",
            photos[1]?.photoUrl || "",
            photos[2]?.photoUrl || "",
            photos[3]?.photoUrl || "",
            photos[4]?.photoUrl || "",
            item.inspectLocation || "Workshop Sangatta",
            "",
          ])
        })
      } else {
        // Fallback template row if empty
        rows.push([
          1,
          "EXAMPLE001",
          "SIDEWALL DAMAGE",
          "",
          "A",
          "R1",
          "NEW DEFFECT",
          "27.00R49",
          "",
          "",
          "",
          "",
          "55:55",
          "BRIDGESTONE, 27.00R49, VMTP, E3A, **",
          "",
          "",
          "",
          "",
          "",
          "Workshop Sangatta",
          "",
        ])
      }

      const worksheet = XLSX.utils.aoa_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Oktober-2025")

      const fileName = `Tyre_Inspection_Report_KPC_${new Date().toISOString().split("T")[0]}.xlsx`

      // Safe Browser Blob Download
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("File Excel format KPC berhasil diunduh!")
    } catch (err: any) {
      console.error("Export Excel error:", err)
      toast.error("Gagal mengunduh file Excel: " + (err?.message || "Kesalahan browser"))
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filteredInspections.length === 0) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const headers = [
      "No.",
      "Serial Number",
      "R-Tag (Estimasi Durasi)",
      "Customer",
      "Site",
      "Ukuran Ban",
      "Brand",
      "Type Construction",
      "Pattern",
      "Status Ban",
      "RTD Left (mm)",
      "RTD Right (mm)",
      "Cargo Manifest No",
      "Repair Location",
      "Tanggal Masuk Ban",
      "Tanggal Inspeksi",
      "Report By (Inspector)",
      "Remarks / Catatan Defect",
      "Jumlah Foto",
    ]

    const rows = filteredInspections.map((item, idx) => [
      idx + 1,
      item.serialNumber,
      item.repairDuration || "-",
      item.customer,
      item.customerSite || "-",
      item.tireSize,
      item.brand || "-",
      item.typeConstruction || "RADIAL",
      item.pattern || "-",
      item.status,
      item.rtd1 ?? "-",
      item.rtd2 ?? "-",
      item.cargoManifestNo || "-",
      item.inspectLocation,
      item.dateReceived ? new Date(item.dateReceived).toISOString().split("T")[0] : "-",
      item.dateInspect ? new Date(item.dateInspect).toISOString().split("T")[0] : "-",
      item.reportBy || "-",
      `"${(item.remarks || "").replace(/"/g, '""')}"`,
      item.photos?.length || 0,
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `tire_inspection_report_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Export CSV berhasil diunduh")
  }

  // Handle Photo Upload with Multi-Area Tagging
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const joinedArea = selectedPhotoAreas.join(", ")

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Url = event.target?.result as string
        if (base64Url) {
          setPhotos((prev) => [
            ...prev,
            {
              id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              photoArea: joinedArea,
              photoUrl: base64Url,
            },
          ])
          toast.success(`Foto area "${joinedArea}" berhasil ditambahkan`)
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  // Handle Create Inspection Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serialNumber.trim()) {
      toast.error("Serial Number wajib diisi")
      return
    }
    if (!customer.trim()) {
      toast.error("Customer wajib dipilih")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createTireRepairInspectionAction({
        inspectLocation,
        dateInspect,
        reportBy: reportBy || "Inspector",
        repairDuration,
        cargoManifestNo,
        rtd1,
        rtd2,
        remarks,
        tireSize,
        serialNumber: serialNumber.toUpperCase(),
        brand,
        typeConstruction,
        pattern,
        dateReceived,
        customer,
        customerSite,
        status,
        photos: photos.map((p) => ({
          photoArea: p.photoArea,
          photoUrl: p.photoUrl,
        })),
      })

      if (res?.success && res.data) {
        toast.success("Inspeksi ban baru berhasil disimpan!")
        setIsNewModalOpen(false)
        // Reset form
        setSerialNumber("")
        setCargoManifestNo("")
        setRtd1("")
        setRtd2("")
        setRemarks("")
        setPhotos([])
        handleRefresh()
      } else {
        toast.error(res?.message || "Gagal menyimpan inspeksi")
      }
    } catch {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEdit = (item: TireRepairInspectionRecord) => {
    setEditingItem(item)
    setInspectLocation(item.inspectLocation || "Workshop Sangatta")
    setDateInspect(item.dateInspect ? new Date(item.dateInspect).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])
    setReportBy(item.reportBy || "")
    setRepairDuration((item.repairDuration as DurationTag) || "R1")
    setCargoManifestNo(item.cargoManifestNo || "")
    setRtd1(item.rtd1 || "")
    setRtd2(item.rtd2 || "")
    setRemarks(item.remarks || "")
    setTireSize(item.tireSize || "27.00R49")
    setSerialNumber(item.serialNumber || "")
    setBrand(item.brand || "MICHELIN")
    setTypeConstruction(item.typeConstruction || "RADIAL")
    setPattern(item.pattern || "E4")
    setDateReceived(item.dateReceived ? new Date(item.dateReceived).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])
    setCustomer(item.customer || "PT Kaltim Prima Coal")
    setCustomerSite(item.customerSite || "Sangatta KPC")
    setStatus((item.status as any) || "Repair")
    setPhotos((item.photos || []).map((p) => ({
      id: `photo_${p.id}`,
      photoArea: p.photoArea,
      photoUrl: p.photoUrl,
    })))
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    if (!serialNumber.trim()) {
      toast.error("Serial Number wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await updateTireRepairInspectionAction(editingItem.id, {
        inspectLocation,
        dateInspect,
        reportBy: reportBy || "Inspector",
        repairDuration,
        cargoManifestNo,
        rtd1,
        rtd2,
        remarks,
        tireSize,
        serialNumber: serialNumber.toUpperCase(),
        brand,
        typeConstruction,
        pattern,
        dateReceived,
        customer,
        customerSite,
        status,
        photos: photos.map((p) => ({
          photoArea: p.photoArea,
          photoUrl: p.photoUrl,
        })),
      })

      if (res?.success) {
        toast.success("Laporan inspeksi ban berhasil diperbarui!")
        setIsEditModalOpen(false)
        setEditingItem(null)
        handleRefresh()
      } else {
        toast.error(res?.message || "Gagal memperbarui inspeksi")
      }
    } catch {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInspection = (id: number, sn: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data inspeksi ban SN "${sn}"?`)) return
    startTransition(async () => {
      const res = await deleteTireRepairInspectionAction(id)
      if (res?.success) {
        toast.success(`Data inspeksi ${sn} berhasil dihapus`)
        handleRefresh()
      } else {
        toast.error(res?.message || "Gagal menghapus data inspeksi")
      }
    })
  }

  // Helper status badge style
  const getStatusBadge = (statusVal: string | null) => {
    const s = (statusVal || "").toLowerCase()
    if (s.includes("repair") || statusVal === "A") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>REPAIR</span>
        </span>
      )
    }
    if (s.includes("retread") || statusVal === "B") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>RETREAD</span>
        </span>
      )
    }
    if (s.includes("reject") || s.includes("scrap") || statusVal === "C") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>REJECT</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {statusVal || "-"}
      </span>
    )
  }

  // Helper R-tag badge style
  const getRTagBadge = (tag: string | null) => {
    if (!tag) return <span className="text-muted-foreground text-xs">-</span>
    const map: Record<string, { bg: string; text: string; border: string }> = {
      R1: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/30" },
      R2: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/30" },
      R3: { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/30" },
      R4: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/30" },
    }
    const conf = map[tag] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${conf.bg} ${conf.text} border ${conf.border}`}>
        {tag}
      </span>
    )
  }

  // Format Date display
  const formatDateDisplay = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return "-"
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return String(dateVal)
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return String(dateVal)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Module Quick Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
        <Link
          href="/dashboard/repair-retread/inspection"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-[#003f78] text-white shadow-xs"
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Tire Inspection Report</span>
        </Link>

        <Link
          href="/dashboard/repair-retread/jobcard"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Repair Job Card</span>
        </Link>

        <Link
          href="/dashboard/repair-retread/form-wo"
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>Form WO & WIP</span>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Tire Inspection Report</h1>
            <Badge variant="outline" className="text-xs font-mono">Repair & Retread</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Data inspeksi penerimaan ban masuk, klasifikasi defect, evaluasi RTD, dan dokumentasi foto defect.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/export/tire-inspection"
            download
            className="inline-flex items-center justify-center h-9 px-3.5 gap-1.5 rounded-md text-xs font-bold border border-emerald-600/30 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export</span>
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="h-9 gap-1.5 border-[#003f78]/30 text-[#003f78] dark:text-sky-400 hover:bg-[#003f78]/10 font-bold"
          >
            <Upload className="h-4 w-4 text-[#003f78] dark:text-sky-400" />
            <span>Import</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewModalOpen(true)}
            className="h-9 gap-1.5 bg-[#003f78] hover:bg-[#002e59] text-white font-bold shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Input Inspeksi Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card className="shadow-xs border border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Total Inspeksi</CardDescription>
            <CardTitle className="text-2xl font-bold">{kpis.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-muted-foreground">Semua data inspeksi ban</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Siap Repair</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{kpis.readyRepair}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-muted-foreground">{kpis.total > 0 ? Math.round((kpis.readyRepair / kpis.total) * 100) : 0}% dari total</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-sky-500/20 bg-sky-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-sky-700 dark:text-sky-400">Siap Retread</CardDescription>
            <CardTitle className="text-2xl font-bold text-sky-700 dark:text-sky-400">{kpis.readyRetread}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-muted-foreground">{kpis.total > 0 ? Math.round((kpis.readyRetread / kpis.total) * 100) : 0}% dari total</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-rose-500/20 bg-rose-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-rose-700 dark:text-rose-400">Reject / Scrap</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400">{kpis.reject}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-muted-foreground">{kpis.total > 0 ? Math.round((kpis.reject / kpis.total) * 100) : 0}% dari total</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border/80 col-span-2 sm:col-span-4 lg:col-span-1">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Distribusi R-Tag</CardDescription>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-blue-600">R1:{kpis.r1}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-bold text-amber-600">R2:{kpis.r2}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-bold text-orange-600">R3:{kpis.r3}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-bold text-purple-600">R4:{kpis.r4}</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-xs text-muted-foreground">Siklus repair/retread ban</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="shadow-xs border border-border/80">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Serial Number, Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Customer Filter */}
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Customer</SelectItem>
                {customerOptions.map((cust) => (
                  <SelectItem key={cust} value={cust}>{cust}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Retread">Retread</SelectItem>
                <SelectItem value="Reject">Reject</SelectItem>
              </SelectContent>
            </Select>

            {/* Tire Size Filter */}
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Ukuran Ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Ukuran Ban</SelectItem>
                {sizeOptions.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Semua Workshop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Workshop</SelectItem>
                {locationOptions.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || selectedCustomer !== "ALL" || selectedStatus !== "ALL" || selectedSize !== "ALL" || selectedLocation !== "ALL") && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span>Menampilkan <b>{filteredInspections.length}</b> dari {inspections.length} total laporan</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCustomer("ALL")
                  setSelectedStatus("ALL")
                  setSelectedSize("ALL")
                  setSelectedLocation("ALL")
                }}
              >
                Reset Filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table (Matching Mobile Columns) */}
      <Card className="shadow-xs border border-border/80 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[50px] text-xs font-semibold">NO.</TableHead>
              <TableHead className="text-xs font-semibold">SERIAL NUMBER & BRAND</TableHead>
              <TableHead className="text-xs font-semibold">R-TAG</TableHead>
              <TableHead className="text-xs font-semibold">CUSTOMER & SITE</TableHead>
              <TableHead className="text-xs font-semibold">UKURAN BAN</TableHead>
              <TableHead className="text-xs font-semibold">RTD (L / R)</TableHead>
              <TableHead className="text-xs font-semibold">STATUS BAN</TableHead>
              <TableHead className="text-xs font-semibold">CARGO MANIFEST</TableHead>
              <TableHead className="text-xs font-semibold">TGL MASUK / INSPEKSI</TableHead>
              <TableHead className="text-xs font-semibold">INSPECTOR</TableHead>
              <TableHead className="text-center text-xs font-semibold">FOTO</TableHead>
              <TableHead className="text-right text-xs font-semibold">AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Filter className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Tidak ada data inspeksi yang sesuai</p>
                    <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau tambah inspeksi baru.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInspections.map((item, index) => {
                const photoCount = item.photos?.length || 0
                return (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs tracking-tight text-foreground font-mono">
                          {item.serialNumber}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.brand || "MICHELIN"} {item.pattern ? `· ${item.pattern}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRTagBadge(item.repairDuration)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-xs font-medium truncate text-foreground" title={item.customer}>
                          {item.customer}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {item.customerSite || "-"} · {item.inspectLocation}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium font-mono">{item.tireSize}</span>
                        <span className="text-[10px] text-muted-foreground">{item.typeConstruction || "RADIAL"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">
                        {item.rtd1 || "-"} / {item.rtd2 || "-"} <span className="text-[10px] text-muted-foreground">mm</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {item.cargoManifestNo || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[11px]">
                        <span className="text-foreground">{formatDateDisplay(item.dateInspect || item.dateReceived)}</span>
                        <span className="text-muted-foreground text-[10px]">Masuk: {formatDateDisplay(item.dateReceived)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground font-medium">
                        {item.reportBy || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {photoCount > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400"
                          onClick={() => {
                            setSelectedItem(item)
                            setActivePhotoIndex(0)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>{photoCount}</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 gap-1 text-xs font-semibold"
                          onClick={() => {
                            setSelectedItem(item)
                            setActivePhotoIndex(0)
                            setIsDetailOpen(true)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Detail</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs font-semibold border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-50"
                          onClick={() => handleDeleteInspection(item.id, item.serialNumber)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DETAIL MODAL WITH BRIGHT EXECUTIVE REPORT DESIGN & CLICKABLE PHOTO GALLERY */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 rounded-3xl border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900">
          {selectedItem && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Bright Executive Hero Header (Pinned) */}
              <div className="relative shrink-0 bg-gradient-to-r from-slate-50 via-sky-50/50 to-slate-50 text-slate-900 p-6 sm:p-7 border-b border-slate-200/80 shadow-2xs">
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 font-mono tracking-wider uppercase text-[11px] font-bold">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>PT CHITRA PARATAMA · TIRE INSPECTION REPORT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 text-xs bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs font-semibold">
                        REPORT ID #{selectedItem.id}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-full transition-colors"
                        onClick={() => setIsDetailOpen(false)}
                      >
                        <X className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#003f78]">
                          {selectedItem.serialNumber}
                        </span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(selectedItem.status)}
                          {getRTagBadge(selectedItem.repairDuration)}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">
                        {selectedItem.brand || "MICHELIN"} {selectedItem.pattern ? `· ${selectedItem.pattern}` : ""} · Ukuran {selectedItem.tireSize} ({selectedItem.typeConstruction || "RADIAL"})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3.5 gap-2 text-xs font-semibold border-emerald-600/30 text-emerald-700 bg-white hover:bg-emerald-50 rounded-xl shadow-2xs cursor-pointer active:scale-95 transition-transform"
                        onClick={() => handleExportExcel([selectedItem])}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span>Export KPC Excel</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 gap-2 text-xs font-semibold border-amber-500/30 text-amber-700 bg-white hover:bg-amber-50 rounded-xl shadow-2xs cursor-pointer"
                        onClick={() => {
                          const itemToEdit = selectedItem
                          setIsDetailOpen(false)
                          handleOpenEdit(itemToEdit)
                        }}
                      >
                        <Pencil className="h-4 w-4 text-amber-600" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 gap-2 text-xs font-semibold border-rose-500/30 text-rose-700 bg-white hover:bg-rose-50 rounded-xl shadow-2xs cursor-pointer"
                        onClick={() => {
                          const itemToDelete = selectedItem
                          setIsDetailOpen(false)
                          handleDeleteInspection(itemToDelete.id, itemToDelete.serialNumber)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Detail Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-7 space-y-6 bg-white">
                {/* Metric Quick Stats Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Ukuran Ban
                    </span>
                    <span className="text-sm font-extrabold font-mono text-slate-900 block">
                      {selectedItem.tireSize}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Const: {selectedItem.typeConstruction || "RADIAL"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Sisa Tapak (RTD)
                    </span>
                    <span className="text-sm font-extrabold font-mono text-emerald-700 block">
                      {selectedItem.rtd1 || "-"} / {selectedItem.rtd2 || "-"} <span className="text-xs text-slate-500">mm</span>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      Left / Right
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Customer & Site
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate block" title={selectedItem.customer}>
                      {selectedItem.customer}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium truncate block">
                      {selectedItem.customerSite || "-"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Estimasi Selesai
                    </span>
                    <span className="text-xs font-bold text-slate-900 block">
                      {formatDateDisplay(selectedItem.repairCompletedDate)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Durasi: {selectedItem.repairDuration || "R1"} ({selectedItem.maxDays || 4} Hari)
                    </span>
                  </div>
                </div>

                {/* 2-Column Detailed Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Column: Data Spesifikasi & Logistik */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-[#003f78]" />
                        <span>Data Inspeksi & Logistik</span>
                      </h4>
                    </div>

                    <div className="divide-y divide-slate-200/80 text-xs">
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Repair Location</span>
                        <span className="font-semibold text-slate-900">{selectedItem.inspectLocation}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Report By (Inspector)</span>
                        <span className="font-semibold text-slate-900">{selectedItem.reportBy || "-"}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Tanggal Masuk Ban</span>
                        <span className="font-medium text-slate-900">{formatDateDisplay(selectedItem.dateReceived)}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Tanggal Inspeksi</span>
                        <span className="font-medium text-slate-900">{formatDateDisplay(selectedItem.dateInspect)}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Cargo Manifest No.</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedItem.cargoManifestNo || "-"}</span>
                      </div>
                      <div className="py-2 flex items-center justify-between">
                        <span className="text-slate-500">Pattern / Motif Ban</span>
                        <span className="font-semibold text-slate-900">{selectedItem.pattern || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Catatan Defect & Temuan */}
                  <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span>Catatan Defect / Temuan Inspeksi</span>
                        </h4>
                      </div>

                      {selectedItem.remarks ? (
                        <div className="p-4 rounded-xl bg-amber-50/80 border-l-4 border-l-amber-500 border-y border-r border-amber-200 text-xs">
                          <p className="text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                            {selectedItem.remarks}
                          </p>
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 italic">
                          Tidak ada catatan defect atau keterangan khusus yang diinputkan.
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                      <span>Status Garansi / SLA:</span>
                      <span className="font-bold text-slate-800">
                        R-Tag {selectedItem.repairDuration || "R1"} (Max {selectedItem.maxDays || 4} Hari Kerja)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photo Gallery Grid (Bukan Slide, Tapi Galeri Kartu Klik) */}
                {(() => {
                  const itemPhotos = selectedItem.photos || []
                  return (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <Camera className="h-5 w-5 text-[#003f78]" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Galeri Foto Defect ({itemPhotos.length} Foto)
                          </h4>
                        </div>
                        <span className="text-xs text-slate-500 font-semibold">
                          Klik foto untuk memperbesar & detail
                        </span>
                      </div>

                      {itemPhotos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-500 text-xs">
                          <Camera className="h-8 w-8 text-slate-400 mb-2" />
                          <span className="font-semibold">Belum ada foto dokumentasi inspeksi untuk ban ini</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {itemPhotos.map((photo, pIdx) => {
                            const hasError = photo.photoUrl ? photoErrorMap[photo.photoUrl] : false
                            return (
                              <div
                                key={photo.id || pIdx}
                                onClick={() => setZoomPhotoUrl(photo.photoUrl)}
                                className="group relative rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col hover:border-[#003f78]/50"
                              >
                                {/* Image Aspect Container */}
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                                  {!hasError && photo.photoUrl ? (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={photo.photoUrl}
                                        alt={photo.photoArea || "Tire Defect"}
                                        onError={() => handlePhotoError(photo.photoUrl)}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      {/* Hover Overlay */}
                                      <div className="absolute inset-0 bg-[#082033]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-[2px]">
                                        <ZoomIn className="h-5 w-5 text-white" />
                                        <span>Klik untuk Memperbesar</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center p-6 text-slate-400 space-y-1 text-center">
                                      <AlertTriangle className="h-8 w-8 text-amber-500 mb-1" />
                                      <span className="text-xs font-semibold text-slate-700">Gambar Tidak Dapat Dimuat</span>
                                    </div>
                                  )}

                                  {/* Multi-Area Tags Badge on Image Top-Left */}
                                  <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1 max-w-[85%] pointer-events-none">
                                    {photo.photoArea?.split(',').map((tag, tIdx) => (
                                      <span
                                        key={tIdx}
                                        className="bg-white/95 backdrop-blur-md text-[#003f78] text-[11px] px-2.5 py-1 rounded-lg font-bold border border-slate-200 shadow-2xs flex items-center gap-1"
                                      >
                                        <Camera className="h-3 w-3 text-emerald-600 shrink-0" />
                                        <span>{tag.trim()}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Card Caption Bar */}
                                <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800 truncate">
                                    {photo.photoArea || "Dokumentasi Inspeksi"}
                                  </span>
                                  <span className="text-[11px] text-[#003f78] font-semibold group-hover:underline flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Lihat</span>
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Modal Footer (Pinned) */}
              <div className="shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500 font-mono">
                  PT Chitra Paratama HERO · Tire Inspection System
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl px-6 font-semibold bg-white text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* LIGHT-THEMED FULL ZOOM LIGHTBOX MODAL */}
      <Dialog open={!!zoomPhotoUrl} onOpenChange={() => setZoomPhotoUrl(null)}>
        <DialogContent className="max-w-4xl p-4 bg-white rounded-3xl border-slate-200 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#003f78]" />
              <DialogTitle className="text-sm font-bold text-slate-900">
                Detail Foto Dokumentasi Defect
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="relative h-[70vh] w-full flex items-center justify-center p-2 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            {zoomPhotoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={zoomPhotoUrl}
                alt="Defect Full View"
                className="max-h-full max-w-full object-contain rounded-xl drop-shadow-md"
              />
            )}
          </div>
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>PT Chitra Paratama · Inspection Gallery</span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-4 font-semibold text-xs bg-white text-slate-700 hover:bg-slate-100"
              onClick={() => setZoomPhotoUrl(null)}
            >
              Tutup Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW INSPECTION MODAL (WITH MULTI-AREA CHIPS) */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border-border/80 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-lg font-bold">Input Inspeksi Ban Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan data inspeksi ban masuk, penentuan status, dan foto dokumentasi defect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-6 pt-2">
            {/* SECTION 1: INFORMASI INSPEKSI */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-4 shadow-2xs">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  1. Informasi Inspeksi
                </h3>
              </div>

              {/* Repair Location (Searchable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Repair Location
                </label>
                <TireRepairSearchableSelect
                  value={inspectLocation}
                  onValueChange={setInspectLocation}
                  options={locationOptions}
                  placeholder="Pilih Lokasi Workshop"
                  searchPlaceholder="Cari lokasi workshop..."
                />
              </div>

              {/* Date Inspect & Report By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Date Inspect
                  </label>
                  <Input
                    type="date"
                    value={dateInspect}
                    onChange={(e) => setDateInspect(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Report By (Inspector)
                  </label>
                  <TireRepairSearchableSelect
                    value={reportBy}
                    onValueChange={setReportBy}
                    options={inspectorOptions}
                    placeholder="Pilih atau ketik Inspector..."
                    searchPlaceholder="Cari nama inspector/karyawan..."
                  />
                </div>
              </div>

              {/* Estimasi Durasi Perbaikan R1 - R4 Cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Estimasi Durasi Perbaikan
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(Object.keys(DURATION_CONFIG) as DurationTag[]).map((tag) => {
                    const conf = DURATION_CONFIG[tag]
                    const isSelected = repairDuration === tag
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setRepairDuration(tag)}
                        className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                            : "border-border/60 bg-background text-foreground hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold">{tag}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] block mt-0.5 text-muted-foreground font-medium">
                          Max {conf.maxDays} Hari Kerja
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cargo Manifest No */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Cargo Manifest No.
                </label>
                <Input
                  value={cargoManifestNo}
                  onChange={(e) => setCargoManifestNo(e.target.value)}
                  placeholder="Contoh: CM-2026-09-001"
                  className="h-9 text-xs"
                />
              </div>

              {/* RTD (mm) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  RTD (mm)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={rtd1}
                    onChange={(e) => setRtd1(e.target.value)}
                    placeholder="0.0"
                    className="h-9 text-xs text-center font-semibold flex-1"
                  />
                  <span className="text-muted-foreground font-bold text-sm select-none">/</span>
                  <Input
                    type="number"
                    step="0.1"
                    value={rtd2}
                    onChange={(e) => setRtd2(e.target.value)}
                    placeholder="0.0"
                    className="h-9 text-xs text-center font-semibold flex-1"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Remarks (Catatan Tambahan)
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Tuliskan catatan kondisi ban atau instruksi khusus..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* SECTION 2: UPLOAD FOTO DOKUMENTASI (MULTI-AREA SELECT) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-4 shadow-2xs">
              <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  2. Upload Foto Dokumentasi
                </h3>
                <span className="text-xs text-muted-foreground font-medium">({photos.length} foto diunggah)</span>
              </div>

              {/* Multi-Select Area Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Pilih Area Foto (Bisa Pilih &gt; 1)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {selectedPhotoAreas.length} area aktif
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHOTO_AREAS.map((area) => {
                    const isSelected = selectedPhotoAreas.includes(area)
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => togglePhotoArea(area)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-background border-border/60 text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{area}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Upload Button */}
              <div className="pt-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-10 gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  <Camera className="h-4 w-4 text-emerald-600" />
                  <span>Upload Foto: [{selectedPhotoAreas.join(", ")}]</span>
                </Button>
              </div>

              {/* Uploaded Photos Grid */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-xl border border-border/80 overflow-hidden bg-black aspect-video shadow-xs"
                    >
                      <Image
                        src={photo.photoUrl}
                        alt={photo.photoArea}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                        <span className="text-[10px] font-semibold text-white block truncate">
                          {photo.photoArea}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-xl p-4 text-center text-xs text-muted-foreground">
                  Belum ada foto yang diunggah. Pilih area target lalu klik <b>Upload Foto</b>.
                </div>
              )}
            </div>

            {/* SECTION 3: TIRE DETAIL & STATUS */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-4 shadow-2xs">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  3. Tire Detail & Status
                </h3>
              </div>

              {/* Tire Size (Searchable + Add Manual) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Tire Size <span className="text-red-500">*</span>
                </label>
                <TireRepairSearchableSelect
                  value={tireSize}
                  onValueChange={setTireSize}
                  options={sizeOptions}
                  placeholder="Pilih Ukuran Ban"
                  searchPlaceholder="Cari ukuran ban..."
                  onAddNewManual={() => setCustomSizeModalOpen(true)}
                  addNewManualLabel="+ Tambah Manual"
                />
              </div>

              {/* Serial Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  placeholder="Contoh: SN-889920"
                  required
                  className="h-9 text-xs font-bold uppercase tracking-wider font-mono"
                />
              </div>

              {/* Brand & Type Construction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Brand
                  </label>
                  <TireRepairSearchableSelect
                    value={brand}
                    onValueChange={setBrand}
                    options={brandOptions}
                    placeholder="Pilih Brand"
                    searchPlaceholder="Cari brand ban..."
                    onAddNewManual={() => setCustomBrandModalOpen(true)}
                    addNewManualLabel="+ Tambah Manual"
                    uppercase
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Type Construction
                  </label>
                  <Select value={typeConstruction} onValueChange={setTypeConstruction}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Tipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RADIAL">RADIAL</SelectItem>
                      <SelectItem value="BIAS">BIAS</SelectItem>
                      <SelectItem value="SOLID">SOLID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pattern & Date Received */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Pattern
                  </label>
                  <Input
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value.toUpperCase())}
                    placeholder="E4"
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Date Received
                  </label>
                  <Input
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Customer (Full Width Searchable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Customer <span className="text-red-500">*</span>
                </label>
                <TireRepairSearchableSelect
                  value={customer}
                  onValueChange={setCustomer}
                  options={customerOptions}
                  placeholder="Pilih Customer"
                  searchPlaceholder="Cari nama customer..."
                  onAddNewManual={() => setCustomCustomerModalOpen(true)}
                  addNewManualLabel="+ Tambah Manual"
                  uppercase
                />
              </div>

              {/* Site & Status Ban */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Site
                  </label>
                  <TireRepairSearchableSelect
                    value={customerSite}
                    onValueChange={setCustomerSite}
                    options={siteOptions}
                    placeholder="Pilih Site"
                    searchPlaceholder="Cari nama site..."
                    onAddNewManual={() => setCustomSiteModalOpen(true)}
                    addNewManualLabel="+ Tambah Manual"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Status
                  </label>
                  <Select value={status} onValueChange={(val: "Repair" | "Retread" | "Reject") => setStatus(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Repair">Repair</SelectItem>
                      <SelectItem value="Retread">Retread</SelectItem>
                      <SelectItem value="Reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/60 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground font-bold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Inspeksi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT INSPECTION MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-500" />
              <span>Edit Laporan Inspeksi Ban - {editingItem?.serialNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Perbarui data inspeksi ban, lokasi workshop, SLA, atau foto defect.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Workshop Location</label>
                <TireRepairSearchableSelect
                  value={inspectLocation}
                  onValueChange={setInspectLocation}
                  options={locationOptions}
                  placeholder="Pilih Lokasi Workshop"
                  searchPlaceholder="Cari workshop..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tgl Inspeksi</label>
                <Input
                  type="date"
                  value={dateInspect}
                  onChange={(e) => setDateInspect(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Inspector</label>
                <TireRepairSearchableSelect
                  value={reportBy}
                  onValueChange={setReportBy}
                  options={inspectorOptions}
                  placeholder="Pilih nama inspector"
                  searchPlaceholder="Cari nama inspector..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">R-Tag (Durasi Repair)</label>
                <Select value={repairDuration} onValueChange={(val: DurationTag) => setRepairDuration(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih R-Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R1">R1 (Max 4 Hari)</SelectItem>
                    <SelectItem value="R2">R2 (Max 8 Hari)</SelectItem>
                    <SelectItem value="R3">R3 (Max 12 Hari)</SelectItem>
                    <SelectItem value="R4">R4 (Max 18 Hari)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Cargo Manifest No</label>
                <Input
                  value={cargoManifestNo}
                  onChange={(e) => setCargoManifestNo(e.target.value)}
                  placeholder="Opsional (misal: CM-1002)"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status Ban</label>
                <Select value={status} onValueChange={(val: "Repair" | "Retread" | "Reject") => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Repair">Repair</SelectItem>
                    <SelectItem value="Retread">Retread</SelectItem>
                    <SelectItem value="Reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Serial Number</label>
                <Input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  placeholder="SN Ban (Contoh: 123456)"
                  className="h-9 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Ukuran Ban</label>
                <TireRepairSearchableSelect
                  value={tireSize}
                  onValueChange={setTireSize}
                  options={sizeOptions}
                  placeholder="Pilih Ukuran Ban"
                  searchPlaceholder="Cari ukuran..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Brand</label>
                <TireRepairSearchableSelect
                  value={brand}
                  onValueChange={setBrand}
                  options={brandOptions}
                  placeholder="Pilih Brand"
                  searchPlaceholder="Cari brand..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Pattern</label>
                <Input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value.toUpperCase())}
                  placeholder="E4, L5, dsb"
                  className="h-9 text-xs uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Customer</label>
                <TireRepairSearchableSelect
                  value={customer}
                  onValueChange={setCustomer}
                  options={customerOptions}
                  placeholder="Pilih Customer"
                  searchPlaceholder="Cari customer..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Site</label>
                <TireRepairSearchableSelect
                  value={customerSite}
                  onValueChange={setCustomerSite}
                  options={siteOptions}
                  placeholder="Pilih Site"
                  searchPlaceholder="Cari site..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">RTD Left (mm)</label>
                <Input
                  value={rtd1}
                  onChange={(e) => setRtd1(e.target.value)}
                  placeholder="Contoh: 45"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">RTD Right (mm)</label>
                <Input
                  value={rtd2}
                  onChange={(e) => setRtd2(e.target.value)}
                  placeholder="Contoh: 46"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Catatan / Defect Remarks</label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Deskripsi temuan defect atau catatan inspeksi..."
                className="text-xs min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/60 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isSubmitting ? "Memperbarui..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODALS FOR MANUAL ADDITIONS */}
      {/* Add Custom Size */}
      <Dialog open={customSizeModalOpen} onOpenChange={setCustomSizeModalOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Ukuran Ban Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newCustomSizeInput}
              onChange={(e) => setNewCustomSizeInput(e.target.value.toUpperCase())}
              placeholder="Contoh: 36.00R51"
              className="text-xs uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomSizeModalOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                if (newCustomSizeInput.trim()) {
                  const val = newCustomSizeInput.trim().toUpperCase()
                  setSizeOptions((prev) => [val, ...prev])
                  setTireSize(val)
                  setNewCustomSizeInput("")
                  setCustomSizeModalOpen(false)
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Brand */}
      <Dialog open={customBrandModalOpen} onOpenChange={setCustomBrandModalOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Brand Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newCustomBrandInput}
              onChange={(e) => setNewCustomBrandInput(e.target.value.toUpperCase())}
              placeholder="Contoh: CONTINENTAL"
              className="text-xs uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomBrandModalOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                if (newCustomBrandInput.trim()) {
                  const val = newCustomBrandInput.trim().toUpperCase()
                  setBrandOptions((prev) => [val, ...prev])
                  setBrand(val)
                  setNewCustomBrandInput("")
                  setCustomBrandModalOpen(false)
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Customer */}
      <Dialog open={customCustomerModalOpen} onOpenChange={setCustomCustomerModalOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Customer Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newCustomCustomerInput}
              onChange={(e) => setNewCustomCustomerInput(e.target.value.toUpperCase())}
              placeholder="Contoh: PT FREEPORT INDONESIA"
              className="text-xs uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomCustomerModalOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                if (newCustomCustomerInput.trim()) {
                  const val = newCustomCustomerInput.trim().toUpperCase()
                  setCustomerOptions((prev) => [val, ...prev])
                  setCustomer(val)
                  setNewCustomCustomerInput("")
                  setCustomCustomerModalOpen(false)
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Site */}
      <Dialog open={customSiteModalOpen} onOpenChange={setCustomSiteModalOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Tambah Site Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newCustomSiteInput}
              onChange={(e) => setNewCustomSiteInput(e.target.value)}
              placeholder="Contoh: Grasberg"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCustomSiteModalOpen(false)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                if (newCustomSiteInput.trim()) {
                  const val = newCustomSiteInput.trim()
                  setSiteOptions((prev) => [val, ...prev])
                  setCustomerSite(val)
                  setNewCustomSiteInput("")
                  setCustomSiteModalOpen(false)
                }
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV / Excel Dialog */}
      <TireInspectionImportDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
