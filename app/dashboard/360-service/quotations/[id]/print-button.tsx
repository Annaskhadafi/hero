"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"
import { Download, Loader2 } from "lucide-react"

export function PrintButton() {
  const searchParams = useSearchParams()
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      const pages = document.querySelectorAll('.pdf-wrapper')
      
      if (!pages || pages.length === 0) {
        alert("No pages found to generate PDF")
        setIsGenerating(false)
        return
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // We need to briefly modify styles so html2canvas captures it perfectly 
      // without shadows or border-radius that might be there for browser preview.
      // But currently, pdf-wrapper has no border-radius. 
      // However, we want to make sure it captures the 210x297mm size accurately.

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement
        
        // Hide scrollbars temporarily for capture if any, though overflow is hidden
        const originalStyle = page.style.cssText
        
        const canvas = await html2canvas(page, {
          scale: 2, 
          logging: false,
          // ignore styling that might cause issues
          onclone: (clonedDoc) => {
            const clonedPage = clonedDoc.querySelectorAll('.pdf-wrapper')[i] as HTMLElement
            if (clonedPage) {
              clonedPage.style.boxShadow = 'none'
              clonedPage.style.transform = 'none'
            }
          }
        })
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0)
        
        if (i > 0) {
          pdf.addPage()
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      }
      
      // Get reference number if available from the page or use document title
      let fileName = "Quotation.pdf"
      if (document.title && document.title !== "Quotation Preview") {
        fileName = `${document.title}.pdf`
      } else {
        const refElement = document.querySelector('.text-slate-800.font-bold')
        if (refElement && refElement.textContent && refElement.textContent.includes('Ref:')) {
          const refNo = refElement.textContent.replace('Ref:', '').trim().replace(/\//g, '-')
          fileName = `Quotation_${refNo}.pdf`
        }
      }
      
      pdf.save(fileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('download') === 'true' && !hasAutoDownloaded) {
      setHasAutoDownloaded(true)
      // Slight delay to ensure images are loaded
      setTimeout(() => {
        handleDownload()
      }, 1000)
    }
  }, [searchParams, hasAutoDownloaded])

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isGenerating}
      className="bg-teal-600 hover:bg-teal-700 text-white"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  )
}
