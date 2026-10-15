'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from '@/components/signature-pad'
import { uploadFile } from '@/app/actions/upload'
import {
  getEmployeesForTrainingPicker,
  createTrainingRequest,
  type TrainingEmployeeOption,
  type ApproverStepInput,
} from '@/app/actions/training-requests'
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  User,
  Users,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TrainingRequestFormDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function TrainingRequestFormDialog({
  onSuccess,
  trigger,
}: TrainingRequestFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [employeesList, setEmployeesList] = useState<TrainingEmployeeOption[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // Participant selection state
  const [participantsType, setParticipantsType] = useState<'employees' | 'attached_list'>('employees')
  const [selectedEmployees, setSelectedEmployees] = useState<TrainingEmployeeOption[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false)

  // ISO Form Fields
  const [jobLevel, setJobLevel] = useState('Staff - Manager')
  const [department, setDepartment] = useState('All Department')
  const [workLocation, setWorkLocation] = useState('Head Office & All Sites')
  const [trainingTitle, setTrainingTitle] = useState('')
  const [trainingType, setTrainingType] = useState('Training') // Training, Seminar, Lokakarya
  const [trainingCategory, setTrainingCategory] = useState('External') // External, Internal, In-house, Online
  const [trainingDate, setTrainingDate] = useState('')
  const [trainingVenue, setTrainingVenue] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [costCurrency, setCostCurrency] = useState('IDR')
  const [costNotes, setCostNotes] = useState('Sesuai penawaran terlampir')
  const [providerName, setProviderName] = useState('')
  const [providerContact, setProviderContact] = useState('')

  // Dynamic Objectives & Past Trainings
  const [objectives, setObjectives] = useState<string[]>([
    'Meningkatkan keterampilan dan kapabilitas operasional sesuai standar industri.',
    'Memenuhi persyaratan sertifikasi dan kepatuhan regulasi keselamatan kerja.',
  ])
  const [pastTrainings, setPastTrainings] = useState<string[]>([
    'Pelatihan Keselamatan & Kesehatan Kerja (HSE Basic)',
  ])

  // Attachment
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Custom Approvers
  const [approvers, setApprovers] = useState<ApproverStepInput[]>([
    {
      stepOrder: 1,
      roleLabel: 'Diajukan Oleh (Pemohon)',
      approverName: '',
      approverEmail: '',
      approverTitle: 'Pemohon',
      approverEmployeeId: null,
    },
    {
      stepOrder: 2,
      roleLabel: 'HR Verifikasi',
      approverName: 'HR Training Staff',
      approverEmail: '',
      approverTitle: 'HR Training Specialist',
      approverEmployeeId: null,
    },
    {
      stepOrder: 3,
      roleLabel: 'Mengetahui (Manager / Atasan)',
      approverName: 'Department Manager',
      approverEmail: '',
      approverTitle: 'Manager Terkait',
      approverEmployeeId: null,
    },
    {
      stepOrder: 4,
      roleLabel: 'Mengetahui (General Operation Manager)',
      approverName: 'General Operation Manager',
      approverEmail: '',
      approverTitle: 'GOM',
      approverEmployeeId: null,
    },
    {
      stepOrder: 5,
      roleLabel: 'Menyetujui (Direktur)',
      approverName: 'Direktur',
      approverEmail: '',
      approverTitle: 'Director',
      approverEmployeeId: null,
    },
  ])

  // Requester Immediate Signature
  const [requesterSignature, setRequesterSignature] = useState<string | null>(null)

  // Load employee directory
  useEffect(() => {
    if (open && employeesList.length === 0) {
      setIsLoadingEmployees(true)
      getEmployeesForTrainingPicker()
        .then((res) => setEmployeesList(res))
        .finally(() => setIsLoadingEmployees(false))
    }
  }, [open, employeesList.length])

  // Auto-fill fields based on selected employees
  const handleToggleEmployee = (emp: TrainingEmployeeOption) => {
    const exists = selectedEmployees.some((e) => e.id === emp.id)
    let updated: TrainingEmployeeOption[]
    if (exists) {
      updated = selectedEmployees.filter((e) => e.id !== emp.id)
    } else {
      updated = [...selectedEmployees, emp]
    }
    setSelectedEmployees(updated)

    if (updated.length === 1) {
      const single = updated[0]
      if (single.department) setDepartment(single.department)
      if (single.position) setJobLevel(single.position)
      if (single.workLocation) setWorkLocation(single.workLocation)
    } else if (updated.length > 1) {
      const depts = Array.from(new Set(updated.map((e) => e.department).filter(Boolean)))
      setDepartment(depts.length === 1 ? depts[0] : 'Multiple Departments')
      setJobLevel('Staff - Supervisor - Manager')
    }
  }

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'training-requests')

      const res = await uploadFile(formData)
      if (res && res.success && res.url) {
        setAttachmentUrl(res.url)
        setAttachmentName(file.name)
        toast.success(`Berkas ${file.name} berhasil diunggah`)
      } else {
        toast.error('Gagal mengunggah berkas')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah berkas')
    } finally {
      setIsUploading(false)
    }
  }

  // Objectives handlers
  const handleAddObjective = () => setObjectives([...objectives, ''])
  const handleUpdateObjective = (idx: number, val: string) => {
    const arr = [...objectives]
    arr[idx] = val
    setObjectives(arr)
  }
  const handleRemoveObjective = (idx: number) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter((_, i) => i !== idx))
    }
  }

  // Past trainings handlers
  const handleAddPastTraining = () => setPastTrainings([...pastTrainings, ''])
  const handleUpdatePastTraining = (idx: number, val: string) => {
    const arr = [...pastTrainings]
    arr[idx] = val
    setPastTrainings(arr)
  }
  const handleRemovePastTraining = (idx: number) => {
    setPastTrainings(pastTrainings.filter((_, i) => i !== idx))
  }

  // Approver change handler
  const handleUpdateApprover = (idx: number, field: keyof ApproverStepInput, val: any) => {
    const arr = [...approvers]
    arr[idx] = { ...arr[idx], [field]: val }
    setApprovers(arr)
  }

  const handleSelectApproverEmployee = (idx: number, emp: TrainingEmployeeOption) => {
    const arr = [...approvers]
    arr[idx] = {
      ...arr[idx],
      approverEmployeeId: emp.id,
      approverName: emp.name,
      approverEmail: emp.email,
      approverTitle: emp.position || arr[idx].approverTitle,
    }
    setApprovers(arr)
  }

  const handleSubmit = () => {
    if (!trainingTitle.trim()) {
      toast.error('Judul Training wajib diisi.')
      return
    }
    if (!trainingDate.trim()) {
      toast.error('Tanggal Penyelenggaraan wajib diisi.')
      return
    }
    if (!providerName.trim()) {
      toast.error('Lembaga Penyelenggara wajib diisi.')
      return
    }
    if (participantsType === 'employees' && selectedEmployees.length === 0) {
      toast.error('Pilih minimal satu karyawan peserta atau pilih opsi List Peserta Terlampir.')
      return
    }

    startTransition(async () => {
      const participantNames =
        participantsType === 'employees'
          ? selectedEmployees.map((e) => e.name).join(', ')
          : 'List Peserta Terlampir'

      const participantDetails =
        participantsType === 'employees'
          ? selectedEmployees.map((e) => ({
              employeeId: e.id,
              name: e.name,
              position: e.position,
              department: e.department,
              location: e.workLocation,
            }))
          : []

      const res = await createTrainingRequest({
        participantsType,
        participantEmployeeIds: selectedEmployees.map((e) => e.id),
        participantNames,
        participantDetails,
        jobLevel,
        department,
        workLocation,
        trainingTitle,
        trainingType,
        trainingCategory,
        trainingDate,
        trainingVenue,
        costAmount,
        costCurrency,
        costNotes,
        providerName,
        providerContact,
        objectives: objectives.filter((o) => o.trim().length > 0),
        pastTrainings: pastTrainings.filter((p) => p.trim().length > 0),
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        approvers,
        requesterSignature: requesterSignature || undefined,
      })

      if (res.success) {
        toast.success(`Pengajuan Training #${res.data?.requestNumber} berhasil dibuat!`)
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(res.error || 'Gagal menyimpan pengajuan training.')
      }
    })
  }

  const filteredEmployees = employeesList.filter((e) =>
    (e.name || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.position || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.employeeSn || '').toLowerCase().includes(employeeSearch.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#003461] hover:bg-[#00284d] text-white shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan Training</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 bg-gradient-to-r from-[#003461] to-[#004f8a] text-white border-b">
          <div className="flex items-center justify-between pr-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white">
                  Formulir ISO &bull; F.HR.STD.011.00
                </span>
                <span className="text-[10px] font-medium bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-200">
                  Rev. 00
                </span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                Pengajuan Pendaftaran Training / Seminar / Lokakarya
              </DialogTitle>
              <p className="text-xs text-white/80 mt-0.5">
                Lengkapi rincian formulir pendaftaran, peserta, dan konfigurasi persetujuan berjenjang.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* SECTION 1: DATA PESERTA */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-[#003461]">
                <Users className="w-5 h-5 text-[#003461]" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  I. Data Peserta
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border text-xs">
                <button
                  type="button"
                  onClick={() => setParticipantsType('employees')}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-medium transition-colors',
                    participantsType === 'employees'
                      ? 'bg-white text-[#003461] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Pilih Karyawan
                </button>
                <button
                  type="button"
                  onClick={() => setParticipantsType('attached_list')}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-medium transition-colors',
                    participantsType === 'attached_list'
                      ? 'bg-white text-[#003461] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  List Peserta Terlampir
                </button>
              </div>
            </div>

            {participantsType === 'employees' ? (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700">
                  Pilih Karyawan Peserta (Bisa Lebih Dari Satu) *
                </Label>

                {/* Selected Badges */}
                {selectedEmployees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border rounded-lg max-h-32 overflow-y-auto">
                    {selectedEmployees.map((emp) => (
                      <Badge
                        key={emp.id}
                        variant="secondary"
                        className="bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 px-2 py-1"
                      >
                        <User className="w-3 h-3 text-blue-600" />
                        <span className="font-semibold text-xs">{emp.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({emp.position || emp.department || 'Staff'})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEmployee(emp)}
                          className="hover:text-red-600 ml-1"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search & Dropdown Picker */}
                <div className="relative">
                  <Input
                    placeholder="Cari nama karyawan, jabatan, departemen, atau NIK..."
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value)
                      setIsEmployeeDropdownOpen(true)
                    }}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    className="text-xs bg-white"
                  />

                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                      <div className="p-1.5 flex justify-between items-center bg-slate-50 border-b text-[11px] text-slate-500">
                        <span>Pilih nama karyawan ({filteredEmployees.length} tersedia):</span>
                        <button
                          type="button"
                          onClick={() => setIsEmployeeDropdownOpen(false)}
                          className="text-xs font-semibold hover:text-slate-800"
                        >
                          Tutup
                        </button>
                      </div>

                      {isLoadingEmployees ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data karyawan...
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Tidak ditemukan karyawan yang cocok.
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 30).map((emp) => {
                          const isSelected = selectedEmployees.some((e) => e.id === emp.id)
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleToggleEmployee(emp)}
                              className={cn(
                                'w-full text-left p-2.5 hover:bg-slate-50 border-b last:border-b-0 flex items-center justify-between text-xs',
                                isSelected && 'bg-blue-50/60 font-semibold text-blue-900'
                              )}
                            >
                              <div>
                                <div className="font-semibold text-slate-800">{emp.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {emp.position || '-'} &bull; {emp.department || '-'} &bull; {emp.workLocation || '-'}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold mb-1">List Peserta Terlampir:</p>
                <p>
                  Gunakan opsi ini jika peserta training berskala massal (banyak orang). Pastikan Anda melampirkan daftar nama, jabatan, dan departemen peserta pada lampiran dokumen proposal/list peserta di bagian bawah.
                </p>
              </div>
            )}

            {/* Department, Job Level, Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Jabatan / Level</Label>
                <Input
                  value={jobLevel}
                  onChange={(e) => setJobLevel(e.target.value)}
                  placeholder="Contoh: Staff - Manager"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Departemen</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Contoh: Operation / All"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Lokasi Kerja</Label>
                <Input
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  placeholder="Contoh: Site Adaro / HO"
                  className="text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: INFORMASI TRAINING */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#003461] border-b pb-3">
              <Briefcase className="w-5 h-5 text-[#003461]" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                II. Informasi Training / Seminar / Lokakarya
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Judul Training / Seminar / Lokakarya *
                </Label>
                <Input
                  value={trainingTitle}
                  onChange={(e) => setTrainingTitle(e.target.value)}
                  placeholder="Contoh: Sertifikasi Pengawas Operasional Pertama (POP) Pertambangan"
                  className="text-xs mt-1 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Jenis Kegiatan</Label>
                  <select
                    value={trainingType}
                    onChange={(e) => setTrainingType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                  >
                    <option value="Training">Training / Pelatihan</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Lokakarya">Lokakarya / Workshop</option>
                    <option value="Sertifikasi">Sertifikasi Kompetensi</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Kategori Penyelenggaraan</Label>
                  <select
                    value={trainingCategory}
                    onChange={(e) => setTrainingCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                  >
                    <option value="External">External (Penyelenggara Luar)</option>
                    <option value="In-house">In-house (Trainer Diundang ke Kantor/Site)</option>
                    <option value="Internal">Internal HERO</option>
                    <option value="Online">Online / Webinar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Penyelenggaraan *
                  </Label>
                  <Input
                    value={trainingDate}
                    onChange={(e) => setTrainingDate(e.target.value)}
                    placeholder="Contoh: 15 - 18 November 2026"
                    className="text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tempat / Venue Pelaksanaan *
                  </Label>
                  <Input
                    value={trainingVenue}
                    onChange={(e) => setTrainingVenue(e.target.value)}
                    placeholder="Contoh: Hotel Mercure Balikpapan / Zoom Online"
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Lembaga Penyelenggara *
                  </Label>
                  <Input
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Contoh: PPSDM Geominerba / Provider Training"
                    className="text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Kontak Lembaga Penyelenggara
                  </Label>
                  <Input
                    value={providerContact}
                    onChange={(e) => setProviderContact(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890 / info@provider.co.id"
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              {/* Biaya & Beban Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-lg">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Mata Uang</Label>
                  <select
                    value={costCurrency}
                    onChange={(e) => setCostCurrency(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm mt-1"
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD (Dollar)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Nominal Biaya</Label>
                  <Input
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    placeholder="Contoh: 6.500.000 (per orang / total)"
                    className="text-xs mt-1 bg-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">
                    Catatan Beban Biaya (Beban Dept / Penawaran)
                  </Label>
                  <Input
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    placeholder="Contoh: Beban Biaya Department Operation, sesuai penawaran No. 123"
                    className="text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: TUJUAN MENGIKUTI TRAINING */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-[#003461]">
                <FileCheck className="w-5 h-5 text-[#003461]" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  III. Tujuan Mengikuti Training
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddObjective}
                className="text-xs h-7 gap-1 text-[#003461]"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Poin
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              Sebutkan poin tujuan dan output yang diharapkan dari keikutsertaan program ini:
            </p>

            <div className="space-y-2">
              {objectives.map((obj, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-600 w-5">{idx + 1}.</span>
                  <Input
                    value={obj}
                    onChange={(e) => handleUpdateObjective(idx, e.target.value)}
                    placeholder={`Tujuan poin ke-${idx + 1}...`}
                    className="text-xs flex-1"
                  />
                  {objectives.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveObjective(idx)}
                      className="text-slate-400 hover:text-red-600 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: TRAINING 1 TAHUN TERAKHIR */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-[#003461]">
                <Calendar className="w-5 h-5 text-[#003461]" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  IV. Training Yang Pernah Diikuti Selama 1 Tahun Terakhir
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPastTraining}
                className="text-xs h-7 gap-1 text-[#003461]"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Riwayat
              </Button>
            </div>

            <div className="space-y-2">
              {pastTrainings.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-600 w-5">{idx + 1}.</span>
                  <Input
                    value={pt}
                    onChange={(e) => handleUpdatePastTraining(idx, e.target.value)}
                    placeholder={`Nama training yang pernah diikuti (1 tahun terakhir)...`}
                    className="text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePastTraining(idx)}
                    className="text-slate-400 hover:text-red-600 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {pastTrainings.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Belum ada riwayat training yang ditambahkan.
                </p>
              )}
            </div>
          </div>

          {/* SECTION 5: BERKAS LAMPIRAN */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#003461] border-b pb-2">
              <Upload className="w-5 h-5 text-[#003461]" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                V. Lampiran Berkas (Proposal / Penawaran / Dokumen Peserta)
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold border transition-colors">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Mengunggah...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-blue-600" /> Pilih File Lampiran (PDF / Gambar)
                      </>
                    )}
                  </span>
                </label>

                {attachmentUrl && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-xs">{attachmentName || 'Berkas Terlampir'}</span>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-700 text-[11px] ml-1"
                    >
                      Buka
                    </a>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Format yang didukung: PDF, JPG, PNG. Berkas otomatis tersimpan di cloud proxy sistem.
              </p>
            </div>
          </div>

          {/* SECTION 6: MULTI-TIER APPROVAL FLOW (CUSTOMIZABLE) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-[#003461]">
                <ShieldCheck className="w-5 h-5 text-[#003461]" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  VI. Konfigurasi Alur Persetujuan &amp; Tanda Tangan
                </h3>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[11px]">
                {approvers.length} Tingkat Persetujuan
              </Badge>
            </div>

            <p className="text-xs text-slate-500">
              Tentukan siapa saja yang wajib mengetahui, memverifikasi, dan menyetujui formulir ini. Anda dapat mengubah nama, email, jabatan, atau memilih langsung dari User Management.
            </p>

            <div className="space-y-3">
              {approvers.map((appr, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#003461] text-white flex items-center justify-center text-[10px]">
                        {appr.stepOrder}
                      </span>
                      {appr.roleLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <Label className="text-[10px] text-slate-500">Nama Pejabat / Approver</Label>
                      <Input
                        value={appr.approverName}
                        onChange={(e) => handleUpdateApprover(idx, 'approverName', e.target.value)}
                        placeholder="Nama Lengkap"
                        className="text-xs h-8 bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Email Notifikasi</Label>
                      <Input
                        value={appr.approverEmail}
                        onChange={(e) => handleUpdateApprover(idx, 'approverEmail', e.target.value)}
                        placeholder="email@chitraparatama.co.id"
                        className="text-xs h-8 bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Jabatan / Role</Label>
                      <Input
                        value={appr.approverTitle}
                        onChange={(e) => handleUpdateApprover(idx, 'approverTitle', e.target.value)}
                        placeholder="Jabatan"
                        className="text-xs h-8 bg-white mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 7: TANDA TANGAN PEMOHON LANGSUNG */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#003461] border-b pb-2">
              <ShieldCheck className="w-5 h-5 text-[#003461]" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                VII. Tanda Tangan Pemohon (Step 1)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Goreskan tanda tangan digital Anda di bawah ini agar Step 1 (Diajukan Oleh) langsung berstatus disetujui, dan alur otomatis berlanjut ke HR Verifikasi (Step 2).
            </p>

            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 max-w-md mx-auto">
              <SignaturePad
                height={130}
                onDataUrlChange={(url) => setRequesterSignature(url)}
                autoUseProfileSignature={true}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || isUploading}
            className="bg-[#003461] hover:bg-[#00284d] text-white text-xs px-6 shadow-sm gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Kirim Pengajuan Training
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
