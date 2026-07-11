'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  BookOpen,
  ChevronDown,
  Copy,
  Edit2,
  FileQuestion,
  FileText,
  GripVertical,
  HelpCircle,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  Video,
  Presentation,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import { createLesson, deleteLesson, deleteQuizQuestion, duplicateLesson, reorderCurriculum, updateLesson } from '@/app/dashboard/chitralearning-lms/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { QuestionsLibraryDialog } from './questions-library-dialog'

export type LessonType = 'video' | 'article' | 'quiz' | 'pretest' | 'posttest' | 'google_slide'

export interface BuilderLesson {
  id: string
  title: string
  type: LessonType
  description?: string
  videoUrl?: string
  fileUrl?: string
  durationMinutes?: number
  quizSettings?: any
}

export interface BuilderSection {
  id: string
  title: string
  lessons: BuilderLesson[]
}

export interface BuilderQuestion {
  id: number
  lessonId: number | null
  questionText: string
  questionImageUrl?: string | null
  optionA: string
  optionAImageUrl?: string | null
  optionB: string
  optionBImageUrl?: string | null
  optionC: string
  optionCImageUrl?: string | null
  optionD: string
  optionDImageUrl?: string | null
  correctOption: string
}

interface LmsCurriculumBuilderProps {
  courseId: number
  initialSections: BuilderSection[]
  initialQuestions?: BuilderQuestion[]
  onChange?: (sections: BuilderSection[]) => void
}

function lessonIcon(type: LessonType) {
  if (type === 'video') return <Video className="h-4 w-4" />
  if (type === 'quiz' || type === 'pretest' || type === 'posttest') return <HelpCircle className="h-4 w-4" />
  if (type === 'google_slide') return <Presentation className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

function lessonLabel(type: LessonType) {
  if (type === 'pretest') return 'Pre-test'
  if (type === 'posttest') return 'Post-test'
  if (type === 'article') return 'Text lesson'
  if (type === 'google_slide') return 'Google Slide'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function isQuizType(type: LessonType) {
  return type === 'quiz' || type === 'pretest' || type === 'posttest'
}

function documentPreviewUrl(fileUrl: string) {
  const path = fileUrl.toLowerCase().split('?')[0]
  const extension = path.match(/\.([a-z0-9]+)$/)?.[1] || ''
  const absoluteUrl = fileUrl.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${fileUrl}` : fileUrl

  if (extension === 'pdf') {
    return { src: `${fileUrl}${fileUrl.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=1`, supported: true }
  }

  if (['doc', 'docx', 'ppt', 'pptx'].includes(extension) && /^https?:\/\//i.test(absoluteUrl)) {
    return { src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`, supported: true }
  }

  return { src: '', supported: false }
}

function DocumentMaterialPreview({ fileUrl }: { fileUrl: string }) {
  if (!fileUrl) return null
  const preview = documentPreviewUrl(fileUrl)

  if (!preview.supported) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Preview tersedia untuk PDF atau Office file publik (.doc, .docx, .ppt, .pptx).
      </div>
    )
  }

  return (
    <iframe
      src={preview.src}
      sandbox="allow-forms allow-scripts allow-same-origin"
      className="h-80 w-full rounded-lg border border-slate-200 bg-white"
      title="Preview materi"
    />
  )
}

function SortableLesson({
  lesson,
  isActive,
  sectionId,
  onSelect,
  onDelete,
  onDuplicate,
  onReorder,
}: {
  lesson: BuilderLesson
  isActive: boolean
  sectionId: string
  onSelect: (id: string) => void
  onDelete: (lessonId: string, sectionId: string) => void
  onDuplicate: (lessonId: string, sectionId: string) => void
  onReorder: (sectionId: string, oldIndex: number, newIndex: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `lesson-${sectionId}-${lesson.id}` })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        isActive
          ? 'border-blue-500 bg-blue-50 text-slate-950'
          : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      <button {...attributes} {...listeners} type="button" className="cursor-grab text-slate-300 hover:text-slate-500" aria-label="Geser materi">
        <GripVertical className="h-4 w-4 shrink-0" />
      </button>
      <span className={isQuizType(lesson.type) ? 'text-amber-500' : 'text-emerald-500'}>{lessonIcon(lesson.type)}</span>
      <button type="button" onClick={() => onSelect(lesson.id)} className="min-w-0 flex-1 truncate text-left font-medium">
        {lesson.title}
      </button>
      {isQuizType(lesson.type) && <Badge variant="outline" className="h-5 rounded-[4px] bg-white px-1.5 text-[10px] uppercase">Quiz</Badge>}
      <button type="button" onClick={() => onDuplicate(lesson.id, sectionId)} className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600" aria-label="Duplikat materi">
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={() => onDelete(lesson.id, sectionId)} className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="Hapus materi">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function SortableSection({
  section,
  activeLessonId,
  updateSectionTitle,
  onAddLesson,
  onImportMaterials,
  onSelectLesson,
  onDeleteLesson,
  onDuplicateLesson,
  removeSection,
  onReorderLessons,
}: {
  section: BuilderSection
  activeLessonId: string | null
  updateSectionTitle: (id: string, title: string) => void
  onAddLesson: (sectionId: string) => void
  onImportMaterials: (sectionId: string) => void
  onSelectLesson: (lessonId: string) => void
  onDeleteLesson: (lessonId: string, sectionId: string) => void
  onDuplicateLesson: (lessonId: string, sectionId: string) => void
  removeSection: (id: string) => void
  onReorderLessons: (sectionId: string, oldIndex: number, newIndex: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  }

  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const lessonIds = section.lessons.map(l => `lesson-${section.id}-${l.id}`)
    const oldIndex = lessonIds.indexOf(String(active.id))
    const newIndex = lessonIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    onReorderLessons(section.id, oldIndex, newIndex)
  }

  return (
    <section ref={setNodeRef} style={style} className="overflow-hidden rounded-lg border border-slate-200/60 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <button {...attributes} {...listeners} type="button" className="cursor-grab text-slate-300 hover:text-slate-500" aria-label="Geser section">
          <GripVertical className="h-4 w-4" />
        </button>
        <Input
          value={section.title}
          onChange={(event) => updateSectionTitle(section.id, event.target.value)}
          className="h-8 border-0 bg-transparent px-1 text-[15px] font-semibold text-slate-950 shadow-none focus-visible:ring-1"
          aria-label="Nama section"
        />
        <ChevronDown className="h-4 w-4 text-slate-400" />
        <Button variant="ghost" size="icon" onClick={() => removeSection(section.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1.5 px-3 py-3">
        {section.lessons.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">Belum ada materi.</p>
        ) : (
          <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
            <SortableContext items={section.lessons.map(l => `lesson-${section.id}-${l.id}`)} strategy={verticalListSortingStrategy}>
              {section.lessons.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  sectionId={section.id}
                  isActive={activeLessonId === lesson.id}
                  onSelect={onSelectLesson}
                  onDelete={onDeleteLesson}
                  onDuplicate={onDuplicateLesson}
                  onReorder={onReorderLessons}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={() => onAddLesson(section.id)} className="h-9 justify-center bg-blue-50 text-blue-700 hover:bg-blue-100">
            <Plus className="mr-1.5 h-4 w-4" />
            Add lesson
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onImportMaterials(section.id)} className="h-9 justify-center bg-slate-100 text-slate-700 hover:bg-slate-200">
            <Search className="mr-1.5 h-4 w-4" />
            Materials
          </Button>
        </div>
      </div>
    </section>
  )
}

export function LmsCurriculumBuilder({ courseId, initialSections, initialQuestions = [], onChange }: LmsCurriculumBuilderProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [sections, setSections] = useState<BuilderSection[]>(initialSections)
  const [questions, setQuestions] = useState<BuilderQuestion[]>(initialQuestions)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => initialSections.flatMap((section) => section.lessons)[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [lessonType, setLessonType] = useState<LessonType>('video')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('0')
  const [quizSettings, setQuizSettings] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [questionsLibraryOpen, setQuestionsLibraryOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  const router = useRouter()

  const flatLessons = useMemo(() => sections.flatMap((section) => section.lessons.map((lesson) => ({ ...lesson, sectionId: section.id, sectionTitle: section.title }))), [sections])
  const activeLesson = flatLessons.find((lesson) => lesson.id === activeLessonId) ?? null
  const activeLessonQuestions = useMemo(
    () => questions.filter((question) => String(question.lessonId ?? '') === String(activeLessonId)),
    [questions, activeLessonId]
  )

  useEffect(() => {
    if (!activeLesson) return
    setLessonType(activeLesson.type)
    setTitle(activeLesson.title)
    setDescription(activeLesson.description ?? '')
    setVideoUrl(activeLesson.videoUrl ?? '')
    setFileUrl(activeLesson.fileUrl ?? '')
    setDurationMinutes(String(activeLesson.durationMinutes ?? 0))
    setQuizSettings(activeLesson.quizSettings ?? {})
  }, [activeLesson?.id])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function setAndEmit(nextSections: BuilderSection[]) {
    setSections(nextSections)
    onChange?.(nextSections)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex((section) => section.id === active.id)
    const newIndex = sections.findIndex((section) => section.id === over.id)
    const nextSections = arrayMove(sections, oldIndex, newIndex)
    setAndEmit(nextSections)

    try {
      await reorderCurriculum(courseId, nextSections)
      toast.success('Urutan tersimpan')
    } catch {
      toast.error('Gagal simpan urutan')
    }
  }

  function handleReorderLessons(sectionId: string, oldIndex: number, newIndex: number) {
    const nextSections = sections.map((section) => {
      if (section.id !== sectionId) return section
      return { ...section, lessons: arrayMove(section.lessons, oldIndex, newIndex) }
    })
    setAndEmit(nextSections)
    reorderCurriculum(courseId, nextSections).then(
      () => toast.success('Urutan materi tersimpan'),
      () => toast.error('Gagal simpan urutan materi')
    )
  }

  function addSection() {
    setAndEmit([...sections, { id: `new-${Date.now()}`, title: 'Section baru', lessons: [] }])
  }

  function updateSectionTitle(id: string, nextTitle: string) {
    setAndEmit(sections.map((section) => section.id === id ? { ...section, title: nextTitle } : section))
  }

  function removeSection(id: string) {
    const section = sections.find((item) => item.id === id)
    if (section?.lessons.length) {
      toast.error('Kosongkan materi sebelum hapus section')
      return
    }
    setAndEmit(sections.filter((section) => section.id !== id))
  }

  function openAddLesson(sectionId: string) {
    setActiveSectionId(sectionId)
    setLessonType('video')
    setTitle('')
    setDescription('')
    setVideoUrl('')
    setFileUrl('')
    setDurationMinutes('0')
    setQuizSettings({})
    setDialogOpen(true)
  }

  function openImportMaterials(sectionId: string) {
    setActiveSectionId(sectionId)
    setLessonType('article')
    setTitle('')
    setDescription('')
    setVideoUrl('')
    setFileUrl('')
    setDurationMinutes('0')
    setQuizSettings({})
    setDialogOpen(true)
  }

  async function handleDeleteLesson(lessonId: string, sectionId: string) {
    if (!confirm('Hapus materi ini?')) return

    try {
      if (!lessonId.startsWith('new-')) await deleteLesson(parseInt(lessonId, 10))
      const nextSections = sections.map((section) => section.id === sectionId ? { ...section, lessons: section.lessons.filter((lesson) => lesson.id !== lessonId) } : section)
      setAndEmit(nextSections)
      if (activeLessonId === lessonId) setActiveLessonId(nextSections.flatMap((section) => section.lessons)[0]?.id ?? null)
      toast.success('Materi dihapus')
      router.refresh()
    } catch {
      toast.error('Gagal hapus materi')
    }
  }

  async function handleDuplicateLesson(lessonId: string, sectionId: string) {
    const section = sections.find((item) => item.id === sectionId)
    const source = section?.lessons.find((lesson) => lesson.id === lessonId)
    if (!section || !source) return

    try {
      if (lessonId.startsWith('new-')) {
        const copy = { ...source, id: `new-${Date.now()}`, title: `${source.title} (Copy)` }
        setAndEmit(sections.map((item) => item.id === sectionId ? { ...item, lessons: [...item.lessons, copy] } : item))
        toast.success('Materi diduplikat')
        return
      }

      const created = await duplicateLesson(parseInt(lessonId, 10))
      const copy: BuilderLesson = {
        id: String(created.id),
        title: created.title,
        type: created.lessonType as LessonType,
        description: created.description,
        videoUrl: created.videoUrl,
        fileUrl: created.fileUrl,
        durationMinutes: created.durationMinutes,
        quizSettings: created.quizSettings,
      }
      setAndEmit(sections.map((item) => item.id === sectionId ? { ...item, lessons: [...item.lessons, copy] } : item))
      toast.success('Materi diduplikat')
      router.refresh()
    } catch {
      toast.error('Gagal duplikat materi')
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm('Hapus soal ini?')) return

    try {
      await deleteQuizQuestion(questionId)
      setQuestions((current) => current.filter((question) => question.id !== questionId))
      toast.success('Soal dihapus')
      router.refresh()
    } catch {
      toast.error('Gagal hapus soal')
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setUploadProgress(0)
    try {
      const ticketResponse = await fetch('/api/uploads/lms-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }),
      })
      const ticket = await ticketResponse.json()
      if (!ticketResponse.ok) throw new Error(ticket.error || 'Gagal menyiapkan upload file')

      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('Upload file ditolak oleh storage'))
        request.onerror = () => reject(new Error('Koneksi upload terputus'))
        request.open('PUT', ticket.uploadUrl)
        request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        request.send(file)
      })

      setFileUrl(ticket.url)
      toast.success('File terupload')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal upload file')
    } finally {
      setUploadingFile(false)
      setUploadProgress(null)
      event.target.value = ''
    }
  }

  async function handleVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadFile(formData)
      if (result.success && result.url) {
        setVideoUrl(result.readableUrl || result.url)
        toast.success('Video terupload')
      } else {
        toast.error(result.error || 'Gagal upload video')
      }
    } catch {
      toast.error('Gagal upload video')
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }

  function lessonFormData(sectionTitle: string) {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('sectionTitle', sectionTitle)
    formData.append('lessonType', lessonType)
    formData.append('videoUrl', videoUrl)
    formData.append('fileUrl', fileUrl)
    formData.append('durationMinutes', durationMinutes)
    formData.append('quizSettings', JSON.stringify(quizSettings))
    formData.append('isRequired', 'true')
    return formData
  }

  async function handleCreateLesson(event: React.FormEvent) {
    event.preventDefault()
    const section = sections.find((section) => section.id === activeSectionId)
    if (!section || !title.trim()) return

    setLoading(true)
    try {
      const created = await createLesson(courseId, lessonFormData(section.title))
      const lesson: BuilderLesson = {
        id: String(created.id),
        title: created.title,
        type: created.lessonType as LessonType,
        description: created.description,
        videoUrl: created.videoUrl,
        fileUrl: created.fileUrl,
        durationMinutes: created.durationMinutes,
        quizSettings: created.quizSettings,
      }
      setAndEmit(sections.map((item) => item.id === section.id ? { ...item, lessons: [...item.lessons, lesson] } : item))
      setActiveLessonId(lesson.id)
      toast.success('Materi ditambahkan')
      setDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Gagal simpan materi')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateLesson(event: React.FormEvent) {
    event.preventDefault()
    if (!activeLesson || activeLesson.id.startsWith('new-') || !title.trim()) return

    setLoading(true)
    try {
      const updated = await updateLesson(parseInt(activeLesson.id, 10), lessonFormData(activeLesson.sectionTitle))
      setAndEmit(sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => lesson.id === activeLesson.id ? {
          ...lesson,
          title: updated?.title ?? title,
          type: (updated?.lessonType as LessonType | undefined) ?? lessonType,
          description: updated?.description ?? description,
          videoUrl: updated?.videoUrl ?? videoUrl,
          fileUrl: updated?.fileUrl ?? fileUrl,
          durationMinutes: updated?.durationMinutes ?? (Number(durationMinutes) || 0),
          quizSettings: updated?.quizSettings ?? quizSettings,
        } : lesson),
      })))
      toast.success('Materi tersimpan')
      router.refresh()
    } catch {
      toast.error('Gagal simpan materi')
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[10px] bg-slate-50 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
      <div className="flex h-[calc(100vh-180px)] flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-r-2 border-r-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-[2px_0_8px_rgba(0,0,0,0.04)] lg:w-[380px]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Curriculum</h2>
            <Button size="sm" variant="secondary" onClick={() => openImportMaterials(sections[0]?.id ?? 'section-default')} className="h-8 bg-blue-50 text-xs text-blue-700 hover:bg-blue-100">
              <Upload className="mr-1.5 h-4 w-4" />
              Import SCORM
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    activeLessonId={activeLessonId}
                    updateSectionTitle={updateSectionTitle}
                    onAddLesson={openAddLesson}
                    onImportMaterials={openImportMaterials}
                    onSelectLesson={setActiveLessonId}
                    onDeleteLesson={handleDeleteLesson}
                    onDuplicateLesson={handleDuplicateLesson}
                    removeSection={removeSection}
                    onReorderLessons={handleReorderLessons}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <Button variant="outline" onClick={addSection} className="h-10 w-full border-dashed border-blue-300 bg-blue-50/50 text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50">
              <Plus className="mr-2 h-4 w-4" />
              New section
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-white">
          {activeLesson ? (
            <form onSubmit={handleUpdateLesson} className="flex min-h-full flex-col">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-5 xl:flex-row xl:items-center">
                <div className="flex h-10 shrink-0 items-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
                  {lessonIcon(lessonType)}
                  {lessonLabel(lessonType)}
                </div>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} className="h-10 flex-1 text-base" required />
                {isQuizType(lessonType) && (
                  <Button type="button" variant="outline" onClick={() => setQuestionsLibraryOpen(true)} className="h-10 shrink-0 border-blue-500 text-blue-700">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Questions library
                  </Button>
                )}
                <Button type="submit" disabled={loading || uploadingFile} className="h-10 shrink-0 bg-blue-600 text-white hover:bg-blue-700">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>

              <div className="flex-1 p-5">
                <Tabs key={`${activeLesson.id}-${lessonType}`} defaultValue={isQuizType(lessonType) ? 'questions' : 'lesson'} className="gap-5">
                  <TabsList className="grid w-full max-w-xl grid-cols-3 rounded-md bg-slate-200 p-1">
                    <TabsTrigger value={isQuizType(lessonType) ? 'questions' : 'lesson'}>{isQuizType(lessonType) ? 'Questions' : 'Lesson'}</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="qa">Q&A</TabsTrigger>
                  </TabsList>

                  <TabsContent value={isQuizType(lessonType) ? 'questions' : 'lesson'} className="space-y-5">
                    {isQuizType(lessonType) ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">Questions</p>
                            <p className="text-sm text-slate-500">{activeLessonQuestions.length} soal untuk quiz ini.</p>
                          </div>
                          <Button asChild className="bg-blue-600 hover:bg-blue-700">
                            <Link href={`/dashboard/chitralearning-lms/lessons/${activeLesson.id}/quiz-builder`}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add question
                            </Link>
                          </Button>
                        </div>
                        {activeLessonQuestions.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                            <FileQuestion className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                            <p className="font-medium text-slate-900">Belum ada soal untuk quiz ini.</p>
                            <p className="mt-1 text-sm text-slate-500">Klik Add question untuk menambah soal.</p>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {activeLessonQuestions.map((question, index) => (
                              <div key={question.id} className="border-b border-slate-100 p-4 last:border-b-0">
                                <div className="flex items-start gap-4">
                                  <div className="min-w-0 flex-1 space-y-3">
                                    <div className="font-medium text-slate-950 [&_img]:mt-2 [&_img]:max-h-48 [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain">
                                      <span className="mr-2 text-slate-400">{index + 1}.</span>
                                      <span dangerouslySetInnerHTML={{ __html: question.questionText }} />
                                    </div>
                                    {question.questionImageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={question.questionImageUrl} alt="Gambar pertanyaan" className="h-32 w-56 rounded-md border border-slate-200 object-cover" />
                                    ) : null}
                                    <div className="grid gap-2 text-sm md:grid-cols-2">
                                      {[
                                        ['A', question.optionA, question.optionAImageUrl],
                                        ['B', question.optionB, question.optionBImageUrl],
                                        ['C', question.optionC, question.optionCImageUrl],
                                        ['D', question.optionD, question.optionDImageUrl],
                                      ].map(([key, value, imageUrl]) => (
                                        <div
                                          key={key}
                                          className={[
                                            'space-y-2 rounded-md border px-3 py-2',
                                            question.correctOption === key
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                              : 'border-slate-200 bg-slate-50 text-slate-700',
                                          ].join(' ')}
                                        >
                                          <div>
                                            <span className="mr-2 font-bold">{key}.</span>
                                            {value}
                                          </div>
                                          {imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={String(imageUrl)} alt={`Opsi ${key}`} className="h-24 w-full rounded-md object-cover" />
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <Button type="button" variant="outline" size="icon" asChild>
                                      <Link href={`/dashboard/chitralearning-lms/lessons/${activeLesson.id}/quiz-builder`}>
                                        <Edit2 className="h-4 w-4 text-slate-500" />
                                      </Link>
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" onClick={() => handleDeleteQuestion(question.id)}>
                                      <Trash2 className="h-4 w-4 text-rose-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid max-w-3xl gap-5">
                        <div className="grid gap-2">
                          <Label>Lesson duration</Label>
                          <Input type="number" min="0" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} placeholder="Example: 120" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch disabled />
                          <span className="text-sm font-medium text-slate-700">Lesson preview</span>
                        </div>
                        <div className="grid gap-2">
                          <Label>Short description of the lesson</Label>
                          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[180px]" placeholder="Tulis ringkasan lesson." />
                        </div>
                        {lessonType === 'video' ? (
                          <div className="grid gap-2">
                            <Label>Lesson content</Label>
                            <div className="flex gap-2">
                              <Input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." className="flex-1" />
                              <input id="lesson-video-upload" type="file" className="hidden" onChange={handleVideoUpload} accept="video/mp4,video/webm,video/quicktime" />
                              <Button type="button" variant="outline" onClick={() => document.getElementById('lesson-video-upload')?.click()} disabled={uploadingFile} className="shrink-0">
                                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </Button>
                            </div>
                            {videoUrl && (
                              <div className="mt-2">
                                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                                  <div className="aspect-video w-full max-w-xl rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-sm text-slate-500">
                                    YouTube embed preview
                                  </div>
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <video src={videoUrl} controls controlsList="nodownload" disablePictureInPicture onContextMenu={(event) => event.preventDefault()} className="w-full max-w-xl rounded-md border border-slate-200" />
                                )}
                              </div>
                            )}
                          </div>
                        ) : lessonType === 'google_slide' ? (
                          <div className="grid gap-2">
                            <Label>Embed Link Google Slide</Label>
                            <Input 
                               value={fileUrl} 
                               onChange={(event) => setFileUrl(event.target.value)} 
                               placeholder='<iframe src="https://docs.google.com/presentation/d/e/.../pubembed?..." ...></iframe>' 
                            />
                            {fileUrl && fileUrl.includes('<iframe') && (
                              <div className="mt-2 w-full max-w-xl overflow-hidden rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-80" dangerouslySetInnerHTML={{ __html: fileUrl }} />
                            )}
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <Label>Lesson materials</Label>
                            <div className="flex gap-2">
                              <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="URL file atau upload dokumen" />
                              <input id="lesson-file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx" />
                              <Button type="button" variant="outline" onClick={() => document.getElementById('lesson-file-upload')?.click()} disabled={uploadingFile}>
                                {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </Button>
                            </div>
                            {uploadProgress !== null && <p className="text-xs font-medium text-slate-600">Upload materi {uploadProgress}%</p>}
                            <DocumentMaterialPreview fileUrl={fileUrl} />
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="settings" className="max-w-3xl space-y-5">
                    <div className="grid gap-2">
                      <Label>Short description of the quiz / lesson</Label>
                      <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[120px]" placeholder="Quiz description" />
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Duration (minutes)</Label>
                        <Input type="number" min="0" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} placeholder="Enter duration" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Time unit</Label>
                        <Select defaultValue="minutes">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="minutes">Minutes</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { key: 'randomizeQuestions', label: 'Randomize questions' },
                        { key: 'randomizeAnswers', label: 'Randomize answers' },
                        { key: 'showCorrectAnswer', label: 'Show correct answer' },
                        { key: 'attemptHistory', label: 'Quiz Attempt History' },
                        { key: 'retakeAfterPass', label: 'Retake After Pass' },
                        { key: 'limitAttempts', label: 'Limited attempts to retake quizzes' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                          <Switch 
                            checked={!!quizSettings?.[key]} 
                            onCheckedChange={(checked) => setQuizSettings({ ...quizSettings, [key]: checked })} 
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="rounded-md bg-slate-100 p-4 text-sm text-slate-700">
                      <span className="font-semibold text-slate-950">Hint:</span> 4.5 Points = 80-89% or "A" grade
                    </div>
                  </TabsContent>

                  <TabsContent value="qa">
                    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      Q&A lesson belum aktif.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </form>
          ) : (
            <div className="flex min-h-[400px] items-center justify-center p-8 text-center">
              <div>
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-900">Pilih lesson atau tambah materi baru.</p>
                <p className="mt-1 text-sm text-slate-500">Curriculum tree di kiri jadi pusat kerja builder.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Materi Baru</DialogTitle>
            <DialogDescription>Tambah lesson atau quiz ke section aktif.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLesson} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Tipe Materi</Label>
              <Select value={lessonType} onValueChange={(value: LessonType) => setLessonType(value)}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="article">Text lesson / Dokumen</SelectItem>
                  <SelectItem value="google_slide">Google Slide</SelectItem>
                  <SelectItem value="pretest">Pre-test</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="posttest">Post-test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Judul Materi</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Masukkan judul" required />
            </div>
            <div className="grid gap-2">
              <Label>Deskripsi Singkat</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Penjelasan singkat materi" />
            </div>
            {lessonType === 'video' && (
              <div className="grid gap-2">
                <Label>URL Video</Label>
                <div className="flex gap-2">
                  <Input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtube.com/watch?v=... atau upload" />
                  <input id="new-lesson-video-upload" type="file" className="hidden" onChange={handleVideoUpload} accept="video/mp4,video/webm" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('new-lesson-video-upload')?.click()} disabled={uploadingFile}>
                    {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {lessonType === 'article' && (
              <div className="grid gap-2">
                <Label>File materi / SCORM</Label>
                <div className="flex gap-2">
                  <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="URL file atau upload" />
                  <input id="new-lesson-file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".zip,.pdf,.doc,.docx,.ppt,.pptx" />
                  <Button type="button" variant="outline" onClick={() => document.getElementById('new-lesson-file-upload')?.click()} disabled={uploadingFile}>
                    {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {uploadProgress !== null && <p className="text-xs font-medium text-slate-600">Upload materi {uploadProgress}%</p>}
                <DocumentMaterialPreview fileUrl={fileUrl} />
              </div>
            )}
            {lessonType === 'google_slide' && (
              <div className="grid gap-2">
                <Label>Embed Link Google Slide</Label>
                <Input 
                   value={fileUrl} 
                   onChange={(event) => setFileUrl(event.target.value)} 
                   placeholder='<iframe src="https://docs.google.com/presentation/d/e/.../pubembed?..." ...></iframe>' 
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Estimasi Durasi (menit)</Label>
              <Input type="number" min="0" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Materi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {activeLesson && (
        <QuestionsLibraryDialog 
          open={questionsLibraryOpen} 
          onOpenChange={setQuestionsLibraryOpen}
          courseId={courseId}
          lessonId={parseInt(activeLesson.id, 10)}
          onSuccess={(copiedQuestions) => {
            setQuestions((current) => [...current, ...copiedQuestions])
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
