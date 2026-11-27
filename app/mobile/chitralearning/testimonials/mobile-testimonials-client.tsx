'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
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
  ChevronLeft,
  BookOpen,
  Calendar,
  Layers,
  ThumbsUp,
  Info,
  ShieldCheck,
  Building2,
  MapPin,
  Briefcase,
  X,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  HeroConfirmDialog,
  HeroEmptyState,
} from '@/components/templates'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  TestimonialItem,
  TestimonialStats,
  submitLmsTestimonial,
  deleteLmsTestimonial,
} from '@/app/dashboard/chitralearning-lms/testimonials/actions'

interface MobileTestimonialsClientProps {
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

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: '5/5 - Sangat Puas & Sangat Bermanfaat',
  4: '4/5 - Puas & Menambah Wawasan',
  3: '3/5 - Cukup Bermanfaat',
  2: '2/5 - Kurang Memuaskan',
  1: '1/5 - Perlu Banyak Peningkatan',
}

export function MobileTestimonialsClient({
  initialTestimonials,
  initialStats,
  availableCourses,
  currentUser,
}: MobileTestimonialsClientProps) {
  const router = useRouter()
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(initialTestimonials)

  React.useEffect(() => {
    setTestimonials(initialTestimonials)
  }, [initialTestimonials])

  // Derive dynamic stats from testimonials state
  const stats = useMemo<TestimonialStats>(() => {
    const active = testimonials.filter((t) => t.allowDisplay !== false)
    const totalCount = active.length

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

    for (const item of active) {
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

  // Filters state
  const [selectedStar, setSelectedStar] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all')

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 6 Questions state
  const [rating, setRating] = useState<number>(5)
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>('')
  const [customCourseTitle, setCustomCourseTitle] = useState<string>('')
  const [experienceReview, setExperienceReview] = useState<string>('')
  const [knowledgeBenefit, setKnowledgeBenefit] = useState<string>('')
  const [feedbackSuggestion, setFeedbackSuggestion] = useState<string>('')
  const [allowDisplay, setAllowDisplay] = useState<boolean>(true)

  // Delete State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filtered Testimonials
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((item) => {
      if (activeTab === 'mine' && currentUser && item.employeeId !== currentUser.id) {
        return false
      }
      if (selectedStar !== null && item.rating !== selectedStar) {
        return false
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.trainingTitle.toLowerCase().includes(q)
        const matchExp = item.experienceReview.toLowerCase().includes(q)
        const matchBenefit = item.knowledgeBenefit.toLowerCase().includes(q)
        const matchAuthor = item.author.name.toLowerCase().includes(q)
        const matchDept = (item.author.department || '').toLowerCase().includes(q)
        if (!matchTitle && !matchExp && !matchBenefit && !matchAuthor && !matchDept) {
          return false
        }
      }
      return true
    })
  }, [testimonials, activeTab, selectedStar, searchQuery, currentUser])

  const myTestimonialsCount = useMemo(() => {
    if (!currentUser) return 0
    return testimonials.filter((t) => t.employeeId === currentUser.id).length
  }, [testimonials, currentUser])

  // Form handlers
  const handleOpenForm = () => {
    setRating(5)
    setSelectedCourseTitle(availableCourses[0]?.title || '')
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

    const finalTitle = customCourseTitle.trim() || selectedCourseTitle.trim()
    if (!finalTitle) {
      setFormError('Harap pilih atau tulis nama Training/Modul yang Anda ikuti.')
      return
    }

    if (!experienceReview.trim()) {
      setFormError('Harap ceritakan pengalaman Anda selama mengikuti pembelajaran.')
      return
    }

    if (!knowledgeBenefit.trim()) {
      setFormError('Harap tuliskan pengetahuan atau manfaat baru yang Anda dapatkan.')
      return
    }

    const matchedCourse = availableCourses.find((c) => c.title.toLowerCase() === finalTitle.toLowerCase())

    setIsSubmitting(true)
    const result = await submitLmsTestimonial({
      rating,
      trainingTitle: finalTitle,
      experienceReview: experienceReview.trim(),
      knowledgeBenefit: knowledgeBenefit.trim(),
      feedbackSuggestion: feedbackSuggestion.trim(),
      allowDisplay,
      courseId: matchedCourse?.id || null,
    })
    setIsSubmitting(false)

    if (!result.success) {
      setFormError(result.message || 'Gagal mengirim testimoni.')
      return
    }

    setIsFormOpen(false)
    router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    const res = await deleteLmsTestimonial(deleteTargetId)
    setIsDeleting(false)

    if (res.success) {
      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTargetId))
      setDeleteTargetId(null)
      router.refresh()
    } else {
      alert(res.message || 'Gagal menghapus testimoni.')
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/mobile/chitralearning"
            className="flex size-9 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200/80 text-[#003461] active:scale-95 transition-transform"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#486275]">ChitraLearning</p>
            <h1 className="text-xl font-black tracking-tight text-[#003461]">Testimoni & Ulasan</h1>
          </div>
        </div>

        <button
          onClick={handleOpenForm}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-[#003461] to-[#0ea5b0] text-white text-xs font-black shadow-md shadow-[#003461]/20 active:scale-95 transition-all"
        >
          <PenSquare className="size-3.5" />
          <span>Tulis Ulasan</span>
        </button>
      </section>

      {/* Google Play Store / App Store Style Rating Summary Card */}
      <section className="rounded-[1.4rem] bg-gradient-to-br from-[#003461] via-[#004f8a] to-[#082033] p-4 text-white shadow-[0_16px_36px_rgba(0,52,97,0.22)]">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/15">
              <MessageSquareQuote className="size-4 text-[#7ec8e3]" />
            </span>
            <span className="text-xs font-black text-white tracking-wide">Rating & Ulasan Rekan Kerja</span>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-400/30">
            {stats.satisfactionRate}% Rekan Puas
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-12 gap-3 items-center">
          {/* Big Score */}
          <div className="col-span-5 text-center pr-2 border-r border-white/10">
            <p className="text-4xl font-black tracking-tighter text-white">
              {stats.totalCount > 0 ? stats.averageRating.toFixed(1) : '5.0'}
            </p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'size-3.5',
                    star <= Math.round(stats.averageRating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-white/20 text-white/20'
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-[10px] font-bold text-[#b9dff6]">
              {stats.totalCount} ulasan masuk
            </p>
          </div>

          {/* Breakdown Bars */}
          <div className="col-span-7 space-y-1 pl-1">
            {([5, 4, 3, 2, 1] as const).map((starNum) => {
              const count = stats.ratingCounts[starNum] || 0
              const pct = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0
              return (
                <div key={starNum} className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="w-2.5 text-right text-white/90">{starNum}</span>
                  <Star className="size-2.5 fill-amber-300 text-amber-300 shrink-0" />
                  <div className="h-1.5 flex-1 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[9px] text-white/70">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tabs & Search */}
      <section className="space-y-2.5">
        {/* Tab Pills */}
        <div className="flex rounded-xl bg-white p-1 shadow-sm border border-slate-200/80">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 py-1.5 text-xs font-black rounded-lg transition-all',
              activeTab === 'all'
                ? 'bg-[#003461] text-white shadow-sm'
                : 'text-[#486275] hover:text-[#082033]'
            )}
          >
            Semua Testimoni ({testimonials.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={cn(
              'flex-1 py-1.5 text-xs font-black rounded-lg transition-all',
              activeTab === 'mine'
                ? 'bg-[#003461] text-white shadow-sm'
                : 'text-[#486275] hover:text-[#082033]'
            )}
          >
            Ulasan Saya ({myTestimonialsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#486275]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari modul, ulasan, nama rekan..."
            className="h-10 w-full rounded-xl bg-white pl-10 pr-9 text-xs font-semibold text-[#082033] shadow-sm border border-slate-200/80 outline-none placeholder:text-slate-400 focus:border-[#003461] focus:ring-1 focus:ring-[#003461]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Rating Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedStar(null)}
            className={cn(
              'h-7 px-3 rounded-full text-[11px] font-black shrink-0 transition-all border',
              selectedStar === null
                ? 'bg-[#003461] text-white border-[#003461]'
                : 'bg-white text-[#486275] border-slate-200'
            )}
          >
            Semua Bintang
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedStar(selectedStar === star ? null : star)}
              className={cn(
                'flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-black shrink-0 transition-all border',
                selectedStar === star
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              )}
            >
              <Star
                className={cn(
                  'size-3',
                  selectedStar === star ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'
                )}
              />
              <span>{star}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Testimonials List */}
      <section className="space-y-3">
        {filteredTestimonials.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
            <MessageSquareQuote className="mx-auto mb-2 size-10 text-slate-300" />
            <p className="font-black text-[#082033] text-sm">Tidak Ada Testimoni</p>
            <p className="mt-1 text-xs text-[#486275]">
              {searchQuery || selectedStar !== null || activeTab === 'mine'
                ? 'Tidak ada ulasan yang sesuai dengan filter pencarian Anda.'
                : 'Belum ada ulasan yang diterbitkan. Jadilah yang pertama memberikan ulasan!'}
            </p>
            <button
              onClick={handleOpenForm}
              className="mt-4 inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-[#003461] text-white text-xs font-black shadow-sm"
            >
              <PenSquare className="size-3" />
              <span>Tulis Ulasan Sekarang</span>
            </button>
          </div>
        ) : (
          filteredTestimonials.map((item) => {
            const isOwner = currentUser?.id === item.employeeId
            const canDelete = isOwner || Boolean(currentUser?.canManageAll)
            const createdDate = new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            const initials = item.author.name
              ? item.author.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'CP'

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(8,32,51,0.06)] border border-slate-100 space-y-3"
              >
                {/* Author row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.author.image ? (
                      <div className="relative size-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                        <Image
                          src={resolveUploadUrl(item.author.image)}
                          alt={item.author.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#003461] to-[#0ea5b0] text-xs font-black text-white shrink-0 shadow-sm">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-black text-[#082033] truncate">{item.author.name}</p>
                        <ShieldCheck className="size-3.5 text-blue-600 shrink-0" />
                      </div>
                      <p className="text-[10px] font-semibold text-[#486275] truncate">
                        {item.author.jobTitle || item.author.role || 'Staff'} · {item.author.department}
                      </p>
                      {item.author.workLocation && (
                        <p className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5 truncate">
                          <MapPin className="size-2.5" /> {item.author.workLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      className="size-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                      title="Hapus ulasan"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Rating & Date & Course Tag */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            'size-3.5',
                            star <= item.rating
                              ? 'fill-amber-400 text-amber-500'
                              : 'fill-slate-100 text-slate-200'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-amber-700 ml-0.5">{item.rating}.0</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{createdDate}</span>
                </div>

                {/* Training Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e9f6fd] border border-blue-100/80 text-[10px] font-black text-[#003461] max-w-full">
                  <BookOpen className="size-3 shrink-0 text-[#003461]" />
                  <span className="truncate">Modul: {item.trainingTitle}</span>
                </div>

                {/* Question 3: Experience Review */}
                <div className="rounded-xl bg-slate-50/70 p-3 border border-slate-100 text-xs font-medium text-slate-800 leading-relaxed italic">
                  &ldquo;{item.experienceReview}&rdquo;
                </div>

                {/* Question 4: Knowledge Benefit */}
                {item.knowledgeBenefit && (
                  <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-100/80 text-xs text-emerald-950 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <Sparkles className="size-3 text-emerald-600" /> Manfaat & Hal Baru:
                    </p>
                    <p className="font-semibold text-[11px] leading-snug">{item.knowledgeBenefit}</p>
                  </div>
                )}

                {/* Question 5: Feedback / Suggestion (if any) */}
                {item.feedbackSuggestion && (
                  <div className="rounded-xl bg-purple-50/70 p-2.5 border border-purple-100 text-xs text-purple-950 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                      <MessageSquareQuote className="size-3 text-purple-600" /> Masukan & Saran:
                    </p>
                    <p className="font-semibold text-[11px] leading-snug">{item.feedbackSuggestion}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* CREATE TESTIMONIAL MODAL (DIALOG) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md w-[95%] max-h-[90vh] overflow-y-auto rounded-3xl p-5 bg-white border-slate-200">
          <DialogHeader className="text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[9px] font-black border border-rose-100 w-fit">
              <MessageSquareQuote className="size-3" /> Form Testimoni ChitraLearning
            </div>
            <DialogTitle className="text-lg font-black text-[#003461]">
              Tulis Ulasan Pembelajaran
            </DialogTitle>
            <DialogDescription className="text-xs text-[#486275]">
              Bagikan pengalaman dan manfaat yang Anda dapatkan untuk memotivasi rekan kerja.
            </DialogDescription>
          </DialogHeader>

          {/* Current User Quick Info */}
          {currentUser && (
            <div className="rounded-2xl bg-[#e9f6fd] p-3 border border-blue-100 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#003461] text-xs font-black text-white shrink-0">
                {currentUser.name?.slice(0, 2).toUpperCase() || 'CP'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[#003461] truncate">{currentUser.name}</p>
                <p className="text-[10px] font-semibold text-[#486275] truncate">
                  NIK: {currentUser.employeeSn} · {currentUser.jobTitle} ({currentUser.department})
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Question 1: Course Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033] flex items-center gap-1">
                1. Modul / Kursus yang Diikuti <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCourseTitle}
                onChange={(e) => {
                  setSelectedCourseTitle(e.target.value)
                  if (e.target.value !== 'custom') {
                    setCustomCourseTitle('')
                  }
                }}
                className="h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-[#003461]"
              >
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.title}>
                    {c.title}
                  </option>
                ))}
                <option value="custom">+ Ketik Judul Pelatihan Lainnya...</option>
              </select>

              {selectedCourseTitle === 'custom' && (
                <input
                  type="text"
                  placeholder="Ketik nama modul atau pelatihan..."
                  value={customCourseTitle}
                  onChange={(e) => setCustomCourseTitle(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl bg-white px-3 text-xs font-semibold text-[#082033] border border-slate-200 outline-none focus:border-[#003461]"
                  autoFocus
                />
              )}
            </div>

            {/* Question 2: Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033] flex items-center gap-1">
                2. Berikan Penilaian (Rating Bintang) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 active:scale-90 transition-transform"
                  >
                    <Star
                      className={cn(
                        'size-7',
                        star <= rating
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-slate-100 text-slate-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-amber-700">
                {RATING_DESCRIPTIONS[rating] || `${rating}/5 Bintang`}
              </p>
            </div>

            {/* Question 3: Experience Review */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033] flex items-center gap-1">
                3. Ceritakan Pengalaman Belajar Anda <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={experienceReview}
                onChange={(e) => setExperienceReview(e.target.value)}
                placeholder="Ceritakan bagaimana materi disampaikan, kemudahan akses modul, simulasi, atau hal menarik yang Anda rasakan..."
                className="w-full rounded-xl bg-white p-3 text-xs font-medium text-[#082033] border border-slate-200 outline-none focus:border-[#003461] placeholder:text-slate-400"
              />
            </div>

            {/* Question 4: Knowledge Benefit */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033] flex items-center gap-1">
                4. Pengetahuan atau Manfaat yang Didapatkan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={knowledgeBenefit}
                onChange={(e) => setKnowledgeBenefit(e.target.value)}
                placeholder="Contoh: Saya menjadi lebih paham cara identifikasi kerusakan ban dan standar keselamatan kerja..."
                className="w-full rounded-xl bg-white p-3 text-xs font-medium text-[#082033] border border-slate-200 outline-none focus:border-[#003461] placeholder:text-slate-400"
              />
            </div>

            {/* Question 5: Suggestions */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#082033]">
                5. Saran & Masukan untuk ChitraLearning (Opsional)
              </label>
              <textarea
                rows={2}
                value={feedbackSuggestion}
                onChange={(e) => setFeedbackSuggestion(e.target.value)}
                placeholder="Tuliskan ide materi lanjutan atau perbaikan fasilitas pembelajaran..."
                className="w-full rounded-xl bg-white p-3 text-xs font-medium text-[#082033] border border-slate-200 outline-none focus:border-[#003461] placeholder:text-slate-400"
              />
            </div>

            {/* Question 6: Allow Display */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[#082033]">
                  6. Tampilkan di feed testimoni publik?
                </p>
                <p className="text-[10px] font-semibold text-[#486275]">
                  Testimoni Anda dapat dibaca oleh rekan kerja lain di HERO.
                </p>
              </div>
              <Switch checked={allowDisplay} onCheckedChange={setAllowDisplay} />
            </div>

            <DialogFooter className="flex flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#003461] to-[#0ea5b0] text-white text-xs font-black shadow-md shadow-[#003461]/20 hover:opacity-95"
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Testimoni'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <HeroConfirmDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title="Hapus Ulasan Testimoni"
        description="Apakah Anda yakin ingin menghapus testimoni ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
