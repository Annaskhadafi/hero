'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Inbox,
  Layers,
  LayoutGrid,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Import all templates directly from central barrel
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroDateRangePicker,
  HeroDetailModal,
  HeroEmptyState,
  HeroFileUpload,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroKpiCard,
  HeroNumberInput,
  HeroSearchableSelect,
  HeroStatusBadge,
  HeroSwitch,
  HeroTextarea,
  type HeroColumnDef,
  type HeroSearchableSelectOption,
  type HeroStatusOption,
  type HeroTableFilter,
} from '@/components/templates'

// Mock Data Structure
interface WorkOrderRecord {
  id: string
  woNumber: string
  employeeSn: string
  employeeName: string
  department: string
  site: string
  date: string
  cost: number
  priority: 'Tinggi' | 'Sedang' | 'Rendah'
  status: string
}

const INITIAL_MOCK_DATA: WorkOrderRecord[] = [
  {
    id: 'WO-001',
    woNumber: 'WO/2026/04/001',
    employeeSn: 'CP-1029',
    employeeName: 'Budi Santoso',
    department: 'Workshop',
    site: 'Balikpapan Base',
    date: '2026-04-12',
    cost: 4500000,
    priority: 'Tinggi',
    status: 'approved',
  },
  {
    id: 'WO-002',
    woNumber: 'WO/2026/04/002',
    employeeSn: 'CP-1088',
    employeeName: 'Rian Pratama',
    department: 'Mining Operations',
    site: 'Kideco Jaya Agung',
    date: '2026-04-13',
    cost: 12500000,
    priority: 'Tinggi',
    status: 'pending',
  },
  {
    id: 'WO-003',
    woNumber: 'WO/2026/04/003',
    employeeSn: 'CP-1142',
    employeeName: 'Siti Aminah',
    department: 'General Affairs',
    site: 'Head Office Jakarta',
    date: '2026-04-14',
    cost: 1800000,
    priority: 'Rendah',
    status: 'approved',
  },
  {
    id: 'WO-004',
    woNumber: 'WO/2026/04/004',
    employeeSn: 'CP-1205',
    employeeName: 'Fajar Nugraha',
    department: 'HSE & Safety',
    site: 'Berau Coal',
    date: '2026-04-14',
    cost: 7300000,
    priority: 'Sedang',
    status: 'in_review',
  },
  {
    id: 'WO-005',
    woNumber: 'WO/2026/04/005',
    employeeSn: 'CP-1310',
    employeeName: 'Eko Wahyudi',
    department: 'Workshop',
    site: 'Sangatta Kutai',
    date: '2026-04-15',
    cost: 8900000,
    priority: 'Tinggi',
    status: 'rejected',
  },
  {
    id: 'WO-006',
    woNumber: 'WO/2026/04/006',
    employeeSn: 'CP-1422',
    employeeName: 'Dewi Lestari',
    department: 'Human Capital',
    site: 'Head Office Jakarta',
    date: '2026-04-15',
    cost: 2100000,
    priority: 'Rendah',
    status: 'draft',
  },
  {
    id: 'WO-007',
    woNumber: 'WO/2026/04/007',
    employeeSn: 'CP-1504',
    employeeName: 'Agus Setiawan',
    department: 'Mining Operations',
    site: 'Adaro Tabalong',
    date: '2026-04-15',
    cost: 15400000,
    priority: 'Tinggi',
    status: 'pending',
  },
  {
    id: 'WO-008',
    woNumber: 'WO/2026/04/008',
    employeeSn: 'CP-1618',
    employeeName: 'Hendro Saputra',
    department: 'Workshop',
    site: 'Balikpapan Base',
    date: '2026-04-16',
    cost: 3200000,
    priority: 'Sedang',
    status: 'approved',
  },
  {
    id: 'WO-009',
    woNumber: 'WO/2026/04/009',
    employeeSn: 'CP-1725',
    employeeName: 'Nurul Hidayah',
    department: 'Supply Chain',
    site: 'Balikpapan Base',
    date: '2026-04-16',
    cost: 6700000,
    priority: 'Sedang',
    status: 'in_review',
  },
  {
    id: 'WO-010',
    woNumber: 'WO/2026/04/010',
    employeeSn: 'CP-1833',
    employeeName: 'Bayu Wicaksono',
    department: 'Mining Operations',
    site: 'Kideco Jaya Agung',
    date: '2026-04-16',
    cost: 9800000,
    priority: 'Tinggi',
    status: 'approved',
  },
]

const EMPLOYEE_OPTIONS: HeroSearchableSelectOption[] = [
  { value: 'CP-1029', label: 'Budi Santoso', description: 'Workshop Lead - Balikpapan', badge: 'Workshop' },
  { value: 'CP-1088', label: 'Rian Pratama', description: 'Senior Tyre Specialist - Kideco', badge: 'Mining' },
  { value: 'CP-1142', label: 'Siti Aminah', description: 'GA Specialist - Head Office', badge: 'GA' },
  { value: 'CP-1205', label: 'Fajar Nugraha', description: 'Safety Officer - Berau', badge: 'HSE' },
  { value: 'CP-1310', label: 'Eko Wahyudi', description: 'Tyre Handler - Sangatta', badge: 'Workshop' },
  { value: 'CP-1422', label: 'Dewi Lestari', description: 'Talent Acquisition - Head Office', badge: 'HC' },
  { value: 'CP-1504', label: 'Agus Setiawan', description: 'Service Supervisor - Adaro', badge: 'Mining' },
]

const DEPARTMENT_OPTIONS: HeroSearchableSelectOption[] = [
  { value: 'Workshop', label: 'Workshop & Retread' },
  { value: 'Mining Operations', label: 'Mining Operations' },
  { value: 'General Affairs', label: 'General Affairs' },
  { value: 'HSE & Safety', label: 'HSE & Safety' },
  { value: 'Human Capital', label: 'Human Capital' },
  { value: 'Supply Chain', label: 'Supply Chain & Logistics' },
]

const SITE_OPTIONS: HeroSearchableSelectOption[] = [
  { value: 'Balikpapan Base', label: 'Balikpapan Base' },
  { value: 'Kideco Jaya Agung', label: 'Kideco Jaya Agung (Batu Kajang)' },
  { value: 'Adaro Tabalong', label: 'Adaro Indonesia (Tabalong)' },
  { value: 'Sangatta Kutai', label: 'KPC Sangatta' },
  { value: 'Berau Coal', label: 'Berau Coal Site' },
  { value: 'Head Office Jakarta', label: 'Head Office (Jakarta)' },
]

const STATUS_OPTIONS: HeroStatusOption[] = [
  { value: 'approved', label: 'Disetujui (Approved)' },
  { value: 'pending', label: 'Menunggu (Pending)' },
  { value: 'in_review', label: 'Dalam Peninjauan (In Review)' },
  { value: 'rejected', label: 'Ditolak (Rejected)' },
  { value: 'draft', label: 'Draf (Draft)' },
]

export default function UiShowcasePage() {
  const [dataList, setDataList] = React.useState<WorkOrderRecord[]>(INITIAL_MOCK_DATA)
  const [selectedRecord, setSelectedRecord] = React.useState<WorkOrderRecord | null>(null)

  // Dialog State
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false)
  const [bulkTargetIds, setBulkTargetIds] = React.useState<string[]>([])
  const [bulkStatusToApply, setBulkStatusToApply] = React.useState('approved')

  // Standalone Form Demonstration State
  const [formEmployee, setFormEmployee] = React.useState('CP-1029')
  const [formDept, setFormDept] = React.useState('Workshop')
  const [formSites, setFormSites] = React.useState<string[]>(['Balikpapan Base'])
  const [formStatus, setFormStatus] = React.useState('approved')
  const [formTitle, setFormTitle] = React.useState('Inspeksi Tyre Handler Harian')
  const [formCost, setFormCost] = React.useState<number | undefined>(4500000)
  const [formDate, setFormDate] = React.useState<Date | undefined>(new Date())
  const [formDateRange, setFormDateRange] = React.useState<any>()
  const [formNeedL2, setFormNeedL2] = React.useState(true)
  const [formNotes, setFormNotes] = React.useState('Mohon diperiksa sebelum pergantian shift sore.')
  const [formUploadedFile, setFormUploadedFile] = React.useState<string | null>('/uploads/sample.pdf')

  // Notification Toast Demo
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Row Action Handlers
  const handleView = (row: WorkOrderRecord) => {
    setSelectedRecord(row)
    setIsDetailOpen(true)
  }

  const handleEdit = (row: WorkOrderRecord) => {
    setSelectedRecord(row)
    setIsFormOpen(true)
  }

  const handleDelete = (row: WorkOrderRecord) => {
    setSelectedRecord(row)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!selectedRecord) return
    setDataList((prev) => prev.filter((r) => r.id !== selectedRecord.id))
    setIsDeleteOpen(false)
    showToast(`Dokumen ${selectedRecord.woNumber} berhasil dihapus.`)
  }

  const handleInlineStatusChange = (rowId: string, newStatus: string) => {
    setDataList((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, status: newStatus } : r))
    )
    showToast(`Status data ${rowId} diubah langsung menjadi ${newStatus}.`)
  }

  const handleBulkEdit = (ids: string[]) => {
    setBulkTargetIds(ids)
    setIsBulkEditOpen(true)
  }

  const confirmBulkEdit = () => {
    setDataList((prev) =>
      prev.map((r) =>
        bulkTargetIds.includes(r.id) ? { ...r, status: bulkStatusToApply } : r
      )
    )
    setIsBulkEditOpen(false)
    showToast(`${bulkTargetIds.length} data diperbarui ke status ${bulkStatusToApply}.`)
  }

  const handleBulkDelete = (ids: string[]) => {
    if (confirm(`Hapus ${ids.length} data yang dipilih?`)) {
      setDataList((prev) => prev.filter((r) => !ids.includes(r.id)))
      showToast(`${ids.length} data berhasil dihapus.`)
    }
  }

  // Columns definition
  const columns: HeroColumnDef<WorkOrderRecord>[] = [
    {
      key: 'woNumber',
      header: 'No. Work Order',
      sortable: true,
      render: (row) => (
        <span
          onClick={() => handleView(row)}
          className="font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          {row.woNumber}
        </span>
      ),
    },
    {
      key: 'employeeName',
      header: 'Karyawan',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.employeeName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.employeeSn}</div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Departemen',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-700">{row.department}</span>,
    },
    {
      key: 'site',
      header: 'Lokasi / Site',
      sortable: true,
      render: (row) => <span className="text-xs text-slate-600">{row.site}</span>,
    },
    {
      key: 'date',
      header: 'Tanggal',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(row.date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Estimasi Biaya',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          Rp {row.cost.toLocaleString('id-ID')}
        </span>
      ),
      exportValue: (row) => row.cost,
    },
    {
      key: 'priority',
      header: 'Prioritas',
      sortable: true,
      align: 'center',
      render: (row) => {
        const color =
          row.priority === 'Tinggi'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : row.priority === 'Sedang'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-slate-50 text-slate-700 border-slate-200'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
            {row.priority}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status (Klik Ubah)',
      sortable: true,
      align: 'center',
      render: (row) => (
        <HeroStatusBadge
          status={row.status}
          editable
          options={STATUS_OPTIONS}
          onChange={(newSt) => handleInlineStatusChange(row.id, newSt)}
        />
      ),
    },
  ]

  const filters: HeroTableFilter[] = [
    {
      key: 'department',
      label: 'Departemen',
      isMulti: true,
      options: [
        { value: 'Workshop', label: 'Workshop' },
        { value: 'Mining Operations', label: 'Mining Operations' },
        { value: 'General Affairs', label: 'General Affairs' },
        { value: 'HSE & Safety', label: 'HSE & Safety' },
        { value: 'Human Capital', label: 'Human Capital' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      isMulti: true,
      options: [
        { value: 'approved', label: 'Approved' },
        { value: 'pending', label: 'Pending' },
        { value: 'in_review', label: 'In Review' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'draft', label: 'Draft' },
      ],
    },
  ]

  const importFields = [
    { key: 'woNumber', label: 'No. Work Order', required: true },
    { key: 'employeeSn', label: 'SN Karyawan', required: true },
    { key: 'employeeName', label: 'Nama Karyawan', required: true },
    { key: 'department', label: 'Departemen', required: true },
    { key: 'cost', label: 'Estimasi Biaya' },
  ]

  return (
    <AdminPageShell
      title="Standard UI Component Template Library"
      eyebrow="HERO OPERATIONAL WORKSPACE"
      badge="Full Shadcn Kit"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="dense"
            onClick={() => {
              setDataList(INITIAL_MOCK_DATA)
              showToast('Data dikembalikan ke sampel awal.')
            }}
            className="h-9 gap-1.5 font-medium"
          >
            <RefreshCw className="size-3.5" />
            <span>Reset Demo</span>
          </Button>

          <Button
            variant="default"
            size="dense"
            onClick={() => {
              setSelectedRecord(null)
              setIsFormOpen(true)
            }}
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Tambah Data Baru</span>
          </Button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Colorful KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpiCard
          title="Total Work Orders"
          value={dataList.length}
          unit="Dokumen"
          tone="blue"
          icon={<FileText className="size-5" />}
          badge="Operasional"
          trend={{ value: '+12%', direction: 'up', label: 'vs bulan lalu' }}
        />
        <HeroKpiCard
          title="Disetujui (Approved)"
          value={dataList.filter((d) => d.status === 'approved').length}
          unit="Pekerjaan"
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
          badge="100% SLA"
          trend={{ value: 'Tepat Waktu', direction: 'up', label: 'on track' }}
        />
        <HeroKpiCard
          title="Pending Approval"
          value={dataList.filter((d) => d.status === 'pending').length}
          unit="Antrean"
          tone="amber"
          icon={<Clock className="size-5" />}
          badge="Perlu Review"
          trend={{ value: '2 Butuh L2', direction: 'neutral', label: 'antrean site' }}
        />
        <HeroKpiCard
          title="Perlu Koreksi"
          value={dataList.filter((d) => d.status === 'rejected').length}
          unit="Revisi"
          tone="rose"
          icon={<AlertTriangle className="size-5" />}
          badge="Tindakan"
          trend={{ value: '-5%', direction: 'down', label: 'revisi requester' }}
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="table" className="w-full space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-11 border border-border/70">
          <TabsTrigger
            value="table"
            className="h-9 gap-2 px-4 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            <TableIcon className="size-4" />
            <span>1. Table Template (Lengkap)</span>
          </TabsTrigger>
          <TabsTrigger
            value="forms"
            className="h-9 gap-2 px-4 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            <Layers className="size-4" />
            <span>2. Form Controls & Dropdown Searchable</span>
          </TabsTrigger>
          <TabsTrigger
            value="dialogs"
            className="h-9 gap-2 px-4 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            <LayoutGrid className="size-4" />
            <span>3. Modal & Dialog Templates</span>
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="h-9 gap-2 px-4 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
          >
            <Award className="size-4" />
            <span>4. Status Badges & Empty State</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: REUSABLE TABLE TEMPLATE                           */}
        {/* ======================================================== */}
        <TabsContent value="table" className="space-y-4 outline-none">
          <Card className="border border-border/70 shadow-xs rounded-xl bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold text-slate-900">
                HeroDataTable Template
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Tabel operasional lengkap: Sorting kolom, pencarian instan, filter searchable, multi-select baris, bulk edit status / bulk delete, ekspor Excel (.xlsx), ekspor PDF A4, dan import data.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <HeroDataTable
                data={dataList}
                columns={columns}
                idField="id"
                searchPlaceholder="Cari no. SPK, nama, departemen, site..."
                searchKeys={['woNumber', 'employeeName', 'department', 'site', 'employeeSn']}
                filters={filters}
                importFields={importFields}
                importTitle="Import Work Order Operasional"
                onImport={(payload) => showToast(`Import berhasil! Memproses ${payload.rows.length} baris.`)}
                exportFileName="work-orders-hero"
                pdfTitle="Laporan Rekapitulasi Work Order - PT Chitra Paratama"
                onBulkEdit={handleBulkEdit}
                onBulkDelete={handleBulkDelete}
                renderRowActions={(row) => (
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="dense"
                            onClick={() => handleView(row)}
                            className="size-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Lihat Rincian</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="dense"
                            onClick={() => handleEdit(row)}
                            className="size-8 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ubah Data</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="dense"
                            onClick={() => handleDelete(row)}
                            className="size-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Hapus</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: REUSABLE FORM CONTROLS & SEARCHABLE DROPDOWNS     */}
        {/* ======================================================== */}
        <TabsContent value="forms" className="space-y-4 outline-none">
          <Card className="border border-border/70 shadow-xs rounded-xl bg-white max-w-4xl mx-auto">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold text-slate-900">
                Form Controls Suite (Semua Kontrol Standar h-9)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Setiap dropdown wajib searchable, input mata uang otomatis terformat, datepicker dengan preset lokal, dan upload berkas persisten S3/Dokploy.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Single Searchable Select */}
                <HeroFormField label="Pilih Karyawan (Searchable)" required tooltip="Pilih penanggung jawab teknis dari daftar karyawan aktif">
                  <HeroSearchableSelect
                    placeholder="Ketik nama / SN karyawan..."
                    options={EMPLOYEE_OPTIONS}
                    value={formEmployee}
                    onChange={setFormEmployee}
                  />
                </HeroFormField>

                {/* 2. Departemen Searchable */}
                <HeroFormField label="Departemen (Searchable)" required>
                  <HeroSearchableSelect
                    placeholder="Pilih departemen..."
                    options={DEPARTMENT_OPTIONS}
                    value={formDept}
                    onChange={setFormDept}
                  />
                </HeroFormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3. Multi-Select Searchable Sites */}
                <HeroFormField label="Area / Multi-Site (Multi Searchable)" tooltip="Bisa memilih lebih dari 1 lokasi kerja">
                  <HeroSearchableSelect
                    placeholder="Pilih satu atau lebih site..."
                    isMulti
                    options={SITE_OPTIONS}
                    value={formSites}
                    onChange={setFormSites}
                  />
                </HeroFormField>

                {/* 4. Date Picker Single */}
                <HeroFormField label="Tanggal Pelaksanaan" required>
                  <HeroDatePicker
                    value={formDate}
                    onChange={setFormDate}
                    placeholder="Pilih tanggal pekerjaan..."
                  />
                </HeroFormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 5. Date Range Picker with Presets */}
                <HeroFormField label="Rentang Periode SLA (Presets)" tooltip="Mendukung preset cepat: Hari Ini, 7 Hari, 30 Hari">
                  <HeroDateRangePicker
                    value={formDateRange}
                    onChange={setFormDateRange}
                    placeholder="Pilih rentang tanggal SLA..."
                  />
                </HeroFormField>

                {/* 6. Number / Currency Input */}
                <HeroFormField label="Estimasi Anggaran (Otomatis Rupiah)" required>
                  <HeroNumberInput
                    value={formCost}
                    onChange={setFormCost}
                    placeholder="5.000.000"
                  />
                </HeroFormField>
              </div>

              {/* 7. Text Input */}
              <HeroFormField label="Judul Pekerjaan Operasional" required helperText="Gunakan format ringkas yang mudah diidentifikasi">
                <HeroInput
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Inspeksi Tyre Handler Site Balikpapan"
                  clearable
                  onClear={() => setFormTitle('')}
                />
              </HeroFormField>

              {/* 8. Textarea with character counter */}
              <HeroFormField label="Catatan Teknis / SOP" tooltip="Rincian instruksi kerja sesuai standar WIN">
                <HeroTextarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  showCount
                  placeholder="Tuliskan catatan teknis operasional..."
                />
              </HeroFormField>

              {/* 9. File Upload with Lightbox Preview */}
              <HeroFormField label="Dokumen Pendukung / Foto Kerusakan" helperText="File tersimpan secara persisten melalui proxy terpusat /api/uploads/...">
                <HeroFileUpload
                  value={formUploadedFile}
                  onChange={setFormUploadedFile}
                  description="Format JPG, PNG, atau PDF (Maks. 10MB)"
                />
              </HeroFormField>

              {/* 10. Switch Toggle */}
              <HeroSwitch
                label="Verifikasi Tambahan L2 Approver"
                description="Wajib dicentang jika pekerjaan menyangkut safety kritis atau biaya di atas ambang batas site."
                checked={formNeedL2}
                onCheckedChange={setFormNeedL2}
              />

              {/* Form Action Buttons (Unified h-9) */}
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={() => {
                    setFormTitle('')
                    setFormCost(undefined)
                    setFormNotes('')
                    setFormUploadedFile(null)
                    showToast('Formulir direset.')
                  }}
                  className="h-9 px-4 font-medium"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="dense"
                  onClick={() => showToast('Data formulir berhasil disimpan!')}
                  className="h-9 px-5 font-semibold"
                >
                  Simpan Formulir
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: DIALOGS & MODAL TEMPLATES                         */}
        {/* ======================================================== */}
        <TabsContent value="dialogs" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Form Modal Card */}
            <Card className="border border-border/70 rounded-xl bg-white shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit2 className="size-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">HeroFormDialog</h4>
                <p className="text-xs text-slate-500">
                  Modal baku untuk Create / Update formulir dengan layout scrollable dan tombol aksi terstandarisasi.
                </p>
              </div>
              <Button
                variant="outline"
                size="dense"
                onClick={() => {
                  setSelectedRecord(null)
                  setIsFormOpen(true)
                }}
                className="h-9 mt-4 w-full"
              >
                Buka Form Dialog
              </Button>
            </Card>

            {/* 2. Confirm Dialog Card */}
            <Card className="border border-border/70 rounded-xl bg-white shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="size-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">HeroConfirmDialog</h4>
                <p className="text-xs text-slate-500">
                  Dialog konfirmasi tindakan kritis (Hapus, Tolak, Kembalikan) dengan nada warna peringatan dan tombol proteksi.
                </p>
              </div>
              <Button
                variant="outline"
                size="dense"
                onClick={() => {
                  setSelectedRecord(dataList[0])
                  setIsDeleteOpen(true)
                }}
                className="h-9 mt-4 w-full text-rose-600 hover:text-rose-700"
              >
                Buka Confirm Dialog
              </Button>
            </Card>

            {/* 3. Detail Document Modal Card */}
            <Card className="border border-border/70 rounded-xl bg-white shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="size-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">HeroDetailModal</h4>
                <p className="text-xs text-slate-500">
                  Tampilan pratinjau dokumen resmi (Detail View max-w-4xl) dengan status badge dan tombol shortcut Edit langsung.
                </p>
              </div>
              <Button
                variant="outline"
                size="dense"
                onClick={() => {
                  setSelectedRecord(dataList[0])
                  setIsDetailOpen(true)
                }}
                className="h-9 mt-4 w-full text-blue-600 hover:text-blue-700"
              >
                Buka Detail Modal
              </Button>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: SCORECARDS, STATUS BADGES & EMPTY STATES          */}
        {/* ======================================================== */}
        <TabsContent value="status" className="space-y-6 outline-none">
          {/* 1. Galeri Scorecard Colorful (Soft Gradient + Vibrant Icon Badge) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Galeri Scorecard Colorful (Varian Soft Gradient + Ikonik)
              </h3>
              <p className="text-xs text-slate-500">
                Warna pastel cerah dengan badge ikon gradien, watermark dekoratif, dan indikator tren.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <HeroKpiCard
                title="Total WO"
                value="142"
                unit="Dokumen"
                tone="blue"
                icon={<FileText />}
                badge="Aktif"
                trend={{ value: '+14%', direction: 'up' }}
              />
              <HeroKpiCard
                title="Approved"
                value="98"
                unit="Selesai"
                tone="emerald"
                icon={<CheckCircle2 />}
                badge="98% SLA"
                trend={{ value: '+8%', direction: 'up' }}
              />
              <HeroKpiCard
                title="Pending"
                value="26"
                unit="Antrean"
                tone="amber"
                icon={<Clock />}
                badge="Review"
                trend={{ value: '3 Butuh L2', direction: 'neutral' }}
              />
              <HeroKpiCard
                title="Ditolak"
                value="6"
                unit="Revisi"
                tone="rose"
                icon={<AlertTriangle />}
                badge="Tindakan"
                trend={{ value: '-2%', direction: 'down' }}
              />
              <HeroKpiCard
                title="Performa Tim"
                value="94.8"
                unit="/ 100"
                tone="purple"
                icon={<Award />}
                badge="Top Tier"
                trend={{ value: '+3.2%', direction: 'up' }}
              />
              <HeroKpiCard
                title="Unit Utility"
                value="48"
                unit="Armada"
                tone="cyan"
                icon={<Wrench />}
                badge="Optimal"
                trend={{ value: 'Ready', direction: 'up' }}
              />
            </div>
          </div>

          {/* 2. Galeri Scorecard Solid Gradient */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Varian Solid Gradient (Kontras Tajam untuk Dashboard Utama)
              </h3>
              <p className="text-xs text-slate-500">
                Warna saturated penuh dengan teks putih bersih dan efek glow.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <HeroKpiCard
                variant="solid"
                title="Total Transaksi Bulan Ini"
                value="Rp 842.500.000"
                tone="blue"
                icon={<FileSpreadsheet />}
                badge="Target 85%"
                trend={{ value: '+18.4%', direction: 'up', label: 'vs bulan lalu' }}
              />
              <HeroKpiCard
                variant="solid"
                title="Tingkat Keselamatan Kerja (HSE)"
                value="99.9%"
                unit="Zero Accident"
                tone="emerald"
                icon={<UserCheck />}
                badge="HSE Gold"
                trend={{ value: '365 Hari', direction: 'up', label: 'tanpa insiden' }}
              />
              <HeroKpiCard
                variant="solid"
                title="Pencapaian KPI Operasional"
                value="96.4%"
                tone="purple"
                icon={<Sparkles />}
                badge="Excellence"
                trend={{ value: '+5.1%', direction: 'up', label: 'di atas rata-rata' }}
              />
            </div>
          </div>

          {/* 3. Status Badges & Empty State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Status Badges Suite */}
            <Card className="border border-border/70 rounded-xl bg-white shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold text-slate-900">
                  HeroStatusBadge (Interaktif & Konservasi Warna)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Klik badge untuk mengubah status secara inline tanpa harus membuka formulir penuh.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
                  <span className="text-slate-600">Disetujui (Approved):</span>
                  <HeroStatusBadge
                    status="approved"
                    editable
                    options={STATUS_OPTIONS}
                    onChange={(st) => showToast(`Status berubah ke: ${st}`)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
                  <span className="text-slate-600">Menunggu (Pending):</span>
                  <HeroStatusBadge
                    status="pending"
                    editable
                    options={STATUS_OPTIONS}
                    onChange={(st) => showToast(`Status berubah ke: ${st}`)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
                  <span className="text-slate-600">Dalam Peninjauan (In Review):</span>
                  <HeroStatusBadge
                    status="in_review"
                    editable
                    options={STATUS_OPTIONS}
                    onChange={(st) => showToast(`Status berubah ke: ${st}`)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
                  <span className="text-slate-600">Ditolak (Rejected):</span>
                  <HeroStatusBadge
                    status="rejected"
                    editable
                    options={STATUS_OPTIONS}
                    onChange={(st) => showToast(`Status berubah ke: ${st}`)}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border text-xs">
                  <span className="text-slate-600">Draf (Draft):</span>
                  <HeroStatusBadge
                    status="draft"
                    editable
                    options={STATUS_OPTIONS}
                    onChange={(st) => showToast(`Status berubah ke: ${st}`)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Empty State Component */}
            <Card className="border border-border/70 rounded-xl bg-white shadow-xs p-5">
              <HeroEmptyState
                icon={<Inbox className="size-8 text-blue-500" />}
                title="Tidak Ada Data Tersedia"
                description="Belum ada riwayat pengajuan work order untuk filter ini. Silakan buat pengajuan baru."
                actionLabel="Buat Pengajuan Baru"
                onAction={() => {
                  setSelectedRecord(null)
                  setIsFormOpen(true)
                }}
                secondaryActionLabel="Refresh Data"
                onSecondaryAction={() => showToast('Data diperbarui.')}
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* GLOBAL MODALS (VIEW DETAIL, FORM, DELETE, BULK)          */}
      {/* ======================================================== */}

      {/* 1. Official Detail Modal */}
      {selectedRecord && (
        <HeroDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={`Dokumen Work Order: ${selectedRecord.woNumber}`}
          subtitle={`ID Ref: ${selectedRecord.id} | Dibuat pada ${selectedRecord.date}`}
          statusBadge={<HeroStatusBadge status={selectedRecord.status} />}
          onEdit={() => {
            setIsDetailOpen(false)
            setIsFormOpen(true)
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400">Penanggung Jawab:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedRecord.employeeName}</p>
                <p className="text-[11px] text-slate-400 font-mono">{selectedRecord.employeeSn}</p>
              </div>
              <div>
                <span className="text-slate-400">Departemen:</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.department}</p>
              </div>
              <div>
                <span className="text-slate-400">Lokasi / Site:</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.site}</p>
              </div>
              <div>
                <span className="text-slate-400">Estimasi Biaya:</span>
                <p className="font-bold text-blue-600 font-mono text-sm mt-0.5">
                  Rp {selectedRecord.cost.toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Tingkat Prioritas:</span>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.priority}</p>
              </div>
              <div>
                <span className="text-slate-400">Status Saat Ini:</span>
                <div className="mt-1">
                  <HeroStatusBadge status={selectedRecord.status} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Lampiran Berkas Pendukung
              </h5>
              <HeroFileUpload
                value="/uploads/sample-work-order.pdf"
                disabled
                label=""
              />
            </div>
          </div>
        </HeroDetailModal>
      )}

      {/* 2. Form Dialog */}
      <HeroFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={selectedRecord ? 'Ubah Data Work Order' : 'Tambah Work Order Baru'}
        description="Lengkapi informasi di bawah ini sesuai standar operasional."
        onSubmit={(e) => {
          e.preventDefault()
          if (selectedRecord) {
            setDataList((prev) =>
              prev.map((r) => (r.id === selectedRecord.id ? selectedRecord : r))
            )
            showToast(`Data ${selectedRecord.woNumber} berhasil diperbarui.`)
          } else {
            const newRecord: WorkOrderRecord = {
              id: `WO-0${dataList.length + 1}`,
              woNumber: `WO/2026/04/0${dataList.length + 1}`,
              employeeSn: formEmployee,
              employeeName:
                EMPLOYEE_OPTIONS.find((e) => e.value === formEmployee)?.label || 'Pegawai Baru',
              department: formDept,
              site: formSites[0] || 'Balikpapan Base',
              date: new Date().toISOString().slice(0, 10),
              cost: formCost || 5000000,
              priority: 'Sedang',
              status: formStatus,
            }
            setDataList((prev) => [newRecord, ...prev])
            showToast('Work order baru berhasil ditambahkan!')
          }
          setIsFormOpen(false)
        }}
      >
        <div className="space-y-3">
          <HeroFormField label="Pilih Karyawan" required>
            <HeroSearchableSelect
              options={EMPLOYEE_OPTIONS}
              value={selectedRecord ? selectedRecord.employeeSn : formEmployee}
              onChange={(sn) => {
                const emp = EMPLOYEE_OPTIONS.find((e) => e.value === sn)
                if (emp && selectedRecord) {
                  setSelectedRecord({
                    ...selectedRecord,
                    employeeSn: emp.value,
                    employeeName: emp.label,
                  })
                }
              }}
            />
          </HeroFormField>

          <HeroFormField label="Departemen" required>
            <HeroSearchableSelect
              options={DEPARTMENT_OPTIONS}
              value={selectedRecord ? selectedRecord.department : formDept}
              onChange={(dep) => {
                if (selectedRecord) {
                  setSelectedRecord({ ...selectedRecord, department: dep })
                }
              }}
            />
          </HeroFormField>

          <HeroFormField label="Estimasi Anggaran (Rp)" required>
            <HeroNumberInput
              value={selectedRecord ? selectedRecord.cost : formCost}
              onChange={(val) => {
                if (selectedRecord && val) {
                  setSelectedRecord({ ...selectedRecord, cost: val })
                }
              }}
            />
          </HeroFormField>

          <HeroFormField label="Status Dokumen">
            <HeroSearchableSelect
              options={STATUS_OPTIONS}
              value={selectedRecord ? selectedRecord.status : formStatus}
              onChange={(st) => {
                if (selectedRecord) {
                  setSelectedRecord({ ...selectedRecord, status: st })
                }
              }}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* 3. Confirm Delete Dialog */}
      <HeroConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Konfirmasi Hapus Data"
        description={
          <span>
            Apakah Anda yakin ingin menghapus data{' '}
            <strong className="text-slate-900">{selectedRecord?.woNumber}</strong>? Tindakan ini bersifat permanen.
          </span>
        }
        confirmLabel="Ya, Hapus Data"
        tone="destructive"
        onConfirm={confirmDelete}
      />

      {/* 4. Bulk Edit Dialog */}
      <HeroFormDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        title={`Ubah Status Massal (${bulkTargetIds.length} data)`}
        description="Terapkan status baru untuk semua data yang sedang dipilih."
        submitLabel="Terapkan Status"
        onSubmit={(e) => {
          e.preventDefault()
          confirmBulkEdit()
        }}
      >
        <HeroFormField label="Pilih Status Baru">
          <HeroSearchableSelect
            options={STATUS_OPTIONS}
            value={bulkStatusToApply}
            onChange={setBulkStatusToApply}
          />
        </HeroFormField>
      </HeroFormDialog>
    </AdminPageShell>
  )
}
