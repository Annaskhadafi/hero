'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { TireSizePreset } from '@/db/schema/tire-pattern'
import type { DesignerState, TireDimensions } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  presets: TireSizePreset[]
  onNext: () => void
  onBack: () => void
}

// ─── Kalkulasi dimensi ban ───────────────────────────────────────────────────
function calcDimensions(widthMm: number, aspectRatio: number, rimInch: number): Omit<TireDimensions, 'sizeCode'> {
  const rimMm = rimInch * 25.4
  const sectionHeightMm = (widthMm * aspectRatio) / 100
  const outerDiameterMm = rimMm + 2 * sectionHeightMm
  const circumferenceMm = Math.round(Math.PI * outerDiameterMm)
  const treadWidthMm = Math.round(widthMm * 0.78)
  return {
    sectionWidthMm: widthMm,
    aspectRatio,
    rimDiameterMm: Math.round(rimMm),
    circumferenceMm,
    treadWidthMm,
  }
}

// ─── Parse format "1000-20" ──────────────────────────────────────────────────
function parseTireSizeCode(code: string): { widthMm: number; rimInch: number } | null {
  const match = code.match(/^(\d{3,4})-(\d{2,3})$/)
  if (!match) return null
  const widthMm = parseInt(match[1])
  const rimInch = parseInt(match[2])
  if (isNaN(widthMm) || isNaN(rimInch)) return null
  return { widthMm, rimInch }
}

export default function Step2TireSize({ state, dispatch, presets, onNext, onBack }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<TireSizePreset | null>(null)
  const [customCode, setCustomCode] = useState('')
  const [customWidth, setCustomWidth] = useState('')
  const [customRim, setCustomRim] = useState('')
  const [customAr, setCustomAr] = useState('100')
  const [dims, setDims] = useState<TireDimensions | null>(state.tireDimensions ?? null)
  const [inputMode, setInputMode] = useState<'preset' | 'custom'>(state.tireDimensions ? 'preset' : 'preset')

  // Restore from state
  useEffect(() => {
    if (state.tireDimensions && !selectedPreset) {
      setDims(state.tireDimensions)
      setCustomCode(state.tireDimensions.sizeCode)
    }
  }, [state.tireDimensions, selectedPreset])

  const applyPreset = (preset: TireSizePreset) => {
    setSelectedPreset(preset)
    setInputMode('preset')
    const d: TireDimensions = {
      sectionWidthMm: preset.sectionWidth,
      aspectRatio: preset.aspectRatio,
      rimDiameterMm: preset.rimDiameterMm,
      circumferenceMm: preset.circumferenceMm,
      treadWidthMm: preset.treadWidthMm,
      sizeCode: preset.code,
    }
    setDims(d)
    dispatch({ type: 'SET_TIRE_SIZE', dimensions: d })
  }

  const applyCustom = () => {
    if (customCode) {
      const parsed = parseTireSizeCode(customCode.trim())
      if (parsed) {
        const ar = parseInt(customAr) || 100
        const calc = calcDimensions(parsed.widthMm, ar, parsed.rimInch)
        const d: TireDimensions = { ...calc, sizeCode: customCode.trim() }
        setDims(d)
        setSelectedPreset(null)
        dispatch({ type: 'SET_TIRE_SIZE', dimensions: d })
        return
      }
    }
    if (customWidth && customRim) {
      const w = parseInt(customWidth)
      const r = parseInt(customRim)
      const ar = parseInt(customAr) || 100
      if (!isNaN(w) && !isNaN(r)) {
        const calc = calcDimensions(w, ar, r)
        const code = `${w}-${r}`
        const d: TireDimensions = { ...calc, sizeCode: code }
        setDims(d)
        setSelectedPreset(null)
        dispatch({ type: 'SET_TIRE_SIZE', dimensions: d })
      }
    }
  }

  const truckPresets = presets.filter((p) => p.category === 'truck')
  const otrPresets = presets.filter((p) => p.category === 'otr')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Preset + Custom ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex border-b">
              {(['preset', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium transition-colors',
                    inputMode === mode
                      ? 'bg-[#0f172a] text-white'
                      : 'text-[#64748b] hover:bg-gray-50',
                  )}
                >
                  {mode === 'preset' ? '📋 Pilih Preset' : '✏️ Input Manual'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {inputMode === 'preset' ? (
                <div className="space-y-4">
                  {/* Truck */}
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">Truck / Bus</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {truckPresets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p)}
                          className={cn(
                            'text-sm font-medium py-2 px-3 rounded-lg border-2 transition-all',
                            selectedPreset?.id === p.id
                              ? 'border-amber-500 bg-amber-50 text-amber-800'
                              : 'border-gray-100 hover:border-amber-300 text-[#0f172a]',
                          )}
                        >
                          {p.code}
                          {p.label.includes('★') && <span className="block text-[10px] text-amber-500">★ Umum</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* OTR */}
                  <div>
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">OTR / Alat Berat</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {otrPresets.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p)}
                          className={cn(
                            'text-sm font-medium py-2 px-3 rounded-lg border-2 transition-all',
                            selectedPreset?.id === p.id
                              ? 'border-amber-500 bg-amber-50 text-amber-800'
                              : 'border-gray-100 hover:border-amber-300 text-[#0f172a]',
                          )}
                        >
                          {p.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Format Cepat (misal: 1000-20)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="1000-20"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        className="font-mono"
                      />
                      <Button onClick={applyCustom} variant="outline">Hitung</Button>
                    </div>
                    <p className="text-xs text-[#64748b] mt-1">Format: [lebar_mm]-[diameter_rim_inch]</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Atau Input Terpisah</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Lebar (mm)</Label>
                        <Input placeholder="254" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className="mt-1 font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs">Rim (inch)</Label>
                        <Input placeholder="20" value={customRim} onChange={(e) => setCustomRim(e.target.value)} className="mt-1 font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs">Aspek Ratio (%)</Label>
                        <Input placeholder="100" value={customAr} onChange={(e) => setCustomAr(e.target.value)} className="mt-1 font-mono" />
                      </div>
                    </div>
                    <Button onClick={applyCustom} className="mt-3 w-full" variant="outline">
                      <Calculator className="w-4 h-4 mr-2" />
                      Hitung Dimensi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Result panel ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className={cn(
            'bg-white rounded-xl border-2 shadow-sm p-5 space-y-4 transition-all',
            dims ? 'border-amber-300' : 'border-gray-100',
          )}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📐</span>
              <h3 className="font-semibold text-[#0f172a]">Dimensi Terhitung</h3>
            </div>

            {dims ? (
              <>
                <div className="text-center py-3 bg-[#0f172a] rounded-lg">
                  <p className="text-3xl font-bold text-white font-['Manrope']">{dims.sizeCode}</p>
                  <p className="text-xs text-gray-400 mt-1">Kode Ukuran Ban</p>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Lebar Penampang', value: `${dims.sectionWidthMm} mm` },
                    { label: 'Diameter Rim', value: `${dims.rimDiameterMm} mm (${dims.rimDiameterMm / 25.4 | 0}")` },
                    { label: 'Aspek Ratio', value: `${dims.aspectRatio}%` },
                    { label: 'Keliling Ban', value: `${dims.circumferenceMm.toLocaleString()} mm` },
                    { label: 'Lebar Tapak', value: `${dims.treadWidthMm} mm` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                      <span className="text-[#64748b]">{label}</span>
                      <span className="font-semibold text-[#0f172a]">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 border border-amber-200">
                  <strong>Area Pattern:</strong><br />
                  {dims.circumferenceMm.toLocaleString()} × {dims.treadWidthMm} mm<br />
                  = {(dims.circumferenceMm * dims.treadWidthMm / 100).toLocaleString()} cm²
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[#64748b]">
                <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Pilih atau input ukuran ban untuk melihat dimensi</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button
          onClick={onNext}
          disabled={!dims}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 gap-2"
        >
          Generate Pola 2D
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
