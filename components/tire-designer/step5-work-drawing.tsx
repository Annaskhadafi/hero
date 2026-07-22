'use client'

import { useRef, useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { DesignerState } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  onNext: () => void
  onBack: () => void
}

function formatDate() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function generateDocNo(tireSize: string, patternType: string) {
  const now = new Date()
  return `RTD-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${tireSize}-${patternType.substring(0, 3).toUpperCase()}`
}

export default function Step5WorkDrawing({ state, dispatch, onNext, onBack }: Props) {
  const drawingRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const dims = state.tireDimensions!
  const cfg = state.patternConfig!
  const docNo = generateDocNo(dims.sizeCode, cfg.type)
  const repeatCount = Math.round(dims.circumferenceMm / cfg.repeatUnitMm)
  const scaleNote = `1 : ${Math.ceil(dims.circumferenceMm / 800)}`

  const handleExportPDF = useCallback(async () => {
    const el = drawingRef.current
    if (!el) return
    setIsExporting(true)
    toast.loading('Mengekspor gambar kerja...', { id: 'export-pdf' })
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
      const w = pdf.internal.pageSize.getWidth()
      const h = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`GK-${dims.sizeCode}-${cfg.type}.pdf`)
      toast.success('Gambar kerja berhasil diekspor!', { id: 'export-pdf' })

      // Save dataUrl to state
      dispatch({ type: 'SET_WORK_DRAWING', url: imgData })
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengekspor PDF', { id: 'export-pdf' })
    } finally {
      setIsExporting(false)
    }
  }, [dims, cfg, dispatch])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white gap-2"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Mengekspor...' : 'Export PDF'}
        </Button>
      </div>

      {/* Drawing Document */}
      <div
        ref={drawingRef}
        className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden no-print:shadow-xl"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Title Block Header */}
        <div className="border-b-2 border-gray-800 bg-[#0f172a] text-white p-4 flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">PT. Chitra Paratama Sejahtera</p>
            <h2 className="text-lg font-bold tracking-tight">GAMBAR KERJA — POLA BAN RETREAD</h2>
            <p className="text-sm text-gray-300 mt-1">Central Service Division</p>
          </div>
          <div className="text-right text-xs text-gray-300 space-y-1">
            <div><span className="text-gray-500">No. Dok:</span> <strong className="text-white font-mono">{docNo}</strong></div>
            <div><span className="text-gray-500">Tanggal:</span> <strong className="text-white">{formatDate()}</strong></div>
            <div><span className="text-gray-500">Revisi:</span> <strong className="text-white">0</strong></div>
            <div><span className="text-gray-500">Skala:</span> <strong className="text-white">{scaleNote}</strong></div>
          </div>
        </div>

        {/* Spec Bar */}
        <div className="border-b border-gray-300 bg-gray-50 px-6 py-3 grid grid-cols-6 gap-4 text-center">
          {[
            { label: 'Ukuran Ban', value: dims.sizeCode },
            { label: 'Tipe Pola', value: cfg.type.toUpperCase() },
            { label: 'Sudut Alur', value: `${cfg.grooveAngle}°` },
            { label: 'Lebar Alur', value: `${cfg.grooveWidthMm} mm` },
            { label: 'Dalam Alur', value: `${cfg.grooveDepthMm} mm` },
            { label: 'Keliling', value: `${dims.circumferenceMm.toLocaleString()} mm` },
          ].map(({ label, value }) => (
            <div key={label} className="border-r last:border-r-0 border-gray-200 pr-4 last:pr-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-base font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Main drawing area */}
        <div className="p-6 space-y-6">
          {/* Tread flat view */}
          <div className="border border-gray-300 rounded">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">TAMPAK TAPAK BAN (TREAD VIEW) — Diurai / Unrolled</span>
              <span className="text-xs text-gray-500 font-mono">Satu Segmen dari {repeatCount} Repeat</span>
            </div>
            <div className="p-4 bg-white">
              {/* Dimension top arrow */}
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                <div className="flex-1 flex items-center">
                  <span className="border-t border-gray-600 flex-1"></span>
                  <span className="mx-2 font-mono">← {dims.treadWidthMm} mm (Lebar Tapak) →</span>
                  <span className="border-t border-gray-600 flex-1"></span>
                </div>
              </div>

              {/* Pattern canvas embedded */}
              <div
                className="w-full relative border border-gray-200 rounded overflow-hidden"
                style={{ height: 120, background: '#2a2a2a' }}
              >
                {state.patternCanvasDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.patternCanvasDataUrl}
                    alt="Pola ban"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white text-sm opacity-50">
                    [Pola {cfg.type}]
                  </div>
                )}

                {/* Ruler overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-5 bg-white/90 border-t border-gray-300 flex">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-gray-300 text-[8px] text-gray-500 text-center leading-5">
                      {Math.round((dims.treadWidthMm / 10) * i)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension bottom */}
              <div className="text-center text-xs text-gray-500 mt-2 font-mono">
                Keliling total: {dims.circumferenceMm.toLocaleString()} mm / {repeatCount} repeat = {cfg.repeatUnitMm} mm / repeat
              </div>
            </div>
          </div>

          {/* Cross section + Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Cross section */}
            <div className="border border-gray-300 rounded">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">POTONGAN MELINTANG (CROSS SECTION)</span>
              </div>
              <div className="p-4">
                  {/* Dynamic SVG cross-section diagram */}
                  {(() => {
                    let numGrooves = 4
                    if (cfg.type === 'rib') numGrooves = Math.max(3, Math.min(6, Math.floor(dims.treadWidthMm / 55)))
                    else if (cfg.type === 'block') numGrooves = Math.max(3, Math.min(5, Math.floor(dims.treadWidthMm / 60)))
                    else if (cfg.type === 'lug' || cfg.type === 'traction') numGrooves = 2
                    else if (cfg.type === 'mixed') numGrooves = 3

                    const scale = 260 / dims.treadWidthMm
                    const gWidthPx = Math.max(5, Math.min(25, cfg.grooveWidthMm * scale * 1.5))
                    const gDepthPx = Math.max(12, Math.min(45, cfg.grooveDepthMm * 1.8))
                    const spacing = 260 / (numGrooves + 1)

                    return (
                      <svg viewBox="0 0 300 120" className="w-full border border-gray-100 rounded bg-white">
                        {/* Solid Rubber tread block background */}
                        <rect x="10" y="20" width="280" height="80" fill="#444" rx="2" />
                        
                        {/* Grooves cut into the rubber */}
                        {Array.from({ length: numGrooves }).map((_, i) => {
                          const x = 10 + spacing * (i + 1) - gWidthPx / 2
                          return (
                            <rect
                              key={i}
                              x={x}
                              y="20"
                              width={gWidthPx}
                              height={gDepthPx}
                              fill="#1a1a1a"
                              rx={0.5}
                            />
                          )
                        })}

                        {/* Tread surface line */}
                        <rect x="10" y="19" width="280" height="1.5" fill="#555" rx="0.5" />

                        {/* Groove width dimension line */}
                        {(() => {
                          const firstX = 10 + spacing - gWidthPx / 2
                          return (
                            <>
                              <line x1={firstX} y1="20" x2={firstX} y2="6" stroke="#666" strokeWidth="0.5" />
                              <line x1={firstX + gWidthPx} y1="20" x2={firstX + gWidthPx} y2="6" stroke="#666" strokeWidth="0.5" />
                              <line x1={firstX} y1="10" x2={firstX + gWidthPx} y2="10" stroke="#333" strokeWidth="0.8" />
                              <text x={firstX + gWidthPx / 2} y="7" textAnchor="middle" fontSize="6.5" fill="#333" className="font-mono font-bold">
                                {cfg.grooveWidthMm}mm
                              </text>
                            </>
                          )
                        })()}

                        {/* Groove depth dimension line */}
                        <line x1="291" y1="20" x2="299" y2="20" stroke="#666" strokeWidth="0.5" />
                        <line x1="291" y1={20 + gDepthPx} x2="299" y2={20 + gDepthPx} stroke="#666" strokeWidth="0.5" />
                        <line x1="295" y1="20" x2="295" y2={20 + gDepthPx} stroke="#333" strokeWidth="0.8" />
                        <text x="296" y={20 + gDepthPx / 2 + 2} fontSize="6.5" fill="#333" className="font-mono font-bold">
                          {cfg.grooveDepthMm}mm
                        </text>

                        {/* Labels */}
                        <text x="150" y="16" textAnchor="middle" fontSize="6" fill="#888">Permukaan Tapak</text>
                        <text x="150" y="90" textAnchor="middle" fontSize="6" fill="#ccc">Karet Dasar (Base Rubber)</text>
                      </svg>
                    )
                  })()}
                </div>
              </div>

            {/* Tech specs */}
            <div className="border border-gray-300 rounded">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">SPESIFIKASI TEKNIS</span>
              </div>
              <div className="p-4">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {[
                      ['Ukuran Ban', dims.sizeCode],
                      ['Lebar Penampang', `${dims.sectionWidthMm} mm`],
                      ['Diameter Rim', `${dims.rimDiameterMm} mm`],
                      ['Keliling Luar', `${dims.circumferenceMm.toLocaleString()} mm`],
                      ['Lebar Tapak', `${dims.treadWidthMm} mm`],
                      ['Tipe Pola', cfg.type.toUpperCase()],
                      ['Sudut Alur', `${cfg.grooveAngle}°`],
                      ['Lebar Alur', `${cfg.grooveWidthMm} mm`],
                      ['Kedalaman Alur', `${cfg.grooveDepthMm} mm`],
                      ['Jumlah Repeat', `${repeatCount}x sepanjang keliling`],
                      ['Panjang 1 Repeat', `${cfg.repeatUnitMm} mm`],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2 text-gray-500 font-medium w-44">{label}</td>
                        <td className="py-1.5 font-bold text-gray-900 font-mono">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Signature block */}
          <div className="border border-gray-300 rounded">
            <div className="grid grid-cols-3 divide-x divide-gray-300">
              {['Dibuat Oleh', 'Diperiksa Oleh', 'Disetujui Oleh'].map((role) => (
                <div key={role} className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{role}</p>
                  <div className="h-14 border-b border-dashed border-gray-300 mt-3 mb-2"></div>
                  <p className="text-xs text-gray-400">Nama &amp; Tanda Tangan</p>
                  <p className="text-xs text-gray-400">Tanggal: ______________</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-300 px-6 py-2 flex justify-between text-[10px] text-gray-400">
          <span>Dokumen ini bersifat internal. Dilarang menduplikasi tanpa izin.</span>
          <span className="font-mono">{docNo} | Rev. 0</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button onClick={onNext} className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 gap-2">
          Template Cetak A2
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print\\:shadow-xl { box-shadow: none !important; }
          [data-print-target], [data-print-target] * { visibility: visible; }
          @page { size: A3 landscape; margin: 5mm; }
        }
      `}</style>
    </div>
  )
}
