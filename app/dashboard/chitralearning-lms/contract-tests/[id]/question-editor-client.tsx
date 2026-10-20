'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Layers,
  Upload,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  saveContractReviewTestQuestion,
  deleteContractReviewTestQuestion,
} from '@/app/actions/contract-review-tests'

interface QuestionItem {
  id: number
  configId: number
  questionText: string
  questionImageUrl: string
  optionA: string
  optionAImageUrl: string
  optionB: string
  optionBImageUrl: string
  optionC: string
  optionCImageUrl: string
  optionD: string
  optionDImageUrl: string
  correctOption: string
  explanation: string
  points: number
  sortOrder: number
}

interface ConfigDetail {
  id: number
  sectionId: number | null
  sectionName: string
  reviewType: string
  title: string
  description: string
  durationMinutes: number
  hasPassingGrade: boolean
  passingGrade: number
  maxRemedialAttempts: number
  isActive: boolean
  questions: QuestionItem[]
}

export function QuestionEditorClient({ config }: { config: ConfigDetail }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [questions, setQuestions] = useState<QuestionItem[]>(config.questions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Form State
  const [questionText, setQuestionText] = useState('')
  const [questionImageUrl, setQuestionImageUrl] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState('A')
  const [explanation, setExplanation] = useState('')
  const [points, setPoints] = useState(1)
  const [sortOrder, setSortOrder] = useState(1)

  function openCreateDialog() {
    setEditingQuestion(null)
    setQuestionText('')
    setQuestionImageUrl('')
    setOptionA('')
    setOptionB('')
    setOptionC('')
    setOptionD('')
    setCorrectOption('A')
    setExplanation('')
    setPoints(1)
    setSortOrder(questions.length + 1)
    setIsDialogOpen(true)
  }

  function openEditDialog(q: QuestionItem) {
    setEditingQuestion(q)
    setQuestionText(q.questionText)
    setQuestionImageUrl(q.questionImageUrl || '')
    setOptionA(q.optionA)
    setOptionB(q.optionB)
    setOptionC(q.optionC || '')
    setOptionD(q.optionD || '')
    setCorrectOption(q.correctOption || 'A')
    setExplanation(q.explanation || '')
    setPoints(q.points || 1)
    setSortOrder(q.sortOrder || 1)
    setIsDialogOpen(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('prefix', 'chitralearning')
      const result = await uploadFile(formData)
      if (result.success && result.url) {
        setQuestionImageUrl(result.url)
        toast.success('Gambar soal berhasil diunggah.')
      } else {
        toast.error(result.error || 'Gagal mengunggah gambar.')
      }
    } catch {
      toast.error('Terjadi kesalahan saat unggah gambar.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!questionText.trim()) {
      toast.error('Teks pertanyaan wajib diisi.')
      return
    }
    if (!optionA.trim() || !optionB.trim()) {
      toast.error('Pilihan A dan B wajib diisi.')
      return
    }

    startTransition(async () => {
      try {
        const saved = await saveContractReviewTestQuestion({
          id: editingQuestion?.id,
          configId: config.id,
          questionText: questionText.trim(),
          questionImageUrl,
          optionA: optionA.trim(),
          optionB: optionB.trim(),
          optionC: optionC.trim(),
          optionD: optionD.trim(),
          correctOption,
          explanation: explanation.trim(),
          points: Number(points) || 1,
          sortOrder: Number(sortOrder) || 1,
        })

        toast.success(editingQuestion ? 'Soal berhasil diperbarui.' : 'Soal baru berhasil ditambahkan.')
        setIsDialogOpen(false)

        if (editingQuestion) {
          setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? (saved as QuestionItem) : q)))
        } else {
          setQuestions((prev) => [...prev, saved as QuestionItem])
        }
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menyimpan soal.')
      }
    })
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus soal ini dari bank soal ujian?')) return

    startTransition(async () => {
      try {
        await deleteContractReviewTestQuestion(id, config.id)
        toast.success('Soal berhasil dihapus.')
        setQuestions((prev) => prev.filter((q) => q.id !== id))
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus soal.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          href="/dashboard/chitralearning-lms/contract-tests"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Kembali ke Daftar Modul Ujian
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="outline" className="font-mono text-xs">
                {config.sectionName || 'Semua Section'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {config.reviewType === 'probation'
                  ? 'Probation Saja'
                  : config.reviewType === 'contract'
                  ? 'Perpanjangan Kontrak'
                  : 'Semua Tipe'}
              </Badge>
              {config.hasPassingGrade ? (
                <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs">
                  Pass Grade: {config.passingGrade}%
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Asesmen (Non-Passing)
                </Badge>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-2">
                <Clock className="size-3" /> {config.durationMinutes} Menit
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h1>
            {config.description && <p className="text-sm text-muted-foreground mt-1">{config.description}</p>}
          </div>
          <Button onClick={openCreateDialog} className="shrink-0 shadow-sm">
            <Plus className="mr-1.5 size-4" /> Tambah Soal Ujian
          </Button>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daftar Soal Pilihan Ganda ({questions.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Total Poin: {questions.reduce((acc, q) => acc + (q.points || 1), 0)}
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center gap-3">
            <HelpCircle className="size-10 text-muted-foreground/40" />
            <div className="font-medium text-foreground">Bank Soal Masih Kosong</div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Tambahkan pertanyaan pilihan ganda beserta kunci jawaban untuk modul ujian evaluasi kontrak ini.
            </p>
            <Button onClick={openCreateDialog} variant="outline" size="sm" className="mt-2">
              <Plus className="mr-1.5 size-4" /> Tambah Soal Pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="shadow-none border-border/80 overflow-hidden">
                <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">Soal #{idx + 1}</span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      Bobot: {q.points || 1} poin
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(q)}
                      title="Edit Soal"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(q.id)}
                      title="Hapus Soal"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground whitespace-pre-line">{q.questionText}</p>
                    {q.questionImageUrl && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-border/80 max-w-md bg-muted/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveUploadUrl(q.questionImageUrl)}
                          alt={`Gambar Soal #${idx + 1}`}
                          className="w-full object-cover max-h-60"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { key: 'A', text: q.optionA },
                      { key: 'B', text: q.optionB },
                      { key: 'C', text: q.optionC },
                      { key: 'D', text: q.optionD },
                    ]
                      .filter((opt) => Boolean(opt.text?.trim()))
                      .map((opt) => {
                        const isCorrect = q.correctOption.toUpperCase() === opt.key
                        return (
                          <div
                            key={opt.key}
                            className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                              isCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : 'bg-muted/30 border-border/60 text-muted-foreground'
                            }`}
                          >
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="flex-1 break-words">{opt.text}</span>
                            {isCorrect && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
                          </div>
                        )
                      })}
                  </div>

                  {q.explanation && (
                    <div className="pt-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/60">
                      <span className="font-semibold text-foreground">Pembahasan: </span>
                      {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Soal Ujian' : 'Tambah Soal Ujian Baru'}</DialogTitle>
              <DialogDescription>
                Isi teks pertanyaan, opsi jawaban A-D, dan tentukan kunci jawaban yang benar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="questionText" className="text-xs font-semibold">
                  Teks Pertanyaan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="questionText"
                  placeholder="Tuliskan butir soal atau kasus evaluasi di sini..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {/* Upload Gambar Soal (Opsional) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Gambar Pendukung Soal (Opsional)</Label>
                {questionImageUrl ? (
                  <div className="relative inline-block border rounded-lg overflow-hidden bg-muted/40 p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveUploadUrl(questionImageUrl)}
                      alt="Preview Gambar Soal"
                      className="max-h-36 object-contain rounded"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 size-6 rounded-full shadow"
                      onClick={() => setQuestionImageUrl('')}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border/80 bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors">
                      {isUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                      <span>Unggah Gambar (JPG/PNG maks 5MB)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Options A - D */}
              <div className="space-y-3 pt-2 border-t">
                <div className="text-xs font-semibold text-foreground">Pilihan Jawaban (A - D)</div>

                <div className="grid gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      A
                    </span>
                    <Input
                      placeholder="Pilihan jawaban A"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      B
                    </span>
                    <Input
                      placeholder="Pilihan jawaban B"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      C
                    </span>
                    <Input
                      placeholder="Pilihan jawaban C (opsional)"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      D
                    </span>
                    <Input
                      placeholder="Pilihan jawaban D (opsional)"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Correct Option & Points */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Kunci Jawaban Benar <span className="text-destructive">*</span>
                  </Label>
                  <Select value={correctOption} onValueChange={setCorrectOption}>
                    <SelectTrigger className="w-full font-bold">
                      <SelectValue placeholder="Pilih Kunci" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Pilihan A</SelectItem>
                      <SelectItem value="B">Pilihan B</SelectItem>
                      {optionC.trim() && <SelectItem value="C">Pilihan C</SelectItem>}
                      {optionD.trim() && <SelectItem value="D">Pilihan D</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="points" className="text-xs font-semibold">
                    Bobot Poin
                  </Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    max={100}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="explanation" className="text-xs font-semibold">
                  Pembahasan / Alasan Kunci (Opsional)
                </Label>
                <Textarea
                  id="explanation"
                  placeholder="Penjelasan ringkas mengapa pilihan tersebut benar..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending || isUploading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending ? 'Menyimpan...' : 'Simpan Soal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
