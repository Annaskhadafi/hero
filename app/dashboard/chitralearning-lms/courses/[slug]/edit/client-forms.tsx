'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCourseBaseInfo, updateCourseSettings } from '../../../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { uploadFile } from '@/app/actions/upload'
import { toast } from 'sonner'

export function EditCourseInfoForm({ course, categories }: { course: any, categories: any[] }) {
  const [title, setTitle] = useState(course.title || '')
  const [description, setDescription] = useState(course.description || '')
  const [categoryId, setCategoryId] = useState(course.categoryId?.toString() || '')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [level, setLevel] = useState(course.level || 'beginner')
  const [coverImageUrl, setCoverImageUrl] = useState(course.coverImageUrl || '')
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(course.videoPreviewUrl || '')
  
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleUploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', e.target.files[0])
    try {
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setCoverImageUrl(res.url)
      } else {
        toast.error('Gagal upload gambar')
      }
    } catch (err) {
      toast.error('Error saat upload gambar')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('categoryId', categoryId)
      
      const catName = categoryId === 'new' ? newCategoryName : (categories.find(c => c.id.toString() === categoryId)?.name || 'Internal')
      formData.append('categoryName', catName)
      if (categoryId === 'new') {
        formData.append('newCategoryName', newCategoryName)
      }
      formData.append('level', level)
      formData.append('coverImageUrl', coverImageUrl)
      formData.append('videoPreviewUrl', videoPreviewUrl)

      await updateCourseBaseInfo(course.id, formData)
      toast.success('Informasi dasar berhasil diperbarui.')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan perubahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Judul Kursus</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
              <SelectItem value="new">Tulis Manual...</SelectItem>
            </SelectContent>
          </Select>
          {categoryId === 'new' && (
            <Input 
              placeholder="Masukkan nama kategori baru" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)} 
              required
            />
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Tingkat (Level)</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Deskripsi Kursus</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[120px]" />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Cover Image URL (Upload System)</Label>
          <div className="flex gap-2">
            <Input value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="/api/uploads/..." />
            <div className="relative">
              <Button type="button" variant="secondary" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleUploadCover}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Video Preview (YouTube / Vimeo)</Label>
          <Input value={videoPreviewUrl} onChange={e => setVideoPreviewUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Informasi
        </Button>
      </div>
    </form>
  )
}


export function EditCourseSettingsForm({ course }: { course: any }) {
  const [status, setStatus] = useState(course.status || 'draft')
  const [passingScore, setPassingScore] = useState(course.passingScore?.toString() || '80')
  const [dueDays, setDueDays] = useState(course.dueDays?.toString() || '30')
  const [certificateEnabled, setCertificateEnabled] = useState(course.certificateEnabled ? 'yes' : 'no')
  
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('status', status)
      formData.append('passingScore', passingScore)
      formData.append('dueDays', dueDays)
      formData.append('certificateEnabled', certificateEnabled)

      await updateCourseSettings(course.id, formData)
      toast.success('Pengaturan berhasil diperbarui.')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan perubahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Nilai Kelulusan (%)</Label>
          <Input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min="0" max="100" />
        </div>
        
        <div className="space-y-2">
          <Label>Batas Waktu Penyelesaian (Hari)</Label>
          <Input type="number" value={dueDays} onChange={e => setDueDays(e.target.value)} min="1" />
        </div>
        
        <div className="space-y-2">
          <Label>Sertifikat</Label>
          <Select value={certificateEnabled} onValueChange={setCertificateEnabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Aktifkan Sertifikat</SelectItem>
              <SelectItem value="no">Tanpa Sertifikat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  )
}
