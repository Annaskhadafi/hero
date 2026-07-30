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
  Bug,
  Mail,
  Send,
  Paperclip,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { generateTestRfr, getRfrDetail } from '@/app/actions/rfr'

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

  // State for Test Approval & Custom Email Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('wustho.c@gmail.com')
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{
    rfrNumber: string
    targetEmail: string
    positionTitle: string
    links: Array<{ step: number; role: string; name: string; title: string; url: string }>
  } | null>(null)

  async function handleRunTest() {
    if (!testEmail || !testEmail.trim()) {
      toast.error('Masukkan email custom terlebih dahulu.')
      return
    }
    setIsTestRunning(true)
    const toastId = toast.loading('Sedang membuat data test RFR & mengirim email...')
    const result = await generateTestRfr(testEmail.trim())
    setIsTestRunning(false)
    setIsTestModalOpen(false)

    if (result.success && result.data) {
      toast.success(`Test RFR (${result.data.rfrNumber}) berhasil dibuat! Email telah dikirim ke ${result.data.targetEmail}`, {
        id: toastId,
      })
      setTestResult(result.data)
      router.refresh()
    } else {
      toast.error(result.error || 'Gagal membuat test RFR.', { id: toastId })
    }
  }

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            disabled={isTestRunning}
            className="gap-1.5 border"
          >
            <Bug className="w-4 h-4 text-amber-500" />
            {isTestRunning ? 'Generating Test...' : 'Test Approval & Email'}
          </Button>
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

                {/* Section F: Lampiran & Dokumen Pendukung */}
                {((previewDetail.rfr.uploadedAttachmentUrls && previewDetail.rfr.uploadedAttachmentUrls.length > 0) || previewDetail.rfr.attachmentMpp || previewDetail.rfr.attachmentJd) && (
                  <div className="mt-6 pt-4 border-t border-gray-300">
                    <div className="font-bold border-b border-gray-400 pb-1 mb-3 text-xs flex items-center justify-between text-gray-900">
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        F. Lampiran & Dokumen Pendukung
                      </span>
                      {previewDetail.rfr.uploadedAttachmentUrls?.length > 0 && (
                        <span className="text-[10px] font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {previewDetail.rfr.uploadedAttachmentUrls.length} Berkas
                        </span>
                      )}
                    </div>

                    {/* Status checklist */}
                    <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Lampiran MPP:</span>
                        {previewDetail.rfr.attachmentMpp ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Melampirkan MPP
                          </span>
                        ) : (
                          <span className="text-slate-400">Tidak ada</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Lampiran Job Description (JD):</span>
                        {previewDetail.rfr.attachmentJd ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Melampirkan JD
                          </span>
                        ) : (
                          <span className="text-slate-400">Tidak ada</span>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Files (Images, PDFs, etc.) */}
                    {Array.isArray(previewDetail.rfr.uploadedAttachmentUrls) && previewDetail.rfr.uploadedAttachmentUrls.length > 0 ? (
                      <div className="space-y-4">
                        {previewDetail.rfr.uploadedAttachmentUrls.map((url: string, idx: number) => {
                          const cleanUrl = url.trim()
                          const filename = cleanUrl.split('/').pop() || `Lampiran_${idx + 1}`
                          const isPdf = cleanUrl.toLowerCase().endsWith('.pdf') || cleanUrl.toLowerCase().includes('.pdf')
                          const isImage = /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(cleanUrl) || cleanUrl.startsWith('data:image')

                          return (
                            <div key={idx} className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-slate-900 space-y-2">
                              <div className="flex items-center justify-between text-xs font-semibold border-b pb-2 border-slate-200">
                                <span className="flex items-center gap-2 truncate max-w-lg">
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                  Lampiran {idx + 1}: {filename}
                                </span>
                                <a
                                  href={cleanUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Buka Fullscreen
                                </a>
                              </div>

                              {/* Image Preview */}
                              {isImage && (
                                <div className="rounded border bg-black/5 p-2 flex justify-center max-h-[500px] overflow-hidden">
                                  <img
                                    src={cleanUrl}
                                    alt={filename}
                                    className="max-h-[480px] max-w-full object-contain rounded shadow-sm"
                                  />
                                </div>
                              )}

                              {/* PDF Embedded View */}
                              {isPdf && (
                                <div className="rounded border bg-white h-[500px] overflow-hidden shadow-inner">
                                  <iframe
                                    src={cleanUrl}
                                    className="w-full h-full border-0"
                                    title={`Preview ${filename}`}
                                  />
                                </div>
                              )}

                              {/* Other File Fallback */}
                              {!isImage && !isPdf && (
                                <div className="p-3 bg-white rounded border flex items-center justify-between">
                                  <span className="text-xs text-slate-700 truncate">{filename}</span>
                                  <a
                                    href={cleanUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Download File
                                  </a>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 1: Test Email Input Prompt */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-primary" /> Test Approval & Email Delivery RFR
            </DialogTitle>
            <DialogDescription>
              Masukkan alamat email custom untuk menerima pengujian permohonan RFR dan alur TTD digital (6 Tahap Approval).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="test-email-input" className="text-xs font-semibold">Alamat Email Custom Target</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="test-email-input"
                  type="email"
                  placeholder="contoh: email.anda@perusahaan.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sistem akan membuat 1 permohonan RFR uji coba dan mengatur ke-6 approver menggunakan email ini, lalu mengirimkan email notifikasi tahap 1.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestModalOpen(false)} disabled={isTestRunning}>
              Batal
            </Button>
            <Button onClick={handleRunTest} disabled={isTestRunning} className="gap-1.5">
              <Send className="w-4 h-4" /> {isTestRunning ? 'Memproses...' : 'Jalankan Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Test Links Result Dialog */}
      <Dialog open={!!testResult} onOpenChange={(o) => { if (!o) setTestResult(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Test Approval Links ({testResult?.rfrNumber})
            </DialogTitle>
            <DialogDescription>
              Permohonan RFR <strong>{testResult?.rfrNumber}</strong> ({testResult?.positionTitle}) telah dibuat. Email notifikasi tahap 1 telah dikirim ke <strong>{testResult?.targetEmail}</strong>. Klik link di bawah ini untuk menguji persetujuan & TTD digital tiap tahap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {testResult?.links.map((link) => (
              <div key={link.step} className="flex items-center justify-between rounded-lg border p-3 bg-card hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Step {link.step}: {link.role}
                  </p>
                  <p className="text-xs font-medium text-primary">{link.name}</p>
                  <p className="text-[11px] text-muted-foreground">{link.title}</p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Link
                </a>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestResult(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

