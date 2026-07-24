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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
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

export function RfrClientPage({ initialData, total, page, totalPages }: RfrClientPageProps) {
  const router = useRouter()
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

  function handlePrint() {
    window.print()
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
              <div className="pdf-wrapper bg-white text-black p-8 shadow-xl border rounded-sm w-full max-w-[800px] text-[10pt] font-sans leading-tight">
                {/* Header Document */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="font-bold text-blue-900 text-lg">Chitra Paratama</div>
                  <div className="text-center font-bold text-sm tracking-wide border-b border-black pb-0.5">
                    REQUEST FOR RECRUITMENT FORM
                  </div>
                  <div className="text-[7pt] text-amber-600 italic">Internal information</div>
                </div>

                {/* Section A */}
                <div className="mb-4">
                  <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">A. Requestor Information</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div><span className="w-32 inline-block font-medium">Request Date</span>: {previewDetail.rfr.requestDate}</div>
                    <div><span className="w-32 inline-block font-medium">Join Date Estimation</span>: {previewDetail.rfr.joinDateEstimation}</div>
                    <div><span className="w-32 inline-block font-medium">Requestor Name</span>: {previewDetail.rfr.requestorName}</div>
                    <div><span className="w-32 inline-block font-medium">Received by HR</span>: {previewDetail.rfr.receivedByHr || '-'}</div>
                    <div className="col-span-2"><span className="w-32 inline-block font-medium">Section/ Dept</span>: {previewDetail.rfr.sectionDepartment}</div>
                  </div>
                </div>

                {/* Section B */}
                <div className="mb-4">
                  <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">B. Request Information</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-2">
                    <div><span className="w-32 inline-block font-medium">Position title</span>: <strong>{previewDetail.rfr.positionTitle}</strong></div>
                    <div><span className="w-32 inline-block font-medium">Number</span>: <strong>{previewDetail.rfr.numberOfPersons} Person(s)</strong></div>
                  </div>
                  <div className="text-xs mb-2">
                    <span className="font-bold">Brief Job Description:</span>
                    <p className="p-2 bg-slate-50 border rounded mt-1 text-slate-800">{previewDetail.rfr.briefJobDescription || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2 border-y py-2">
                    <div>
                      <span className="font-medium mr-2">Level:</span>
                      <span className="capitalize">{previewDetail.rfr.level?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="font-medium mr-2">Reason For Request:</span>
                      <span className="capitalize">{previewDetail.rfr.reasonForRequest?.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="font-medium mr-2">MPP:</span>
                      <span className="capitalize">{previewDetail.rfr.mppStatus}</span>
                    </div>
                    <div>
                      <span className="font-medium mr-2">Employment Status:</span>
                      <span className="capitalize">{previewDetail.rfr.employmentStatus} ({previewDetail.rfr.contractDurationMonths || 6} bln)</span>
                    </div>
                  </div>
                </div>

                {/* Section C */}
                <div className="mb-4">
                  <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">C. Basic Requirements</div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div><span className="font-medium w-36 inline-block">Jenis Kelamin</span>: {previewDetail.rfr.sexPreference}</div>
                    <div><span className="font-medium w-36 inline-block">Rentang Usia</span>: {previewDetail.rfr.agePreference}</div>
                    <div><span className="font-medium w-36 inline-block">Pendidikan</span>: {previewDetail.rfr.educationDegree?.toUpperCase()}</div>
                    <div><span className="font-medium w-36 inline-block">Pengalaman</span>: {previewDetail.rfr.yearsOfExperience}</div>
                  </div>
                </div>

                {/* Section D */}
                <div className="mb-4">
                  <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">D. Functional Competency</div>
                  <table className="w-full border-collapse border border-gray-300 text-xs text-left">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-1.5 border-r w-8">No</th>
                        <th className="p-1.5 border-r">Job Related Skills</th>
                        <th className="p-1.5 border-r w-24 text-center">Level</th>
                        <th className="p-1.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewDetail.rfr.functionalCompetencies || []).map((comp: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="p-1.5 border-r text-center">{idx + 1}</td>
                          <td className="p-1.5 border-r">{comp.skillName}</td>
                          <td className="p-1.5 border-r text-center capitalize font-medium">{comp.level}</td>
                          <td className="p-1.5">{comp.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section E. Approval (6 Columns Grid) */}
                <div>
                  <div className="font-bold border-b border-gray-400 pb-1 mb-2 text-xs">E. Approval Matrix</div>
                  <div className="grid grid-cols-6 border border-gray-400 rounded-sm divide-x divide-gray-400 text-center">
                    {(previewDetail.approvals || []).map((step: any) => (
                      <div key={step.id} className="p-2 flex flex-col justify-between min-h-[100px]">
                        <div className="font-bold text-[7.5pt] border-b pb-1 text-gray-800">{step.roleLabel}</div>
                        <div className="my-2 flex items-center justify-center min-h-[35px]">
                          {step.status === 'approved' && step.signatureDataUrl ? (
                            <img src={step.signatureDataUrl} alt="TTD" className="max-h-9 max-w-full object-contain" />
                          ) : (
                            <span className="text-[7pt] italic text-gray-400">
                              {step.status === 'approved' ? '[Signed]' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[7pt] underline truncate">{step.approverName}</div>
                          <div className="text-[6pt] text-gray-600 line-clamp-2">{step.approverTitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
