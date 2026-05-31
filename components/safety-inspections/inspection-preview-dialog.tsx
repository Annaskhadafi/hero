import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Printer, Download, FileText, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getInspectionAttachmentDataUrl,
  type SafetyInspection,
} from "@/app/actions/safety-inspections"
import html2canvas from "html2canvas-pro"
import jsPDF from "jspdf"

interface InspectionPreviewDialogProps {
  inspection?: SafetyInspection
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

function isPdfUrl(rawUrl?: string | null) {
  return Boolean(rawUrl && rawUrl.trim().toLowerCase().split("?")[0].endsWith(".pdf"))
}

function toProxyUrl(rawUrl?: string | null) {
  const url = rawUrl?.trim()
  if (!url) return ""
  if (url.startsWith("/")) return url
  return `/api/safety/attachment?url=${encodeURIComponent(url)}`
}

export function InspectionPreviewDialog({ inspection, open, onOpenChange, onEdit }: InspectionPreviewDialogProps) {
  const documentRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [reportSrc, setReportSrc] = useState("")
  const [resultSrc, setResultSrc] = useState("")
  const [imagesLoading, setImagesLoading] = useState(false)

  const reportUrl = inspection?.reportAttachmentUrl ?? ""
  const resultUrl = inspection?.resultAttachmentUrl ?? ""
  const reportIsPdf = isPdfUrl(reportUrl)
  const resultIsPdf = isPdfUrl(resultUrl)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setReportSrc("")
    setResultSrc("")

    const needsReportImage = Boolean(reportUrl) && !reportIsPdf
    const needsResultImage = Boolean(resultUrl) && !resultIsPdf

    if (!needsReportImage && !needsResultImage) {
      setImagesLoading(false)
      return
    }

    setImagesLoading(true)
    Promise.all([
      needsReportImage ? getInspectionAttachmentDataUrl(reportUrl) : Promise.resolve(null),
      needsResultImage ? getInspectionAttachmentDataUrl(resultUrl) : Promise.resolve(null),
    ])
      .then(([reportData, resultData]) => {
        if (cancelled) return
        if (reportData) setReportSrc(reportData)
        if (resultData) setResultSrc(resultData)
      })
      .catch((error) => {
        console.error("Failed to load attachment images", error)
      })
      .finally(() => {
        if (!cancelled) setImagesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, reportUrl, resultUrl, reportIsPdf, resultIsPdf])

  if (!inspection) return null

  const renderDocumentCanvas = async () => {
    const element = documentRef.current
    if (!element) return null

    // Wait for attachment images to finish loading before snapshotting.
    const images = Array.from(element.querySelectorAll("img"))
    await Promise.all(
      images.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true })
              img.addEventListener("error", () => resolve(), { once: true })
            }),
      ),
    )

    return html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    })
  }

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return
    setIsDownloading(true)
    try {
      const canvas = await renderDocumentCanvas()
      if (!canvas) return

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0
      const imgData = canvas.toDataURL("image/png")

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight

      // Split tall documents across multiple A4 pages.
      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`Inspection_${inspection.id}_${format(new Date(), "yyyyMMdd")}.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF", error)
      alert("Gagal mengunduh PDF. Silakan coba lagi.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = async () => {
    if (!documentRef.current) return
    setIsPrinting(true)
    try {
      const canvas = await renderDocumentCanvas()
      if (!canvas) return

      const imgData = canvas.toDataURL("image/png")
      const printWindow = window.open("", "_blank", "width=900,height=1200")
      if (!printWindow) {
        alert("Popup diblokir. Izinkan popup untuk mencetak dokumen.")
        return
      }

      printWindow.document.write(`<!doctype html><html><head><title>Inspection_${inspection.id}</title>
<style>
  @page { size: A4; margin: 10mm; }
  html, body { margin: 0; padding: 0; }
  img { display: block; width: 100%; height: auto; }
</style>
</head><body><img src="${imgData}" /></body></html>`)
      printWindow.document.close()

      const triggerPrint = () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      const img = printWindow.document.querySelector("img")
      if (img && !img.complete) {
        img.addEventListener("load", triggerPrint, { once: true })
      } else {
        setTimeout(triggerPrint, 200)
      }
    } catch (error) {
      console.error("Failed to print document", error)
      alert("Gagal mencetak dokumen. Silakan coba lagi.")
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible p-0 bg-gray-100/80 backdrop-blur-sm border-none shadow-2xl">
        <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between no-print sticky top-0 z-50 shadow-sm rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg tracking-tight font-bold text-slate-800">{inspection.title}</DialogTitle>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Inspection Documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pr-6">
            <Button variant="outline" size="sm" onClick={onEdit} className="hidden sm:flex border-sky-200 text-sky-700 hover:bg-sky-50 font-bold">
              Edit Data
            </Button>
            <Button size="sm" className="bg-[#059669] hover:bg-[#047857] text-white font-bold tracking-wide" onClick={handleDownloadPDF} disabled={isDownloading || isPrinting || imagesLoading}>
              <Download className={`mr-2 h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`} /> 
              {isDownloading ? "Memproses..." : "Unduh Laporan"}
            </Button>
            <Button size="sm" className="bg-[#0f172a] text-white hover:bg-slate-800 font-bold tracking-wide" onClick={handlePrint} disabled={isDownloading || isPrinting || imagesLoading}>
              <Printer className="mr-2 h-4 w-4" /> {isPrinting ? "Menyiapkan..." : "Cetak Dokumen"}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-8 md:p-12">
          {/* Document Paper */}
          <div ref={documentRef} className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden pdf-wrapper mx-auto max-w-4xl relative">
            {/* Header section */}
            <div className="px-10 py-8 border-b-[3px] border-slate-800 flex justify-between items-center bg-white">
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-32 flex items-center">
                  <img src="/cp_logo-removebg-preview.png" alt="Logo" className="max-h-full max-w-full object-contain object-left" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">PT. CHITRA PARATAMA</h1>
                  <p className="text-xs font-bold text-sky-600 tracking-widest mb-1.5">SAFETY IS OUR CORE VALUE. PROTECT YOUR FUTURE.</p>
                  <p className="text-[10px] text-slate-500 leading-tight">Kawasan Industri Kariangau, Balikpapan, Indonesia</p>
                  <p className="text-[10px] text-slate-500 font-semibold leading-tight">
                    <span className="font-bold text-slate-700">Phone:</span> +62 542 748 123 | <span className="font-bold text-slate-700">Email:</span> hse@chitra.co.id 
                    <span className="mx-2 text-slate-300">•</span> 
                    <span className="text-slate-800 font-black tracking-wider">OFFICIAL HSE SYSTEM</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center border-2 border-slate-800 rounded-full h-[84px] w-[84px] p-1 shrink-0 opacity-90">
                <div className="border-[1.5px] border-slate-800 rounded-full h-full w-full flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-slate-800 mb-0.5" strokeWidth={2.5} />
                  <span className="text-[9px] font-black tracking-tighter text-slate-800">VERIFIED</span>
                  <span className="text-[6px] tracking-tighter text-slate-600 font-bold uppercase">Document</span>
                </div>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-6 px-10 py-6 border-b border-slate-100 bg-white">
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Document ID</p>
                <p className="text-sm font-black text-slate-800 tracking-tight">INSP-{inspection.id.toString().padStart(6, '0')}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Classification</p>
                <p className="text-sm font-black text-slate-800 tracking-tight">{inspection.category.toUpperCase()}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Location / Site</p>
                <p className="text-sm font-black text-slate-800 tracking-tight">{inspection.location}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date / Period</p>
                <p className="text-sm font-black text-slate-800 tracking-tight">{format(new Date(inspection.date), "yyyy-MM-dd")}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">PIC / Auditor</p>
                <p className="text-sm font-black text-slate-800 tracking-tight">{inspection.picName}</p>
              </div>
              <div className="col-span-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Doc Status</p>
                <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider border ${inspection.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {inspection.status}
                </Badge>
              </div>
            </div>

            <div className="p-10 space-y-8 bg-white">
              {/* Blue Banner */}
              <div className="bg-[#2563eb] rounded-[16px] p-8 text-white relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-md">
                {/* Decorative background graphics */}
                <div className="absolute right-[-5%] top-[-20%] bottom-0 opacity-10 pointer-events-none w-1/2 h-[150%]">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor" preserveAspectRatio="none">
                    <path d="M0,100 L100,0 L100,100 Z" />
                  </svg>
                </div>
                <div className="absolute left-[10%] top-[10%] opacity-10 pointer-events-none">
                  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="8">
                    <circle cx="50" cy="50" r="40" />
                  </svg>
                </div>
                
                <div className="relative z-10 space-y-3 max-w-[65%]">
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest bg-blue-800/30 inline-block px-3 py-1 rounded-full border border-blue-400/20">HSE Field Inspection</p>
                  <h2 className="text-3xl font-black italic tracking-tight leading-tight">{inspection.title.toUpperCase()}</h2>
                  <div className="flex items-center gap-2 text-blue-100 text-sm font-bold tracking-wide">
                    <svg className="w-4 h-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {inspection.location.toUpperCase()}
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-end mt-6 sm:mt-0 space-y-4">
                  <Badge className="bg-white text-blue-700 hover:bg-blue-50 font-black px-4 py-1.5 shadow-sm text-xs tracking-wider border-none">
                    {inspection.status}
                  </Badge>
                  <div className="text-right bg-blue-800/20 p-3 rounded-xl border border-blue-400/20 backdrop-blur-sm">
                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1 text-center">Assessment Score</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-black">{inspection.assessmentScore ?? "-"}</span>
                      <span className="text-blue-300 text-sm font-black ml-1">/100</span>
                    </div>
                    <p className="text-[10px] font-bold text-blue-200 mt-2 text-center border-t border-blue-400/20 pt-2">{format(new Date(inspection.date), "yyyy-MM-dd")}</p>
                  </div>
                </div>
              </div>

              {/* Grid 2 cols for Findings & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="border-2 border-slate-100 bg-slate-50/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Key Findings (Temuan Utama)
                  </p>
                  <p className="text-slate-700 font-bold italic leading-relaxed text-[15px]">
                    "{inspection.findings}"
                  </p>
                </div>
                
                <div className="border-2 border-blue-100 bg-blue-50/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Recommendations (Saran Perbaikan)
                  </p>
                  <p className="text-slate-800 font-bold italic leading-relaxed text-[15px]">
                    "{inspection.recommendation}"
                  </p>
                </div>
              </div>

              {/* Photo Evidence */}
              {(inspection.reportAttachmentUrl || inspection.resultAttachmentUrl) && (
                <div className="pt-4 border-t-2 border-slate-100 border-dashed mt-8">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Report Document</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {inspection.reportAttachmentUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md relative aspect-square bg-slate-50 p-2 group">
                        <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-100">
                          {reportIsPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-white">
                              <FileText className="h-16 w-16 mb-3 text-red-500" />
                              <a href={toProxyUrl(reportUrl)} target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline text-blue-600">Lihat PDF Laporan</a>
                            </div>
                          ) : reportSrc ? (
                            <img src={reportSrc} alt="Report Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-white">
                              {imagesLoading ? "Memuat gambar..." : "Gambar gagal dimuat"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {inspection.resultAttachmentUrl && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md relative aspect-square bg-slate-50 p-2 group">
                         <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-100">
                          {resultIsPdf ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-white">
                              <FileText className="h-16 w-16 mb-3 text-red-500" />
                              <a href={toProxyUrl(resultUrl)} target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline text-blue-600">Lihat PDF Hasil</a>
                            </div>
                          ) : resultSrc ? (
                            <img src={resultSrc} alt="Result Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-white">
                              {imagesLoading ? "Memuat gambar..." : "Gambar gagal dimuat"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-800 text-slate-400 p-5 text-center">
              <p className="text-[10px] font-bold tracking-widest uppercase">Generated by Chitra HSE System • {format(new Date(), "yyyy-MM-dd HH:mm")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
