'use client'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  Users,
  Briefcase,
  PenTool,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SignaturePad } from '@/components/signature-pad'
import { createRfrRequest } from '@/app/actions/rfr'

type MobileRfrCreateFormClientProps = {
  defaultRequestorName: string
  defaultSectionDepartment: string
  defaultEmployeeId?: number | null
}

export function MobileRfrCreateFormClient({
  defaultRequestorName,
  defaultSectionDepartment,
  defaultEmployeeId,
}: MobileRfrCreateFormClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form Fields
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10))
  const [joinDateEstimation, setJoinDateEstimation] = useState('')
  const [requestorName, setRequestorName] = useState(defaultRequestorName)
  const [sectionDepartment, setSectionDepartment] = useState(defaultSectionDepartment)
  const [receivedByHr, setReceivedByHr] = useState('')

  const [positionTitle, setPositionTitle] = useState('')
  const [numberOfPersons, setNumberOfPersons] = useState(1)
  const [briefJobDescription, setBriefJobDescription] = useState('')
  const [level, setLevel] = useState('non_staff')
  const [reasonForRequest, setReasonForRequest] = useState('new_headcount')
  const [mppStatus, setMppStatus] = useState('budgeted')
  const [reasonsIfNonBudgeted, setReasonsIfNonBudgeted] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('contract')
  const [contractDurationMonths, setContractDurationMonths] = useState(6)

  // Basic Requirements
  const [sexPreference, setSexPreference] = useState('any')
  const [agePreference, setAgePreference] = useState('any')
  const [educationDegree, setEducationDegree] = useState('smk')
  const [yearsOfExperience, setYearsOfExperience] = useState('any')

  // Functional Competencies
  const [functionalCompetencies, setFunctionalCompetencies] = useState<
    Array<{ id: string; skillName: string; level: 'basic' | 'intermediate' | 'advance'; remarks: string }>
  >([
    { id: '1', skillName: '', level: 'basic', remarks: '' },
  ])

  // Submitter Signature
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)

  function addCompetency() {
    setFunctionalCompetencies([
      ...functionalCompetencies,
      { id: Date.now().toString(), skillName: '', level: 'basic', remarks: '' },
    ])
  }

  function removeCompetency(id: string) {
    if (functionalCompetencies.length === 1) return
    setFunctionalCompetencies(functionalCompetencies.filter((c) => c.id !== id))
  }

  function updateCompetency(id: string, field: string, value: any) {
    setFunctionalCompetencies(
      functionalCompetencies.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!positionTitle.trim()) {
      toast.error('Mohon isi Posisi Jabatan yang dibutuhkan.')
      return
    }

    if (!joinDateEstimation) {
      toast.error('Mohon tentukan Estimasi Tanggal Masuk (Join Date).')
      return
    }

    if (!liveSignatureUrl) {
      toast.error('Mohon bubuhkan tanda tangan pemohon sebelum mengirim pengajuan.')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          requestDate,
          joinDateEstimation,
          requestorName,
          requestorEmployeeId: defaultEmployeeId || null,
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
          attachmentMpp: true,
          attachmentJd: true,
          sexPreference,
          agePreference,
          educationDegree,
          yearsOfExperience,
          functionalCompetencies: functionalCompetencies.filter((c) => c.skillName.trim() !== ''),
          requestorSignatureDataUrl: liveSignatureUrl,
        }

        const res = await createRfrRequest(payload)
        if (res && res.success) {
          toast.success('Pengajuan RFR berhasil disubmit!')
          router.push('/mobile/rfr')
        } else {
          toast.error(res?.error || 'Gagal menyimpan pengajuan RFR.')
        }
      } catch (err: any) {
        toast.error(err.message || 'Terjadi kesalahan sistem saat submit RFR.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-3.5 rounded-2xl shadow-2xs">
        <Link
          prefetch={false}
          href="/mobile/rfr"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 px-2.5 rounded-xl transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali</span>
        </Link>
        <h1 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Form Pengajuan RFR
        </h1>
        <div className="w-8" />
      </div>

      {/* 2. Section A: Requestor Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-black text-sky-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-sky-600" />
          <span>A. Informasi Pemohon</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-700">Nama Pemohon</Label>
            <Input
              value={requestorName}
              onChange={(e) => setRequestorName(e.target.value)}
              placeholder="Nama lengkap pemohon"
              className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-700">Seksi / Departemen</Label>
            <Input
              value={sectionDepartment}
              onChange={(e) => setSectionDepartment(e.target.value)}
              placeholder="Contoh: Service / Operation"
              className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Tgl Pengajuan</Label>
              <Input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Estimasi Masuk *</Label>
              <Input
                type="date"
                value={joinDateEstimation}
                onChange={(e) => setJoinDateEstimation(e.target.value)}
                className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section B: Position Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-black text-sky-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-sky-600" />
          <span>B. Informasi Posisi Kebutuhan</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-700">Posisi Jabatan *</Label>
            <Input
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="Contoh: Tire Mechanic, Finance Staff"
              className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Jumlah Orang</Label>
              <Input
                type="number"
                min={1}
                value={numberOfPersons}
                onChange={(e) => setNumberOfPersons(parseInt(e.target.value, 10) || 1)}
                className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Level Jabatan</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="non_staff">Non Staff</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="coordinator_supervisor">Supervisor / Coord</SelectItem>
                  <SelectItem value="managerial">Managerial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-700">Uraian Singkat Pekerjaan</Label>
            <Textarea
              value={briefJobDescription}
              onChange={(e) => setBriefJobDescription(e.target.value)}
              rows={3}
              placeholder="Jelaskan ringkasan tugas dan tanggung jawab..."
              className="mt-1 text-xs rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Alasan Kebutuhan</Label>
              <Select value={reasonForRequest} onValueChange={setReasonForRequest}>
                <SelectTrigger className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="new_headcount">New Headcount</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] font-bold text-slate-700">Status MPP</Label>
              <Select value={mppStatus} onValueChange={setMppStatus}>
                <SelectTrigger className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="budgeted">Budgeted</SelectItem>
                  <SelectItem value="non_budgeted">Non Budgeted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section C: Basic Requirements */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-black text-sky-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          C. Kualifikasi Dasar
        </h2>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <Label className="text-[11px] font-bold text-slate-700">Jenis Kelamin</Label>
            <Select value={sexPreference} onValueChange={setSexPreference}>
              <SelectTrigger className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="any">Semua (Pria / Wanita)</SelectItem>
                <SelectItem value="male">Pria</SelectItem>
                <SelectItem value="female">Wanita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] font-bold text-slate-700">Pendidikan</Label>
            <Select value={educationDegree} onValueChange={setEducationDegree}>
              <SelectTrigger className="h-9 mt-1 text-xs rounded-xl bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="smk">SMK / SMA</SelectItem>
                <SelectItem value="d3">Diploma 3 (D3)</SelectItem>
                <SelectItem value="s1">Sarjana (S1)</SelectItem>
                <SelectItem value="s2">Magister (S2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 5. Section D: Functional Competencies */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-black text-sky-900 uppercase tracking-wider">
            D. Kompetensi Fungsional
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCompetency}
            className="h-7 text-[11px] font-bold px-2 rounded-lg border-sky-300 text-sky-800 gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah</span>
          </Button>
        </div>

        <div className="space-y-2.5">
          {functionalCompetencies.map((comp, idx) => (
            <div key={comp.id} className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/60 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-700 text-[11px]">Skill #{idx + 1}</span>
                {functionalCompetencies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCompetency(comp.id)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Input
                value={comp.skillName}
                onChange={(e) => updateCompetency(comp.id, 'skillName', e.target.value)}
                placeholder="Nama kompetensi/keahlian..."
                className="h-8 text-xs bg-white rounded-lg"
              />
              <div className="flex gap-2">
                <Select
                  value={comp.level}
                  onValueChange={(val: any) => updateCompetency(comp.id, 'level', val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white rounded-lg w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={comp.remarks}
                  onChange={(e) => updateCompetency(comp.id, 'remarks', e.target.value)}
                  placeholder="Keterangan..."
                  className="h-8 text-xs bg-white rounded-lg flex-1"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Section E: Signature Pad */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-xs space-y-2">
        <h2 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
          <PenTool className="h-4 w-4 text-sky-700" />
          <span>Tanda Tangan Pemohon *</span>
        </h2>
        <p className="text-[11px] text-slate-500">
          Goreskan tanda tangan digital Anda pada kanvas di bawah ini:
        </p>

        <div className="rounded-xl border border-sky-300 bg-white p-2 shadow-2xs">
          <SignaturePad
            onDataUrlChange={setLiveSignatureUrl}
            height={160}
          />
        </div>
      </div>

      {/* 7. Submit Action Button */}
      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses Pengajuan...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Kirim Permohonan RFR</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
