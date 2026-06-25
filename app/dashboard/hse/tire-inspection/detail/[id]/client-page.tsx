"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, FileEdit, Wand2, FileText, Download, ImageOff, ArrowLeft } from "lucide-react"
import { generateAiReport } from "../../actions"

function getStarsData(score: number) {
  if (score >= 91) return { count: 5, label: "Sangat Memuaskan" }
  if (score >= 81) return { count: 4, label: "Memuaskan" }
  if (score >= 61) return { count: 3, label: "Cukup Memuaskan" }
  if (score >= 41) return { count: 2, label: "Kurang Memuaskan" }
  return { count: 1, label: "Tidak Memuaskan" }
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function labelSection(value: string) {
  return value.replace(/_/g, " ")
}

function scoreCardClass(score: number) {
  if (score >= 85) return "border-emerald-100 bg-emerald-50 text-emerald-900"
  if (score >= 70) return "border-sky-100 bg-sky-50 text-sky-900"
  if (score >= 50) return "border-amber-100 bg-amber-50 text-amber-900"
  return "border-red-100 bg-red-50 text-red-900"
}

export function TireInspectionDetailClient({ detail, access, basePath = "/dashboard/hse/tire-inspection" }: { detail: any, access: any, basePath?: string }) {
  const router = useRouter()
  const [loadingAi, setLoadingAi] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<any>(null)
  
  const { inspection, checklists, photos } = detail

  const handleGenerateAi = async () => {
    if (!confirm("Apakah Anda yakin ingin menghasilkan ulang laporan menggunakan AI? Ini akan menimpa laporan sebelumnya.")) return;
    setLoadingAi(true)
    try {
      await generateAiReport(inspection.id)
      toast.success("Laporan AI berhasil di-generate!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Gagal menghasilkan laporan AI")
    } finally {
      setLoadingAi(false)
    }
  }

  const sectionTitles: any = {
    loading_area: "Loading Areas (Daerah Loading)",
    haul_road: "Jalan Angkutan (Haul Road)",
    dumping_area: "Dumping Area (Daerah Buangan Material)"
  }

  const sectionScores: any = {
    loading_area: inspection.loadingScore,
    haul_road: inspection.haulRoadScore,
    dumping_area: inspection.dumpingScore
  }

  // Calculate index score (totalScore is already a 0-100 percentage based on section averages)
  const indexScore = Number(inspection.totalScore || 0)

  return (
    <div id="print-root" className="mx-auto max-w-5xl space-y-4 pb-12 -mx-4 px-1 md:mx-auto md:px-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: white !important;
          }
          
          /* Sembunyikan elemen Sidebar, Header, dan Navigasi */
          header, aside, [data-sidebar="sidebar"], nav, .admin-page-header, .no-print {
            display: none !important;
          }
          
          /* Mematikan flex/grid pada semua parent agar sidebar tidak menyisakan ruang putih */
          html, body, main, [data-slot="sidebar-inset"], [data-admin-dashboard-shell],
          div:has(#print-root) {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            min-width: 100% !important;
            background: white !important;
            position: static !important;
            transform: none !important;
          }
          
          /* Reset container component kita */
          #print-root {
            display: block !important;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .pdf-wrapper {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
          }
          
          .pdf-document {
            min-width: 0 !important;
            width: 100% !important;
            padding: 0 !important;
          }
        }
        .pdf-document {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
          line-height: 1.4;
        }
        .pdf-document table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #000;
        }
        .pdf-document th, .pdf-document td {
          border: 1px solid #000;
          padding: 4px 6px;
          vertical-align: middle;
        }
        .pdf-document .font-bold { font-weight: bold; }
        .pdf-document .text-center { text-align: center; }
        .pdf-document .bg-gray { background-color: #f3f4f6 !important; }
        .pdf-document .bg-green { background-color: #bbf7d0 !important; }
        .pdf-document .bg-yellow { background-color: #fef08a !important; }
        .pdf-document .border-none { border: none !important; }
      `}} />
      
      {/* Header Actions */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm md:flex md:flex-wrap md:items-center md:justify-between md:gap-4 no-print">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(basePath)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-black text-[#082033] md:text-xl">Tire Inspection Report</h2>
            <p className="text-sm font-semibold text-[#486275]">{inspection.siteName} - {inspection.customerName}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:mt-0 md:flex md:items-center">
          {access.canEdit && (
            <Button variant="outline" onClick={() => router.push(`${basePath}/edit/${inspection.id}`)}>
              <FileEdit className="mr-2 h-4 w-4" />
              Edit Data
            </Button>
          )}
          {access.canEdit && (
            <Button variant="outline" onClick={handleGenerateAi} disabled={loadingAi}>
              {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate AI Report
            </Button>
          )}
          {access.canEdit && inspection.status !== "draft" && (
            <Button variant="outline" onClick={() => router.push(`${basePath}/editor/${inspection.id}`)}>
              <FileEdit className="mr-2 h-4 w-4" />
              Edit Laporan
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      <div className="pdf-wrapper shadow-sm md:shadow-md border bg-white overflow-hidden overflow-x-auto w-full rounded-xl md:rounded-none">
        <div className="pdf-document min-w-[800px] p-4 md:p-8 space-y-4">
          
          {/* Main Table - Page 1 */}
          <table>
            <tbody>
              {/* Header Row */}
              <tr>
                <td rowSpan={2} colSpan={1} className="w-[100px] text-center font-bold text-xl p-2 border-r-0">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="w-12 h-8 bg-blue-900 text-white flex items-center justify-center font-bold italic text-xs tracking-tighter">CK</div>
                    <div className="text-[7px] leading-tight text-center">Cipta Kridatama</div>
                  </div>
                </td>
                <td colSpan={4} className="text-center font-bold text-base border-l-0">
                  INSPEKSI AREA TAMBANG (IAT)<br/>UNTUK TYRE
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border-r-0 text-xs py-1">
                  <div className="grid grid-cols-[80px_10px_1fr]">
                    <span>Project/Site</span><span>:</span><span className="font-bold">{inspection.siteName}</span>
                    <span>Lokasi PIT</span><span>:</span><span className="font-bold">{inspection.customerName}</span>
                  </div>
                </td>
                <td colSpan={2} className="border-l-0 text-xs py-1">
                  <div className="grid grid-cols-[80px_10px_1fr]">
                    <span>Hari / TGL</span><span>:</span><span className="font-bold" suppressHydrationWarning>{formatDate(inspection.inspectionDate)}</span>
                    <span>Jam / Shift</span><span>:</span><span className="font-bold">{inspection.shift} - {inspection.unitName}</span>
                  </div>
                </td>
              </tr>
              
              {/* Scale Row */}
              <tr>
                <td colSpan={5} className="py-3">
                  <div className="flex justify-center items-center space-x-4 mb-1">
                    <div className="border border-black px-4 py-1 text-xs font-bold text-center w-36">MENGECEWAKAN</div>
                    <div className="flex-1 flex items-center justify-center max-w-xs px-2">
                      <div className="h-0.5 bg-black w-full"></div>
                      <div className="-ml-1 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[8px] border-l-black"></div>
                    </div>
                    <div className="border border-black px-4 py-1 text-xs font-bold text-center w-36">MEMUASKAN</div>
                  </div>
                  <div className="text-center text-xs font-bold">SKOR : 1 ke 10</div>
                </td>
              </tr>
              
              {/* Columns Header */}
              <tr className="font-bold text-center">
                <td className="w-8">No</td>
                <td>Tentang Tyre</td>
                <td className="w-24"></td>
                <td className="w-16">SKOR</td>
                <td className="w-48">Keterangan</td>
              </tr>

              {/* Checklist Items Grouped */}
              {["loading_area", "haul_road", "dumping_area"].map((sectionKey, secIndex) => {
                const rows = checklists.filter((item: any) => item.section === sectionKey)
                const isBgGreen = sectionKey === "loading_area" || sectionKey === "dumping_area"
                const isBgYellow = sectionKey === "haul_road"
                const bgClass = isBgGreen ? "bg-green" : isBgYellow ? "bg-yellow" : ""
                
                return (
                  <React.Fragment key={sectionKey}>
                    <tr className="font-bold bg-gray">
                      <td colSpan={2}>{sectionTitles[sectionKey]} {rows.length > 0 ? `: ${rows[0].remarks?.split(" ")[0] || "-"}` : ""}</td>
                      <td className="text-right border-r-0">Nilai Area</td>
                      <td colSpan={2} className={`text-center ${bgClass} border-l-0 text-base`}>
                        {Number(sectionScores[sectionKey] || 0).toFixed(1)}
                      </td>
                    </tr>
                    {rows.map((item: any, idx: number) => (
                      <tr key={item.id}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{item.question}</td>
                        <td className="text-center text-[10px] whitespace-nowrap">
                          <span className={item.answer ? "font-bold border border-black rounded-full px-2" : "text-gray-500"}>YA</span> / <span className={!item.answer ? "font-bold border border-black rounded-full px-2" : "text-gray-500"}>TDK</span>
                        </td>
                        <td className={`text-center font-bold ${bgClass}`}>
                          {item.score ?? 0}
                        </td>
                        <td className={bgClass}>{item.remarks}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}

              {/* Totals */}
              <tr>
                <td colSpan={3} className="text-right font-bold bg-gray py-2">TOTAL NILAI INSPEKSI</td>
                <td colSpan={2} className="text-center font-bold text-base bg-gray py-2">{Number(inspection.totalScore || 0).toFixed(1)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-right font-bold bg-gray py-2">INDEX TOTAL NILAI INSPEKSI</td>
                <td colSpan={2} className="text-center font-bold text-base bg-gray py-2">
                  <div className="flex items-center justify-center gap-2">
                    <span>{indexScore.toFixed(0)}%</span>
                    <div className="flex text-yellow-500 text-sm tracking-widest">
                      {Array.from({ length: getStarsData(indexScore).count }).map((_, i) => "★").join("")}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-700">{getStarsData(indexScore).label}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Recommendations Area */}
          <table className="w-full mt-4 border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td colSpan={4} className="border-b-0 border border-black border-b-transparent p-2">
                  <div className="font-bold mb-1">Rekomendasi dari Hasil Inspeksi:</div>
                  <div className="min-h-[60px] italic whitespace-pre-wrap">
                    {inspection.recommendations || inspection.notes || "-"}
                  </div>
                </td>
              </tr>
              {/* Approval Area */}
              <tr>
                <td className="w-1/4 text-center border border-black border-t-0 align-top pt-4 h-24">
                  <div className="mb-12">Inspeksi oleh,</div>
                  <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                  <div className="text-[10px]">Leader Tyre SSA / Section Head<br/>Tyre / Eng Tyre (CK)</div>
                </td>
                <td className="w-1/4 text-center border border-black border-t-0 align-top pt-4 h-24">
                  <div className="mb-12">Inspeksi Ulang oleh,</div>
                  <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                  <div className="text-[10px]">Sec.Head Production</div>
                </td>
                <td className="w-1/4 text-center border border-black border-t-0 align-top pt-4 h-24">
                  <div className="mb-12">Mengetahui,</div>
                  <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                  <div className="text-[10px]">Dept. Head EM</div>
                </td>
                <td className="w-1/4 text-center border border-black border-t-0 align-top pt-4 h-24">
                  <div className="mb-12">Mengetahui,</div>
                  <div className="border-b border-black w-4/5 mx-auto mb-1"></div>
                  <div className="text-[10px]">Dept. Head Production</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Page Break for Photos */}
          {photos.length > 0 && (
            <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-400 no-print"></div>
          )}
          {photos.length > 0 && (
            <div className="mt-4" style={{ pageBreakBefore: "always" }}>
              <div className="font-bold mb-2">Foto-Foto Temuan Kondisi Tambang Terhadap Tyre :</div>
              <table>
                <tbody>
                  {["loading_area", "haul_road", "dumping_area"].map((sectionKey) => {
                    const sectionPhotos = photos.filter((p: any) => p.section === sectionKey)
                    const title = sectionKey === "loading_area" ? "LOADING AREA" : 
                                  sectionKey === "haul_road" ? "HAULING AREA" : "DUMPING AREA"
                    
                    return (
                      <tr key={sectionKey}>
                        <td className="w-32 font-bold align-top text-xs pt-2">
                          {title}
                        </td>
                        <td className="p-2">
                          <div className="grid grid-cols-2 gap-4">
                            {sectionPhotos.length > 0 ? sectionPhotos.map((p: any) => (
                              <div key={p.id} className="border border-gray-300 bg-white">
                                <img src={p.readableImageUrl || p.imageUrl} alt={p.caption || "-"} className="w-full h-[200px] object-cover" />
                                <div className="text-xs text-center p-2 bg-gray-50 border-t border-gray-300 font-bold break-words">
                                  {p.caption || "Foto Temuan"}
                                </div>
                              </div>
                            )) : (
                              <div className="text-gray-400 italic text-xs py-2">Tidak ada foto di area ini</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              
              <div className="mt-4 border border-black p-2 text-[9px] space-y-1">
                <div className="font-bold underline">Petunjuk Pemberian Nilai : (1 ke 10)</div>
                <div className="font-bold">1) LOADING AREA</div>
                <div>7 ke 10 = BAIK, ban belakang truk tidak melindas batuan, tumpahan dibersihkan dengan segera</div>
                <div>4 ke 6 = CUKUP, ban belakang kadang melindas batuan, sedikit tumpahan ditemui, dan kemudian dibersihkan</div>
                <div>1 ke 3 = BURUK, ban belakang sering melindas batuan besar atau tumpahan, tumpahan tidak dibersihkan</div>
                
                <div className="font-bold mt-2">2) HAULING ROAD</div>
                <div>7 ke 10 = BAIK, di grader dengan baik, tidak ada tumpahan, sangat sedikit bahkan tidak ada jalan bergelombang</div>
                <div>4 ke 6 = CUKUP, perlu perbaikan, ada sedikit jalan bergelombang, sedikit tumpahan, sedikit genangan air</div>
                <div>1 ke 3 = BURUK, perlu perbaikan segera, banyak jalan bergelombang dan tumpahan, truk sering melindas batuan, banyak genangan</div>
                
                <div className="font-bold mt-2">3) Dumping Area</div>
                <div>7 ke 10 = BAIK, sedikit permukaan bergelombang, sedikit tumpahan, dozer bekerja terus mengantisipasi keadaan, ada safety berm</div>
                <div>4 ke 6 = CUKUP, sering bergelombang, sering ada ceceran material, dozer kurang antisipatif, safety berm tidak tersedia</div>
                <div className="mt-4 grid grid-cols-1 gap-1 w-2/3">
                  <div className="flex items-center gap-2">9 ke 10 = 91% sampai 100% sesuai <div className="flex text-yellow-500 tracking-widest">{"★★★★★"}</div> <span className="font-bold">Sangat Memuaskan</span></div>
                  <div className="flex items-center gap-2">8 ke 9 = 81% sampai 90% sesuai <div className="flex text-yellow-500 tracking-widest">{"★★★★"}</div> <span className="font-bold">Memuaskan</span></div>
                  <div className="flex items-center gap-2">6 ke 8 = 61% sampai 80% sesuai <div className="flex text-yellow-500 tracking-widest">{"★★★"}</div> <span className="font-bold">Cukup Memuaskan</span></div>
                  <div className="flex items-center gap-2">4 ke 6 = 41% sampai 60% sesuai <div className="flex text-yellow-500 tracking-widest">{"★★"}</div> <span className="font-bold">Kurang Memuaskan</span></div>
                  <div className="flex items-center gap-2">1 ke 4 = 10% sampai 40% sesuai. <div className="flex text-yellow-500 tracking-widest">{"★"}</div> <span className="font-bold">Tidak Memuaskan</span></div>
                </div>
                
                <div className="mt-4">
                  <span className="font-bold underline">Catatan:</span><br/>
                  Kolom keterangan dapat diisi dengan lokasi dimana penyimpangan / deviasi ditemukan.
                </div>
              </div>
            </div>
          )}

          {/* Daftar Hadir */}
          {inspection.attendees && Array.isArray(inspection.attendees) && inspection.attendees.length > 0 && (
            <div className="mt-8" style={{ pageBreakInside: "avoid" }}>
              <div className="font-bold mb-2">Daftar Hadir Inspeksi:</div>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center">
                    <td className="border border-black p-1 w-12">No</td>
                    <td className="border border-black p-1 w-24">SN / NRP</td>
                    <td className="border border-black p-1">Nama Lengkap</td>
                    <td className="border border-black p-1 w-48">Departemen / Seksi</td>
                    <td className="border border-black p-1 w-32">TTD</td>
                  </tr>
                </thead>
                <tbody>
                  {inspection.attendees.map((att: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 text-center">{att.sn || "-"}</td>
                      <td className="border border-black p-1">{att.name || "-"}</td>
                      <td className="border border-black p-1 text-center">{att.dept || "-"}</td>
                      <td className="border border-black p-1 text-center align-middle h-24">
                        {/* Space left blank intentionally for manual signing */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI Report Section (No Print) */}
          <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-200 no-print">
            <h3 className="font-bold text-sm mb-4">Laporan Analisis AI (Hanya Tampilan Layar)</h3>
            {inspection.status !== "draft" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                  <div className="font-bold flex items-center mb-2 text-blue-900"><FileText className="mr-2 w-4 h-4" /> Executive Summary</div>
                  <div className="whitespace-pre-wrap text-blue-800 text-xs">{inspection.summary}</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg">
                  <div className="font-bold flex items-center mb-2 text-orange-900"><FileText className="mr-2 w-4 h-4" /> Findings</div>
                  <div className="whitespace-pre-wrap text-orange-800 text-xs">{inspection.findings}</div>
                </div>
                <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                  <div className="font-bold flex items-center mb-2 text-green-900"><FileText className="mr-2 w-4 h-4" /> Recommendations</div>
                  <div className="whitespace-pre-wrap text-green-800 text-xs">{inspection.recommendations}</div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 p-6 text-center rounded-lg">
                <div className="text-gray-500 italic text-xs mb-2">Laporan AI belum di-generate</div>
                {access.canEdit && (
                  <Button onClick={handleGenerateAi} disabled={loadingAi} size="sm" variant="outline">
                    {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Sekarang"}
                  </Button>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
      
      {/* Lightbox for Photos (No Print) */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-[1.2rem] p-0 no-print">
          {previewPhoto ? (
            <div className="bg-white">
              <DialogHeader className="p-4 pb-2 text-left">
                <DialogTitle className="text-base font-black text-[#082033]">Dokumentasi Foto</DialogTitle>
              </DialogHeader>
              <img src={previewPhoto.readableImageUrl || previewPhoto.imageUrl} alt={previewPhoto.caption || "Foto inspeksi"} className="max-h-[72vh] w-full object-contain bg-slate-100" />
              <div className="space-y-2 p-4">
                <Badge variant="outline">{previewPhoto.section?.replace("_", " ") || "-"}</Badge>
                {previewPhoto.caption ? <p className="text-sm font-semibold text-[#082033]">{previewPhoto.caption}</p> : null}
                {previewPhoto.aiCaption ? <p className="rounded-xl bg-[#f3faff] p-3 text-sm font-semibold text-[#486275]">AI: {previewPhoto.aiCaption}</p> : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
