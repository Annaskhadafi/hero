'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileCheck,
  Plus,
  Edit,
  Trash2,
  Clock,
  Award,
  Layers,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Search,
  X,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  upsertContractReviewTestConfig,
  deleteContractReviewTestConfig,
} from '@/app/actions/contract-review-tests'

interface ConfigItem {
  id: number
  sectionId: number | null
  sectionName: string
  targetSectionIds?: number[] | null
  targetSectionNames?: string[] | null
  reviewType: string
  title: string
  description: string
  durationMinutes: number
  hasPassingGrade: boolean
  passingGrade: number
  maxRemedialAttempts: number
  isActive: boolean
  questionCount: number
  createdAt: Date
  updatedAt: Date
}

interface SectionItem {
  id: number
  name: string
}

export function ContractTestsClient({
  initialConfigs,
  sections,
}: {
  initialConfigs: ConfigItem[]
  sections: SectionItem[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [configs, setConfigs] = useState<ConfigItem[]>(initialConfigs)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([])
  const [sectionSearchQuery, setSectionSearchQuery] = useState('')
  const [isSectionPopoverOpen, setIsSectionPopoverOpen] = useState(false)
  const [reviewType, setReviewType] = useState('all')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [hasPassingGrade, setHasPassingGrade] = useState(true)
  const [passingGrade, setPassingGrade] = useState(75)
  const [maxRemedialAttempts, setMaxRemedialAttempts] = useState(1)
  const [isActive, setIsActive] = useState(true)

  const filteredSections = sections.filter((s) =>
    s.name.toLowerCase().includes(sectionSearchQuery.toLowerCase())
  )

  function openCreateDialog() {
    setEditingConfig(null)
    setTitle('')
    setDescription('')
    setSelectedSectionIds([])
    setSectionSearchQuery('')
    setIsSectionPopoverOpen(false)
    setReviewType('all')
    setDurationMinutes(30)
    setHasPassingGrade(true)
    setPassingGrade(75)
    setMaxRemedialAttempts(1)
    setIsActive(true)
    setIsDialogOpen(true)
  }

  function openEditDialog(cfg: ConfigItem) {
    setEditingConfig(cfg)
    setTitle(cfg.title)
    setDescription(cfg.description || '')
    const initialIds = Array.isArray(cfg.targetSectionIds) && cfg.targetSectionIds.length > 0
      ? cfg.targetSectionIds
      : cfg.sectionId ? [cfg.sectionId] : []
    setSelectedSectionIds(initialIds)
    setSectionSearchQuery('')
    setIsSectionPopoverOpen(false)
    setReviewType(cfg.reviewType)
    setDurationMinutes(cfg.durationMinutes)
    setHasPassingGrade(cfg.hasPassingGrade)
    setPassingGrade(cfg.passingGrade)
    setMaxRemedialAttempts(cfg.maxRemedialAttempts)
    setIsActive(cfg.isActive)
    setIsDialogOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Judul ujian wajib diisi.')
      return
    }

    startTransition(async () => {
      try {
        const targetSectionNames = selectedSectionIds
          .map((id) => sections.find((s) => s.id === id)?.name || '')
          .filter(Boolean)

        await upsertContractReviewTestConfig({
          id: editingConfig?.id,
          targetSectionIds: selectedSectionIds,
          targetSectionNames,
          reviewType,
          title: title.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes) || 30,
          hasPassingGrade,
          passingGrade: hasPassingGrade ? Number(passingGrade) || 75 : 0,
          maxRemedialAttempts: Number(maxRemedialAttempts) || 0,
          isActive,
        })

        toast.success(editingConfig ? 'Konfigurasi berhasil diperbarui' : 'Konfigurasi ujian baru berhasil dibuat')
        setIsDialogOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menyimpan konfigurasi.')
      }
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Apakah Anda yakin ingin menghapus konfigurasi ujian ini beserta seluruh bank soalnya?')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteContractReviewTestConfig(id)
        toast.success('Konfigurasi berhasil dihapus.')
        setConfigs((prev) => prev.filter((c) => c.id !== id))
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus konfigurasi.')
      }
    })
  }

  const activeCount = configs.filter((c) => c.isActive).length
  const totalQuestions = configs.reduce((acc, c) => acc + (Number(c.questionCount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <FileCheck className="size-4" />
            <span>Training Center & Assessment</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Test Online Contract Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola soal ujian evaluasi kompetensi, mapping section, syarat passing grade, dan kuota remedial karyawan kontrak.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-sm">
          <Plus className="mr-2 size-4" /> Buat Konfigurasi Ujian
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Modul Ujian
            </CardTitle>
            <Layers className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Konfigurasi materi terdaftar</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Modul Ujian Aktif
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Siap ditugaskan otomatis</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Soal Ujian
            </CardTitle>
            <BookOpen className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground mt-1">Pertanyaan di bank soal</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Section Tercover
            </CardTitle>
            <Award className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {new Set(configs.map((c) => c.sectionName || 'Semua')).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Departemen / Bidang teknis</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="font-semibold text-base text-foreground">Daftar Modul Ujian per Section</h3>
            <p className="text-xs text-muted-foreground">
              Karyawan dengan section yang cocok akan otomatis menerima undangan tes ini saat reminder kontrak dikirim.
            </p>
          </div>
        </div>

        {configs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <HelpCircle className="size-10 text-muted-foreground/50" />
            <div className="font-medium text-foreground">Belum ada modul ujian online</div>
            <p className="text-xs max-w-sm">
              Klik tombol &quot;Buat Konfigurasi Ujian&quot; di atas untuk mendaftarkan materi ujian kompetensi pertama.
            </p>
            <Button onClick={openCreateDialog} variant="outline" size="sm" className="mt-2">
              <Plus className="mr-1.5 size-4" /> Buat Sekarang
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="px-4 py-3">Modul & Judul Ujian</th>
                  <th className="px-4 py-3">Target Section</th>
                  <th className="px-4 py-3">Tipe Review</th>
                  <th className="px-4 py-3 text-center">Durasi</th>
                  <th className="px-4 py-3 text-center">Passing Grade</th>
                  <th className="px-4 py-3 text-center">Remedial</th>
                  <th className="px-4 py-3 text-center">Bank Soal</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {configs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{cfg.title}</span>
                        {cfg.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">{cfg.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cfg.targetSectionNames && cfg.targetSectionNames.length > 1 ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit font-medium text-xs bg-sky-50 text-sky-700 border-sky-200 gap-1">
                            <Layers className="size-3" />
                            <span>{cfg.targetSectionNames.length} Section</span>
                          </Badge>
                          <span
                            className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]"
                            title={cfg.targetSectionNames.join(', ')}
                          >
                            {cfg.targetSectionNames.slice(0, 2).join(', ')}
                            {cfg.targetSectionNames.length > 2 && ` +${cfg.targetSectionNames.length - 2} lainnya`}
                          </span>
                        </div>
                      ) : cfg.targetSectionNames && cfg.targetSectionNames.length === 1 ? (
                        <Badge variant="outline" className="font-normal text-xs bg-muted/40">
                          {cfg.targetSectionNames[0]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-xs bg-muted/40">
                          {cfg.sectionName || 'Semua Section (General)'}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground capitalize">
                        {cfg.reviewType === 'probation'
                          ? 'Probation Saja'
                          : cfg.reviewType === 'contract'
                          ? 'Perpanjangan Kontrak'
                          : 'Semua Tipe Review'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center text-xs font-mono text-muted-foreground gap-1">
                        <Clock className="size-3" /> {cfg.durationMinutes}m
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cfg.hasPassingGrade ? (
                        <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50 border-sky-200 text-xs font-mono">
                          {cfg.passingGrade}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          Non-Passing (Asesmen)
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {cfg.maxRemedialAttempts > 0 ? `${cfg.maxRemedialAttempts}x Kesempatan` : 'Tanpa Remidi'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/dashboard/chitralearning-lms/contract-tests/${cfg.id}`}>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors gap-1 text-xs"
                        >
                          <BookOpen className="size-3" />
                          <span>{cfg.questionCount} Soal</span>
                        </Badge>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cfg.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-xs">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          Nonaktif
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/dashboard/chitralearning-lms/contract-tests/${cfg.id}`}>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                            Kelola Soal <ArrowRight className="ml-1 size-3" />
                          </Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(cfg)}
                          title="Edit Pengaturan"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(cfg.id)}
                          title="Hapus Modul"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit Konfigurasi Ujian' : 'Buat Konfigurasi Ujian Baru'}
              </DialogTitle>
              <DialogDescription>
                Tentukan target section, passing grade, dan durasi pengerjaan untuk evaluasi Contract Review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">
                  Judul Ujian <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Ujian Kompetensi Teknis Retread Level 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Deskripsi / Petunjuk Ujian
                </Label>
                <Textarea
                  id="description"
                  placeholder="Petunjuk singkat mengenai ruang lingkup soal dan materi yang diujikan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Target Section (Bisa Pilih Beberapa Section)
                  </Label>
                  {selectedSectionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectionIds([])}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline"
                    >
                      Reset (Semua Section)
                    </button>
                  )}
                </div>

                <Popover open={isSectionPopoverOpen} onOpenChange={setIsSectionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal text-left h-auto min-h-10 py-2 px-3 text-xs bg-background"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedSectionIds.length === 0
                            ? 'Semua Section (General)'
                            : selectedSectionIds.length === 1
                            ? sections.find((s) => s.id === selectedSectionIds[0])?.name || '1 Section Terpilih'
                            : `${selectedSectionIds.length} Section Terpilih`}
                        </span>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0 text-[11px] font-medium">
                        {selectedSectionIds.length > 0 ? `${selectedSectionIds.length} dipilih` : 'Semua'}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-2" align="start">
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama section..."
                          value={sectionSearchQuery}
                          onChange={(e) => setSectionSearchQuery(e.target.value)}
                          className="pl-8 text-xs h-8"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] px-1 py-1 border-b border-border/60">
                        <span className="text-muted-foreground">
                          {filteredSections.length} section tersedia
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allVisibleIds = filteredSections.map((s) => s.id)
                              const combined = Array.from(new Set([...selectedSectionIds, ...allVisibleIds]))
                              setSelectedSectionIds(combined)
                            }}
                            className="text-primary hover:underline font-medium"
                          >
                            Pilih Semua
                          </button>
                          <span className="text-muted-foreground">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSectionIds([])}
                            className="text-rose-600 hover:underline font-medium"
                          >
                            Kosongkan
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        <div
                          onClick={() => setSelectedSectionIds([])}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-muted/60',
                            selectedSectionIds.length === 0 && 'bg-primary/10 text-primary font-medium'
                          )}
                        >
                          <Checkbox
                            checked={selectedSectionIds.length === 0}
                            onCheckedChange={() => setSelectedSectionIds([])}
                          />
                          <span>Semua Section (General)</span>
                        </div>

                        {filteredSections.map((s) => {
                          const isChecked = selectedSectionIds.includes(s.id)
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedSectionIds((prev) => prev.filter((id) => id !== s.id))
                                } else {
                                  setSelectedSectionIds((prev) => [...prev, s.id])
                                }
                              }}
                              className={cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-muted/60',
                                isChecked && 'bg-primary/10 text-primary font-medium'
                              )}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSectionIds((prev) => [...prev, s.id])
                                  } else {
                                    setSelectedSectionIds((prev) => prev.filter((id) => id !== s.id))
                                  }
                                }}
                              />
                              <span className="truncate">{s.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Badges of selected sections */}
                {selectedSectionIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                    {selectedSectionIds.map((id) => {
                      const sec = sections.find((s) => s.id === id)
                      if (!sec) return null
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-[11px] gap-1 pr-1 py-0.5 bg-muted/60 text-foreground font-normal"
                        >
                          <span className="truncate max-w-[150px]">{sec.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSectionIds((prev) => prev.filter((item) => item !== id))
                            }}
                            className="text-muted-foreground hover:text-rose-600 rounded-full p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jenis Review</Label>
                <Select value={reviewType} onValueChange={setReviewType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis Review</SelectItem>
                    <SelectItem value="probation">Probationary Review</SelectItem>
                    <SelectItem value="contract">Perpanjangan Kontrak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="duration" className="text-xs font-semibold">
                    Durasi Pengerjaan (Menit)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="remedial" className="text-xs font-semibold">
                    Batas Kuota Remedial
                  </Label>
                  <Input
                    id="remedial"
                    type="number"
                    min={0}
                    max={5}
                    value={maxRemedialAttempts}
                    onChange={(e) => setMaxRemedialAttempts(Number(e.target.value))}
                    placeholder="0 = Tanpa remidi"
                  />
                </div>
              </div>

              {/* Passing Grade Settings */}
              <div className="rounded-lg border border-border/80 p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold cursor-pointer">
                      Wajibkan Passing Grade (Syarat Kelulusan)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Jika aktif, PJO terkunci sampai karyawan mencapai nilai minimum. Jika nonaktif, tes hanya mengukur skor asesmen.
                    </p>
                  </div>
                  <Switch
                    checked={hasPassingGrade}
                    onCheckedChange={setHasPassingGrade}
                  />
                </div>

                {hasPassingGrade && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <Label htmlFor="passingGrade" className="text-xs font-medium">
                      Nilai Minimum Kelulusan (%)
                    </Label>
                    <Input
                      id="passingGrade"
                      type="number"
                      min={10}
                      max={100}
                      value={passingGrade}
                      onChange={(e) => setPassingGrade(Number(e.target.value))}
                      className="w-24 text-center font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/80 p-3">
                <div>
                  <Label className="text-xs font-semibold cursor-pointer">Status Modul Aktif</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Modul aktif akan otomatis ditugaskan ke karyawan pada section ini.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
