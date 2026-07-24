'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Upload, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createRfrRequest, resolveRfrMatrixAction } from '@/app/actions/rfr'
import { uploadFile } from '@/app/actions/upload'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'

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
  defaultRequestorName?: string
  defaultSectionDepartment?: string
}

export function RfrClientForm({
  defaultRequestorName = '',
  defaultSectionDepartment = '',
}: RfrClientFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Section A
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10))
  const [joinDateEstimation, setJoinDateEstimation] = useState('')
  const [requestorName, setRequestorName] = useState(defaultRequestorName)
  const [sectionDepartment, setSectionDepartment] = useState(
    defaultSectionDepartment || 'Service Operation Others / Central Services'
  )
  const [receivedByHr, setReceivedByHr] = useState('')

  // Sync session user defaults if loaded asynchronously
  useEffect(() => {
    if (defaultRequestorName && !requestorName) {
      setRequestorName(defaultRequestorName)
    }
  }, [defaultRequestorName])

  const [resolvedApprovers, setResolvedApprovers] = useState([
    { label: 'Purposed,', name: requestorName || 'Junaidi', title: 'Service operation Others Coord' },
    { label: 'HC Verification', name: 'Adilla Tri Arizona', title: 'HR Recruitment & GA Staff' },
    { label: 'Acknowledge', name: 'Kesuma Bagaskara', title: 'Leader HR-GA' },
    { label: 'Acknowledge', name: 'Muhammad Iqbal', title: 'Human Capital Spv' },
    { label: 'Acknowledge', name: 'Romy Hidayat', title: 'Central Service Manager' },
    { label: 'Approval', name: 'Person Sihaloho', title: 'General Manager' },
  ])

  useEffect(() => {
    if (sectionDepartment) {
      resolveRfrMatrixAction(sectionDepartment).then((matrix) => {
        if (matrix && matrix.length === 6) {
          setResolvedApprovers(
            matrix.map((m) => ({
              label: m.roleLabel + (m.stepOrder === 1 ? ',' : ''),
              name: m.stepOrder === 1 ? (requestorName || m.approverName) : m.approverName,
              title: m.approverTitle,
            }))
          )
        }
      })
    }
  }, [sectionDepartment, requestorName])

  // Section B
  const [positionTitle, setPositionTitle] = useState('')
  const [numberOfPersons, setNumberOfPersons] = useState(1)
  const [briefJobDescription, setBriefJobDescription] = useState('')
  const [level, setLevel] = useState('non_staff')
  const [reasonForRequest, setReasonForRequest] = useState('new_headcount')
  const [mppStatus, setMppStatus] = useState('budgeted')
  const [reasonsIfNonBudgeted, setReasonsIfNonBudgeted] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('contract')
  const [contractDurationMonths, setContractDurationMonths] = useState(6)
  const [attachmentMpp, setAttachmentMpp] = useState(false)
  const [attachmentJd, setAttachmentJd] = useState(true)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Section C
  const [sexPreference, setSexPreference] = useState('male')
  const [agePreference, setAgePreference] = useState('18-25')
  const [educationDegree, setEducationDegree] = useState('smk_smu')
  const [educationBackground, setEducationBackground] = useState<string[]>([])
  const [yearsOfExperience, setYearsOfExperience] = useState('fresh_graduate')
  const [fieldOfJobExperience, setFieldOfJobExperience] = useState('')

  // Section D
  const [competencies, setCompetencies] = useState<CompetencyRow[]>(DEFAULT_COMPETENCIES)

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
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      const targetUrl = res.readableUrl || res.url
      if (res.success && targetUrl) {
        setUploadedUrls((prev) => [...prev, targetUrl])
      }
    } catch (err) {
      console.error('File upload error:', err)
    } finally {
      setIsUploading(false)
    }
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

    startTransition(async () => {
      const res = await createRfrRequest({
        requestDate,
        joinDateEstimation,
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
      })

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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Formulir Permohonan Rekrutmen (RFR)</h1>
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
            <Save className="w-4 h-4" /> {isPending ? 'Menyimpan...' : 'Submit & Kirim Approval'}
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

              <div className="flex items-center gap-3 pt-2">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-secondary hover:bg-secondary/80 text-xs font-medium">
                    <Upload className="w-4 h-4" /> {isUploading ? 'Uploading...' : 'Upload Dokumen Pendukung'}
                  </div>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
              {uploadedUrls.length > 0 && (
                <div className="space-y-1 text-xs text-emerald-600 font-medium">
                  {uploadedUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> File terupload {i + 1}: <a href={url} target="_blank" rel="noreferrer" className="underline truncate max-w-xs">{url}</a>
                    </div>
                  ))}
                </div>
              )}
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
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                      value={comp.level}
                      onChange={(e) => updateCompetency(idx, 'level', e.target.value)}
                    >
                      <option value="basic">Basic</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advance">Advance</option>
                    </select>
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
                <div className="grid grid-cols-6 border border-slate-400 divide-x divide-slate-400 text-center bg-white/95 rounded-sm">
                  {resolvedApprovers.map((step, idx) => (
                    <div key={idx} className="p-0.5 flex flex-col justify-between min-h-[72px]">
                      <div className="font-bold text-[7.5px] text-slate-900 border-b border-slate-300 pb-0.5">{step.label}</div>
                      <div className="flex-1 my-0.5 flex items-center justify-center min-h-[22px]">
                        <span className="text-[6.5px] italic text-slate-400">Pending TTD</span>
                      </div>
                      <div>
                        <div className="font-bold text-[7px] underline text-slate-900 truncate leading-tight">{step.name}</div>
                        <div className="text-[6px] text-slate-600 truncate leading-tight">{step.title}</div>
                      </div>
                    </div>
                  ))}
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
