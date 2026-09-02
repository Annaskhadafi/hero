'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Briefcase,
  FileCheck,
  Users,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/admin-page-shell'
import { HcWorkspaceBanner, hcPrimaryActionClassName, hcTableRowClassName } from '@/components/hc/hc-workspace-banner'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getRfrDetail } from '@/app/actions/rfr'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'

type RfrItem = {
  id: number
  rfrNumber: string
  requestDate: string
  joinDateEstimation: string
  requestorName: string
  sectionDepartment: string
  positionTitle: string
  numberOfPersons: number
  level: string
  status: string
  currentStepOrder: number
  generatedRecruitmentId?: number | null
  createdAt: Date | string
}

type RfrClientPageProps = {
  initialData: RfrItem[]
  total: number
  page: number
  totalPages: number
}

function formatIndoDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusBadge(status: string, currentStepOrder: number) {
  if (status === 'in_progress' && currentStepOrder === 1) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold text-xs py-0.5 px-2 flex items-center gap-1 w-fit">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Butuh Revisi (Step 1)</span>
      </Badge>
    )
  }
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold text-xs py-0.5 px-2 flex items-center gap-1 w-fit">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Disetujui</span>
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold text-xs py-0.5 px-2 flex items-center gap-1 w-fit">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak</span>
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 font-semibold text-xs py-0.5 px-2 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Approval ({currentStepOrder}/6)</span>
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs py-0.5 px-2 w-fit">
          Draft
        </Badge>
      )
  }
}

export function RfrClientPage({ initialData, total, page, totalPages }: RfrClientPageProps) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [previewDetail, setPreviewDetail] = useState<{ rfr: any; approvals: any[] } | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Calculate stats
  const totalRfr = total
  const pendingCount = initialData.filter((r) => r.status === 'in_progress' && r.currentStepOrder > 1).length
  const approvedCount = initialData.filter((r) => r.status === 'approved').length
  const rejectedCount = initialData.filter((r) => r.status === 'rejected' || (r.status === 'in_progress' && r.currentStepOrder === 1)).length

  const handlePrint = () => {
    if (previewDetail?.rfr?.id) {
      window.open(`/api/hc/rfr/${previewDetail.rfr.id}/pdf`, '_blank')
    } else {
      window.print()
    }
  }

  function openPreview(id: number) {
    startTransition(async () => {
      const res = await getRfrDetail(id)
      if (res) {
        setPreviewDetail(res)
        setIsDetailOpen(true)
      } else {
        toast.error('Gagal memuat detail dokumen RFR.')
      }
    })
  }

  return (
    <AdminPageShell
      eyebrow="HC • Recruitment Management"
      title="Request For Recruitment"
      description="Kelola formulir permohonan rekrutmen karyawan baru, alur persetujuan berjenjang, dan auto-generate lowongan pekerjaan."
    >
      {/* 1. HERO WORKSPACE BANNER */}
      <HcWorkspaceBanner
        eyebrow="Recruitment Desk"
        title="Permohonan Rekrutmen (RFR)"
        description="Pantau dan kelola seluruh pengajuan kebutuhan tenaga kerja baru lintas departemen dengan alur persetujuan berjenjang."
        items={[
          { label: 'Total RFR', value: totalRfr, tone: 'slate' },
          { label: 'Menunggu Approval', value: pendingCount, tone: 'amber' },
          { label: 'Telah Disetujui', value: approvedCount, tone: 'emerald' },
          { label: 'Revisi / Ditolak', value: rejectedCount, tone: 'rose' },
        ]}
      />

      {/* 2. MINIMAL TABLE SHELL */}
      <MinimalTableShell
        label="permohonan rfr"
        title="Daftar Dokumen RFR"
        description="Daftar pengajuan permohonan penambahan atau penggantian tenaga kerja."
        fileName="rfr-requests-hc"
        searchPlaceholder="Cari nomor RFR, posisi, requestor, dept..."
        access={{ canView: true, canEdit: true, canDelete: true }}
        primaryAction={
          <Link href="/dashboard/hc/rfr/form">
            <Button className={hcPrimaryActionClassName}>
              <Plus className="size-4" />
              <span>Buat Pengajuan RFR</span>
            </Button>
          </Link>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">No. RFR</TableHead>
              <TableHead className="font-semibold">Posisi Jabatan</TableHead>
              <TableHead className="font-semibold text-center">Jumlah</TableHead>
              <TableHead className="font-semibold">Requestor & Dept</TableHead>
              <TableHead className="font-semibold">Tgl Request</TableHead>
              <TableHead className="font-semibold">Estimasi Masuk</TableHead>
              <TableHead className="font-semibold">Status Approval</TableHead>
              <TableHead className="font-semibold text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-slate-400">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-600">Belum ada pengajuan RFR</p>
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id} className={hcTableRowClassName}>
                  {/* No. RFR */}
                  <TableCell className="font-mono font-bold text-slate-900 whitespace-nowrap">
                    {item.rfrNumber}
                  </TableCell>

                  {/* Posisi Jabatan */}
                  <TableCell>
                    <p className="font-semibold text-slate-900 leading-snug">{item.positionTitle}</p>
                    <span className="text-xs text-slate-500 uppercase">
                      {item.level?.replace('_', ' ')}
                    </span>
                  </TableCell>

                  {/* Jumlah */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-semibold text-slate-800 text-xs px-2 py-0.5">
                      <Users className="h-3 w-3 mr-1 text-slate-500 inline" />
                      {item.numberOfPersons} Orang
                    </Badge>
                  </TableCell>

                  {/* Requestor & Dept */}
                  <TableCell>
                    <p className="font-semibold text-slate-900">{item.requestorName}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[220px]">
                      {item.sectionDepartment}
                    </p>
                  </TableCell>

                  {/* Tgl Request */}
                  <TableCell className="text-slate-700 whitespace-nowrap text-xs">
                    {formatIndoDate(item.requestDate)}
                  </TableCell>

                  {/* Estimasi Masuk */}
                  <TableCell className="text-slate-700 whitespace-nowrap text-xs">
                    {formatIndoDate(item.joinDateEstimation)}
                  </TableCell>

                  {/* Status Approval */}
                  <TableCell className="whitespace-nowrap">
                    {getStatusBadge(item.status, item.currentStepOrder)}
                  </TableCell>

                  {/* Aksi */}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'approved' && item.generatedRecruitmentId && (
                        <Link href={`/dashboard/hc/recruitment?recruitmentId=${item.generatedRecruitmentId}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs gap-1"
                            title="Buka Lowongan Kerja Terkait"
                          >
                            <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Lowongan</span>
                          </Button>
                        </Link>
                      )}

                      {(item.status === 'reverted' || (item.status === 'in_progress' && item.currentStepOrder === 1)) && (
                        <Link href={`/dashboard/hc/rfr/form?id=${item.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs gap-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Revisi</span>
                          </Button>
                        </Link>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(item.id)}
                        disabled={isPending}
                        className="h-8 px-2.5 rounded-lg border-slate-300 font-semibold text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </Button>

                      <a
                        href={`/api/hc/rfr/${item.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Unduh PDF Resmi"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      {/* 3. MODAL PREVIEW DOKUMEN RESMI (A4 WYSIWYG) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-[1.25rem]">
          <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 sticky top-0 bg-background z-10 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <FileCheck className="w-5 h-5 text-slate-700" />
              <span>Preview Dokumen: {previewDetail?.rfr?.rfrNumber}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              {previewDetail?.rfr?.status !== 'approved' && (
                <Link href={`/dashboard/hc/rfr/form?id=${previewDetail?.rfr?.id}`}>
                  <Button size="sm" variant="outline" className="h-8 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs gap-1.5 rounded-lg">
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit / Revisi Form</span>
                  </Button>
                </Link>
              )}
              {previewDetail?.rfr?.status === 'approved' && (
                <Link href="/dashboard/hc/recruitment">
                  <Button size="sm" variant="default" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 rounded-lg">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Lihat Lowongan Kerja</span>
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 rounded-lg border-slate-300 font-semibold text-xs gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </Button>
              {previewDetail?.rfr?.id && (
                <a href={`/api/hc/rfr/${previewDetail.rfr.id}/pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-8 rounded-lg border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 font-semibold text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5 text-slate-700" />
                    <span>Download PDF</span>
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>

          {previewDetail && (
            <div className="p-6 bg-slate-100 flex justify-center">
              <RfrDocumentPreview
                rfr={previewDetail.rfr}
                approvals={previewDetail.approvals}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
