'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createRfrRequest, resolveRfrMatrixAction, resubmitRfrRequest, getEmployeeJobTitleAction } from '@/app/actions/rfr'
import { uploadFile } from '@/app/actions/upload'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'
import { SignaturePad } from '@/components/signature-pad'

type CompetencyRow = {
  skillName: string
  level: 'basic' | 'intermediate' | 'advance'
  remarks: string
}

const DEFAULT_COMPETENCIES: CompetencyRow[] = [
  { skillName: 'Remove and Install Tire at Workshop or Field', level: 'basic', remarks: '' },
  { skillName: 'Assembly and Dis assembly Tire EM & TB', level: 'basic', remarks: '' },
  { skillName: 'Tire Pressure inspection EM & TB', level: 'basic', remarks: '' },
  { skillName: 'Re-torque Wheel Nut Tire Unit', level: 'basic', remarks: '' },
  { skillName: 'Maintenance Tools Service and House Keeping Workshop', level: 'basic', remarks: '' },
]

type RfrClientFormProps = {
  defaultRequestorEmployeeId?: number
  defaultRequestorName?: string
  defaultRequestorJobTitle?: string
  defaultSectionDepartment?: string
  initialData?: any
  initialApprovals?: any[]
}

export function RfrClientForm({
  defaultRequestorEmployeeId,
  defaultRequestorName = '',
  defaultRequestorJobTitle = '',
  defaultSectionDepartment = '',
  initialData,
  initialApprovals,
}: RfrClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Section A
  const [requestDate, setRequestDate] = useState(
    initialData?.requestDate ? new Date(initialData.requestDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [joinDateEstimation, setJoinDateEstimation] = useState(
    initialData?.joinDateEstimation ? new Date(initialData.joinDateEstimation).toISOString().slice(0, 10) : ''
  )
  const [requestorName, setRequestorName] = useState(initialData?.requestorName || defaultRequestorName)
  const [requestorJobTitle, setRequestorJobTitle] = useState(
    initialApprovals?.[0]?.approverTitle && initialApprovals[0].approverTitle !== 'Requestor'
      ? initialApprovals[0].approverTitle
      : (defaultRequestorJobTitle || 'Staff')
  )
  const [sectionDepartment, setSectionDepartment] = useState(
    initialData?.sectionDepartment || defaultSectionDepartment || 'Service Operation Others / Central Services'
  )
  const [receivedByHr, setReceivedByHr] = useState(initialData?.receivedByHr || '')

  // Sync session user defaults if loaded asynchronously
  useEffect(() => {
    if (defaultRequestorName && !requestorName) {
      setRequestorName(defaultRequestorName)
    }
    if (defaultRequestorJobTitle && !requestorJobTitle) {
      setRequestorJobTitle(defaultRequestorJobTitle)
    }
  }, [defaultRequestorName, defaultRequestorJobTitle])

  // Lookup requestor position dynamically from DB when name changes
  useEffect(() => {
    if (requestorName) {
      getEmployeeJobTitleAction(requestorName).then((title) => {
        if (title && title !== 'Requestor') {
          setRequestorJobTitle(title)
        }
      })
    }
  }, [requestorName])

  const [resolvedApprovers, setResolvedApprovers] = useState<any[]>(() => {
    if (initialApprovals && initialApprovals.length > 0) {
      return initialApprovals.map((a, idx) => ({
        label: a.roleLabel,
        name: a.approverName || '-',
        title: idx === 0 ? (requestorJobTitle || a.approverTitle || 'Staff') : (a.approverTitle || '-'),
        stepOrder: a.stepOrder,
        signatureDataUrl: a.signatureDataUrl || null,
        signedAt: a.signedAt || null,
        remarks: a.remarks || '',
        status: a.status || 'pending',
      }))
    }
    return [
      { label: 'Submitted', name: requestorName || '-', title: requestorJobTitle || 'Staff', stepOrder: 1 },
      { label: 'HC Verification', name: 'Adila Tri Arizona', title: 'HR Recruitment Staff', stepOrder: 2 },
      { label: 'Leader HR-GA', name: 'Kesuma Bagaskara', title: 'Leader HR-GA', stepOrder: 3 },
      { label: 'Human Capital Spv', name: 'Muhammad Iqbal', title: 'Human Capital Spv', stepOrder: 4 },
      { label: 'Manager Departemen', name: 'Romy Hidayat', title: 'Central Services Manager', stepOrder: 5 },
      { label: 'General Manager', name: 'Person Sihaloho', title: 'General Manager', stepOrder: 6 },
    ]
  })

  useEffect(() => {
    if (sectionDepartment) {
      resolveRfrMatrixAction(sectionDepartment).then((matrix) => {
        if (matrix && matrix.length >= 2) {
          const approvalMap = new Map((initialApprovals || []).map((a) => [a.stepOrder, a]))
          setResolvedApprovers(
            matrix.map((m) => {
              const isReq = m.stepKey === 'requestor_initiated' || m.stepOrder === 1
              const existingApp = approvalMap.get(m.stepOrder)
              const dynamicReqTitle = requestorJobTitle || (existingApp?.approverTitle !== 'Requestor' ? existingApp?.approverTitle : '') || 'Staff'
              return {
                label: m.roleLabel,
                name: isReq ? (requestorName || '-') : (existingApp?.approverName || m.approverName || m.approverTitle || '-'),
                title: isReq ? dynamicReqTitle : (existingApp?.approverTitle || m.approverTitle),
                stepOrder: m.stepOrder,
                signatureDataUrl: existingApp?.signatureDataUrl || null,
                signedAt: existingApp?.signedAt || null,
                remarks: existingApp?.remarks || '',
                status: existingApp?.status || 'pending',
              }
            })
          )
        }
      })
    }
  }, [sectionDepartment, requestorName, requestorJobTitle, initialApprovals])

  // Section B
  const [positionTitle, setPositionTitle] = useState(initialData?.positionTitle || '')
  const [numberOfPersons, setNumberOfPersons] = useState(initialData?.numberOfPersons ?? 1)
  const [briefJobDescription, setBriefJobDescription] = useState(initialData?.briefJobDescription || '')
  const [level, setLevel] = useState(initialData?.level || 'non_staff')
  const [reasonForRequest, setReasonForRequest] = useState(initialData?.reasonForRequest || 'new_headcount')
  const [mppStatus, setMppStatus] = useState(initialData?.mppStatus || 'budgeted')
  const [reasonsIfNonBudgeted, setReasonsIfNonBudgeted] = useState(initialData?.reasonsIfNonBudgeted || '')
  const [employmentStatus, setEmploymentStatus] = useState(initialData?.employmentStatus || 'contract')
  const [contractDurationMonths, setContractDurationMonths] = useState(initialData?.contractDurationMonths ?? 6)
  const [attachmentMpp, setAttachmentMpp] = useState(initialData?.attachmentMpp ?? false)
  const [attachmentJd, setAttachmentJd] = useState(initialData?.attachmentJd ?? true)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(initialData?.uploadedAttachmentUrls || [])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null)
  const [uploadingFileSize, setUploadingFileSize] = useState<number | null>(null)

  // Section C
  const [sexPreference, setSexPreference] = useState(initialData?.sexPreference || 'male')
  const [agePreference, setAgePreference] = useState(initialData?.agePreference || '18-25')
  const [educationDegree, setEducationDegree] = useState(initialData?.educationDegree || 'smk_smu')
  const [educationBackground, setEducationBackground] = useState<string[]>(initialData?.educationBackground || [])
  const [yearsOfExperience, setYearsOfExperience] = useState(initialData?.yearsOfExperience || 'fresh_graduate')
  const [fieldOfJobExperience, setFieldOfJobExperience] = useState(initialData?.fieldOfJobExperience || '')

  // Section D
  const [competencies, setCompetencies] = useState<CompetencyRow[]>(
    initialData?.functionalCompetencies || DEFAULT_COMPETENCIES
  )

  // Requestor Signature
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const requestorSignature = initialApprovals?.find((a) => a.stepOrder === 1)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(
    requestorSignature?.signatureDataUrl || null
  )

  function toggleEduBg(val: string) {
    setEducationBackground((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    )
  }

  function handleAddCompetency() {
    setCompetencies((prev) => [...prev, { skillName: '', level: 'basic', remarks: '' }])
  }

  function handleRemoveCompetency(idx: number) {
    setCompetencies((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateCompetency(idx: number, field: keyof CompetencyRow, value: any) {
    setCompetencies((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Pre-flight file size check (Max 10MB PDF/Docs, Max 5MB images)
    const isImg = file.type.startsWith('image/')
    const maxBytes = isImg ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error(
        `Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas maksimal ${isImg ? '5MB' : '10MB'}. Silakan perkecil atau pilih file lain.`
      )
      e.target.value = ''
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadingFileName(file.name)
    setUploadingFileSize(file.size)

    try {
      let targetUrl: string | null = null

      // Fast streaming via /api/uploads/document with live progress
      try {
        const res = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100)
              setUploadProgress(pct)
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText))
              } catch {
                reject(new Error('Respon server tidak valid'))
              }
            } else {
              reject(new Error(`Server error ${xhr.status}`))
            }
          }
          xhr.onerror = () => reject(new Error('Koneksi upload terputus'))
          xhr.open('POST', '/api/uploads/document')
          const fd = new FormData()
          fd.append('file', file)
          xhr.send(fd)
        })

        if (res?.success) {
          targetUrl = res.readableUrl || res.url
        } else if (res?.error) {
          throw new Error(res.error)
        }
      } catch (streamErr) {
        console.warn('Direct streaming upload fallback to server action:', streamErr)
        const formData = new FormData()
        formData.append('file', file)
        const res = await uploadFile(formData)
        if (res.success) {
          targetUrl = res.readableUrl || res.url || null
        } else {
          throw new Error(res.error || 'Gagal mengunggah file')
        }
      }

      if (targetUrl) {
        setUploadedUrls((prev) => [...prev, targetUrl])
        toast.success(`Dokumen "${file.name}" berhasil diunggah!`)
      }
    } catch (err: any) {
      console.error('File upload error:', err)
      toast.error(err?.message || 'Gagal mengunggah dokumen. Silakan periksa koneksi internet Anda.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      setUploadingFileName(null)
      setUploadingFileSize(null)
      e.target.value = ''
    }
  }

  function handleRemoveUploadedFile(indexToRemove: number) {
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove))
    toast.info('Dokumen lampiran dihapus dari daftar.')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!requestorName.trim()) {
      setError('Nama Requestor wajib diisi.')
      return
    }
    if (!positionTitle.trim()) {
      setError('Posisi Jabatan (Position Title) wajib diisi.')
      return
    }
    if (!joinDateEstimation) {
      setError('Estimasi Tanggal Masuk (Join Date Estimation) wajib diisi.')
      return
    }
    if (!liveSignatureUrl) {
      setError('Tanda tangan digital Pemohon (Requestor) wajib diisi.')
      return
    }

    startTransition(async () => {
      const payload = {
        requestDate,
        joinDateEstimation,
        requestorEmployeeId: defaultRequestorEmployeeId || initialData?.requestorEmployeeId,
        requestorName,
        sectionDepartment,
        receivedByHr,
        positionTitle,
        numberOfPersons: Number(numberOfPersons) || 1,
        briefJobDescription,
        level,
        reasonForRequest,
        mppStatus,
        reasonsIfNonBudgeted,
        employmentStatus,
        contractDurationMonths: Number(contractDurationMonths) || 6,
        attachmentMpp,
        attachmentJd,
        uploadedAttachmentUrls: uploadedUrls,
        sexPreference,
        agePreference,
        educationDegree,
        educationBackground,
        yearsOfExperience,
        fieldOfJobExperience,
        functionalCompetencies: competencies.filter((c) => c.skillName.trim().length > 0),
        requestorSignatureDataUrl: liveSignatureUrl,
      }

      const res = initialData?.id
        ? await resubmitRfrRequest(initialData.id, payload)
        : await createRfrRequest(payload)

      if (res.success) {
        router.push('/dashboard/hc/rfr')
      } else {
        setError(res.error || 'Gagal menyimpan Form RFR.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 bg-card p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hc/rfr">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {initialData?.id ? 'Edit / Revisi Formulir Permohonan Rekrutmen (RFR)' : 'Formulir Permohonan Rekrutmen (RFR)'}
            </h1>
            <p className="text-xs text-muted-foreground">Request For Recruitment Form Standard PT Chitra Paratama</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/hc/rfr">
            <Button variant="outline" type="button">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isPending} className="gap-2 bg-[#003461] text-white hover:bg-[#002548]">
            <Save className="w-4 h-4" /> {isPending ? 'Menyimpan...' : initialData?.id ? 'Simpan Perubahan' : 'Submit & Kirim Approval'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Grid Side-by-Side: KIRI Form Input | KANAN Document PDF Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KIRI: FORM INPUT (6 Columns) */}
        <div className="lg:col-span-6 space-y-6">
          {/* SECTION A */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-foreground">A. Requestor Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Request Date</Label>
                <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} required />
              </div>
              <div>
                <Label>Join Date Estimation</Label>
                <Input type="date" value={joinDateEstimation} onChange={(e) => setJoinDateEstimation(e.target.value)} required />
              </div>
              <div>
                <Label>Requestor Name</Label>
                <Input placeholder="Nama Pemohon (misal: Junaidi)" value={requestorName} onChange={(e) => setRequestorName(e.target.value)} required />
              </div>
              <div>
                <Label>Section / Department</Label>
                <Input placeholder="Section/Dept" value={sectionDepartment} onChange={(e) => setSectionDepartment(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* SECTION B */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-foreground">B. Request Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Position Title (Jabatan yang Diminta)</Label>
                <Input placeholder="Misal: Tire Mechanic" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} required />
              </div>
              <div>
                <Label>Jumlah Person (Number)</Label>
                <Input type="number" min={1} value={numberOfPersons} onChange={(e) => setNumberOfPersons(Number(e.target.value))} required />
              </div>
            </div>

            <div>
              <Label className="mb-1 block">Brief Job Description</Label>
              <Textarea
                rows={3}
                placeholder="Deskripsi singkat tugas dan alasan penambahan manpower..."
                value={briefJobDescription}
                onChange={(e) => setBriefJobDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <div>
                <Label className="mb-2 block">Level Jabatan</Label>
                <RadioGroup value={level} onValueChange={setLevel} className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non_staff" id="lvl-nonstaff" />
                    <label htmlFor="lvl-nonstaff" className="text-sm">Non-Staff</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="lvl-staff" />
                    <label htmlFor="lvl-staff" className="text-sm">Staff</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="coordinator_supervisor" id="lvl-spv" />
                    <label htmlFor="lvl-spv" className="text-sm">Coordinator / Supervisor</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="managerial" id="lvl-mgr" />
                    <label htmlFor="lvl-mgr" className="text-sm">Managerial</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-2 block">Reason For Request</Label>
                <RadioGroup value={reasonForRequest} onValueChange={setReasonForRequest} className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new_headcount" id="reason-new" />
                    <label htmlFor="reason-new" className="text-sm">New Headcount</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replacement" id="reason-repl" />
                    <label htmlFor="reason-repl" className="text-sm">Replacement</label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <div>
                <Label className="mb-2 block">MPP (Manpower Planning)</Label>
                <RadioGroup value={mppStatus} onValueChange={setMppStatus} className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="budgeted" id="mpp-budgeted" />
                    <label htmlFor="mpp-budgeted" className="text-sm">Budgeted</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non_budgeted" id="mpp-nonbudgeted" />
                    <label htmlFor="mpp-nonbudgeted" className="text-sm">Non-Budgeted</label>
                  </div>
                </RadioGroup>
                {mppStatus === 'non_budgeted' && (
                  <Input
                    className="mt-2 text-xs"
                    placeholder="Alasan jika Non-Budgeted..."
                    value={reasonsIfNonBudgeted}
                    onChange={(e) => setReasonsIfNonBudgeted(e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label className="mb-2 block">Status Kepegawaian</Label>
                <RadioGroup value={employmentStatus} onValueChange={setEmploymentStatus} className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="contract" id="emp-contract" />
                    <label htmlFor="emp-contract" className="text-sm">Contract</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="probation" id="emp-probation" />
                    <label htmlFor="emp-probation" className="text-sm">Probation</label>
                  </div>
                </RadioGroup>
                {employmentStatus === 'contract' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      className="w-20 text-xs"
                      value={contractDurationMonths}
                      onChange={(e) => setContractDurationMonths(Number(e.target.value))}
                    />
                    <span className="text-xs text-muted-foreground">Bulan (Duration)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="block">Attachment Checkbox & File Upload</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={attachmentMpp} onCheckedChange={(v) => setAttachmentMpp(Boolean(v))} />
                  <span>Man Power Planning (MPP)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={attachmentJd} onCheckedChange={(v) => setAttachmentJd(Boolean(v))} />
                  <span>Job Description (Compulsory)</span>
                </label>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className={cn("cursor-pointer inline-flex", isUploading && "pointer-events-none opacity-60")}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-secondary hover:bg-secondary/80 text-xs font-semibold shadow-xs transition-colors">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Mengunggah Dokumen...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Upload Dokumen Pendukung</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    />
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Format: PDF, Word (DOC/DOCX), atau Gambar (JPG/PNG). Maks 10MB per file.
                  </span>
                </div>

                {isUploading && (
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-2 max-w-md animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[240px]">
                        {uploadingFileName || 'Mengunggah berkas...'}
                      </span>
                      <span className="font-semibold text-primary tabular-nums">
                        {uploadProgress !== null ? `${uploadProgress}%` : 'Memproses...'}
                      </span>
                    </div>
                    <Progress value={uploadProgress ?? 0} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      {uploadProgress === 100
                        ? 'Menyimpan ke Cloud Storage...'
                        : uploadingFileSize
                          ? `${((uploadingFileSize * (uploadProgress || 0)) / 100 / (1024 * 1024)).toFixed(1)} MB dari ${(uploadingFileSize / (1024 * 1024)).toFixed(1)} MB`
                          : 'Sedang mentransfer data...'}
                    </p>
                  </div>
                )}

                {uploadedUrls.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-foreground">
                      Dokumen Terlampir ({uploadedUrls.length}):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {uploadedUrls.map((url, i) => {
                        const rawName = url.split('/').pop()?.split('?')[0] || `Dokumen ${i + 1}`
                        const resolved = resolveClientUploadUrl(url)
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent/40 text-xs transition-colors shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <a
                                  href={resolved}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-foreground hover:underline truncate block max-w-[200px] sm:max-w-[260px]"
                                  title={rawName}
                                >
                                  {rawName}
                                </a>
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 inline" /> Siap dilampirkan
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={resolved}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Buka Dokumen"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadedFile(i)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION C */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-foreground">C. Basic Requirements</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Jenis Kelamin (Sex)</Label>
                <RadioGroup value={sexPreference} onValueChange={setSexPreference} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="sex-m" />
                    <label htmlFor="sex-m" className="text-sm">Pria</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="sex-f" />
                    <label htmlFor="sex-f" className="text-sm">Wanita</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="any" id="sex-any" />
                    <label htmlFor="sex-any" className="text-sm">Bebas</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-2 block">Usia (Age Preference)</Label>
                <RadioGroup value={agePreference} onValueChange={setAgePreference} className="flex flex-wrap gap-3">
                  {['18-25', '26-35', '36-45', '>45'].map((age) => (
                    <div key={age} className="flex items-center space-x-1.5">
                      <RadioGroupItem value={age} id={`age-${age}`} />
                      <label htmlFor={`age-${age}`} className="text-xs">{age}</label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label className="mb-2 block">Pendidikan (Education Degree)</Label>
                <RadioGroup value={educationDegree} onValueChange={setEducationDegree} className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="smk_smu" id="edu-smk" />
                    <label htmlFor="edu-smk" className="text-xs">SMK / SMU</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="diploma" id="edu-d3" />
                    <label htmlFor="edu-d3" className="text-xs">Diploma (D3)</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="s1" id="edu-s1" />
                    <label htmlFor="edu-s1" className="text-xs">Sarjana (S1)</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="s2" id="edu-s2" />
                    <label htmlFor="edu-s2" className="text-xs">Magister (S2)</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-2 block">Jurusan (Education Background)</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['Finance/Accounting', 'Management', 'Engineering', 'IT'].map((bg) => (
                    <label key={bg} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={educationBackground.includes(bg)}
                        onCheckedChange={() => toggleEduBg(bg)}
                      />
                      <span>{bg}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label className="mb-2 block">Pengalaman Kerja (Years of Exp)</Label>
                <RadioGroup value={yearsOfExperience} onValueChange={setYearsOfExperience} className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="fresh_graduate" id="exp-fg" />
                    <label htmlFor="exp-fg" className="text-xs">Fresh Grad</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="1-3" id="exp-1-3" />
                    <label htmlFor="exp-1-3" className="text-xs">1 - 3 Tahun</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="3-6" id="exp-3-6" />
                    <label htmlFor="exp-3-6" className="text-xs">3 - 6 Tahun</label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="7-12" id="exp-7-12" />
                    <label htmlFor="exp-7-12" className="text-xs">7 - 12 Tahun</label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Bidang Pengalaman (Field of Experience)</Label>
                <Input
                  placeholder="Misal: Tire Maintenance, Heavy Equipment"
                  value={fieldOfJobExperience}
                  onChange={(e) => setFieldOfJobExperience(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* SECTION D */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-bold text-foreground">D. Functional Competency</h2>
              <Button type="button" variant="outline" size="sm" onClick={handleAddCompetency} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Tambah Skill
              </Button>
            </div>

            <div className="space-y-3">
              {competencies.map((comp, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-secondary/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-5">
                    <Label className="text-xs">Skill / Competency</Label>
                    <Input
                      className="h-8 text-xs mt-1"
                      placeholder="Nama Skill..."
                      value={comp.skillName}
                      onChange={(e) => updateCompetency(idx, 'skillName', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Level</Label>
                    <Select
                      value={comp.level}
                      onValueChange={(val: any) => updateCompetency(idx, 'level', val)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic" className="text-xs">Basic</SelectItem>
                        <SelectItem value="intermediate" className="text-xs">Intermediate</SelectItem>
                        <SelectItem value="advance" className="text-xs">Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      className="h-8 text-xs mt-1"
                      placeholder="Catatan..."
                      value={comp.remarks}
                      onChange={(e) => updateCompetency(idx, 'remarks', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end pt-4 md:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleRemoveCompetency(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tanda Tangan Requestor */}
          <div className="p-6 rounded-xl border bg-card shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h2 className="text-base font-bold text-foreground">Tanda Tangan Pemohon (Requestor)</h2>
            </div>
            <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500">
                Wajib membubuhkan tanda tangan digital sebelum mengirim form RFR.
              </p>
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                <SignaturePad
                  defaultDataUrl={liveSignatureUrl}
                  onSignatureChange={setSignatureFile}
                  onDataUrlChange={setLiveSignatureUrl}
                  autoUseProfileSignature={false}
                  height={150}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: LIVE DOCUMENT / PDF PREVIEW (6 Columns Sticky) */}
        <div className="lg:col-span-6 sticky top-4 rounded-xl border bg-slate-100 p-4 shadow-sm space-y-4 max-h-[calc(100vh-2rem)] overflow-auto print:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#003461]" />
              <h2 className="text-sm font-bold text-slate-800">Live Document Preview</h2>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#003461]/10 text-[#003461] px-2 py-0.5 rounded-full">
              PDF Standard A4
            </span>
          </div>

          {/* PDF A4 Page Container with Letterhead Background */}
          <div className="pdf-wrapper relative mx-auto w-full max-w-[210mm] aspect-[210/297] bg-white rounded-lg shadow-md border border-slate-300 text-[9.5px] text-slate-800 font-sans overflow-hidden">
            {/* Background Stationery Letterhead */}
            <img
              src="/ChitraParatama_Stationery_Letterhead_jkt.jpg"
              alt="Chitra Paratama Letterhead"
              className="absolute inset-0 z-0 h-full w-full object-fill pointer-events-none"
            />

            {/* Document Content overlay - transparent so letterhead header logo & watermark shine through */}
            <div className="relative z-10 px-6 pt-[19%] pb-10 space-y-2.5 bg-transparent text-slate-800 text-[8.5px] leading-tight overflow-auto">
              {/* Header Title */}
              <div className="text-center border-b border-slate-400 pb-1 mb-1">
                <h3 className="text-xs font-black uppercase text-[#003461] tracking-wider">REQUEST FOR RECRUITMENT FORM</h3>
                <p className="text-[8.5px] text-slate-700 font-bold">PT CHITRA PARATAMA</p>
              </div>

              {/* A. Requestor Information */}
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 text-[9px]">A. Requestor Information</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                  <div><span className="text-slate-600">Request Date:</span> <span className="font-medium">{requestDate || '-'}</span></div>
                  <div><span className="text-slate-600">Join Date Est:</span> <span className="font-medium">{joinDateEstimation || '-'}</span></div>
                  <div><span className="text-slate-600">Requestor Name:</span> <span className="font-semibold text-slate-900">{requestorName || '-'}</span></div>
                  <div><span className="text-slate-600">Section/Dept:</span> <span className="font-medium">{sectionDepartment || '-'}</span></div>
                </div>
              </div>

              {/* B. Request Information */}
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 text-[9px]">B. Request Information</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                  <div><span className="text-slate-600">Position Title:</span> <span className="font-semibold text-[#003461]">{positionTitle || '-'}</span></div>
                  <div><span className="text-slate-600">Number:</span> <span className="font-semibold">{numberOfPersons} Person(s)</span></div>
                </div>
                <div><span className="text-slate-600">Level Jabatan:</span> <span className="font-bold capitalize text-slate-900">{level.replace('_', ' ')}</span></div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div><span className="text-slate-600">Reason:</span> <span className="font-medium capitalize">{reasonForRequest.replace('_', ' ')}</span></div>
                  <div><span className="text-slate-600">MPP:</span> <span className="font-medium capitalize">{mppStatus} {reasonsIfNonBudgeted ? `(${reasonsIfNonBudgeted})` : ''}</span></div>
                </div>
                <div><span className="text-slate-600">Status:</span> <span className="font-medium capitalize">{employmentStatus} ({contractDurationMonths}m)</span></div>
                {briefJobDescription && (
                  <div className="bg-slate-50/80 p-1 rounded border border-slate-200 text-[8px]">
                    <span className="text-slate-600 font-semibold block">Brief Description:</span>
                    <p className="whitespace-pre-line text-slate-700">{briefJobDescription}</p>
                  </div>
                )}
              </div>

              {/* C. Basic Requirements */}
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 text-[9px]">C. Basic Requirements</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                  <div><span className="text-slate-600">Sex:</span> <span className="font-medium capitalize">{sexPreference}</span></div>
                  <div><span className="text-slate-600">Age:</span> <span className="font-medium">{agePreference}</span></div>
                  <div><span className="text-slate-600">Degree:</span> <span className="font-medium uppercase">{educationDegree.replace('_', '/')}</span></div>
                  <div><span className="text-slate-600">Experience:</span> <span className="font-medium capitalize">{yearsOfExperience.replace('_', ' ')}</span></div>
                </div>
                {educationBackground.length > 0 && (
                  <div><span className="text-slate-600">Education Background:</span> <span className="font-medium">{educationBackground.join(', ')}</span></div>
                )}
                {fieldOfJobExperience && (
                  <div><span className="text-slate-600">Field Experience:</span> <span className="font-medium">{fieldOfJobExperience}</span></div>
                )}
              </div>

              {/* D. Functional Competency Table */}
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 text-[9px]">D. Functional Competency</div>
                <div className="border border-slate-300 rounded overflow-hidden bg-white/90">
                  <table className="w-full text-[8px] text-left">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                      <tr>
                        <th className="p-0.5 px-1 border-r border-slate-300">Skill / Competency</th>
                        <th className="p-0.5 px-1 border-r border-slate-300 text-center w-14">Level</th>
                        <th className="p-0.5 px-1">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {competencies.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-0.5 px-1 border-r border-slate-200 font-medium truncate max-w-[140px]">{c.skillName || '-'}</td>
                          <td className="p-0.5 px-1 border-r border-slate-200 text-center capitalize font-semibold text-[#003461]">{c.level}</td>
                          <td className="p-0.5 px-1 text-slate-600 truncate max-w-[80px]">{c.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* E. Approval Grid matching official document layout */}
              <div className="space-y-0.5 pt-0.5">
                <div className="font-bold text-slate-900 border-b border-slate-300 pb-0.5 text-[9px]">E. Approval</div>
                <div
                  className="grid border border-slate-400 divide-x divide-slate-400 text-center bg-white/95 rounded-sm"
                  style={{ gridTemplateColumns: `repeat(${resolvedApprovers.length}, minmax(0, 1fr))` }}
                >
                  {resolvedApprovers.map((step, idx) => {
                    const isFirstStep = idx === 0 || step.stepOrder === 1
                    const hasSig = Boolean(step.signatureDataUrl)
                    const cleanRemark =
                      step.remarks &&
                      !['Resubmitted after revision', 'Submitted', 'Reverted', 'Approved', 'approved'].includes(step.remarks.trim())
                        ? step.remarks.trim()
                        : ''

                    return (
                      <div key={idx} className="p-0.5 flex flex-col justify-between bg-white/95">
                        {/* 1. Header Role (Wrap word cleanly, no cutoff) */}
                        <div className="font-bold text-[6.5px] text-slate-900 border-b border-slate-300 pb-0.5 h-[24px] flex items-center justify-center text-center leading-[1.1] break-words px-0.5 w-full">
                          {step.label}
                        </div>

                        {/* 2. Signature Area (Fixed Height for Alignment) */}
                        <div className="flex items-center justify-center h-[34px] w-full px-0.5 my-0.5">
                          {isFirstStep && liveSignatureUrl ? (
                            <img src={liveSignatureUrl} alt="Live TTD" className="max-h-[30px] max-w-full object-contain" />
                          ) : hasSig ? (
                            <img src={step.signatureDataUrl} alt="TTD" className="max-h-[30px] max-w-full object-contain" />
                          ) : (
                            <span className="text-[6.5px] italic text-slate-400">
                              {step.status === 'approved' ? '[Signed]' : 'Pending TTD'}
                            </span>
                          )}
                        </div>

                        {/* 3. Approver Bottom Info Section */}
                        <div className="w-full pb-0.5 space-y-0.5">
                          {/* Nama */}
                          <div className="font-bold text-[7px] underline text-slate-900 truncate leading-tight text-center px-0.5">
                            {step.name}
                          </div>

                          {/* Jabatan */}
                          <div className="text-[6px] text-slate-600 truncate leading-tight text-center px-0.5">
                            {step.title}
                          </div>

                          {/* Jam - Tanggal */}
                          <div className="text-[5.5px] text-slate-500 font-medium truncate leading-tight text-center px-0.5">
                            {step.signedAt ? (
                              <span>
                                {new Date(step.signedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} —{' '}
                                {new Date(step.signedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </div>

                          {/* Catatan Approver */}
                          <div className="text-[5.5px] text-slate-500 truncate leading-tight text-center px-0.5 min-h-[10px] flex items-center justify-center">
                            {cleanRemark ? (
                              <span className="truncate max-w-full" title={cleanRemark}>
                                Catatan: {cleanRemark}
                              </span>
                            ) : (
                              <span className="text-transparent">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Attachment File Previews directly below A4 container */}
          {uploadedUrls.length > 0 && (
            <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#003461]" /> Lampiran Dokumen ({uploadedUrls.length})
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">PDF & Image Preview</span>
              </div>
              {uploadedUrls.map((url, i) => {
                const resolvedUrl = resolveClientUploadUrl(url)
                const isPdf = resolvedUrl.toLowerCase().includes('.pdf')
                return (
                  <div key={i} className="border rounded-lg p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Attachment #{i + 1}</span>
                      <a href={resolvedUrl} target="_blank" rel="noreferrer" className="text-[#003461] hover:underline text-[11px] flex items-center gap-1 font-medium">
                        Buka di Tab Baru ↗
                      </a>
                    </div>
                    {isPdf ? (
                      <iframe
                        src={resolvedUrl}
                        className="w-full h-80 rounded border bg-white"
                        title={`Attachment PDF ${i + 1}`}
                      />
                    ) : (
                      <img
                        src={resolvedUrl}
                        alt={`Attachment ${i + 1}`}
                        className="w-full max-h-80 object-contain rounded border bg-white p-1"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
