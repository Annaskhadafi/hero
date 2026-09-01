'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Eye,
  Briefcase,
  FileCheck,
  Paperclip,
  Edit3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

function getStatusBadge(status: string, currentStepOrder: number) {
  if (status === 'in_progress' && currentStepOrder === 1) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-amber-600" /> Reverted / Butuh Revisi
      </Badge>
    )
  }
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Approval ({currentStepOrder}/6)
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          Draft
        </Badge>
      )
  }
}

import { useReactToPrint } from 'react-to-print'
import { useRef } from 'react'

export function RfrClientPage({ initialData, total, page, totalPages }: RfrClientPageProps) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [previewDetail, setPreviewDetail] = useState<{ rfr: any; approvals: any[] } | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    router.push(`/dashboard/hc/rfr?${params.toString()}`)
  }

  function openPreview(id: number) {
    startTransition(async () => {
      const res = await getRfrDetail(id)
      if (res) {
        setPreviewDetail(res)
        setIsDetailOpen(true)
      }
    })
  }

  function exportCsv() {
    if (initialData.length === 0) return
    const headers = ['No RFR', 'Posisi', 'Jumlah', 'Requestor', 'Section/Dept', 'Tgl Request', 'Status']
    const rows = initialData.map((d) => [
      d.rfrNumber,
      `"${d.positionTitle}"`,
      d.numberOfPersons,
      `"${d.requestorName}"`,
      `"${d.sectionDepartment}"`,
      d.requestDate,
      d.status,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `RFR_List_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-primary" /> Request For Recruitment (RFR)
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola formulir permohonan rekrutmen karyawan baru, alur persetujuan 6 tingkat, dan auto-generate lowongan pekerjaan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Link href="/dashboard/hc/rfr/form">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Buat Form RFR
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari Nomor RFR, Posisi, Requestor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Status Approval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="in_progress">In Progress Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary" size="default">
            Filter
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium text-xs uppercase border-b">
              <tr>
                <th className="px-4 py-3">No. RFR</th>
                <th className="px-4 py-3">Posisi Jabatan</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Requestor & Dept</th>
                <th className="px-4 py-3">Tgl Request</th>
                <th className="px-4 py-3">Estimasi Masuk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Belum ada dokumen Request For Recruitment (RFR).
                  </td>
                </tr>
              ) : (
                initialData.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{item.rfrNumber}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {item.positionTitle}
                      <span className="block text-xs text-muted-foreground capitalize">{item.level.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">{item.numberOfPersons} Orang</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{item.requestorName}</span>
                      <span className="block text-xs text-muted-foreground">{item.sectionDepartment}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.requestDate}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.joinDateEstimation}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status, item.currentStepOrder)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'in_progress' && item.currentStepOrder === 1 && (
                          <Link href={`/dashboard/hc/rfr/form?id=${item.id}`}>
                            <Button variant="ghost" size="icon" title="Edit / Revisi Form RFR">
                              <Edit3 className="w-4 h-4 text-amber-600 hover:text-amber-700" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Preview Document RFR"
                          onClick={() => openPreview(item.id)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <a href={`/api/hc/rfr/${item.id}/pdf`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" title="Download PDF">
                            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        </a>
                        {item.status === 'approved' && item.generatedRecruitmentId && (
                          <Link href="/dashboard/hc/recruitment">
                            <Button variant="outline" size="sm" className="gap-1 text-xs text-emerald-600 border-emerald-500/40">
                              <Briefcase className="w-3.5 h-3.5" /> Lowongan
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Large Document Preview Modal (A4 WYSIWYG) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-4 border-b bg-muted/30 sticky top-0 bg-background z-10 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" /> Preview Document: {previewDetail?.rfr?.rfrNumber}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              {previewDetail?.rfr?.status === 'approved' && (
                <Link href="/dashboard/hc/recruitment">
                  <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    <Briefcase className="w-4 h-4" /> Lihat Lowongan Pekerjaan
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="w-4 h-4" /> Print PDF
              </Button>
              {previewDetail?.rfr?.id && (
                <a href={`/api/hc/rfr/${previewDetail.rfr.id}/pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </a>
              )}
            </div>
          </DialogHeader>

          {previewDetail && (
            <div className="p-6 bg-slate-100 dark:bg-slate-900 flex justify-center">
              <RfrDocumentPreview
                rfr={previewDetail.rfr}
                approvals={previewDetail.approvals}
                containerRef={printRef}
                currentStepOrder={previewDetail.rfr.currentStepOrder}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

