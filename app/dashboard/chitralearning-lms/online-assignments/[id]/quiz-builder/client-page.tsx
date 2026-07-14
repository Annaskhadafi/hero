'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Checkbox } from '@/components/ui/checkbox'
import { uploadFile } from '@/app/actions/upload'
import { toast } from 'sonner'
import { createOnlineAssignmentQuestionAction, updateOnlineAssignmentQuestionAction, deleteOnlineAssignmentQuestionAction } from '@/app/dashboard/chitralearning-lms/actions'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

const IMAGE_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Hanya file gambar (JPG, PNG, WebP, GIF) yang diizinkan.'
  if (file.size > IMAGE_MAX_SIZE) return `Ukuran gambar maks 5MB. File Anda ${(file.size / 1024 / 1024).toFixed(1)}MB.`
  return null
}

export function OnlineAssignmentQuizBuilder({ campaignId, initialQuestions }: { campaignId: number, initialQuestions: any[] }) {
  const [loading, setLoading] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [questionRows, setQuestionRows] = useState<any[]>(initialQuestions)
  const router = useRouter()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  const [questionType, setQuestionType] = useState('single_choice')
  const [questionText, setQuestionText] = useState('')
  const [questionImageUrl, setQuestionImageUrl] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionAImageUrl, setOptionAImageUrl] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionBImageUrl, setOptionBImageUrl] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionCImageUrl, setOptionCImageUrl] = useState('')
  const [optionD, setOptionD] = useState('')
  const [optionDImageUrl, setOptionDImageUrl] = useState('')
  const [correctOption, setCorrectOption] = useState('A')

  const [matrixRows, setMatrixRows] = useState<{ text: string; answer: string }[]>([
    { text: '', answer: 'A' },
    { text: '', answer: 'B' },
    { text: '', answer: 'C' },
    { text: '', answer: 'D' },
  ])

  const handleMultipleChoiceToggle = (key: string) => {
    const current = correctOption.split(',').filter(Boolean)
    if (current.includes(key)) {
      setCorrectOption(current.filter(k => k !== key).join(','))
    } else {
      setCorrectOption([...current, key].sort().join(','))
    }
  }

  const doUpload = async (file: File, fieldKey: string, setImageUrl: (url: string) => void) => {
    const err = validateImageFile(file)
    if (err) { toast.error(err); return }
    setUploadingField(fieldKey)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      if (!res.success || !res.url) throw new Error(res.error || 'Upload gagal')
      setImageUrl(res.readableUrl || res.url)
      toast.success('Gambar terupload')
    } catch {
      toast.error('Gagal upload gambar')
    } finally {
      setUploadingField(null)
    }
  }

  const handlePasteImage = async (event: React.ClipboardEvent, fieldKey: string, setImageUrl: (url: string) => void) => {
    const file = Array.from(event.clipboardData.files).find(f => f.type.startsWith('image/'))
    if (!file) return
    event.preventDefault()
    await doUpload(file, fieldKey, setImageUrl)
  }

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>, fieldKey: string, setImageUrl: (url: string) => void) => {
    const file = event.target.files?.[0]
    if (!file) return
    await doUpload(file, fieldKey, setImageUrl)
    event.target.value = ''
  }

  const openAddDialog = () => {
    setEditingQuestion(null)
    setQuestionType('single_choice')
    setQuestionText('')
    setQuestionImageUrl('')
    setOptionA(''); setOptionAImageUrl('')
    setOptionB(''); setOptionBImageUrl('')
    setOptionC(''); setOptionCImageUrl('')
    setOptionD(''); setOptionDImageUrl('')
    setCorrectOption('A')
    setMatrixRows([
      { text: '', answer: 'A' },
      { text: '', answer: 'B' },
      { text: '', answer: 'C' },
      { text: '', answer: 'D' },
    ])
    setDialogOpen(true)
  }

  const openEditDialog = (q: any) => {
    setEditingQuestion(q)
    setQuestionType(q.questionType || 'single_choice')
    setQuestionText(q.questionText)
    setQuestionImageUrl(q.questionImageUrl || '')
    setOptionA(q.optionA); setOptionAImageUrl(q.optionAImageUrl || '')
    setOptionB(q.optionB); setOptionBImageUrl(q.optionBImageUrl || '')
    setOptionC(q.optionC); setOptionCImageUrl(q.optionCImageUrl || '')
    setOptionD(q.optionD); setOptionDImageUrl(q.optionDImageUrl || '')
    setCorrectOption(q.correctOption)
    
    if (q.questionType === 'image_matching') {
      if (q.questionMetadata?.matrixRows) {
        setMatrixRows(q.questionMetadata.matrixRows)
      } else {
        const correctAnswers = (q.correctOption || '').split(',')
        setMatrixRows([
          { text: q.optionA || '', answer: correctAnswers[0] || 'A' },
          { text: q.optionB || '', answer: correctAnswers[1] || 'B' },
          { text: q.optionC || '', answer: correctAnswers[2] || 'C' },
          { text: q.optionD || '', answer: correctAnswers[3] || 'D' },
        ].filter(r => r.text !== ''))
      }
    } else {
      setMatrixRows([
        { text: '', answer: 'A' },
        { text: '', answer: 'B' },
        { text: '', answer: 'C' },
        { text: '', answer: 'D' },
      ])
    }

    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus soal ini?')) return
    try {
      await deleteOnlineAssignmentQuestionAction(id)
      setQuestionRows(current => current.filter(q => q.id !== id))
      toast.success('Soal dihapus')
      router.refresh()
    } catch {
      toast.error('Gagal menghapus soal')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!questionText.replace(/<[^>]+>/g, '').trim() && !questionText.includes('<img') && !questionImageUrl) {
      toast.error('Pertanyaan wajib diisi')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('campaignId', String(campaignId))
      fd.append('questionType', questionType)
      fd.append('questionText', questionText)
      fd.append('questionImageUrl', questionImageUrl)
      fd.append('optionA', optionA); fd.append('optionAImageUrl', optionAImageUrl)
      fd.append('optionB', optionB); fd.append('optionBImageUrl', optionBImageUrl)
      fd.append('optionC', optionC); fd.append('optionCImageUrl', optionCImageUrl)
      fd.append('optionD', optionD); fd.append('optionDImageUrl', optionDImageUrl)
      
      let finalCorrectOption = correctOption
      if (questionType === 'image_matching') {
        fd.append('questionMetadata', JSON.stringify({ matrixRows }))
        fd.append('optionA', matrixRows[0]?.text || '-')
        fd.append('optionB', matrixRows[1]?.text || '-')
        fd.append('optionC', matrixRows[2]?.text || '-')
        fd.append('optionD', matrixRows[3]?.text || '-')
        finalCorrectOption = matrixRows.map(r => r.answer).join(',')
      }
      if (questionType === 'true_false' && !['A', 'B'].includes(finalCorrectOption)) {
        finalCorrectOption = 'A'
      }
      fd.append('correctOption', finalCorrectOption)

      if (editingQuestion) {
        const updated = await updateOnlineAssignmentQuestionAction(editingQuestion.id, fd)
        if (updated) setQuestionRows(current => current.map(q => q.id === updated.id ? updated : q))
        toast.success('Soal diperbarui')
      } else {
        const created = await createOnlineAssignmentQuestionAction(fd)
        if (created) setQuestionRows(current => [...current, created])
        toast.success('Soal ditambahkan')
      }
      setDialogOpen(false)
      router.refresh()
    } catch {
      toast.error('Gagal menyimpan soal')
    } finally {
      setLoading(false)
    }
  }

  const isUploading = (key: string) => uploadingField === key

  const formatQuestionTypeLabel = (type: string) => {
    switch(type) {
      case 'multiple_choice': return 'Multiple Choice'
      case 'true_false': return 'True / False'
      case 'fill_in_the_gap': return 'Fill in the Gap'
      case 'image_matching': return 'Image Matching'
      default: return 'Single Choice'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading">Kelola Soal Assignment</h2>
          <p className="text-slate-500 text-sm">Tambahkan soal untuk assignment online ini.</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Soal
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {questionRows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada soal untuk assignment ini.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questionRows.map((q, index) => (
              <div key={q.id} className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline" className="bg-slate-50 text-xs">
                        {formatQuestionTypeLabel(q.questionType || 'single_choice')}
                      </Badge>
                    </div>
                    <div className="font-medium text-slate-900 [&_img]:mt-2 [&_img]:max-h-48 [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 [&_img]:object-contain">
                      <span className="text-slate-400 mr-2">{index + 1}.</span>
                      <span dangerouslySetInnerHTML={{ __html: q.questionText }} />
                    </div>
                    {q.questionImageUrl && (
                      <div className="h-32 w-48 bg-slate-100 rounded-md overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.questionImageUrl} alt="Question" className="object-cover w-full h-full" />
                      </div>
                    )}
                    
                    {q.questionType === 'fill_in_the_gap' ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md">
                        <strong>Kunci Jawaban:</strong> {q.correctOption}
                      </div>
                    ) : q.questionType === 'image_matching' ? (
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        {[
                          ['Baris 1', q.optionA],
                          ['Baris 2', q.optionB],
                          ['Baris 3', q.optionC],
                          ['Baris 4', q.optionD],
                        ].map(([key, text], idx) => {
                          if (!text) return null;
                          const correctMatches = (q.correctOption || ',,,').split(',');
                          const matchLetter = correctMatches[idx] || '?';
                          return (
                            <div key={key} className="space-y-1 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                              <div><span className="font-bold mr-2">{key}:</span>{text}</div>
                              <div className="text-xs text-emerald-600 font-semibold">Cocok dengan Huruf: {matchLetter}</div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        {[
                          ['A', q.optionA, q.optionAImageUrl],
                          ['B', q.optionB, q.optionBImageUrl],
                          ...(q.questionType === 'true_false' ? [] : [
                            ['C', q.optionC, q.optionCImageUrl],
                            ['D', q.optionD, q.optionDImageUrl],
                          ])
                        ].map(([key, text, imageUrl]) => {
                          const isCorrect = q.questionType === 'multiple_choice' 
                            ? q.correctOption?.includes(key) 
                            : q.correctOption === key;
                          return (
                            <div key={key} className={`space-y-2 p-2 rounded-md ${isCorrect ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-50 border border-slate-100'}`}>
                              <div><span className="font-bold mr-2">{key}.</span>{text}</div>
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={String(imageUrl)} alt={`Opsi ${key}`} className="h-24 w-full rounded-md object-cover" />
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(q)}>
                      <Edit2 className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(q.id)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Soal' : 'Tambah Soal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipe Soal *</Label>
              <Select value={questionType} onValueChange={(val) => {
                setQuestionType(val);
                if (val === 'true_false') {
                  setOptionA('Benar'); setOptionB('Salah');
                  if (!['A', 'B'].includes(correctOption)) setCorrectOption('A');
                } else if (val === 'single_choice' && correctOption.includes(',')) {
                  setCorrectOption(correctOption.split(',')[0] || 'A');
                } else if (val === 'fill_in_the_gap') {
                  setOptionA(''); setOptionB(''); setOptionC(''); setOptionD('');
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Single Choice (1 Jawaban)</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice (&gt;1 Jawaban)</SelectItem>
                  <SelectItem value="true_false">True / False (Benar / Salah)</SelectItem>
                  <SelectItem value="fill_in_the_gap">Fill in the Gap (Isian)</SelectItem>
                  <SelectItem value="image_matching">Image Matching (Mencocokkan Gambar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pertanyaan *</Label>
              <div onPaste={(e) => handlePasteImage(e, 'question', setQuestionImageUrl)}>
                <RichTextEditor
                  value={questionText}
                  onChange={setQuestionText}
                  className="[&_.ql-container]:min-h-[120px]"
                  placeholder={questionType === 'fill_in_the_gap' ? "Gunakan [BLANK] untuk area yang harus diisi. Contoh: Ibukota Indonesia adalah [BLANK]." : "Tulis pertanyaan di sini..."}
                />
              </div>
              <p className="text-xs text-slate-500">Paste gambar di area pertanyaan untuk upload otomatis.</p>
            </div>

            <ImageUrlField
              label="Gambar Pertanyaan (Opsional)"
              value={questionImageUrl}
              onChange={setQuestionImageUrl}
              onUpload={(e) => handleFileInput(e, 'question-img', setQuestionImageUrl)}
              onPaste={(e) => handlePasteImage(e, 'question-img', setQuestionImageUrl)}
              uploading={isUploading('question-img')}
              inputId="oa-question-img-upload"
            />

            {questionType === 'fill_in_the_gap' ? (
              <div className="space-y-2 border-t pt-4">
                <Label>Kunci Jawaban Teks *</Label>
                <Input 
                  value={correctOption} 
                  onChange={(e) => setCorrectOption(e.target.value)} 
                  placeholder="Jawaban benar..."
                  required 
                />
                <p className="text-xs text-slate-500">Huruf besar/kecil tidak berpengaruh (Case Insensitive).</p>
              </div>
            ) : questionType === 'image_matching' ? (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium">Buat Baris Konsep dan Kunci Huruf pada Gambar</p>
                <div className="space-y-4">
                  {matrixRows.map((row, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 items-start sm:items-center relative">
                       <div className="flex-1 space-y-2 w-full">
                         <Label>Opsi Baris {idx + 1}</Label>
                         <Input 
                           value={row.text} 
                           onChange={e => {
                             const newRows = [...matrixRows];
                             newRows[idx].text = e.target.value;
                             setMatrixRows(newRows);
                           }} 
                           placeholder={`Teks untuk baris ke-${idx + 1}`} 
                         />
                       </div>
                       <div className="w-full sm:w-48 space-y-2 shrink-0">
                         <Label>Kunci Huruf</Label>
                         <Select 
                           value={row.answer} 
                           onValueChange={(val) => {
                             const newRows = [...matrixRows];
                             newRows[idx].answer = val;
                             setMatrixRows(newRows);
                           }}
                         >
                           <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                           <SelectContent>
                             {Array.from({ length: Math.max(matrixRows.length, 4) }).map((_, i) => {
                               const letter = String.fromCharCode(65 + i);
                               return <SelectItem key={letter} value={letter}>Huruf {letter}</SelectItem>;
                             })}
                           </SelectContent>
                         </Select>
                       </div>
                       {matrixRows.length > 2 && (
                         <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8"
                           onClick={() => {
                             const newRows = [...matrixRows];
                             newRows.splice(idx, 1);
                             setMatrixRows(newRows);
                           }}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => {
                      setMatrixRows([...matrixRows, { text: '', answer: String.fromCharCode(65 + matrixRows.length) }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Tambah Baris
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
                  {[
                    { label: 'Opsi A *', val: optionA, img: optionAImageUrl, setVal: setOptionA, setImg: setOptionAImageUrl, key: 'opt-a', inputId: 'oa-option-a-img-upload' },
                    { label: 'Opsi B *', val: optionB, img: optionBImageUrl, setVal: setOptionB, setImg: setOptionBImageUrl, key: 'opt-b', inputId: 'oa-option-b-img-upload' },
                    ...(questionType === 'true_false' ? [] : [
                      { label: 'Opsi C', val: optionC, img: optionCImageUrl, setVal: setOptionC, setImg: setOptionCImageUrl, key: 'opt-c', inputId: 'oa-option-c-img-upload' },
                      { label: 'Opsi D', val: optionD, img: optionDImageUrl, setVal: setOptionD, setImg: setOptionDImageUrl, key: 'opt-d', inputId: 'oa-option-d-img-upload' }
                    ])
                  ].map(opt => (
                    <OptionField
                      key={opt.key}
                      label={opt.label}
                      value={opt.val}
                      imageUrl={opt.img}
                      onChange={opt.setVal}
                      onImageChange={opt.setImg}
                      onImageUpload={(e) => handleFileInput(e, opt.key, opt.setImg)}
                      onPaste={(e) => handlePasteImage(e, opt.key, opt.setImg)}
                      inputId={opt.inputId}
                      uploading={isUploading(opt.key)}
                      required={opt.key === 'opt-a' || opt.key === 'opt-b'}
                    />
                  ))}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Kunci Jawaban *</Label>
                  {questionType === 'multiple_choice' ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['A', 'B', 'C', 'D'].map(key => (
                        <label key={key} className="flex items-center gap-2 border rounded p-2 cursor-pointer hover:bg-slate-50">
                          <Checkbox 
                            checked={correctOption.split(',').includes(key)}
                            onCheckedChange={() => handleMultipleChoiceToggle(key)}
                          />
                          <span>Opsi {key}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Select value={correctOption} onValueChange={setCorrectOption}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Opsi A</SelectItem>
                        <SelectItem value="B">Opsi B</SelectItem>
                        {questionType !== 'true_false' && (
                          <>
                            <SelectItem value="C">Opsi C</SelectItem>
                            <SelectItem value="D">Opsi D</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading || !!uploadingField}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Soal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImageUrlField({
  label, value, onChange, onUpload, onPaste, uploading, inputId,
}: {
  label: string; value: string; onChange: (v: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPaste: (e: React.ClipboardEvent) => void; uploading: boolean; inputId: string
}) {
  return (
    <div className="space-y-2" onPaste={onPaste}>
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="URL gambar, upload, atau paste..." />
        <Input type="file" className="hidden" id={inputId} onChange={onUpload} accept="image/jpeg,image/png,image/webp,image/gif" />
        <Button type="button" variant="outline" onClick={() => document.getElementById(inputId)?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      {value && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-28 max-w-full rounded-md border border-slate-200 object-cover" />
          <Button type="button" variant="secondary" size="icon" className="absolute -right-2 -top-2 h-7 w-7" onClick={() => onChange('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function OptionField({
  label, value, imageUrl, onChange, onImageChange, onImageUpload, onPaste, inputId, uploading, required,
}: {
  label: string; value: string; imageUrl: string; onChange: (v: string) => void
  onImageChange: (v: string) => void; onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPaste: (e: React.ClipboardEvent) => void; inputId: string; uploading: boolean; required?: boolean
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" onPaste={onPaste}>
      <Label>{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} required={required && !imageUrl} placeholder="Teks jawaban" />
      <div className="flex gap-2">
        <Input value={imageUrl} onChange={e => onImageChange(e.target.value)} placeholder="URL gambar jawaban" />
        <Input type="file" className="hidden" id={inputId} onChange={onImageUpload} accept="image/jpeg,image/png,image/webp,image/gif" />
        <Button type="button" variant="outline" onClick={() => document.getElementById(inputId)?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </Button>
      </div>
      {imageUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={label} className="h-28 w-full rounded-md border border-slate-200 object-cover" />
          <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={() => onImageChange('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
