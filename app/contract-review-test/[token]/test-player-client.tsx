'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
  Award,
  Layers,
  FileCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  startContractReviewTestAttempt,
  submitContractReviewTestAttempt,
  requestRemedialAttempt,
} from '@/app/actions/contract-review-tests'

interface AttemptData {
  attempt: {
    id: number
    attemptNumber: number
    status: string
    score: number | null
    totalQuestions: number
    correctAnswers: number
    startedAt: Date | null
    completedAt: Date | null
    answersPayload: Record<string, string> | null
  }
  config: {
    id: number
    title: string
    description: string
    durationMinutes: number
    hasPassingGrade: boolean
    passingGrade: number
    maxRemedialAttempts: number
    sectionName: string
  }
  employee: {
    id: number
    name: string
    employeeSn: string | null
    sectionName: string | null
  } | null
  questions: Array<{
    id: number
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
    points: number
    sortOrder: number
  }>
}

export function TestPlayerClient({
  initialData,
  accessToken,
}: {
  initialData: AttemptData
  accessToken: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { config, employee, questions } = initialData
  const [attempt, setAttempt] = useState(initialData.attempt)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(
    (attempt.answersPayload as Record<string, string>) || {}
  )
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false)

  // Timer logic
  const durationSeconds = (config.durationMinutes || 30) * 60
  const [remainingSeconds, setRemainingSeconds] = useState<number>(durationSeconds)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (attempt.status === 'in_progress' && attempt.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      const left = Math.max(0, durationSeconds - elapsed)
      setRemainingSeconds(left)

      if (left <= 0) {
        handleAutoSubmit()
        return
      }

      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [attempt.status, attempt.startedAt])

  function handleStart() {
    startTransition(async () => {
      try {
        const updated = await startContractReviewTestAttempt(accessToken)
        setAttempt((prev) => ({
          ...prev,
          status: 'in_progress',
          startedAt: updated.startedAt,
        }))
        toast.success('Ujian telah dimulai. Selamat mengerjakan!')
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memulai ujian.')
      }
    })
  }

  function handleSelectOption(questionId: number, optionKey: string) {
    if (['passed', 'failed', 'completed'].includes(attempt.status)) return
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionKey,
    }))
  }

  function handleAutoSubmit() {
    toast.warning('Waktu pengerjaan telah habis. Mengirim jawaban Anda secara otomatis...')
    performSubmission()
  }

  function performSubmission() {
    setIsConfirmSubmitOpen(false)
    startTransition(async () => {
      try {
        const result = await submitContractReviewTestAttempt(accessToken, answers)
        if (result.success) {
          setAttempt((prev) => ({
            ...prev,
            status: result.status,
            score: result.score,
            totalQuestions: result.totalQuestions ?? prev.totalQuestions,
            correctAnswers: result.correctAnswers ?? prev.correctAnswers,
            completedAt: new Date(),
          }))
          toast.success('Jawaban Anda berhasil dikumpulkan!')
        }
      } catch (e: any) {
        toast.error(e?.message || 'Gagal mengumpulkan jawaban.')
      }
    })
  }

  function handleRemedial() {
    startTransition(async () => {
      try {
        const newAttempt = await requestRemedialAttempt(accessToken)
        toast.success(`Sesi remedial ke-${newAttempt.attemptNumber} berhasil dibuat!`)
        router.push(`/contract-review-test/${newAttempt.accessToken}`)
      } catch (e: any) {
        toast.error(e?.message || 'Gagal memulai remedial.')
      }
    })
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentQ = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const isFinished = ['passed', 'failed', 'completed'].includes(attempt.status)

  // ─── 1. RESULT SCREEN ────────────────────────────────────────────────
  if (isFinished) {
    const isPassed = attempt.status === 'passed'
    const isFailed = attempt.status === 'failed'
    const scoreVal = attempt.score ?? 0
    const canRemediate =
      isFailed &&
      config.maxRemedialAttempts > 0 &&
      attempt.attemptNumber <= config.maxRemedialAttempts

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-border/80 text-center overflow-hidden">
          <div
            className={`p-6 text-white ${
              isPassed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                : isFailed
                ? 'bg-gradient-to-r from-rose-600 to-red-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
          >
            <div className="flex justify-center mb-3">
              {isPassed ? (
                <div className="size-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <CheckCircle2 className="size-10 text-white" />
                </div>
              ) : isFailed ? (
                <div className="size-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <XCircle className="size-10 text-white" />
                </div>
              ) : (
                <div className="size-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Award className="size-10 text-white" />
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold">
              {isPassed
                ? 'Selamat! Anda Dinyatakan Lulus'
                : isFailed
                ? 'Belum Memenuhi Passing Grade'
                : 'Ujian Evaluasi Telah Selesai'}
            </h1>
            <p className="text-xs text-white/80 mt-1">{config.title}</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Score Ring / Block */}
            <div className="p-6 rounded-2xl bg-muted/30 border border-border/70 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nilai Akhir Ujian
              </span>
              <div className="text-5xl font-black font-mono tracking-tight my-2 text-foreground">
                {scoreVal}%
              </div>
              <div className="flex items-center gap-2 mt-1">
                {config.hasPassingGrade ? (
                  <Badge variant="outline" className="text-xs font-mono">
                    Passing Grade: {config.passingGrade}%
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Evaluasi Kompetensi (Non-Passing)
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Percobaan ke-{attempt.attemptNumber}
                </Badge>
              </div>
            </div>

            {/* Candidate Details */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs bg-muted/20 p-3 rounded-lg border border-border/60">
              <div>
                <span className="text-muted-foreground">Nama Karyawan:</span>
                <p className="font-semibold text-foreground">{employee?.name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">SN Karyawan:</span>
                <p className="font-semibold text-foreground">{employee?.employeeSn || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Section:</span>
                <p className="font-semibold text-foreground">{employee?.sectionName || config.sectionName || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Jawaban Benar:</span>
                <p className="font-semibold text-foreground">
                  {attempt.correctAnswers} / {attempt.totalQuestions || questions.length} Soal
                </p>
              </div>
            </div>

            {/* Explanation / Next Step Alert */}
            {isPassed && (
              <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg text-left">
                Nilai dan status kelulusan Anda telah otomatis tercatat pada dokumen <strong>Contract Review</strong>. PJO/Leader Anda kini dapat melanjutkan proses persetujuan dan rekomendasi perpanjangan kontrak.
              </div>
            )}

            {isFailed && !canRemediate && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-lg text-left">
                Batas kesempatan remedial Anda telah selesai. Hasil akhir evaluasi ini telah dikirim ke formulir Contract Review dan akan dievaluasi lebih lanjut oleh PJO/Leader serta Section Head.
              </div>
            )}

            {isFailed && canRemediate && (
              <div className="space-y-3">
                <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg text-left">
                  Anda belum mencapai nilai kelulusan ({config.passingGrade}%). Tersedia kesempatan remedial untuk mengulang pengerjaan soal ujian ini.
                </div>
                <Button
                  onClick={handleRemedial}
                  disabled={isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  <RotateCcw className="mr-2 size-4" />
                  {isPending ? 'Mempersiapkan Soal Remedial...' : 'Ulangi Ujian (Remedial)'}
                </Button>
              </div>
            )}

            {!config.hasPassingGrade && (
              <div className="p-3 text-xs bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300 rounded-lg text-left">
                Terima kasih telah menyelesaikan ujian online. Skor kompetensi Anda otomatis tercantum pada lampiran evaluasi Contract Review untuk pertimbangan atasan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── 2. PRE-TEST SCREEN ──────────────────────────────────────────────
  if (attempt.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-border/80 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-border/70 pb-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <FileCheck className="size-4" />
              <span>PT Chitra Paratama • Training Center</span>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
              {config.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ujian Evaluasi Kompetensi Teknis sebagai Syarat Contract Review
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Identity Card */}
            <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Kandidat:</span>
                <p className="font-semibold text-foreground">{employee?.name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">SN:</span>
                <p className="font-semibold text-foreground">{employee?.employeeSn || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Section:</span>
                <p className="font-semibold text-foreground">{employee?.sectionName || config.sectionName || 'General'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Percobaan:</span>
                <p className="font-semibold text-foreground">Ke-{attempt.attemptNumber}</p>
              </div>
            </div>

            {/* Test Rules List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Petunjuk & Ketentuan Ujian:
              </h4>
              <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                <li>
                  Jumlah soal: <strong>{questions.length} butir pertanyaan</strong> pilihan ganda.
                </li>
                <li>
                  Waktu pengerjaan: <strong>{config.durationMinutes} menit</strong> sejak tombol Mulai diklik.
                </li>
                <li>
                  {config.hasPassingGrade ? (
                    <span>
                      Passing Grade kelulusan: <strong>{config.passingGrade}%</strong>.
                    </span>
                  ) : (
                    <span>Asesmen kompetensi tanpa syarat batas kelulusan (hasil nilai langsung tercatat).</span>
                  )}
                </li>
                {config.maxRemedialAttempts > 0 && (
                  <li>
                    Tersedia kuota remedial hingga{' '}
                    <strong>{config.maxRemedialAttempts}x percobaan</strong> jika nilai belum mencukupi.
                  </li>
                )}
                <li>
                  Pastikan koneksi internet Anda stabil sebelum menekan tombol mulai di bawah.
                </li>
              </ul>
            </div>

            <Button
              onClick={handleStart}
              disabled={isPending || questions.length === 0}
              className="w-full h-11 text-sm font-semibold shadow-md"
            >
              <Play className="mr-2 size-4 fill-current" />
              {isPending
                ? 'Memulai Ujian...'
                : questions.length === 0
                ? 'Belum Ada Soal Terdaftar'
                : 'Mulai Kerjakan Ujian Sekarang'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── 3. ACTIVE TEST SCREEN ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Sticky Header with Timer */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              <FileCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight line-clamp-1">{config.title}</h2>
              <p className="text-[11px] text-muted-foreground">
                {employee?.name} ({employee?.employeeSn || '-'}) • Percobaan #{attempt.attemptNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold ${
                remainingSeconds < 300
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30 animate-pulse'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              <Clock className="size-3.5" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            <Button
              size="sm"
              variant="default"
              className="hidden sm:inline-flex text-xs h-8"
              onClick={() => setIsConfirmSubmitOpen(true)}
              disabled={isPending}
            >
              <Send className="mr-1.5 size-3" /> Selesai & Kirim
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Current Question */}
        <div className="lg:col-span-3 space-y-4">
          {currentQ ? (
            <Card className="shadow-none border-border/80">
              <div className="p-4 bg-muted/20 border-b border-border/60 flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">
                  Pertanyaan {currentQuestionIndex + 1} dari {questions.length}
                </span>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {currentQ.points || 1} Poin
                </Badge>
              </div>

              <CardContent className="p-5 space-y-5">
                <div>
                  <p className="text-base font-medium text-foreground whitespace-pre-line leading-relaxed">
                    {currentQ.questionText}
                  </p>
                  {currentQ.questionImageUrl && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border/80 max-w-lg bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveUploadUrl(currentQ.questionImageUrl)}
                        alt={`Gambar Pertanyaan #${currentQuestionIndex + 1}`}
                        className="w-full object-contain max-h-72"
                      />
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-2.5 pt-2">
                  {[
                    { key: 'A', text: currentQ.optionA },
                    { key: 'B', text: currentQ.optionB },
                    { key: 'C', text: currentQ.optionC },
                    { key: 'D', currentQ: currentQ.optionD, text: currentQ.optionD },
                  ]
                    .filter((opt) => Boolean(opt.text?.trim()))
                    .map((opt) => {
                      const isSelected = answers[String(currentQ.id)] === opt.key
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.id, opt.key)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm'
                              : 'bg-card border-border/70 hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-sm flex-1 leading-snug">{opt.text}</span>
                        </button>
                      )
                    })}
                </div>

                {/* Bottom Navigation for Question */}
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <ArrowLeft className="mr-1.5 size-3.5" /> Sebelumnya
                  </Button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    >
                      Selanjutnya <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setIsConfirmSubmitOpen(true)}
                    >
                      <Send className="mr-1.5 size-3.5" /> Kumpulkan Ujian
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">Soal tidak ditemukan.</p>
          )}
        </div>

        {/* Right Column: Question Navigator */}
        <div className="space-y-4">
          <Card className="shadow-none border-border/80">
            <CardHeader className="p-3.5 border-b border-border/60 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Navigasi Soal ({answeredCount}/{questions.length} Dijawab)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(answers[String(q.id)])
                  const isCurrent = idx === currentQuestionIndex
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all flex items-center justify-center ${
                        isCurrent
                          ? 'border-primary ring-2 ring-primary/30 font-black'
                          : isAnswered
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
                <Button
                  onClick={() => setIsConfirmSubmitOpen(true)}
                  disabled={isPending}
                  className="w-full text-xs h-9"
                >
                  <Send className="mr-1.5 size-3" /> Kumpulkan Jawaban
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Dialog Before Submit */}
      <AlertDialog open={isConfirmSubmitOpen} onOpenChange={setIsConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan Jawaban Ujian?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda telah menjawab <strong>{answeredCount}</strong> dari total <strong>{questions.length}</strong> pertanyaan.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-rose-600 font-semibold">
                  Peringatan: Masih terdapat {questions.length - answeredCount} soal yang belum dijawab.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Periksa Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={performSubmission} disabled={isPending}>
              {isPending ? 'Mengumpulkan...' : 'Ya, Kumpulkan Sekarang'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
