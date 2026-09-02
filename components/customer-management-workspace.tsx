"use client"

import * as React from "react"
import {
  Search,
  Download,
  Eye,
  Users,
  Building2,
  Mail,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  X,
  SortAsc,
  SortDesc,
  Edit2,
  UserCheck,
} from "lucide-react"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/use-permissions"
import {
  CustomerRecord,
  CustomerStats,
  createCustomerAction,
  deleteCustomerAction,
  getCustomersAction,
  importCustomersCSVAction,
  syncCustomersFromSAPAction,
  updateCustomerAction,
} from "@/app/actions/customer-management"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function getCategoryBadgeColor(category: string | null) {
  if (!category) return "bg-slate-100 text-slate-600 border-slate-200"
  const cat = category.toLowerCase()
  if (cat.includes("mining owner")) return "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
  if (cat.includes("pertambangan") || cat.includes("mining")) return "bg-orange-100 text-orange-800 border-orange-200"
  if (cat.includes("perdagangan") || cat.includes("supplier")) return "bg-slate-100 text-slate-700 border-slate-200"
  if (cat.includes("jasa") || cat.includes("profesional")) return "bg-blue-50 text-blue-700 border-blue-200"
  if (cat.includes("ban") || cat.includes("otomotif")) return "bg-emerald-50 text-emerald-800 border-emerald-200"
  if (cat.includes("perkebunan") || cat.includes("agribisnis")) return "bg-green-100 text-green-800 border-green-200"
  if (cat.includes("konstruksi") || cat.includes("infrastruktur")) return "bg-purple-50 text-purple-700 border-purple-200"
  return "bg-slate-100 text-slate-700 border-slate-200"
}

export function CustomerManagementWorkspace({
  initialCustomers,
  initialStats,
  categories,
}: {
  initialCustomers: CustomerRecord[]
  initialStats: CustomerStats
  categories: string[]
}) {
  // Read-only: data bersumber langsung dari onechitranewdb
  const { hasResourcePermission: _hasResourcePermission } = usePermissions()
  const canEdit = false
  const canCreate = false
  const canDelete = false

  const [customers, setCustomers] = React.useState<CustomerRecord[]>(initialCustomers)
  const [stats, setStats] = React.useState<CustomerStats>(initialStats)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [isPending, startTransition] = React.useTransition()
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [sortField, setSortField] = React.useState<keyof CustomerRecord>("name")
  const [sortAsc, setSortAsc] = React.useState(true)

  // Dialog States
  const [isAddEditOpen, setIsAddEditOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerRecord | null>(null)
  const [viewCustomer, setViewCustomer] = React.useState<CustomerRecord | null>(null)
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [isSyncingSap, setIsSyncingSap] = React.useState(false)

  // Form State
  const [formData, setFormData] = React.useState({
    customerCode: "",
    name: "",
    contactName: "",
    email: "",
    businessCategory: "",
    address1: "",
    address2: "",
    notes: "",
  })

  // Import CSV State
  const [csvFile, setCsvFile] = React.useState<File | null>(null)
  const [csvParsedRows, setCsvParsedRows] = React.useState<any[]>([])
  const [importStep, setImportStep] = React.useState<1 | 2>(1)
  const [fieldMapping, setFieldMapping] = React.useState({
    customerCode: "",
    name: "",
    contactName: "",
    email: "",
    businessCategory: "",
    address1: "",
  })

  const refreshData = React.useCallback(() => {
    startTransition(async () => {
      const res = await getCustomersAction({
        search: searchQuery,
        category: selectedCategory,
      })
      if (res.success) {
        setCustomers(res.data)
        setStats(res.stats)
      }
    })
  }, [searchQuery, selectedCategory])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      refreshData()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCategory, refreshData])

  // Filter & Sort
  const filteredCustomers = React.useMemo(() => {
    let result = [...customers]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.customerCode.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.contactName && c.contactName.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.address1 && c.address1.toLowerCase().includes(q))
      )
    }
    if (selectedCategory !== "all") {
      result = result.filter((c) => (c.businessCategory || "") === selectedCategory)
    }

    result.sort((a, b) => {
      const valA = (a[sortField] || "").toString().toLowerCase()
      const valB = (b[sortField] || "").toString().toLowerCase()
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return result
  }, [customers, searchQuery, selectedCategory, sortField, sortAsc])

  const toggleSort = (field: keyof CustomerRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCustomers.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const openAddModal = () => {
    setEditingCustomer(null)
    setFormData({
      customerCode: "",
      name: "",
      contactName: "",
      email: "",
      businessCategory: "",
      address1: "",
      address2: "",
      notes: "",
    })
    setIsAddEditOpen(true)
  }

  const openEditModal = (customer: CustomerRecord) => {
    setEditingCustomer(customer)
    setFormData({
      customerCode: customer.customerCode,
      name: customer.name,
      contactName: customer.contactName || "",
      email: customer.email || "",
      businessCategory: customer.businessCategory || "",
      address1: customer.address1 || "",
      address2: customer.address2 || "",
      notes: customer.notes || "",
    })
    setIsAddEditOpen(true)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.customerCode.trim()) {
      toast.error("Kode Customer (ID) dan Nama Customer wajib diisi.")
      return
    }

    if (editingCustomer) {
      const res = await updateCustomerAction(editingCustomer.id, formData)
      if (res.success) {
        toast.success("Data customer berhasil diperbarui.")
        setIsAddEditOpen(false)
        refreshData()
      } else {
        toast.error(res.error || "Gagal memperbarui customer.")
      }
    } else {
      const res = await createCustomerAction(formData)
      if (res.success) {
        toast.success("Customer baru berhasil ditambahkan.")
        setIsAddEditOpen(false)
        refreshData()
      } else {
        toast.error(res.error || "Gagal menambahkan customer.")
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await deleteCustomerAction(deleteId)
    if (res.success) {
      toast.success("Customer berhasil dihapus.")
      setDeleteId(null)
      refreshData()
    } else {
      toast.error(res.error || "Gagal menghapus customer.")
    }
  }

  const handleSyncSap = async () => {
    setIsSyncingSap(true)
    try {
      const res = await syncCustomersFromSAPAction()
      if (res.success) {
        toast.success(res.message || "Sinkronisasi SAP selesai.")
        refreshData()
      } else {
        toast.error(res.error || "Gagal sinkronisasi dari SAP.")
      }
    } catch {
      toast.error("Terjadi kesalahan saat sinkronisasi SAP.")
    } finally {
      setIsSyncingSap(false)
    }
  }

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.error("Tidak ada data untuk diexport.")
      return
    }

    const headers = ["ID (Code)", "Customer Name", "Contact", "Email", "Kategori Bisnis", "Address Primary", "Address Secondary", "Notes"]
    const csvRows = [headers.join(",")]

    for (const c of filteredCustomers) {
      const row = [
        `"${(c.customerCode || "").replace(/"/g, '""')}"`,
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${(c.contactName || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.businessCategory || "").replace(/"/g, '""')}"`,
        `"${(c.address1 || "").replace(/"/g, '""')}"`,
        `"${(c.address2 || "").replace(/"/g, '""')}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(","))
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `customer-master-export-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`${filteredCustomers.length} data customer diexport ke CSV.`)
  }

  const downloadExampleCSV = () => {
    const csvContent =
      "ID (Code),Customer Name,Contact,Email,Kategori Bisnis,Address Primary\n" +
      "13C3941A,ANDALAN BHUMI NUSANTARA,Bapak Budi,budi@andalan.co.id,Perdagangan / Supplier Umum,JL. CIKANGUNG NO. 5 RT.001 RW.001 JAKARTA\n" +
      "AGM1,ANTANG GUNUNG MERATUS,Cynthia,cynthia@baramulti.co.id,Mining Owner,Tapin Kalimantan Selatan\n" +
      "C1001,Cakramala Langit Sejahtera,Umar Alwafi,umar@cls.com,Pertambangan & Energi,JL Ruko Cordoba Blok C No 20 PIK Jakarta\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "example_customer_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleParseCsvFile = (file: File) => {
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text) return
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length === 0) return

      const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim())
      const rows: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim())
        const rowObj: any = {}
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || ""
        })
        rows.push(rowObj)
      }

      setCsvParsedRows(rows)

      // Auto map fields
      const autoMap = {
        customerCode: headers.find((h) => /code|id|kode/i.test(h)) || headers[0] || "",
        name: headers.find((h) => /name|nama/i.test(h)) || headers[1] || "",
        contactName: headers.find((h) => /contact|kontak|pic/i.test(h)) || "",
        email: headers.find((h) => /email|surat/i.test(h)) || "",
        businessCategory: headers.find((h) => /kategori|category|bisnis/i.test(h)) || "",
        address1: headers.find((h) => /address|alamat/i.test(h)) || "",
      }
      setFieldMapping(autoMap)
      setImportStep(2)
    }
    reader.readAsText(file)
  }

  const handleExecuteImport = async () => {
    if (!fieldMapping.customerCode || !fieldMapping.name) {
      toast.error("Kolom ID (Code) dan Customer Name wajib dipetakan.")
      return
    }

    const payload = csvParsedRows.map((r) => ({
      customerCode: r[fieldMapping.customerCode] || "",
      name: r[fieldMapping.name] || "",
      contactName: r[fieldMapping.contactName] || "",
      email: r[fieldMapping.email] || "",
      businessCategory: r[fieldMapping.businessCategory] || "",
      address1: r[fieldMapping.address1] || "",
    }))

    const res = await importCustomersCSVAction(payload)
    if (res.success) {
      toast.success(`Berhasil mengimpor ${res.count} data customer.`)
      setIsImportOpen(false)
      setCsvFile(null)
      setCsvParsedRows([])
      setImportStep(1)
      refreshData()
    } else {
      toast.error(res.error || "Gagal mengimpor CSV.")
    }
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Management</h1>
        <p className="text-sm text-slate-500">
          Data customer bersumber langsung dari sistem onechitranewdb (read-only).
        </p>
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Building2 className="h-4 w-4 shrink-0 text-blue-500" />
        <span>
          <strong>Mode Baca Saja.</strong> Data customer dikelola di sistem sumber (<code className="font-mono text-xs bg-blue-100 px-1 rounded">onechitranewdb</code>). Penambahan, pengeditan, dan penghapusan tidak tersedia di sini.
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {/* Total Customers */}
        <Card className="border border-slate-200/80 bg-gradient-to-br from-blue-50/40 via-white to-white shadow-sm transition hover:shadow">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.totalCustomers}</span>
              </div>
              <p className="text-xs text-slate-400">All registered customers</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/70 text-blue-600 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* New This Month */}
        <Card className="border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm transition hover:shadow">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">New This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.newThisMonth}</span>
              </div>
              <p className="text-xs text-slate-400">Added in current month</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/70 text-emerald-600 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="h-10 pl-9 pr-4 text-sm bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-10 w-full sm:w-56 bg-white border-slate-200 shadow-sm text-sm">
              <SelectValue placeholder="Kategori Bisnis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons - Read Only: hanya Export */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 font-medium"
          >
            <Download className="mr-2 h-4 w-4 text-blue-600" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Customer Virtualized Data Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-[600px] overflow-auto relative scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <Checkbox
                    checked={
                      filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th
                  onClick={() => toggleSort("customerCode")}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID (Code)</span>
                    {sortField === "customerCode" &&
                      (sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("name")}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer Name</span>
                    {sortField === "name" &&
                      (sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("contactName")}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Contact</span>
                    {sortField === "contactName" &&
                      (sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("email")}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Email</span>
                    {sortField === "email" &&
                      (sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("businessCategory")}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori Bisnis</span>
                    {sortField === "businessCategory" &&
                      (sortAsc ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />)}
                  </div>
                </th>
                <th className="px-4 py-3.5">Address (Primary)</th>
                <th className="w-24 px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Building2 className="h-10 w-10 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium">Tidak ada data customer yang ditemukan.</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? "Coba ubah kata kunci pencarian." : "Tambahkan customer baru atau impor dari SAP."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isSelected = selectedIds.includes(customer.id)
                  return (
                    <tr
                      key={customer.id}
                      className={`group transition hover:bg-indigo-50/30 ${
                        isSelected ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(customer.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-indigo-600">
                        {customer.customerCode || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 max-w-[260px] truncate">
                        <button
                          onClick={() => setViewCustomer(customer)}
                          className="hover:text-indigo-600 hover:underline text-left"
                        >
                          {customer.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">
                        {customer.contactName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {customer.email}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {customer.businessCategory ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-0.5 text-[11px] font-normal border ${getCategoryBadgeColor(
                              customer.businessCategory
                            )}`}
                          >
                            {customer.businessCategory}
                          </Badge>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[300px] truncate">
                        {customer.address1 || "-"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewCustomer(customer)}
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="View Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-slate-700">{filteredCustomers.length}</strong> dari{" "}
            <strong className="text-slate-700">{customers.length}</strong> customer
          </div>
          {selectedIds.length > 0 && (
            <div className="font-medium text-indigo-600">
              {selectedIds.length} customer terpilih
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveCustomer}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingCustomer ? "Edit Data Customer" : "Tambah Customer Baru"}
              </DialogTitle>
              <DialogDescription>
                Isi rincian informasi customer di bawah ini.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customerCode">ID (Code) *</Label>
                  <Input
                    id="customerCode"
                    value={formData.customerCode}
                    onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                    placeholder="e.g. 13C3941A"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessCategory">Kategori Bisnis</Label>
                  <Input
                    id="businessCategory"
                    value={formData.businessCategory}
                    onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                    placeholder="e.g. Perdagangan / Supplier Umum"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. PT. ANDALAN BHUMI NUSANTARA"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Contact Person</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. Cynthia / David Siregar"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. info@customer.co.id"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address1">Address (Primary)</Label>
                <Textarea
                  id="address1"
                  rows={2}
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                  placeholder="Alamat utama / pengiriman customer..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Catatan Tambahan</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan khusus, syarat pembayaran, dll."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingCustomer ? "Simpan Perubahan" : "Tambah Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Preview Modal (Large Dialog max-w-4xl per One Chitra guidelines) */}
      <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <DialogContent className="sm:max-w-4xl border border-slate-200 p-0 overflow-hidden rounded-2xl shadow-xl">
          {viewCustomer && (
            <div className="space-y-0">
              {/* Modal Banner Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-md border border-indigo-400/30">
                        ID: {viewCustomer.customerCode || "-"}
                      </span>
                      {viewCustomer.businessCategory && (
                        <Badge className="bg-amber-400 text-slate-950 font-medium">
                          {viewCustomer.businessCategory}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white pt-2">{viewCustomer.name}</h2>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const cust = viewCustomer
                        setViewCustomer(null)
                        openEditModal(cust)
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit Customer
                    </Button>
                  )}
                </div>
              </div>

              {/* Document Details Grid */}
              <div className="p-6 space-y-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Contact & General Info */}
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-600" /> Information & PIC
                    </h3>
                    <div className="space-y-3 divide-y divide-slate-100 text-sm">
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Contact Person</span>
                        <strong className="text-slate-900">{viewCustomer.contactName || "-"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Email Address</span>
                        <strong className="text-indigo-600">
                          {viewCustomer.email ? (
                            <a href={`mailto:${viewCustomer.email}`} className="hover:underline">
                              {viewCustomer.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Kategori Bisnis</span>
                        <strong className="text-slate-900">{viewCustomer.businessCategory || "-"}</strong>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Terdaftar Sejak</span>
                        <strong className="text-slate-700">
                          {viewCustomer.createdAt
                            ? new Date(viewCustomer.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "-"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Address Details */}
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-600" /> Primary Shipping Address
                    </h3>
                    <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[120px]">
                      {viewCustomer.address1 ? viewCustomer.address1 : <span className="text-slate-400 italic">Belum ada alamat utama yang disimpan.</span>}
                    </div>
                    {viewCustomer.notes && (
                      <div className="space-y-1 pt-2">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Catatan</span>
                        <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-md">
                          {viewCustomer.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 p-4 bg-white flex justify-end">
                <Button variant="outline" onClick={() => setViewCustomer(null)}>
                  Tutup Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog with Template Download & Field Mapping */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Import Data Customer dari CSV</DialogTitle>
            <DialogDescription>
              Unggah file CSV untuk mengimpor atau memperbarui data customer master.
            </DialogDescription>
          </DialogHeader>

          {importStep === 1 ? (
            <div className="space-y-5 py-4">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-700">Pilih file CSV customer</p>
                <p className="text-xs text-slate-400">File CSV dengan header ID (Code), Customer Name, dll.</p>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="csv-upload-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleParseCsvFile(file)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-slate-300 bg-white"
                  onClick={() => document.getElementById("csv-upload-input")?.click()}
                >
                  Pilih File CSV
                </Button>
              </div>

              {/* Template Download Button (One Chitra Rule) */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-blue-50/50 p-3 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Butuh panduan format header CSV?</span>
                </div>
                <Button variant="ghost" size="sm" onClick={downloadExampleCSV} className="text-blue-700 hover:text-blue-900 font-semibold p-0 h-auto">
                  Download Contoh CSV
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Field Mapping Step */
            <div className="space-y-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pemetaan Kolom CSV ({csvParsedRows.length} baris terdeteksi)
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label>ID / Customer Code *</Label>
                  <Select
                    value={fieldMapping.customerCode}
                    onValueChange={(val) => setFieldMapping({ ...fieldMapping, customerCode: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih Kolom CSV" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(csvParsedRows[0] || {}).map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Customer Name *</Label>
                  <Select
                    value={fieldMapping.name}
                    onValueChange={(val) => setFieldMapping({ ...fieldMapping, name: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih Kolom CSV" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(csvParsedRows[0] || {}).map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Contact Person</Label>
                  <Select
                    value={fieldMapping.contactName}
                    onValueChange={(val) => setFieldMapping({ ...fieldMapping, contactName: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="(Opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(csvParsedRows[0] || {}).map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Email Address</Label>
                  <Select
                    value={fieldMapping.email}
                    onValueChange={(val) => setFieldMapping({ ...fieldMapping, email: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="(Opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(csvParsedRows[0] || {}).map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Address (Primary)</Label>
                  <Select
                    value={fieldMapping.address1}
                    onValueChange={(val) => setFieldMapping({ ...fieldMapping, address1: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="(Opsional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(csvParsedRows[0] || {}).map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {importStep === 2 ? (
              <>
                <Button variant="outline" onClick={() => setImportStep(1)}>
                  Kembali
                </Button>
                <Button onClick={handleExecuteImport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Jalankan Import ({csvParsedRows.length} Rows)
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                Batal
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">Hapus Data Customer?</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus data customer secara permanen dari database One Chitra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Ya, Hapus Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
