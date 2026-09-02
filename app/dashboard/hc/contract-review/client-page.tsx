"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Bug,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Settings,
  Users,
} from "lucide-react"

import {
  deleteContractReview,
  generateTestContractReview,
  saveContractReviewSettings,
  sendDueContractReviewReminders,
  sendSingleContractReminder,
  sendBatchContractReminders,
} from "@/app/actions/contract-review"
import { AdminPageShell } from "@/components/admin-page-shell"
import { HcWorkspaceBanner, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EnterpriseActionButtons } from "@/components/ui/enterprise-table-kit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface ExpiringEmployee {
  id: number
  name: string
  employeeSn: string | null
  email: string | null
  department: string | null
  section: string | null
  siteName: string | null
  jobTitle: string | null
  position: string | null
  contractDurationStart: string | null
  contractDurationEnd: string | null
  daysLeft: number
  urgency: "overdue" | "critical" | "warning" | "normal"
  latestReview: {
    id: number
    status: string
    reviewType: string
    recommendation: string | null
    currentStep: number | null
    currentApproverRole: string | null
    currentApproverName: string | null
    todayDate: string | null
  } | null
}

export function ContractReviewClientPage({
  reviews,
  employees,
  settings,
  expiringEmployees = [],
}: {
  reviews: any[]
  employees: any[]
  settings: any
  expiringEmployees?: ExpiringEmployee[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("reviews")
  const [rows, setRows] = useState(reviews)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState(settings)
  const [testLinks, setTestLinks] = useState<Array<{ step: number; role: string; name: string; url: string }> | null>(null)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [isReminderRunning, setIsReminderRunning] = useState(false)
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null)

  // Multi-select state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([])
  const [isBatchSending, setIsBatchSending] = useState(false)

  // Monitoring filters
  const [monitoringSearch, setMonitoringSearch] = useState("")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all")

  const access = { canView: true, canEdit: true, canDelete: true }

  const employeeOptions = employees.map((emp: any) => ({
    value: String(emp.id),
    label: `${emp.name} - ${emp.rank || emp.position || emp.jobTitle || 'Employee'}`,
  }))

  const updateApproverField = (field: string, id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id)
    const name = emp?.name || ''
    const email = emp?.email ?? ''
    setSettingsForm({
      ...settingsForm,
      approvalMatrix: {
        ...settingsForm.approvalMatrix,
        [field + 'Name']: name,
        [field + 'Email']: email,
      },
    })
  }

  const updateSectionHead = (section: string, id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id)
    const name = emp?.name || ''
    const email = emp?.email ?? ''
    setSettingsForm({
      ...settingsForm,
      approvalMatrix: {
        ...settingsForm.approvalMatrix,
        sectionHeads: {
          ...settingsForm.approvalMatrix.sectionHeads,
          [section]: { name, email },
        },
      },
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus review ini?")) return
    setRows(rows.filter((r) => r.id !== id))
    await deleteContractReview(id)
  }

  const saveSettings = async () => {
    const result = await saveContractReviewSettings(settingsForm)
    if (result.success) {
      toast.success("Contract Review settings saved")
      setIsSettingsOpen(false)
    } else {
      toast.error("Failed to save settings")
    }
  }

  const handleTestApproval = async () => {
    setIsTestRunning(true)
    const result = await generateTestContractReview()
    setIsTestRunning(false)
    if (result.success && result.data) {
      setTestLinks(result.data.links)
      router.refresh()
    } else {
      toast.error(result.error || 'Gagal membuat test review')
    }
  }

  const handleSendReminders = async () => {
    setIsReminderRunning(true)
    const result = await sendDueContractReviewReminders()
    setIsReminderRunning(false)

    if (result.success) {
      toast.success(`Reminder contract review terkirim: ${result.sent}, dilewati: ${result.skipped}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Gagal mengirim reminder contract review')
    }
  }

  const handleSendSingleReminder = async (empId: number, empName: string) => {
    setSendingReminderId(empId)
    const res = await sendSingleContractReminder(empId)
    setSendingReminderId(null)

    if (res.success) {
      toast.success(res.message || `Reminder kontrak untuk ${empName} berhasil dikirim`)
      router.refresh()
    } else {
      toast.error(res.error || `Gagal mengirim reminder untuk ${empName}`)
    }
  }

  const handleSendBatchSelectedReminders = async () => {
    if (selectedEmployeeIds.length === 0) return
    setIsBatchSending(true)
    const res = await sendBatchContractReminders(selectedEmployeeIds)
    setIsBatchSending(false)

    if (res.success) {
      toast.success(`Berhasil mengirim ${res.sent} reminder kontrak.${res.failed > 0 ? ` (${res.failed} gagal)` : ''}`)
      setSelectedEmployeeIds([])
      router.refresh()
    } else {
      toast.error(res.error || 'Gagal mengirim batch reminder')
    }
  }

  // Monitoring stats
  const stats = useMemo(() => {
    const total = expiringEmployees.length
    const overdue = expiringEmployees.filter((e) => e.urgency === "overdue").length
    const critical = expiringEmployees.filter((e) => e.urgency === "critical").length
    const warning = expiringEmployees.filter((e) => e.urgency === "warning").length
    const unreviewed = expiringEmployees.filter((e) => !e.latestReview).length
    return { total, overdue, critical, warning, unreviewed }
  }, [expiringEmployees])

  // Filtered monitoring employees
  const filteredExpiringEmployees = useMemo(() => {
    return expiringEmployees.filter((emp) => {
      // Search
      if (monitoringSearch.trim()) {
        const q = monitoringSearch.toLowerCase()
        const matchName = emp.name.toLowerCase().includes(q)
        const matchSn = (emp.employeeSn || "").toLowerCase().includes(q)
        const matchDept = (emp.department || "").toLowerCase().includes(q)
        const matchSection = (emp.section || "").toLowerCase().includes(q)
        const matchSite = (emp.siteName || "").toLowerCase().includes(q)
        const matchJob = (emp.jobTitle || emp.position || "").toLowerCase().includes(q)
        if (!matchName && !matchSn && !matchDept && !matchSection && !matchSite && !matchJob) {
          return false
        }
      }

      // Urgency filter
      if (urgencyFilter !== "all") {
        if (urgencyFilter === "overdue" && emp.urgency !== "overdue") return false
        if (urgencyFilter === "critical" && emp.urgency !== "critical") return false
        if (urgencyFilter === "warning" && emp.urgency !== "warning") return false
      }

      // Review status filter
      if (reviewStatusFilter !== "all") {
        if (reviewStatusFilter === "none" && emp.latestReview) return false
        if (reviewStatusFilter === "in_progress") {
          if (!emp.latestReview || emp.latestReview.status === "completed" || emp.latestReview.status === "draft") return false
        }
        if (reviewStatusFilter === "completed" && emp.latestReview?.status !== "completed") return false
      }

      return true
    })
  }, [expiringEmployees, monitoringSearch, urgencyFilter, reviewStatusFilter])

  // Checkbox helpers
  const allFilteredSelected =
    filteredExpiringEmployees.length > 0 &&
    filteredExpiringEmployees.every((e) => selectedEmployeeIds.includes(e.id))

  const toggleSelectEmployee = (id: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredExpiringEmployees.map((e) => e.id))
      setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredIdSet.has(id)))
    } else {
      const newIds = new Set([...selectedEmployeeIds, ...filteredExpiringEmployees.map((e) => e.id)])
      setSelectedEmployeeIds(Array.from(newIds))
    }
  }

  return (
    <AdminPageShell eyebrow="HC • Contract & Probation" title="Employee Contract & Review" description="Kelola evaluasi probation, perpanjangan kontrak, dan monitoring masa berakhir kontrak karyawan.">
      <HcWorkspaceBanner
        title="Contract & Probation Reviews"
        description="Monitor evaluasi karyawan untuk perpanjangan kontrak atau pengangkatan karyawan tetap."
        items={[
          { label: "Total Reviews", value: rows.length, tone: "slate" },
          { label: "Monitoring Kontrak", value: stats.total, tone: stats.overdue > 0 ? "rose" : "amber" },
          { label: "Overdue Kontrak", value: stats.overdue, tone: "rose" },
          { label: "Kritis (≤ 30 Hari)", value: stats.critical, tone: "amber" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="reviews" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="size-4" />
            <span>Daftar Review</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[11px]">
              {rows.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="size-4" />
            <span>Monitoring Kontrak (H-90 & Overdue)</span>
            {stats.total > 0 && (
              <Badge variant={stats.overdue > 0 ? "destructive" : "default"} className="ml-1 px-1.5 py-0.2 text-[11px]">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: DAFTAR REVIEW ── */}
        <TabsContent value="reviews" className="space-y-4">
          <MinimalTableShell 
            label="contract review" 
            title="Daftar Review" 
            description="Daftar historis evaluasi karyawan." 
            fileName="contract-reviews-hc" 
            searchPlaceholder="Cari..." 
            access={access} 
            primaryAction={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="size-4" /> Settings
                </Button>
                <Button variant="secondary" onClick={handleTestApproval} disabled={isTestRunning}>
                  <Bug className="size-4" /> {isTestRunning ? 'Generating...' : 'Test Approval'}
                </Button>
                <Button variant="outline" onClick={handleSendReminders} disabled={isReminderRunning}>
                  {isReminderRunning ? 'Sending reminders...' : 'Send Reminders'}
                </Button>
                <Button onClick={() => router.push('/dashboard/hc/contract-review/new')} className={hcPrimaryActionClassName}>
                  <Plus className="size-4" />Tambah Review
                </Button>
              </div>
            }
            columnOptions={[]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jenis Review</TableHead>
                  <TableHead>Tgl Masuk</TableHead>
                  <TableHead>Tgl Review</TableHead>
                  <TableHead>Rekomendasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada data review.</TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const emp = employees.find(e => e.id === row.employeeId)
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{emp?.name || row.employeeNameStr || '-'}</TableCell>
                      <TableCell className="capitalize">{row.reviewType}</TableCell>
                      <TableCell>{row.hireDate ? new Date(row.hireDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell>{row.todayDate ? new Date(row.todayDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="capitalize">{row.recommendation.replace('_', ' ')}</TableCell>
                      <TableCell className="capitalize">
                        <Badge variant={row.status === 'completed' ? 'default' : row.status === 'draft' ? 'outline' : 'secondary'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <EnterpriseActionButtons 
                          access={access} 
                          labels={{ view: "Print Preview", edit: "Edit", delete: "Hapus" }} 
                          onView={() => router.push(`/dashboard/hc/contract-review/${row.id}?mode=print`)} 
                          onEdit={() => router.push(`/dashboard/hc/contract-review/${row.id}`)} 
                          onDelete={() => handleDelete(row.id)} 
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        {/* ── TAB 2: MONITORING KONTRAK ── */}
        <TabsContent value="monitoring" className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Jatuh Tempo / Overdue</span>
                <Users className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground">Karyawan aktif kontrak (≤ 90 hari & overdue)</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Overdue (Lewat Masa)</span>
                <AlertCircle className="size-4 text-rose-600 dark:text-rose-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.overdue}</p>
              <p className="text-[11px] text-muted-foreground">Masa kontrak sudah berakhir, perlu tindakan segera</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm border-amber-200 dark:border-amber-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Kritis (≤ 30 Hari)</span>
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.critical}</p>
              <p className="text-[11px] text-muted-foreground">Segera kirim evaluasi / konfirmasi perpanjangan</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm border-sky-200 dark:border-sky-900/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Mendekati (31 - 90 Hari)</span>
                <Clock className="size-4 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.warning}</p>
              <p className="text-[11px] text-muted-foreground">Dalam periode monitoring evaluasi</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, SN, jabatan, site..."
                  value={monitoringSearch}
                  onChange={(e) => setMonitoringSearch(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>

              {/* Urgency Filter */}
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  size="sm"
                  variant={urgencyFilter === "all" ? "default" : "outline"}
                  onClick={() => setUrgencyFilter("all")}
                  className="h-8 text-xs"
                >
                  Semua ({stats.total})
                </Button>
                <Button
                  size="sm"
                  variant={urgencyFilter === "overdue" ? "destructive" : "outline"}
                  onClick={() => setUrgencyFilter("overdue")}
                  className="h-8 text-xs"
                >
                  Overdue ({stats.overdue})
                </Button>
                <Button
                  size="sm"
                  variant={urgencyFilter === "critical" ? "secondary" : "outline"}
                  onClick={() => setUrgencyFilter("critical")}
                  className={`h-8 text-xs ${urgencyFilter === "critical" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-amber-300" : ""}`}
                >
                  Kritis ≤ 30H ({stats.critical})
                </Button>
                <Button
                  size="sm"
                  variant={urgencyFilter === "warning" ? "secondary" : "outline"}
                  onClick={() => setUrgencyFilter("warning")}
                  className={`h-8 text-xs ${urgencyFilter === "warning" ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100 border-sky-300" : ""}`}
                >
                  31-90H ({stats.warning})
                </Button>
              </div>

              {/* Review Status Filter */}
              <div className="flex items-center gap-1">
                <select
                  aria-label="Filter status review kontrak"
                  value={reviewStatusFilter}
                  onChange={(e) => setReviewStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">Semua Status Review</option>
                  <option value="none">Belum Ada Review</option>
                  <option value="in_progress">Review In Progress</option>
                  <option value="completed">Review Selesai</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendReminders}
                disabled={isReminderRunning}
                className="h-8 text-xs"
              >
                {isReminderRunning ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Mengirim Reminder...
                  </>
                ) : (
                  <>
                    <Bell className="mr-1.5 size-3.5" /> Kirim Auto-Reminder Massal
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Multi-Select Floating / Sticky Action Bar */}
          {selectedEmployeeIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 px-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {selectedEmployeeIds.length} Karyawan Dipilih
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Siap dikirimi email reminder kontrak ke atasan terkait.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedEmployeeIds([])}
                  className="h-8 text-xs"
                >
                  Batalkan Pilihan
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendBatchSelectedReminders}
                  disabled={isBatchSending}
                  className={`h-8 text-xs gap-1.5 ${hcPrimaryActionClassName}`}
                >
                  {isBatchSending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Mengirim ({selectedEmployeeIds.length})...
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" /> Kirim Reminder ({selectedEmployeeIds.length} Karyawan)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Monitoring Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Pilih semua karyawan"
                    />
                  </TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Departemen / Section</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Masa Kontrak</TableHead>
                  <TableHead>Sisa Waktu</TableHead>
                  <TableHead>Status Review</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpiringEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CheckCircle2 className="size-8 text-emerald-500" />
                        <p className="font-medium text-foreground">Tidak ada data karyawan yang cocok dengan filter.</p>
                        <p className="text-xs text-muted-foreground">Semua kontrak terpantau aman atau telah sesuai dengan kriteria yang dipilih.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredExpiringEmployees.map((emp) => {
                  const isOverdue = emp.daysLeft < 0
                  const isCritical = emp.daysLeft >= 0 && emp.daysLeft <= 30
                  const isSelected = selectedEmployeeIds.includes(emp.id)

                  return (
                    <TableRow
                      key={emp.id}
                      className={
                        isSelected
                          ? "bg-primary/5 dark:bg-primary/10"
                          : isOverdue
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : isCritical
                          ? "bg-amber-50/30 dark:bg-amber-950/15"
                          : undefined
                      }
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectEmployee(emp.id)}
                          aria-label={`Pilih ${emp.name}`}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.employeeSn ? `SN: ${emp.employeeSn}` : "No SN"} • {emp.position || emp.jobTitle || "-"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">{emp.department || "-"}</div>
                        <div className="text-xs text-muted-foreground">{emp.section || "-"}</div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {emp.siteName || "Head Office"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-mono">
                          {emp.contractDurationStart ? new Date(emp.contractDurationStart).toLocaleDateString("id-ID") : "?"} s/d
                        </div>
                        <div className="text-xs font-semibold font-mono">
                          {emp.contractDurationEnd ? new Date(emp.contractDurationEnd).toLocaleDateString("id-ID") : "-"}
                        </div>
                      </TableCell>

                      <TableCell>
                        {isOverdue ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1 font-semibold">
                            <AlertCircle className="size-3" />
                            Overdue ({Math.abs(emp.daysLeft)} hari lalu)
                          </Badge>
                        ) : isCritical ? (
                          <Badge className="flex w-fit items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                            <AlertTriangle className="size-3" />
                            {emp.daysLeft} hari lagi
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex w-fit items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                            <Clock className="size-3" />
                            {emp.daysLeft} hari lagi
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {!emp.latestReview ? (
                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                            Belum Dibuat
                          </Badge>
                        ) : emp.latestReview.status === "completed" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Selesai • {emp.latestReview.recommendation ? emp.latestReview.recommendation.replace('_', ' ') : 'Approved'}
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                              In Progress (Step {emp.latestReview.currentStep ?? 1}/3)
                            </Badge>
                            {emp.latestReview.currentApproverName && (
                              <p className="text-[10px] text-muted-foreground">
                                Menunggu: {emp.latestReview.currentApproverName}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!emp.latestReview ? (
                            <Button
                              size="sm"
                              className={`h-7 px-2.5 text-xs gap-1 ${hcPrimaryActionClassName}`}
                              onClick={() =>
                                router.push(`/dashboard/hc/contract-review/new?employeeId=${emp.id}&employeeSn=${emp.employeeSn || ""}`)
                              }
                            >
                              <FilePlus2 className="size-3.5" /> Buat Review
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs gap-1"
                              onClick={() => router.push(`/dashboard/hc/contract-review/${emp.latestReview!.id}`)}
                            >
                              <Eye className="size-3.5" /> Lihat Review
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title={`Kirim Reminder Manual untuk ${emp.name}`}
                            disabled={sendingReminderId === emp.id}
                            onClick={() => handleSendSingleReminder(emp.id, emp.name)}
                          >
                            {sendingReminderId === emp.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── SETTINGS DIALOG ── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Review Settings</DialogTitle>
            <DialogDescription>Atur approval matrix, jadwal reminder kontrak, dan template email tanpa hardcode.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Approval Matrix ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Approval Matrix</h3>
              <div className="space-y-3">
                <div><Label>HO Sites (pisahkan koma)</Label><Input value={settingsForm.approvalMatrix.hoSites.join(', ')} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, hoSites: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } })} /></div>
              </div>

              {/* Section Heads */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section Heads</p>
                {(['repairRetread', 'serviceMvc', 'serviceOthers'] as const).map((key) => {
                  const labels: Record<string, string> = { repairRetread: 'Repair/Retread', serviceMvc: 'Service MVC', serviceOthers: 'Service Others' }
                  const sh = settingsForm.approvalMatrix.sectionHeads[key]
                  const matchedEmp = employees.find((e: any) => e.name === sh.name)
                  return (
                    <div key={key} className="space-y-1">
                      <Label>{labels[key]} Section Head</Label>
                      <SearchableSelect label={labels[key]} placeholder={`Pilih ${labels[key]} Head...`} value={matchedEmp ? String(matchedEmp.id) : ''} onValueChange={(val) => updateSectionHead(key, val)} options={employeeOptions} widthClassName="w-full" />
                      <Input value={sh.email} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, sectionHeads: { ...settingsForm.approvalMatrix.sectionHeads, [key]: { ...sh, email: e.target.value } } } })} placeholder="Email..." className="h-8 text-xs" />
                    </div>
                  )
                })}
              </div>

              {/* Manager & HR */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager & HR</p>
                <div className="space-y-1">
                  <Label>Central Service Manager</Label>
                  <SearchableSelect label="Manager" placeholder="Pilih Manager..." value={(() => { const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix.managerName); return emp ? String(emp.id) : '' })()} onValueChange={(val) => updateApproverField('manager', val)} options={employeeOptions} widthClassName="w-full" />
                  <Input value={settingsForm.approvalMatrix.managerEmail} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, managerEmail: e.target.value } })} placeholder="Email..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label>Default HR</Label>
                  <SearchableSelect label="HR" placeholder="Pilih HR..." value={(() => { const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix.hrName); return emp ? String(emp.id) : '' })()} onValueChange={(val) => updateApproverField('hr', val)} options={employeeOptions} widthClassName="w-full" />
                  <Input value={settingsForm.approvalMatrix.hrEmail} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, hrEmail: e.target.value } })} placeholder="Email..." className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>PJO/TE Keywords</Label>
                <Input value={settingsForm.approvalMatrix.pjoKeywords.join(', ')} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, pjoKeywords: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } })} />
              </div>

              <div className="space-y-1">
                <Label>Reminder Days Before (pisahkan koma)</Label>
                <Input
                  value={(settingsForm.reminderDaysBefore ?? [60, 30, 14, 7, 1]).join(', ')}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    reminderDaysBefore: e.target.value
                      .split(',')
                      .map((value: string) => Number(value.trim()))
                      .filter((value: number) => Number.isFinite(value) && value >= 0),
                  })}
                  placeholder="60, 30, 14, 7, 1"
                />
                <p className="text-[10px] text-muted-foreground">Auto-reminder dikirim saat sisa hari kontrak mendekati angka ini (serta mingguan untuk overdue).</p>
              </div>
            </div>

            {/* ── Email Templates ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email Templates</h3>
              {(['reminder', 'employeeSignature', 'approverSignature'] as const).map((key) => {
                const labels: Record<string, string> = { reminder: `Reminder (${(settingsForm.reminderDaysBefore ?? [60, 30, 14, 7, 1]).map((day: number) => `H-${day}`).join('/')})`, employeeSignature: 'Undangan TTD Karyawan', approverSignature: 'Notifikasi Approval' }
                return (
                  <div key={key} className="space-y-2 rounded-xl border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{labels[key]}</p>
                    <div><Label className="text-xs">Subject</Label><Input value={settingsForm.emailTemplates[key].subject} onChange={(e) => setSettingsForm({ ...settingsForm, emailTemplates: { ...settingsForm.emailTemplates, [key]: { ...settingsForm.emailTemplates[key], subject: e.target.value } } })} /></div>
                    <div><Label className="text-xs">Body</Label><Textarea rows={8} value={settingsForm.emailTemplates[key].body} onChange={(e) => setSettingsForm({ ...settingsForm, emailTemplates: { ...settingsForm.emailTemplates, [key]: { ...settingsForm.emailTemplates[key], body: e.target.value } } })} className="text-xs" /></div>
                    <p className="text-[10px] text-muted-foreground">Variables: {'{{employeeName}}, {{employeeSn}}, {{employeeSection}}, {{employeeSite}}, {{contractEndDate}}, {{recipientName}}, {{reviewerName}}, {{reviewLink}}, {{approverName}}, {{approvalStep}}, {{approvalLink}}'}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TEST APPROVAL LINKS DIALOG ── */}
      <Dialog open={!!testLinks} onOpenChange={(o) => { if (!o) setTestLinks(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Approval Links</DialogTitle>
            <DialogDescription>Klik link untuk menguji alur approval TTD digital. Semua link menggunakan email dummy wustho.c@gmail.com.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {testLinks?.map((link) => (
              <div key={link.step} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Step {link.step}: {link.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{link.role.replace(/_/g, ' ')}</p>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Buka Link</a>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestLinks(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
