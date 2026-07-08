'use client'

import { useEffect, useRef, useState } from 'react'
import * as fabric from 'fabric'
import QRCode from 'qrcode'
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
        let jsonData = JSON.stringify(template.canvasData)
        jsonData = jsonData.replace(/https?:\/\/[^"'\s\\]+\/(upload|attendance-photos|profile-photos|curhat)\/([^"'\s\\]+)/g, '/api/uploads/$1/$2')
        initCanvas.loadFromJSON(JSON.parse(jsonData)).then(() => {
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
          
          // Render QR Code
          const qrcodePlaceholder = objects.find(obj => obj.name === 'qrcode_placeholder')
          if (qrcodePlaceholder && variables.certificateNumber) {
            const verificationUrl = `${window.location.origin}/verify-certificate/${variables.certificateNumber}`
            QRCode.toDataURL(verificationUrl, { margin: 1, scale: 4 }).then(dataUrl => {
              fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then(img => {
                if (img) {
                  img.set({
                    left: qrcodePlaceholder.left,
                    top: qrcodePlaceholder.top,
                  })
                  // Scale to fit the placeholder size (which is 100x100)
                  const scaleX = (qrcodePlaceholder.width || 100) / img.width!
                  const scaleY = (qrcodePlaceholder.height || 100) / img.height!
                  img.scaleX = scaleX
                  img.scaleY = scaleY
                  
                  initCanvas.remove(qrcodePlaceholder)
                  initCanvas.add(img)
                  initCanvas.renderAll()
                }
              })
            })
          }

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
      const getProxiedUrl = (url: string) => {
        if (!url || url.startsWith('/')) return url;
        const match = url.match(/(?:upload|attendance-photos|profile-photos|curhat)\/.+/);
        return match ? `/api/uploads/${match[0]}` : url;
      };
      
      const proxyUrl = getProxiedUrl(template.backgroundImageUrl);
      
      fabric.FabricImage.fromURL(proxyUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (!img) return;
        img.set({
          scaleX: canvas.width! / img.width!,
          scaleY: canvas.height! / img.height!,
          originX: 'left',
          originY: 'top'
        });
        canvas.backgroundImage = img;
        canvas.renderAll()
      }).catch(err => {
        console.error("Fabric load error:", err);
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
