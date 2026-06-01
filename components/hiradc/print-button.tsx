"use client"

import * as React from "react"
import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import jsPDF from "jspdf"
import html2canvas from "html2canvas-pro"
import { toast } from "sonner"

export function PrintButton({ title = "Laporan_HIRADC" }: { title?: string }) {
  const [isDownloading, setIsDownloading] = React.useState(false)

  // We can automatically trigger download if ?print=1 is present
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('print=1')) {
      const timer = setTimeout(() => {
        handleDownload()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      toast.info("Mempersiapkan dokumen PDF...")
      
      const element = document.querySelector(".pdf-wrapper") as HTMLElement
      if (!element) throw new Error("Document not found")
        
      const canvas = await html2canvas(element, {
        scale: 1.0, 
        useCORS: true,
        logging: false,
      })
      
      const imgData = canvas.toDataURL("image/jpeg", 0.5)
      
      // A4 size: 210 x 297 mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgProps = pdf.getImageProperties(imgData)
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST")
      heightLeft -= pdfHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight, undefined, "FAST")
        heightLeft -= pdfHeight
      }
      
      pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
      toast.success("Berhasil mengunduh PDF")
    } catch (error) {
      console.error(error)
      toast.error("Gagal memproses. Membuka dialog print bawaan...")
      window.print()
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button 
      onClick={handleDownload}
      disabled={isDownloading}
      className="bg-[#1a2332] text-white hover:bg-[#1a2332]/90"
    >
      {isDownloading ? (
        <span className="animate-spin mr-2">⏳</span>
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {isDownloading ? "Memproses..." : "Download PDF"}
    </Button>
  )
}
