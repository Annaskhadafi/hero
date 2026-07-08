'use client'

import { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Type, Image as ImageIcon } from 'lucide-react'
import { uploadFile } from '@/app/actions/upload'
import { toast } from 'sonner'
import { updateCertificateTemplateAction } from '../../../actions'

export function CertificateBuilder({ courseId, initialTemplate }: { courseId: number, initialTemplate: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null)
  const [loading, setLoading] = useState(false)
  const [bgUrl, setBgUrl] = useState(initialTemplate?.backgroundImageUrl || '')

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      const initCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#f1f5f9'
      })
      setCanvas(initCanvas)

      if (initialTemplate?.canvasData && Object.keys(initialTemplate.canvasData).length > 0) {
        initCanvas.loadFromJSON(initialTemplate.canvasData).then(() => {
          initCanvas.renderAll()
        })
      }
      
      return () => {
        initCanvas.dispose()
      }
    }
  }, [canvasRef, canvas, initialTemplate])

  useEffect(() => {
    if (canvas && bgUrl) {
      fabric.FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (!img) return;
        canvas.backgroundImage = img;
        img.scaleX = canvas.width! / img.width!;
        img.scaleY = canvas.height! / img.height!;
        canvas.renderAll()
      })
    }
  }, [canvas, bgUrl])

  async function handleUploadBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      if (res.success) {
        setBgUrl(res.url)
      }
    } catch (err) {
      toast.error('Gagal upload background')
    }
  }

  function addVariableText(text: string) {
    if (!canvas) return
    const textObj = new fabric.IText(text, {
      left: canvas.width! / 2 - 100,
      top: canvas.height! / 2,
      fontFamily: 'Arial',
      fontSize: 40,
      fill: '#000000',
      editable: true,
      textAlign: 'center'
    })
    canvas.add(textObj)
    canvas.setActiveObject(textObj)
    canvas.renderAll()
  }
  
  function deleteSelected() {
    if (!canvas) return
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length) {
      canvas.discardActiveObject()
      activeObjects.forEach(obj => canvas.remove(obj))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas && canvas.getActiveObject()) {
          const active = canvas.getActiveObject() as fabric.IText
          if (active && active.isEditing) return
          deleteSelected()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canvas])

  async function handleSave() {
    if (!canvas) return
    setLoading(true)
    try {
      const json = canvas.toJSON()
      await updateCertificateTemplateAction(courseId, bgUrl, json)
      toast.success('Template sertifikat berhasil disimpan')
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4 items-end flex-wrap">
        <div className="space-y-2">
          <Label>Upload Background</Label>
          <Input type="file" accept="image/*" onChange={handleUploadBackground} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => addVariableText('{{employeeName}}')}>
            <Type className="h-4 w-4 mr-2" />
            Nama Karyawan
          </Button>
          <Button type="button" variant="outline" onClick={() => addVariableText('{{courseTitle}}')}>
            <Type className="h-4 w-4 mr-2" />
            Nama Kursus
          </Button>
          <Button type="button" variant="outline" onClick={() => addVariableText('{{date}}')}>
            <Type className="h-4 w-4 mr-2" />
            Tanggal
          </Button>
          <Button type="button" variant="outline" onClick={() => addVariableText('{{certificateNumber}}')}>
            <Type className="h-4 w-4 mr-2" />
            No. Sertifikat
          </Button>
        </div>
      </div>
      
      <div className="border border-slate-300 inline-block bg-slate-100 shadow-sm relative overflow-hidden rounded-md max-w-full overflow-x-auto">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-slate-500">Hint: Klik text untuk mengedit. Drag untuk memindahkan. Tekan Delete/Backspace untuk menghapus elemen.</p>

      <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="mr-2 h-4 w-4" /> Simpan Template</>}
        </Button>
      </div>
    </div>
  )
}
