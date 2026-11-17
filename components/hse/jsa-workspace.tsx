'use client'

import * as React from 'react'
import {
  Bell,
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  FileCheck,
  FileText,
  PenTool,
  Plus,
  Printer,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Clock,
  User,
  ExternalLink,
  RotateCcw,
  XCircle,
  Check,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroStatusBadge,
  HeroConfirmDialog,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroTextarea,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'

import { JsaFormDialog } from './jsa-form-dialog'
import { JsaPrintPreview } from './jsa-print-preview'
import { JsaApprovalDialog } from './jsa-approval-dialog'
import {
  deleteJsa,
  getJsaById,
  saveJsaSettings,
  quickApproveJsaAction,
  quickRejectJsaAction,
  revertJsaAction,
  type JsaSettings,
} from '@/app/dashboard/hse/jsa/actions'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface JsaWorkspaceProps {
  jsaList: any[]
  settings: JsaSettings
}

export function JsaWorkspace({ jsaList, settings }: JsaWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const defaultTab = searchParams.get('tab') || 'data'
  const targetId = searchParams.get('id')

  const [activeTab, setActiveTab] = React.useState(defaultTab)
  const [formOpen, setFormOpen] = React.useState(false)
  const [printOpen, setPrintOpen] = React.useState(false)
  const [approvalOpen, setApprovalOpen] = React.useState(false)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Quick Approval, Reject (dengan catatan), and Revert states
  const [isQuickApprovingId, setIsQuickApprovingId] = React.useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectTargetJsa, setRejectTargetJsa] = React.useState<any>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [isRejecting, setIsRejecting] = React.useState(false)

  const [revertDialogOpen, setRevertDialogOpen] = React.useState(false)
  const [revertTargetJsa, setRevertTargetJsa] = React.useState<any>(null)
  const [isReverting, setIsReverting] = React.useState(false)

  const [selectedJsa, setSelectedJsa] = React.useState<any>(null)
  const [isLoadingJsa, setIsLoadingJsa] = React.useState(false)
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  const [settingsForm, setSettingsForm] = React.useState<JsaSettings>(settings)

  // Handle URL query parameters (e.g. from notification bell click)
  React.useEffect(() => {
    if (targetId) {
      getJsaById(targetId).then((data) => {
        if (data) {
          setSelectedJsa(data)
          if (defaultTab === 'approval') {
            setApprovalOpen(true)
          } else {
            setPrintOpen(true)
          }
        }
      }).catch(() => {})
    }
  }, [targetId, defaultTab])

  // KPIs
  const totalJsas = jsaList.length
  const pendingJsas = jsaList.filter((j) => {
    const isApproved = j.status === 'approved' || Boolean(j.signatures?.verifierUrl)
    const isRejected = j.status === 'rejected'
    return !isApproved && !isRejected
  })
  const approvedJsas = jsaList.filter((j) => j.status === 'approved' || Boolean(j.signatures?.verifierUrl))
  const highRiskJsas = jsaList.filter((j) => j.riskLevel === 'H')

  const handleCopyPublicLink = async () => {
    const link = `${window.location.origin}/jsa`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Public link JSA berhasil disalin')
    } catch {
      toast.error('Gagal menyalin link JSA')
    }
  }

  const handleCreate = () => {
    setSelectedJsa(null)
    setFormOpen(true)
  }

  const handleEdit = async (id: string) => {
    try {
      setIsLoadingJsa(true)
      const data = await getJsaById(id)
      setSelectedJsa(data)
      setFormOpen(true)
    } catch {
      toast.error('Gagal mengambil data JSA')
    } finally {
      setIsLoadingJsa(false)
    }
  }

  const handlePrint = (id: string) => {
    window.open(`/print/jsa/${id}`, '_blank')
  }

  const handlePreview = async (id: string) => {
    const localItem = jsaList.find((j) => j.id === id)
    if (localItem) {
      setSelectedJsa(localItem)
      setPrintOpen(true)
    }
    try {
      setIsLoadingJsa(true)
      const data = await getJsaById(id)
      if (data) setSelectedJsa(data)
      setPrintOpen(true)
    } catch {
      if (!localItem) toast.error('Gagal mengambil data JSA')
    } finally {
      setIsLoadingJsa(false)
    }
  }

  const handleOpenApproval = async (id: string) => {
    const localItem = jsaList.find((j) => j.id === id)
    if (localItem) {
      setSelectedJsa(localItem)
      setApprovalOpen(true)
    }
    try {
      setIsLoadingJsa(true)
      const data = await getJsaById(id)
      if (data) setSelectedJsa(data)
      setApprovalOpen(true)
    } catch {
      if (!localItem) toast.error('Gagal mengambil data JSA')
    } finally {
      setIsLoadingJsa(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return
    try {
      setIsDeleting(true)
      await deleteJsa(deleteTargetId)
      toast.success('Dokumen JSA berhasil dihapus')
      setDeleteTargetId(null)
      router.refresh()
    } catch {
      toast.error('Gagal menghapus dokumen JSA')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleQuickApprove = async (id: string) => {
    try {
      setIsQuickApprovingId(id)
      const res = await quickApproveJsaAction(id)
      if (res.success) {
        toast.success('JSA berhasil disetujui & TTD digital otomatis disematkan!')
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyetujui JSA')
    } finally {
      setIsQuickApprovingId(null)
    }
  }

  const handleOpenReject = (jsa: any) => {
    setRejectTargetJsa(jsa)
    setRejectReason('')
    setRejectDialogOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!rejectTargetJsa) return
    if (!rejectReason.trim()) {
      toast.error('Catatan penolakan / dimana salahnya wajib diisi.')
      return
    }
    try {
      setIsRejecting(true)
      const res = await quickRejectJsaAction(rejectTargetJsa.id, rejectReason)
      if (res.success) {
        toast.success(`JSA ${rejectTargetJsa.jsaNumber} ditolak dan catatan revisi terkirim.`)
        setRejectDialogOpen(false)
        setRejectTargetJsa(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menolak JSA')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleOpenRevert = (jsa: any) => {
    setRevertTargetJsa(jsa)
    setRevertDialogOpen(true)
  }

  const handleConfirmRevert = async () => {
    if (!revertTargetJsa) return
    try {
      setIsReverting(true)
      const res = await revertJsaAction(revertTargetJsa.id)
      if (res.success) {
        toast.success(`Status JSA ${revertTargetJsa.jsaNumber} berhasil dikembalikan ke Pending.`)
        setRevertDialogOpen(false)
        setRevertTargetJsa(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal merevert JSA')
    } finally {
      setIsReverting(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true)
      await saveJsaSettings(settingsForm)
      toast.success('Setting notifikasi dan TTD JSA berhasil disimpan')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan setting JSA')
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Filter definitions for HeroDataTable
  const tableFilters: HeroTableFilter[] = React.useMemo(
    () => [
      {
        key: 'status',
        label: 'Status Approval',
        options: [
          { value: 'all', label: 'Semua Status' },
          { value: 'pending', label: 'Menunggu Verifikasi' },
          { value: 'approved', label: 'Disetujui / Verified' },
          { value: 'rejected', label: 'Ditolak / Revisi' },
        ],
      },
      {
        key: 'riskLevel',
        label: 'Tingkat Risiko',
        options: [
          { value: 'all', label: 'Semua Risiko' },
          { value: 'H', label: 'Tinggi (H)' },
          { value: 'M', label: 'Menengah (M)' },
          { value: 'L', label: 'Rendah (L)' },
        ],
      },
    ],
    []
  )

  // Columns for HeroDataTable
  const columns: HeroColumnDef<any>[] = React.useMemo(
    () => [
      {
        key: 'jsaNumber',
        header: 'No. JSA',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 w-fit">
              {row.jsaNumber || '-'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              {new Date(row.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        ),
      },
      {
        key: 'creatorName',
        header: 'Pembuat & Tim',
        render: (row) => {
          const sig = (row.signatures || {}) as Record<string, any>
          const creator = sig.creatorName || (row.teamMembers ? row.teamMembers.split(',')[0] : 'Pelaksana')
          return (
            <div className="flex flex-col max-w-[200px]">
              <span className="font-semibold text-slate-900 text-xs flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400 shrink-0" />
                {creator}
              </span>
              {row.teamMembers && (
                <span className="text-[11px] text-slate-500 truncate mt-0.5" title={row.teamMembers}>
                  Tim: {row.teamMembers}
                </span>
              )}
            </div>
          )
        },
      },
      {
        key: 'jobDescription',
        header: 'Pekerjaan & Unit',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col max-w-[280px]">
            <span className="font-medium text-slate-900 text-xs line-clamp-2" title={row.jobDescription}>
              {row.jobDescription}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Unit/Alat: <strong className="text-slate-700">{row.equipmentNumber || '—'}</strong>
            </span>
          </div>
        ),
      },
      {
        key: 'riskLevel',
        header: 'Risiko',
        sortable: true,
        render: (row) => {
          const r = row.riskLevel?.toUpperCase()
          if (r === 'H') return <Badge variant="destructive" className="text-xs">Tinggi (H)</Badge>
          if (r === 'M') return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-xs">Menengah (M)</Badge>
          return <Badge variant="secondary" className="text-xs">Rendah (L)</Badge>
        },
      },
      {
        key: 'status',
        header: 'Status Approval',
        sortable: true,
        render: (row) => {
          const isApproved = row.status === 'approved' || Boolean(row.signatures?.verifierUrl)
          const isRejected = row.status === 'rejected'
          const statusKey = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'
          const label = isApproved ? 'Disetujui' : isRejected ? 'Ditolak' : 'Menunggu Verifikasi'

          return (
            <HeroStatusBadge
              status={statusKey}
              label={label}
            />
          )
        },
      },
      {
        key: 'verifierSignature',
        header: 'TTD Verifikasi HSE',
        render: (row) => {
          const sig = (row.signatures || {}) as Record<string, any>
          const hasVerifierSig = Boolean(sig.verifierUrl)
          const verifierName = sig.verifierName || 'HSE Dept'

          if (hasVerifierSig) {
            return (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium truncate max-w-[120px]" title={`Diverifikasi oleh ${verifierName}`}>
                  {verifierName}
                </span>
              </div>
            )
          }

          return (
            <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 w-fit">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Belum TTD HSE</span>
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: 'Aksi',
        render: (row) => {
          const isApproved = row.status === 'approved' || Boolean(row.signatures?.verifierUrl)
          const isRejected = row.status === 'rejected'
          const isPending = !isApproved && !isRejected

          return (
            <TooltipProvider>
              <div className="flex items-center justify-end gap-1.5">
                {/* 1-Click Approve & Reject Buttons (Kayak SPL / Daily Activity) */}
                {isPending && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleQuickApprove(row.id)}
                      disabled={Boolean(isQuickApprovingId) || isLoadingJsa}
                      className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1 shadow-xs cursor-pointer"
                    >
                      {isQuickApprovingId === row.id ? (
                        <Clock className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      <span>Approve</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReject(row)}
                      disabled={Boolean(isQuickApprovingId) || isLoadingJsa}
                      className="h-8 px-2 border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs gap-1 cursor-pointer"
                    >
                      <XCircle className="size-3.5 text-rose-600" />
                      <span>Reject</span>
                    </Button>
                  </>
                )}

                {/* Revert Button if already decided */}
                {(isApproved || isRejected) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRevert(row)}
                        disabled={isLoadingJsa}
                        className="h-8 px-2 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold text-xs gap-1 cursor-pointer"
                      >
                        <RotateCcw className="size-3.5 text-amber-600" />
                        <span>Revert</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Kembalikan status ke Pending (Revert)</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(row.id)}
                      disabled={isLoadingJsa}
                      title="Preview Dokumen JSA"
                      aria-label="Preview Dokumen JSA"
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview Dokumen JSA</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePrint(row.id)}
                      disabled={isLoadingJsa}
                      className="h-8 w-8 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cetak Dokumen PDF</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(row.id)}
                      disabled={isLoadingJsa}
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 cursor-pointer"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Data JSA</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTargetId(row.id)}
                      disabled={isLoadingJsa}
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus JSA</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
      },
    ],
    [isLoadingJsa, isQuickApprovingId]
  )

  return (
    <div className="space-y-6">
      {/* 1. SCORECARD KPI CARDS (Baku @/components/templates) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroKpiCard
          title="Total Dokumen JSA"
          value={totalJsas}
          unit="Dokumen"
          tone="blue"
          icon={<FileText className="size-5" />}
          description="Register seluruh Job Safety Analysis yang tersimpan"
        />

        <HeroKpiCard
          title="Menunggu Approval HSE"
          value={pendingJsas.length}
          unit="Menunggu"
          tone="amber"
          icon={<Clock className="size-5" />}
          description="JSA diajukan manpower dan butuh verifikasi & TTD"
        />

        <HeroKpiCard
          title="Terverifikasi & Disetujui"
          value={approvedJsas.length}
          unit="Disahkan"
          tone="emerald"
          icon={<FileCheck className="size-5" />}
          description="Dokumen JSA telah disahkan dengan TTD online HSE"
        />

        <HeroKpiCard
          title="Pekerjaan Risiko Tinggi"
          value={highRiskJsas.length}
          unit="High Risk"
          tone="rose"
          icon={<ShieldAlert className="size-5" />}
          description="Pekerjaan kritis yang memerlukan kontrol ketat"
        />
      </div>

      {/* 2. TABS NAVIGASI WORKSPACE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 w-full justify-start overflow-x-auto p-1 bg-slate-100 border border-slate-200 rounded-xl">
          <TabsTrigger value="data" className="gap-2 h-8 text-xs font-semibold">
            <FileText className="h-3.5 w-3.5" />
            Data JSA ({totalJsas})
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-2 h-8 text-xs font-semibold relative">
            <ShieldCheck className="h-3.5 w-3.5" />
            Antrian Approval HSE
            {pendingJsas.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                {pendingJsas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ttd-online" className="gap-2 h-8 text-xs font-semibold">
            <PenTool className="h-3.5 w-3.5" />
            Status TTD Online
          </TabsTrigger>
          <TabsTrigger value="notifikasi" className="gap-2 h-8 text-xs font-semibold">
            <Bell className="h-3.5 w-3.5" />
            Notifikasi HSE
          </TabsTrigger>
          <TabsTrigger value="setting" className="gap-2 h-8 text-xs font-semibold">
            <Settings className="h-3.5 w-3.5" />
            Setting JSA
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DATA JSA (HeroDataTable Baku) */}
        <TabsContent value="data" className="space-y-4">
          <HeroDataTable
            data={jsaList}
            columns={columns}
            idField="id"
            title="Daftar Dokumen Job Safety Analysis (JSA)"
            description="Kelola dan verifikasi formulir JSA keselamatan kerja operasional PT. Chitra Paratama"
            searchPlaceholder="Cari nomor JSA, pekerjaan, no. unit, atau pembuat..."
            searchKeys={['jsaNumber', 'jobDescription', 'equipmentNumber', 'teamMembers']}
            filters={tableFilters}
            defaultPageSize={25}
            exportFileName="Register-JSA-HERO-HSE"
            pdfTitle="Register Job Safety Analysis (JSA) — HERO Health, Safety & Environment"
            emptyMessage="Belum ada data JSA yang terdaftar dalam sistem."
            headerActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyPublicLink}
                  className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Salin Public Link (/jsa)
                </Button>
                <Button
                  onClick={handleCreate}
                  className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buat JSA Baru
                </Button>
              </div>
            }
          />
        </TabsContent>

        {/* TAB 2: ANTRIAN APPROVAL HSE */}
        <TabsContent value="approval" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-2xs">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Antrian Verifikasi & Approval Dokumen JSA
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Terdapat {pendingJsas.length} dokumen JSA yang menunggu verifikasi & tanda tangan online HSE
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
                    {pendingJsas.length} Dokumen Perlu Review
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {pendingJsas.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Semua JSA Sudah Terverifikasi</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tidak ada dokumen JSA yang tertunda dalam antrian approval. Semua pekerjaan telah disahkan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingJsas.map((jsa) => {
                    const sig = (jsa.signatures || {}) as Record<string, any>
                    const creator = sig.creatorName || (jsa.teamMembers ? jsa.teamMembers.split(',')[0] : 'Pelaksana')
                    const r = jsa.riskLevel?.toUpperCase()

                    return (
                      <div
                        key={jsa.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {jsa.jsaNumber}
                            </span>
                            <Badge
                              variant={r === 'H' ? 'destructive' : r === 'M' ? 'default' : 'secondary'}
                              className="text-[10px]"
                            >
                              {r === 'H' ? 'Risiko Tinggi' : r === 'M' ? 'Risiko Sedang' : 'Risiko Rendah'}
                            </Badge>
                          </div>

                          <h5 className="font-bold text-sm text-slate-900 line-clamp-2" title={jsa.jobDescription}>
                            {jsa.jobDescription}
                          </h5>

                          <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Pembuat:</span>
                              <span className="font-medium text-slate-800">{creator}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">No. Unit/Alat:</span>
                              <span className="font-medium text-slate-800">{jsa.equipmentNumber || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tanggal Pengajuan:</span>
                              <span className="text-slate-700">
                                {new Date(jsa.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1 text-xs cursor-pointer"
                            onClick={() => handlePreview(jsa.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            className="h-9 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                            onClick={() => handleOpenApproval(jsa.id)}
                          >
                            <PenTool className="w-3.5 h-3.5 mr-1" />
                            Verifikasi & TTD
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STATUS TTD ONLINE */}
        <TabsContent value="ttd-online" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-2xs">
            <CardHeader className="border-b bg-slate-50/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <PenTool className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Status Tanda Tangan Online Dokumen JSA
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Monitoring kelengkapan tanda tangan digital (Pelaksana Pekerjaan & Verifikator Departemen HSE)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="divide-y divide-slate-100">
                {jsaList.map((jsa) => {
                  const sig = (jsa.signatures || {}) as Record<string, any>
                  const hasExecSig = Boolean(sig.executorUrl)
                  const hasVerifSig = Boolean(sig.verifierUrl)
                  const execName = sig.creatorName || (jsa.teamMembers ? jsa.teamMembers.split(',')[0] : 'Pelaksana')
                  const verifName = sig.verifierName || 'HSE Officer'
                  const isComplete = hasExecSig && hasVerifSig

                  return (
                    <div
                      key={jsa.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {jsa.jsaNumber}
                          </span>
                          {isComplete ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                              Lengkap (2/2 TTD)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                              Menunggu TTD HSE (1/2 TTD)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-700">{jsa.jobDescription}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* TTD Pelaksana */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 min-w-[160px]">
                          <div className={`h-2.5 w-2.5 rounded-full ${hasExecSig ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Pelaksana</span>
                            <span className="font-medium text-slate-800">{execName}</span>
                          </div>
                        </div>

                        {/* TTD HSE */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 min-w-[160px]">
                          <div className={`h-2.5 w-2.5 rounded-full ${hasVerifSig ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Verifikator HSE</span>
                            <span className="font-medium text-slate-800">
                              {hasVerifSig ? verifName : 'Belum Ditandatangani'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!hasVerifSig && (
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                              onClick={() => handleOpenApproval(jsa.id)}
                            >
                              <PenTool className="w-3.5 h-3.5 mr-1" />
                              TTD Sekarang
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer"
                            onClick={() => handlePreview(jsa.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Lihat Dokumen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: NOTIFIKASI HSE */}
        <TabsContent value="notifikasi" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-2xs">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Alur Notifikasi & Verifikasi JSA Departemen HSE
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Sistem notifikasi otomatis seperti alur permohonan APD yang terhubung ke Lonceng HERO dan Email
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                    <FileText className="h-4 w-4" />
                    1. Pengisian Form JSA
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Manpower atau pelaksana mengisi formulir JSA melalui link publik <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">/jsa</code> atau dashboard HERO serta memberikan TTD awal.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <Bell className="h-4 w-4" />
                    2. Notifikasi Approval Otomatis
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Departemen HSE langsung menerima notifikasi Lonceng HERO (<code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">approval_requests</code>) dan broadcast Email resmi berisi detail pekerjaan dan risiko.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    3. TTD Online & Pengesahan
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    HSE Officer membuka notifikasi, mereview potensi bahaya, dan melakukan TTD online via profil HERO atau gores tanda tangan langsung untuk mengesahkan dokumen JSA.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h5 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  Daftar Penerima Notifikasi Aktif:
                </h5>
                <p className="text-xs text-slate-600 font-mono bg-white p-2.5 rounded border border-slate-200">
                  {settings.notificationRecipients || 'Belum ada email tambahan. Menggunakan daftar anggota Departemen HSE sistem default.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: SETTING JSA */}
        <TabsContent value="setting" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-2xs">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Setting Notifikasi & TTD Default JSA</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Konfigurasikan daftar penerima notifikasi email dan identitas default pengesahan HSE
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <HeroFormField
                  label="Penerima Notifikasi Email Tambahan"
                  info="Pisahkan dengan tanda koma bila lebih dari 1 email."
                >
                  <HeroTextarea
                    rows={4}
                    placeholder="Contoh: hse@chitraparatama.co.id, supervisor.hse@chitraparatama.co.id"
                    value={settingsForm.notificationRecipients}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        notificationRecipients: event.target.value,
                      }))
                    }
                  />
                </HeroFormField>
                <p className="text-xs text-slate-500">
                  Seluruh staf departemen HSE terdaftar juga otomatis menerima notifikasi lonceng internal sistem HERO.
                </p>
              </div>

              <div className="space-y-3">
                <HeroFormField label="Nama Default Verifikator HSE">
                  <HeroInput
                    placeholder="Contoh: Muhammad Taufik Akbar"
                    value={settingsForm.defaultSignerName}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        defaultSignerName: event.target.value,
                      }))
                    }
                  />
                </HeroFormField>

                <HeroFormField label="Jabatan Default Verifikator">
                  <HeroInput
                    placeholder="Contoh: HSE Specialist / Site Safety Supervisor"
                    value={settingsForm.defaultSignerTitle}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        defaultSignerTitle: event.target.value,
                      }))
                    }
                  />
                </HeroFormField>

                <HeroFormField label="Email Default Verifikator">
                  <HeroInput
                    placeholder="Contoh: muhammad.akbar@chitraparatama.co.id"
                    value={settingsForm.defaultSignerEmail}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        defaultSignerEmail: event.target.value,
                      }))
                    }
                  />
                </HeroFormField>
              </div>

              <div className="lg:col-span-2 flex justify-end pt-3 border-t">
                <Button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="h-9 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer"
                >
                  Simpan Setting JSA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FORM CREATE / EDIT DIALOG */}
      <JsaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={selectedJsa}
        id={selectedJsa?.id}
        onSuccess={() => {
          router.refresh()
        }}
      />

      {/* PRINT & DOCUMENT PREVIEW DIALOG */}
      <JsaPrintPreview
        open={printOpen}
        onOpenChange={setPrintOpen}
        data={selectedJsa}
        onApproved={() => {
          router.refresh()
        }}
      />

      {/* APPROVAL & TTD ONLINE DIALOG */}
      <JsaApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        jsa={selectedJsa}
        defaultSigner={settings}
        onSuccess={() => {
          router.refresh()
        }}
      />

      {/* CONFIRM DELETE DIALOG (Baku @/components/templates) */}
      <HeroConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Hapus Dokumen JSA"
        description="Apakah Anda yakin ingin menghapus dokumen Job Safety Analysis (JSA) ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus Dokumen"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* DIALOG CATATAN REJECT JSA (Baku @/components/templates) */}
      <HeroFormDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogOpen(false)
            setRejectTargetJsa(null)
            setRejectReason('')
          }
        }}
        title={`Tolak / Minta Revisi JSA: ${rejectTargetJsa?.jsaNumber || ''}`}
        description="Berikan catatan perbaikan atau penjelasan letak kesalahan dokumen agar pelaksana pekerjaan dapat merevisi JSA ini."
        submitLabel="Tolak & Kirim Catatan"
        cancelLabel="Batal"
        isSubmitting={isRejecting}
        onSubmit={(e) => {
          e.preventDefault()
          handleConfirmReject()
        }}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
            <strong>Pekerjaan:</strong> {rejectTargetJsa?.jobDescription}
            <br />
            <strong>Pembuat:</strong> {rejectTargetJsa?.teamMembers || 'Pelaksana'}
          </div>

          <HeroFormField
            label="Catatan Perbaikan / Dimana Salahnya"
            required
            info="Jelaskan secara spesifik langkah atau identifikasi bahaya mana yang perlu diperbaiki."
          >
            <HeroTextarea
              rows={4}
              placeholder="Contoh: Pada langkah 2 mohon tambahkan APD kacamata safety dan perhatikan jarak aman radius forklift minimal 5 meter..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* CONFIRM REVERT STATUS DIALOG */}
      <HeroConfirmDialog
        open={revertDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRevertDialogOpen(false)
            setRevertTargetJsa(null)
          }
        }}
        title={`Revert Status JSA: ${revertTargetJsa?.jsaNumber || ''}`}
        description="Apakah Anda yakin ingin mengembalikan status dokumen JSA ini ke 'Pending' (Menunggu Verifikasi)? Catatan penolakan atau status approval akan direset."
        confirmLabel="Ya, Revert ke Pending"
        cancelLabel="Batal"
        tone="warning"
        isProcessing={isReverting}
        onConfirm={handleConfirmRevert}
      />
    </div>
  )
}
