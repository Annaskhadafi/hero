'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { getInternalLmsAllQuestionsAction, copyInternalLmsQuestionsAction } from '@/app/dashboard/chitralearning-lms/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function QuestionsLibraryDialog({ 
  open, 
  onOpenChange, 
  courseId,
  lessonId,
  onSuccess
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: number
  lessonId: number
  onSuccess?: (questions: any[]) => void
}) {
  const [loading, setLoading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const router = useRouter()

  useEffect(() => {
    if (open) {
      loadQuestions()
      setSelectedIds(new Set())
    }
  }, [open])

  async function loadQuestions() {
    setLoading(true)
    try {
      const data = await getInternalLmsAllQuestionsAction()
      // Filter out questions that are already in the current lesson
      setQuestions(data.filter(q => q.lessonTitle !== undefined)) // Maybe filter out current lesson?
    } catch (e) {
      toast.error('Gagal memuat bank soal')
    } finally {
      setLoading(false)
    }
  }

  const filtered = questions.filter(q => 
    q.questionText.toLowerCase().includes(search.toLowerCase()) || 
    (q.courseTitle || '').toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleCopy = async () => {
    if (selectedIds.size === 0) return
    setCopying(true)
    try {
      const result = await copyInternalLmsQuestionsAction(Array.from(selectedIds), courseId, lessonId)
      toast.success(`${selectedIds.size} soal berhasil ditambahkan`)
      onOpenChange(false)
      onSuccess?.(result.questions || [])
      router.refresh()
    } catch (e) {
      toast.error('Gagal menyalin soal')
    } finally {
      setCopying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Questions Library</DialogTitle>
          <DialogDescription>
            Pilih soal dari kursus lain untuk ditambahkan ke quiz ini.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari pertanyaan atau nama kursus..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-md">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                Tidak ada soal yang ditemukan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(q => (
                  <label key={q.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                    <Checkbox 
                      checked={selectedIds.has(q.id)} 
                      onCheckedChange={() => toggleSelect(q.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div 
                        className="text-sm font-medium text-slate-900 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: q.questionText }}
                      />
                      <div className="text-xs text-slate-500 mt-1">
                        Dari: {q.courseTitle} - {q.lessonTitle}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-auto pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleCopy} disabled={selectedIds.size === 0 || copying} className="bg-blue-600 hover:bg-blue-700">
            {copying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Tambahkan {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} Soal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
