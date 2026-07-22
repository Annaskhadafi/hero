'use client'

import { useRef, useCallback, useState } from 'react'
import { ChevronLeft, Download, Printer, Grid3X3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { DesignerState } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  onBack: () => void
}

// A2 = 420 × 594 mm
const A2_W_MM = 594
const A2_H_MM = 420

export default function Step6PrintTemplate({ state, dispatch: _dispatch, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [showCuttingMarks, setShowCuttingMarks] = useState(true)
  const [showFoldMarks, setShowFoldMarks] = useState(true)
  const [showSectionNumbers, setShowSectionNumbers] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [scale, setScale] = useState<'1:1' | '1:2' | '1:4'>('1:2')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<string>('all')

  const dims = state.tireDimensions!
  const cfg = state.patternConfig!

  // Calculate how many sections fit in A2 width
  const scaleNum = scale === '1:1' ? 1 : scale === '1:2' ? 2 : 4
  const patternLengthScaled = dims.circumferenceMm / scaleNum
  const repeatUnitScaled = cfg.repeatUnitMm / scaleNum
  const numSections = Math.round(dims.circumferenceMm / cfg.repeatUnitMm)
  const treadWidthScaled = dims.treadWidthMm / scaleNum

  const sheetWidthMm = 500 // 500mm printable width per A2 sheet (A2 = 594mm width)
  const totalSheetsNeeded = Math.ceil(patternLengthScaled / sheetWidthMm)

  const parsedSheet = parseInt(selectedSheet) || 0
  const prevSheetText = parsedSheet > 1 ? String(parsedSheet - 1) : ''
  const nextSheetText = parsedSheet < totalSheetsNeeded ? `dan ${parsedSheet + 1}` : ''

  // Pixel conversion for preview (1mm = px at screen)
  const previewScale = Math.min(1.2, (700 / patternLengthScaled))
  const patternPxW = patternLengthScaled * previewScale
  const patternPxH = treadWidthScaled * previewScale

  const handlePrintA2 = useCallback(() => {
    window.print()
  }, [])

  const handleExportPDF = useCallback(async () => {
    const el = printRef.current
    if (!el) return
    setIsExporting(true)
    toast.loading('Mengekspor template cetak...', { id: 'export-a2' })
    try {
      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a2',
      })
      const w = pdf.internal.pageSize.getWidth()
      const h = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`TEMPLATE-A2-${dims.sizeCode}-${cfg.type}-${scale}.pdf`)
      toast.success('Template A2 berhasil diekspor!', { id: 'export-a2' })
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengekspor template', { id: 'export-a2' })
    } finally {
      setIsExporting(false)
    }
  }, [dims, cfg, scale])

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Controls bar */}
      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm text-[#0f172a]">Template Cetak A2</span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#64748b]">Skala</Label>
          <Select value={scale} onValueChange={(v) => { setScale(v as typeof scale); setSelectedSheet('all') }}>
            <SelectTrigger className="w-24 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">1:1 (Asli)</SelectItem>
              <SelectItem value="1:2">1:2</SelectItem>
              <SelectItem value="1:4">1:4</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-[#64748b]">Lembaran (Tiling)</Label>
          <Select value={selectedSheet} onValueChange={setSelectedSheet}>
            <SelectTrigger className="w-40 h-8 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bagian (Scroll)</SelectItem>
              {Array.from({ length: totalSheetsNeeded }).map((_, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  Lembar {i + 1} ({Math.round(i * sheetWidthMm * scaleNum)} - {Math.round(Math.min(dims.circumferenceMm, (i + 1) * sheetWidthMm * scaleNum))} mm)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label: 'Cutting Marks', state: showCuttingMarks, setter: setShowCuttingMarks },
            { label: 'Fold Marks', state: showFoldMarks, setter: setShowFoldMarks },
            { label: 'No. Bagian', state: showSectionNumbers, setter: setShowSectionNumbers },
            { label: 'Grid', state: showGrid, setter: setShowGrid },
          ].map(({ label, state: checked, setter }) => (
            <div key={label} className="flex items-center gap-2">
              <Switch checked={checked} onCheckedChange={setter} />
              <Label className="text-xs">{label}</Label>
            </div>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={handlePrintA2} variant="outline" className="gap-2 h-9">
            <Printer className="w-4 h-4" />
            Print A2
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white gap-2 h-9"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Mengekspor...' : 'Download PDF A2'}
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex flex-wrap gap-4 text-xs text-amber-800">
        <span><strong>Ban:</strong> {dims.sizeCode}</span>
        <span><strong>Pola:</strong> {cfg.type.toUpperCase()}</span>
        <span><strong>Skala:</strong> {scale}</span>
        <span><strong>Keliling:</strong> {dims.circumferenceMm.toLocaleString()} mm</span>
        <span><strong>Repeat:</strong> {numSections}x ({cfg.repeatUnitMm} mm)</span>
        <span><strong>Ukuran cetak:</strong> A2 ({A2_W_MM} × {A2_H_MM} mm)</span>
      </div>

      {/* Print preview */}
      <div
        ref={printRef}
        className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden shadow-xl"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="bg-[#0f172a] text-white px-6 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">PT. Chitra Paratama Sejahtera</p>
            <p className="text-base font-bold">TEMPLATE CETAKAN POLA BAN — {dims.sizeCode} | {cfg.type.toUpperCase()}</p>
          </div>
          <div className="text-right text-xs text-gray-300 space-y-0.5">
            <div>Skala: <strong className="text-white">{scale}</strong></div>
            <div>Kertas: <strong className="text-white">A2 Landscape</strong></div>
            <div>Jumlah bagian: <strong className="text-amber-300">{numSections} bagian</strong></div>
          </div>
        </div>
        {/* Main template area */}
        <div className="p-6 overflow-x-auto">
          {/* A2 paper simulation */}
          <div
            className="relative border border-gray-400 mx-auto bg-white overflow-hidden"
            style={{
              width: selectedSheet === 'all' 
                ? Math.min(patternPxW + 80, 950) 
                : Math.min(sheetWidthMm * previewScale + 80, 950),
              minHeight: patternPxH + 120,
            }}
          >
            {/* Margin lines (5mm = corner marks) */}
            {showCuttingMarks && (
              <>
                {/* Corner marks */}
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                  <div
                    key={pos}
                    className={`absolute w-6 h-6 ${pos.includes('top') ? 'top-2' : 'bottom-2'} ${pos.includes('left') ? 'left-2' : 'right-2'}`}
                  >
                    <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-4 h-0.5 bg-gray-600`}></div>
                    <div className={`absolute ${pos.includes('top') ? 'top-0' : 'bottom-0'} ${pos.includes('left') ? 'left-0' : 'right-0'} w-0.5 h-4 bg-gray-600`}></div>
                  </div>
                ))}
              </>
            )}

            {/* Pattern area */}
            <div className="absolute inset-8 flex flex-col">
              {/* Pattern strip */}
              <div
                className="relative border border-gray-300 overflow-hidden flex-shrink-0"
                style={{ height: Math.max(60, patternPxH) }}
              >
                {/* Tiled pattern */}
                {state.patternCanvasDataUrl ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${state.patternCanvasDataUrl})`,
                      backgroundSize: `${repeatUnitScaled * previewScale}px 100%`,
                      backgroundRepeat: 'repeat-x',
                      backgroundPosition: selectedSheet === 'all'
                        ? '0px 0px'
                        : `-${(parseInt(selectedSheet) - 1) * sheetWidthMm * previewScale}px 0px`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <span className="text-white text-xs opacity-50">Pola {cfg.type}</span>
                  </div>
                )}

                {/* Cutting marks between sections */}
                {showCuttingMarks && Array.from({ length: numSections + 1 }).map((_, i) => {
                  const x = i * repeatUnitScaled * previewScale
                  if (selectedSheet !== 'all') {
                    const sheetIndex = parseInt(selectedSheet) - 1
                    const startX = sheetIndex * sheetWidthMm * previewScale
                    const endX = (sheetIndex + 1) * sheetWidthMm * previewScale
                    if (x < startX || x > endX) return null
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-400"
                        style={{ left: x - startX, opacity: 0.8 }}
                      />
                    )
                  }
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-400"
                      style={{ left: x, opacity: 0.8 }}
                    />
                  )
                })}

                {/* Section numbers */}
                {showSectionNumbers && Array.from({ length: numSections }).map((_, i) => {
                  const x = (i + 0.5) * repeatUnitScaled * previewScale
                  if (selectedSheet !== 'all') {
                    const sheetIndex = parseInt(selectedSheet) - 1
                    const startX = sheetIndex * sheetWidthMm * previewScale
                    const endX = (sheetIndex + 1) * sheetWidthMm * previewScale
                    if (x < startX || x > endX) return null
                    return (
                      <div
                        key={i}
                        className="absolute top-1 text-[9px] font-bold text-orange-300 bg-black/60 px-1 rounded"
                        style={{ left: Math.max(0, x - startX - 12) }}
                      >
                        {i + 1}{"/"}{numSections}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={i}
                      className="absolute top-1 text-[9px] font-bold text-orange-300 bg-black/60 px-1 rounded"
                      style={{ left: Math.max(0, x - 12) }}
                    >
                      {i + 1}{"/"}{numSections}
                    </div>
                  )
                })}

                {/* Registration marks */}
                {Array.from({ length: numSections + 1 }).map((_, i) => {
                  const x = i * repeatUnitScaled * previewScale
                  if (selectedSheet !== 'all') {
                    const sheetIndex = parseInt(selectedSheet) - 1
                    const startX = sheetIndex * sheetWidthMm * previewScale
                    const endX = (sheetIndex + 1) * sheetWidthMm * previewScale
                    if (x < startX || x > endX) return null
                    return (
                      <div key={i} className="absolute" style={{ left: x - startX - 5, top: -8 }}>
                        <div className="text-blue-600 text-[10px] font-bold leading-none">+</div>
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="absolute" style={{ left: x - 5, top: -8 }}>
                      <div className="text-blue-600 text-[10px] font-bold leading-none">+</div>
                    </div>
                  )
                })}
              </div>

              {/* Width dimension */}
              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                <div className="flex-1 border-t border-gray-400"></div>
                <span className="mx-1 whitespace-nowrap font-mono">
                  {selectedSheet === 'all' ? (
                    `← ${dims.treadWidthMm} mm (Lebar Tapak) | Keliling Total: ${dims.circumferenceMm} mm →`
                  ) : (
                    `← Lembar ${selectedSheet} dari ${totalSheetsNeeded} | Cakupan: ${Math.round((parseInt(selectedSheet) - 1) * sheetWidthMm * scaleNum)} - ${Math.round(Math.min(dims.circumferenceMm, parseInt(selectedSheet) * sheetWidthMm * scaleNum))} mm →`
                  )}
                </span>
                <div className="flex-1 border-t border-gray-400"></div>
              </div>

              {/* Fold marks */}
              {showFoldMarks && (
                <div className="mt-6 border-2 border-dashed border-blue-300 rounded p-3 text-center">
                  <p className="text-xs text-blue-400 font-semibold">▶ LIPAT DI SINI — Sisakan overlap 10mm untuk sambungan ◀</p>
                </div>
              )}

              {/* Instructions */}
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-600 space-y-1">
                <p className="font-bold text-gray-800">Cara Penggunaan:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  {selectedSheet === 'all' ? (
                    <>
                      <li>Print lembaran ini di kertas A2 sesuai skala yang dipilih ({scale})</li>
                      <li>Gunting setiap bagian mengikuti garis potong oranye</li>
                      <li>Susun di atas triplek sesuai nomor urut bagian {"(1/"}{numSections}{" s.d. "}{numSections}{"/"}{numSections}{")"}</li>
                      <li>Rekatkan menggunakan tanda registrasi (+) sebagai panduan sambungan</li>
                    </>
                  ) : (
                    <>
                      <li>Print lembar ke-{selectedSheet} dari total {totalSheetsNeeded} lembar pada kertas A2 dengan skala {scale}</li>
                      <li>Sambungkan lembar ini dengan lembar {prevSheetText} {nextSheetText} memakai overlap garis potong</li>
                      <li>Rekatkan menggunakan tanda registrasi (+) sebagai panduan sambungan</li>
                    </>
                  )}
                  <li>Gambar pola ke ban/triplek mengikuti garis, lalu pahat sesuai kedalaman {cfg.grooveDepthMm}mm</li>
                </ol>
              </div>
            </div>

            {/* Grid overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
                  backgroundSize: '10px 10px',
                }}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-orange-400"></div>
            <span>Garis Potong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
            <span>Garis Lipat</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600">
            <span className="font-bold text-base leading-none">+</span>
            <span>Tanda Registrasi</span>
          </div>
          <span className="ml-auto font-mono">Skala: {scale} | {dims.sizeCode} | {cfg.type.toUpperCase()}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="text-sm text-[#64748b] flex items-center gap-2">
          ✅ Desain selesai!
          {state.savedId && <span className="text-green-600 font-semibold">Tersimpan di database #{state.savedId}</span>}
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          body * { visibility: hidden; }
          [data-print-a2], [data-print-a2] * { visibility: visible; }
          @page { size: A2 landscape; margin: 0; }
        }
      `}</style>
    </div>
  )
}
