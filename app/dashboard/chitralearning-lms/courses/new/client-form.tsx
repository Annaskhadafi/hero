'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCourse } from '../../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { uploadFile } from '@/app/actions/upload'

export function NewCourseForm({ categories }: { categories: any[] }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [level, setLevel] = useState('beginner')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  
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
        alert('Gagal upload gambar')
      }
    } catch (err) {
      alert('Error saat upload gambar')
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

      const slug = await createCourse(formData)
      router.push(`/dashboard/chitralearning-lms/courses/${slug}/edit`)
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Buat Course Baru</CardTitle>
          <CardDescription>Lengkapi informasi dasar kursus Anda.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Judul Course *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pengenalan K3 Tambang"
                autoFocus
                required
              />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi Kursus</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="min-h-[120px]" 
                placeholder="Jelaskan secara singkat materi yang akan dipelajari..."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label>Video Preview (YouTube / Vimeo)</Label>
                <Input value={videoPreviewUrl} onChange={e => setVideoPreviewUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-slate-50 border-t border-slate-100 p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/chitralearning-lms/catalog')}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat & Lanjut ke Kurikulum
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
