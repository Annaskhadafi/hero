'use client'

import { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function CertificateViewer({ template, variables }: { template: any, variables: Record<string, string> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<fabric.StaticCanvas | null>(null)

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      // Use StaticCanvas for view-only
      const initCanvas = new fabric.StaticCanvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff'
      })
      setCanvas(initCanvas)

      if (template?.canvasData && Object.keys(template.canvasData).length > 0) {
        initCanvas.loadFromJSON(template.canvasData).then(() => {
          // Replace variables
          const objects = initCanvas.getObjects()
          objects.forEach(obj => {
            if (obj.type === 'i-text' || obj.type === 'text') {
              const textObj = obj as fabric.IText
              let text = textObj.text || ''
              
              // Replace all matching {{var}}
              Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g')
                text = text.replace(regex, variables[key])
              })
              
              textObj.set({ text })
            }
          })
          initCanvas.renderAll()
        })
      }
      
      return () => {
        initCanvas.dispose()
      }
    }
  }, [canvasRef, canvas, template, variables])

  useEffect(() => {
    if (canvas && template.backgroundImageUrl) {
      fabric.FabricImage.fromURL(template.backgroundImageUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (!img) return;
        canvas.backgroundImage = img;
        img.scaleX = canvas.width! / img.width!;
        img.scaleY = canvas.height! / img.height!;
        canvas.renderAll()
      })
    }
  }, [canvas, template])

  function handleDownload() {
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 })
    const link = document.createElement('a')
    link.download = `Sertifikat-${variables.employeeName}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="border border-slate-300 shadow-sm max-w-full overflow-x-auto relative rounded-md bg-white">
        <canvas ref={canvasRef} />
      </div>
      <div className="mt-6 flex justify-center">
        <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
          <Download className="h-4 w-4 mr-2" />
          Download Sertifikat (PNG)
        </Button>
      </div>
    </div>
  )
}
