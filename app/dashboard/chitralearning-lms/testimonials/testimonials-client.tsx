'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Star,
  MessageSquareQuote,
  PenSquare,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  User,
  Sparkles,
  Building2,
  Briefcase,
  Layers,
  ThumbsUp,
  Info,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  HeroFormField,
  HeroInput,
  HeroTextarea,
  HeroFormDialog,
  HeroConfirmDialog,
  HeroKpiCard,
  HeroEmptyState,
  HeroSearchableSelect,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TestimonialItem,
  TestimonialStats,
  submitLmsTestimonial,
  deleteLmsTestimonial,
} from './actions'

interface TestimonialsClientProps {
  initialTestimonials: TestimonialItem[]
  initialStats: TestimonialStats
  availableCourses: Array<{ id: number; title: string }>
  currentUser: {
    id: number
    name: string
    email: string
    employeeSn: string
    jobTitle: string
    role: string
    section: string
    department: string
    image: string | null
    canManageAll?: boolean
  } | null
}

const RATING_LABELS: Record<number, string> = {
  5: '5/5 - Sangat Puas & Bermanfaat',
  4: '4/5 - Puas & Menambah Wawasan',
  3: '3/5 - Cukup Baik',
  2: '2/5 - Kurang Memuaskan',
  1: '1/5 - Sangat Kurang',
}

export function TestimonialsClient({
  initialTestimonials,
  initialStats,
  availableCourses,
  currentUser,
}: TestimonialsClientProps) {
  const router = useRouter()
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(initialTestimonials)

  // Synchronize state when initialTestimonials changes via server revalidation
  React.useEffect(() => {
    setTestimonials(initialTestimonials)
  }, [initialTestimonials])

  // Derive stats dynamically from current testimonials in state so any delete or addition updates scorecard instantly
  const stats = useMemo<TestimonialStats>(() => {
    const activeItems = testimonials.filter((t) => t.allowDisplay !== false)
    const totalCount = activeItems.length

    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageRating: 0.0,
        ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        satisfactionRate: 0,
      }
    }

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let sum = 0
    let satisfied = 0

    for (const item of activeItems) {
      const r = Math.min(Math.max(item.rating || 5, 1), 5) as 1 | 2 | 3 | 4 | 5
      ratingCounts[r] = (ratingCounts[r] || 0) + 1
      sum += r
      if (r >= 4) satisfied++
    }

    return {
      totalCount,
      averageRating: Number((sum / totalCount).toFixed(1)),
      ratingCounts,
      satisfactionRate: Math.round((satisfied / totalCount) * 100),
    }
  }, [testimonials])

  const [isPending, startTransition] = useTransition()

  // Filters
  const [selectedStar, setSelectedStar] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all')

  // Form Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form Fields (6 questions)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [customCourseTitle, setCustomCourseTitle] = useState<string>('')
  const [experienceReview, setExperienceReview] = useState<string>('')
  const [knowledgeBenefit, setKnowledgeBenefit] = useState<string>('')
  const [feedbackSuggestion, setFeedbackSuggestion] = useState<string>('')
  const [allowDisplay, setAllowDisplay] = useState<boolean>(true)

  // Delete State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Course dropdown options
  const courseOptions = useMemo(() => {
    return availableCourses.map((c) => ({
      value: c.title,
      label: c.title,
      description: 'Modul ChitraLearning',
    }))
  }, [availableCourses])

  // Filtered Testimonials
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((item) => {
      // Tab filter
      if (activeTab === 'mine' && currentUser && item.employeeId !== currentUser.id) {
        return false
      }
      // Star filter
      if (selectedStar !== null && item.rating !== selectedStar) {
        return false
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.trainingTitle.toLowerCase().includes(q)
        const matchExp = item.experienceReview.toLowerCase().includes(q)
        const matchBenefit = item.knowledgeBenefit.toLowerCase().includes(q)
        const matchAuthor = item.author.name.toLowerCase().includes(q)
        const matchSection = (item.author.section || '').toLowerCase().includes(q)
        if (!matchTitle && !matchExp && !matchBenefit && !matchAuthor && !matchSection) {
          return false
        }
      }
      return true
    })
  }, [testimonials, activeTab, selectedStar, searchQuery, currentUser])

  // Handlers
  const handleOpenForm = () => {
    setRating(5)
    setHoverRating(0)
    setSelectedCourseIds([])
    setCustomCourseTitle('')
    setExperienceReview('')
    setKnowledgeBenefit('')
    setFeedbackSuggestion('')
    setAllowDisplay(true)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Combine multi-selected courses + custom typed title (if any)
    const combinedTitles = [...selectedCourseIds]
    if (customCourseTitle.trim() && !combinedTitles.includes(customCourseTitle.trim())) {
      combinedTitles.push(customCourseTitle.trim())
    }

    if (combinedTitles.length === 0) {
      setFormError('Harap pilih atau tulis minimal satu nama Training/Modul yang diikuti.')
      return
    }

    const trainingTitle = combinedTitles.join(', ')

    // Match courseId from the first matched course if present
    let courseId: number | null = null
    const firstMatched = availableCourses.find((c) => combinedTitles.includes(c.title))
    if (firstMatched) {
      courseId = firstMatched.id
    }

    if (!experienceReview.trim()) {
      setFormError('Harap ceritakan pengalaman Anda selama mengikuti pembelajaran.')
      return
    }

    if (!knowledgeBenefit.trim()) {
      setFormError('Harap tuliskan pengetahuan atau manfaat yang Anda dapatkan.')
      return
    }

    setIsSubmitting(true)

    const result = await submitLmsTestimonial({
      rating,
      trainingTitle,
      experienceReview: experienceReview.trim(),
      knowledgeBenefit: knowledgeBenefit.trim(),
      feedbackSuggestion: feedbackSuggestion.trim(),
      allowDisplay,
      courseId,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setFormError(result.message || 'Gagal menyimpan testimoni.')
      return
    }

    // Refresh list locally
    setIsFormOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    const res = await deleteLmsTestimonial(deleteTargetId)
    setIsDeleting(false)
    setDeleteTargetId(null)
    if (res.success) {
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTargetId))
      router.refresh()
    }
  }

  const renderStars = (count: number, size = 'size-4') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              size,
              s <= count
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-300'
            )}
          />
        ))}
      </div>
    )
  }

  const formatDate = (val: Date | string) => {
    try {
      const d = new Date(val)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 pt-2">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm text-blue-200">
              <Sparkles className="size-3.5 text-amber-300" />
              Suara Insan Chitra Paratama
            </div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Testimoni & Ulasan Pembelajaran
            </h1>
            <p className="text-slate-200 text-sm max-w-2xl leading-relaxed">
              Pengalaman nyata, ulasan materi, dan masukan berharga dari para pembelajar di
              ChitraLearning. Bagikan pengalaman belajar Anda dan bantu rekan lainnya memilih
              modul yang tepat.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Button
              onClick={handleOpenForm}
              className="h-9 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md transition-all duration-150 flex items-center gap-2 rounded-xl"
            >
              <PenSquare className="size-4" />
              Tulis Testimoni
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeroKpiCard
          title="Total Ulasan Masuk"
          value={stats.totalCount}
          description="Testimoni aktif terverifikasi"
          color="blue"
          icon={MessageSquareQuote}
        />
        <HeroKpiCard
          title="Rata-rata Rating"
          value={stats.totalCount > 0 ? `${stats.averageRating.toFixed(1)} / 5.0` : '-'}
          description="Skor kepuasan keseluruhan"
          color="amber"
          icon={Star}
        />
        <HeroKpiCard
          title="Tingkat Kepuasan"
          value={stats.totalCount > 0 ? `${stats.satisfactionRate}%` : '0%'}
          description="Peserta memberi bintang 4 & 5"
          color="emerald"
          icon={ThumbsUp}
        />
      </div>

      {/* Google Play Store Style Ratings Summary Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Star className="size-5 text-amber-500 fill-amber-500" />
          Peringkat dan Ulasan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Big Score Block */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-100">
            <span className="text-6xl font-black font-heading text-slate-900 tracking-tight">
              {stats.totalCount > 0 ? stats.averageRating.toFixed(1) : '0.0'}
            </span>
            <div className="mt-3">
              {renderStars(stats.totalCount > 0 ? Math.round(stats.averageRating) : 0, 'size-5')}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Berdasarkan {stats.totalCount} ulasan peserta
            </p>
          </div>

          {/* Progress Bars (Google Play Store Style) */}
          <div className="md:col-span-8 space-y-2.5">
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = stats.ratingCounts[starNum as 1 | 2 | 3 | 4 | 5] || 0
              const percentage = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0
              const isSelected = selectedStar === starNum

              return (
                <button
                  key={starNum}
                  onClick={() => setSelectedStar(isSelected ? null : starNum)}
                  className={cn(
                    'w-full flex items-center gap-3 text-xs group hover:bg-slate-50 p-1.5 rounded-lg transition-colors',
                    isSelected && 'bg-amber-50/70 ring-1 ring-amber-200'
                  )}
                >
                  <span className="w-4 font-bold text-slate-700 text-right">{starNum}</span>
                  <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />

                  {/* Horizontal Bar */}
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        starNum >= 4
                          ? 'bg-amber-400 group-hover:bg-amber-500'
                          : starNum === 3
                          ? 'bg-amber-300'
                          : 'bg-slate-300'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="w-12 text-slate-400 text-right font-medium">
                    {count} ({percentage}%)
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter and Tab Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Tabs: Semua vs Ulasan Saya */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'h-8 px-4 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Semua Testimoni ({testimonials.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={cn(
              'h-8 px-4 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'mine'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Ulasan Saya
          </button>
        </div>

        {/* Search & Star Filter Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Star Filter Chips */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedStar(null)}
              className={cn(
                'h-9 px-3 rounded-xl text-xs font-semibold border transition-all',
                selectedStar === null
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              Semua Bintang
            </button>
            {[5, 4, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStar(selectedStar === s ? null : s)}
                className={cn(
                  'h-9 px-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all',
                  selectedStar === s
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                <span>{s}</span>
                <Star className="size-3 fill-current" />
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-64">
            <HeroInput
              placeholder="Cari ulasan atau modul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefixIcon={<Search className="size-4 text-slate-400" />}
            />
          </div>
        </div>
      </div>

      {/* Testimonials List */}
      {filteredTestimonials.length === 0 ? (
        <HeroEmptyState
          title="Belum Ada Testimoni"
          description={
            searchQuery || selectedStar
              ? 'Tidak ada ulasan yang sesuai dengan filter yang Anda terapkan.'
              : 'Jadilah yang pertama membagikan pengalaman belajar Anda di ChitraLearning!'
          }
          actionLabel="Tulis Testimoni Sekarang"
          onAction={handleOpenForm}
        />
      ) : (
        <div className="space-y-4">
          {filteredTestimonials.map((item) => {
            const isOwner = currentUser && item.employeeId === currentUser.id
            const canDelete = Boolean(isOwner || currentUser?.canManageAll)
            const avatarUrl = item.author.image
              ? resolveUploadUrl(item.author.image)
              : null

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Top Row: Training Name & Owner Badge */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Ulasan Anda
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors text-right">
                    {item.trainingTitle}
                  </span>
                </div>

                {/* Rating Stars (Golden Stars) */}
                <div className="mb-3.5">
                  {renderStars(item.rating, 'size-4')}
                </div>

                {/* Main Quote / Experience Review (Matching Image 3) */}
                <p className="text-sm text-slate-800 leading-relaxed font-normal mb-4">
                  &ldquo;{item.experienceReview}&rdquo;
                </p>

                {/* Additional Sections: Pengetahuan/Manfaat & Saran (if available) */}
                {(item.knowledgeBenefit || item.feedbackSuggestion) && (
                  <div className="space-y-2 mb-4 bg-slate-50/70 rounded-xl p-3.5 border border-slate-100 text-xs">
                    {item.knowledgeBenefit && (
                      <div>
                        <span className="font-semibold text-slate-700">Pengetahuan & Manfaat: </span>
                        <span className="text-slate-600">{item.knowledgeBenefit}</span>
                      </div>
                    )}
                    {item.feedbackSuggestion && (
                      <div>
                        <span className="font-semibold text-slate-700">Saran & Masukan: </span>
                        <span className="text-slate-600">{item.feedbackSuggestion}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider Line */}
                <div className="border-t border-slate-100 my-4" />

                {/* Profile Footer (Exact Match with Image 3) */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="size-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={item.author.name}
                          width={40}
                          height={40}
                          className="size-full object-cover"
                        />
                      ) : (
                        <User className="size-5 text-slate-400" />
                      )}
                    </div>

                    {/* User Profile Details */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.author.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-tight mt-0.5">
                        {item.author.jobTitle || item.author.role || 'Staff'} |{' '}
                        {item.author.section || item.author.department || 'Site Operation'}
                      </p>
                      <p className="text-xs text-slate-400 leading-tight mt-0.5">
                        PT Chitra Paratama
                      </p>
                    </div>
                  </div>

                  {/* Submission Date & Owner Actions */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {formatDate(item.createdAt)}
                    </span>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTargetId(item.id)}
                        className="h-8 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title={isOwner ? 'Hapus Ulasan Anda' : 'Moderasi / Hapus Ulasan (Admin Training)'}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Form Dialog (6 Questions Matching Image 2) */}
      <HeroFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="size-5 text-blue-600" />
            <span>Form Ulasan & Testimoni ChitraLearning</span>
          </div>
        }
        description="Bagikan pengalaman belajar Anda untuk meningkatkan kualitas pembelajaran di ChitraLearning."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Kirim Testimoni"
        maxWidth="2xl"
      >
        <div className="space-y-6 py-2">
          {/* User Profile Card (Auto-detected per User Request) */}
          {currentUser && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-600" />
                  Profil Pengisi Terverifikasi (Otomatis Sesuai Akun Anda)
                </span>
                <span className="text-[11px] font-mono text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                  NIK: {currentUser.employeeSn}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <div className="size-11 rounded-full bg-white border border-blue-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {currentUser.image ? (
                    <Image
                      src={resolveUploadUrl(currentUser.image)}
                      alt={currentUser.name}
                      width={44}
                      height={44}
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="size-6 text-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{currentUser.name}</h4>
                  <p className="text-xs text-slate-600">
                    {currentUser.jobTitle || currentUser.role} | {currentUser.section}
                  </p>
                  <p className="text-[11px] text-slate-500">PT Chitra Paratama</p>
                </div>
              </div>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Question 1: Rating Bintang 5/5 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900 block">
              1. Berikan penilaian Anda terhadap pengalaman belajar ini{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(s)}
                    className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={cn(
                        'size-7 transition-colors',
                        s <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700 ml-2">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Question 2: Training atau Modul yang Diikuti (Multi-Select) */}
          <div className="space-y-2">
            <HeroFormField
              label="2. Training atau Modul yang Diikuti"
              required
              tooltip="Pilih satu atau beberapa modul kursus yang telah Anda ikuti, atau ketik nama modul custom."
            >
              <HeroSearchableSelect
                options={courseOptions}
                value={selectedCourseIds}
                onChange={(val) => {
                  if (Array.isArray(val)) {
                    setSelectedCourseIds(val)
                  } else if (val) {
                    setSelectedCourseIds([val])
                  } else {
                    setSelectedCourseIds([])
                  }
                }}
                isMulti={true}
                allowCustom={true}
                placeholder="Pilih atau cari satu atau beberapa modul..."
              />
            </HeroFormField>

            <div className="mt-1.5">
              <HeroInput
                placeholder="Ketik modul lainnya jika tidak ada di daftar (opsional)..."
                value={customCourseTitle}
                onChange={(e) => setCustomCourseTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Question 3: Bagaimana pengalaman Anda selama mengikuti training ini? */}
          <div>
            <HeroFormField
              label="3. Bagaimana pengalaman Anda selama mengikuti training ini?"
              required
              tooltip="Ceritakan secara terbuka bagaimana penyampaian materi, interaktivitas, dan kepuasan Anda."
            >
              <HeroTextarea
                rows={3}
                placeholder="Ceritakan pengalaman Anda selama mengikuti pembelajaran ini..."
                value={experienceReview}
                onChange={(e) => setExperienceReview(e.target.value)}
                showCount
                maxLength={600}
              />
            </HeroFormField>
          </div>

          {/* Question 4: Apa pengetahuan atau manfaat yang Anda dapatkan? */}
          <div>
            <HeroFormField
              label="4. Apa pengetahuan atau manfaat yang Anda dapatkan?"
              required
              tooltip="Sebutkan hal-hal baru atau peningkatan keterampilan yang langsung dirasakan."
            >
              <HeroTextarea
                rows={2}
                placeholder="Contoh: Saya menjadi lebih memahami konstruksi ban, cara inspeksi, dan perawatan ban untuk operasional..."
                value={knowledgeBenefit}
                onChange={(e) => setKnowledgeBenefit(e.target.value)}
                showCount
                maxLength={400}
              />
            </HeroFormField>
          </div>

          {/* Question 5: Apa saran dan masukan yang ingin Anda berikan tentang Chitra Learning? */}
          <div>
            <HeroFormField
              label="5. Apa saran dan masukan yang ingin Anda berikan tentang Chitra Learning?"
              tooltip="Opsional. Masukan Anda sangat berarti untuk pengembangan fitur dan materi berikutnya."
            >
              <HeroTextarea
                rows={2}
                placeholder="Tuliskan saran atau masukan untuk pengembangan Chitra Learning..."
                value={feedbackSuggestion}
                onChange={(e) => setFeedbackSuggestion(e.target.value)}
                showCount
                maxLength={400}
              />
            </HeroFormField>
          </div>

          {/* Question 6: Apakah testimoni Anda boleh ditampilkan di Chitra Learning? (ya / tidak) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <label className="text-sm font-semibold text-slate-900 block">
              6. Apakah testimoni Anda boleh ditampilkan di Chitra Learning?{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all',
                  allowDisplay
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                <input
                  type="radio"
                  name="allowDisplay"
                  checked={allowDisplay === true}
                  onChange={() => setAllowDisplay(true)}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900">Ya, Boleh</span>
                  <p className="text-[11px] text-slate-500">
                    Tampilkan ulasan di feed testimoni publik ChitraLearning.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all',
                  !allowDisplay
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                <input
                  type="radio"
                  name="allowDisplay"
                  checked={allowDisplay === false}
                  onChange={() => setAllowDisplay(false)}
                  className="size-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900">Tidak</span>
                  <p className="text-[11px] text-slate-500">
                    Hanya untuk evaluasi internal tim L&D, tidak dipublikasikan.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </HeroFormDialog>

      {/* Confirm Delete Dialog */}
      <HeroConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Hapus Ulasan Testimoni"
        description="Apakah Anda yakin ingin menghapus testimoni ini? Tindakan ini tidak dapat dibatalkan."
        tone="destructive"
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
