'use client'

import { useEffect, useRef } from 'react'
import * as fabric from 'fabric'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function CertificateViewer({ variables }: { variables: Record<string, string> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasInstanceRef = useRef<fabric.StaticCanvas | null>(null)

  // Extract variables to avoid object reference dependency issues in useEffect
  const { employeeName, courseTitle, date, certificateNumber } = variables

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize canvas
    const canvas = new fabric.StaticCanvas(canvasRef.current, {
      width: 1000,
      height: 707,
      backgroundColor: '#ffffff'
    })
    canvasInstanceRef.current = canvas

    // Load background image
    const bgUrl = '/CERTIFICATE-LMS-CLEAR.png'
    fabric.FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (img && canvasInstanceRef.current) {
        img.set({
          scaleX: 1000 / img.width!,
          scaleY: 707 / img.height!,
          originX: 'left',
          originY: 'top'
        })
        canvas.backgroundImage = img
        canvas.renderAll()
      }
    }).catch(err => {
      console.error("Failed to load certificate background image:", err)
    })

    // Add Name Text
    const nameText = new fabric.Text(employeeName || '', {
      left: 500,
      top: 310,
      originX: 'center',
      originY: 'center',
      fontSize: 38,
      fontWeight: 'bold',
      fontFamily: 'Georgia, serif',
      fill: '#0f172a',
      textAlign: 'center'
    })
    canvas.add(nameText)

    // Add Course Title Text
    const courseText = new fabric.Text(courseTitle || '', {
      left: 500,
      top: 455,
      originX: 'center',
      originY: 'center',
      fontSize: 24,
      fontWeight: 'bold',
      fontFamily: 'Georgia, serif',
      fill: '#1e40af',
      textAlign: 'center'
    })
    canvas.add(courseText)

    // Add Date Text (aligned under pre-printed 'ON')
    const dateText = new fabric.Text(date || '', {
      left: 500,
      top: 635,
      originX: 'center',
      originY: 'center',
      fontSize: 20,
      fontWeight: 'bold',
      fontStyle: 'italic',
      fontFamily: 'Georgia, serif',
      fill: '#0f172a',
      textAlign: 'center'
    })
    canvas.add(dateText)

    // Add Certificate Number Text above QR Code
    const certNoText = new fabric.Text(`No: ${certificateNumber || ''}`, {
      left: 140,
      top: 545,
      originX: 'center',
      originY: 'center',
      fontSize: 15,
      fontWeight: 'bold',
      fontFamily: 'Georgia, serif',
      fill: '#475569',
      textAlign: 'center'
    })
    canvas.add(certNoText)

    // Add QR Code at the bottom left corner
    if (certificateNumber) {
      const verificationUrl = `${window.location.origin}/verify-certificate/${certificateNumber}`
      QRCode.toDataURL(verificationUrl, { margin: 1, scale: 4 }).then(dataUrl => {
        fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then(qrImg => {
          if (qrImg && canvasInstanceRef.current) {
            qrImg.set({
              left: 140,
              top: 560,
              originX: 'center',
              originY: 'top',
              scaleX: 80 / qrImg.width!,
              scaleY: 80 / qrImg.height!,
            })
            canvas.add(qrImg)
            
            // Add PT Chitra Paratama Text below QR Code
            const ptText = new fabric.Text('PT Chitra Paratama', {
              left: 140,
              top: 650,
              originX: 'center',
              originY: 'top',
              fontSize: 11,
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              fill: '#475569',
              textAlign: 'center'
            })
            canvas.add(ptText)
            
            canvas.renderAll()
          }
        })
      })
    }

    canvas.renderAll()

    return () => {
      canvas.dispose()
      canvasInstanceRef.current = null
    }
  }, [employeeName, courseTitle, date, certificateNumber])

  function handleDownloadPng() {
    const canvas = canvasInstanceRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
    const link = document.createElement('a')
    link.download = `Sertifikat-${employeeName}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleDownloadJpg() {
    const canvas = canvasInstanceRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 1, multiplier: 2 })
    const link = document.createElement('a')
    link.download = `Sertifikat-${employeeName}.jpg`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleDownloadPdf() {
    const canvas = canvasInstanceRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 })
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Sertifikat - ${employeeName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-color: #fff;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            @media print {
              body {
                background: none;
              }
              img {
                width: 100vw;
                height: 100vh;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center">
      <div className="relative aspect-[1000/707] w-full max-w-[1000px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm [&_canvas]:!h-auto [&_canvas]:!w-full">
        <canvas ref={canvasRef} className="block h-auto max-w-full" />
      </div>
      <div className="mt-5 grid w-full gap-2.5 sm:mt-6 sm:w-auto sm:grid-cols-3 sm:gap-3">
        <Button onClick={handleDownloadPng} className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Download PNG
        </Button>
        <Button onClick={handleDownloadJpg} className="w-full bg-slate-700 hover:bg-slate-800 sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Download JPG
        </Button>
        <Button onClick={handleDownloadPdf} className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}
