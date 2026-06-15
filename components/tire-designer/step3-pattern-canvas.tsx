'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download, RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { savePattern } from '@/app/actions/tire-pattern-actions'
import type { DesignerState, PatternConfig } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'
import { drawPattern } from './utils'

const PATTERN_TYPES = [
  { id: 'zig-zag', label: 'Zig-Zag', icon: '⚡' },
  { id: 'lug', label: 'Lug', icon: '🟫' },
  { id: 'rib', label: 'Rib', icon: '〰️' },
  { id: 'block', label: 'Block', icon: '⬛' },
  { id: 'mixed', label: 'Mixed', icon: '🔀' },
  { id: 'traction', label: 'Traction (OTR)', icon: '🚜' },
  { id: 'custom', label: 'Custom', icon: '✏️' },
] as const

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  onNext: () => void
  onBack: () => void
  userEmail: string
}

export default function Step3PatternCanvas({ state, dispatch, onNext, onBack, userEmail }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  const analysis = state.analysisResult
  const dims = state.tireDimensions!

  const [config, setConfig] = useState<PatternConfig>(() => ({
    type: state.patternConfig?.type || state.selectedPatternPreset || analysis?.patternType || 'zig-zag',
    grooveAngle: state.patternConfig?.grooveAngle ?? analysis?.suggestedGrooveAngle ?? 45,
    grooveWidthMm: state.patternConfig?.grooveWidthMm ?? analysis?.suggestedGrooveWidthMm ?? 8,
    grooveDepthMm: state.patternConfig?.grooveDepthMm ?? analysis?.suggestedGrooveDepthMm ?? 12,
    patternDensity: state.patternConfig?.patternDensity ?? analysis?.patternDensity ?? 50,
    repeatUnitMm: state.patternConfig?.repeatUnitMm ?? 42,
    hasCenterGroove: state.patternConfig?.hasCenterGroove ?? analysis?.hasCenterGroove ?? false,
    hasLateralGrooves: state.patternConfig?.hasLateralGrooves ?? true,
  }))

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawPattern(ctx, config, canvas.width, canvas.height)
  }, [config])

  useEffect(() => {
    redraw()
  }, [redraw])

  const handleConfigChange = (key: keyof PatternConfig, value: number | string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const svg = '' // placeholder - in production would generate proper SVG

    dispatch({ type: 'SET_PATTERN_CONFIG', config })
    dispatch({ type: 'SET_PATTERN_SVG', svg, dataUrl })

    setIsSaving(true)
    try {
      const result = await savePattern({
        name: state.designName || `${dims.sizeCode} ${config.type}`,
        tireSize: dims.sizeCode,
        patternType: config.type,
        grooveAngle: config.grooveAngle,
        grooveWidthMm: config.grooveWidthMm,
        grooveDepthMm: config.grooveDepthMm,
        patternDensity: config.patternDensity,
        repeatUnitMm: config.repeatUnitMm,
        patternConfig: config as unknown as Record<string, unknown>,
        analysisResult: state.analysisResult as unknown as Record<string, unknown>,
        analysisModel: 'anthropic/claude-3.5-sonnet',
        analysisSource: state.analysisSource,
        tireSectionWidthMm: dims.sectionWidthMm,
        tireAspectRatio: dims.aspectRatio,
        tireRimDiameterMm: dims.rimDiameterMm,
        tireCircumferenceMm: dims.circumferenceMm,
        tireTreadWidthMm: dims.treadWidthMm,
      })
      if (result.success && result.id) {
        dispatch({ type: 'SET_SAVED_ID', id: result.id })
        toast.success('Desain tersimpan ke database!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png')
      dispatch({ type: 'SET_PATTERN_CONFIG', config })
      dispatch({ type: 'SET_PATTERN_SVG', svg: '', dataUrl })
    }
    onNext()
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `pola-${dims.sizeCode}-${config.type}.png`
    a.click()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
          <h2 className="font-semibold text-[#0f172a] flex items-center gap-2">
            ⚙️ Pengaturan Pola
          </h2>

          {/* Pattern type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Tipe Pola</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PATTERN_TYPES.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => handleConfigChange('type', pt.id)}
                  className={cn(
                    'text-xs py-1.5 px-2 rounded-lg border transition-all',
                    config.type === pt.id
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-gray-100 hover:border-amber-300',
                  )}
                >
                  {pt.icon} {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Groove Angle */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Sudut Alur</Label>
              <span className="text-xs font-mono font-bold text-[#0f172a]">{config.grooveAngle}°</span>
            </div>
            <Slider
              min={0} max={90} step={5}
              value={[config.grooveAngle]}
              onValueChange={([v]) => handleConfigChange('grooveAngle', v)}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          {/* Groove Width */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Lebar Alur</Label>
              <span className="text-xs font-mono font-bold text-[#0f172a]">{config.grooveWidthMm} mm</span>
            </div>
            <Slider
              min={4} max={20} step={1}
              value={[config.grooveWidthMm]}
              onValueChange={([v]) => handleConfigChange('grooveWidthMm', v)}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          {/* Groove Depth */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Kedalaman Alur</Label>
              <span className="text-xs font-mono font-bold text-[#0f172a]">{config.grooveDepthMm} mm</span>
            </div>
            <Slider
              min={6} max={25} step={1}
              value={[config.grooveDepthMm]}
              onValueChange={([v]) => handleConfigChange('grooveDepthMm', v)}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          {/* Density */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Kerapatan</Label>
              <span className="text-xs font-mono font-bold text-[#0f172a]">{config.patternDensity}%</span>
            </div>
            <Slider
              min={20} max={80} step={5}
              value={[config.patternDensity]}
              onValueChange={([v]) => handleConfigChange('patternDensity', v)}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          {/* Repeat Unit */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Unit Repeat</Label>
              <span className="text-xs font-mono font-bold text-[#0f172a]">{config.repeatUnitMm} mm</span>
            </div>
            <Slider
              min={20} max={120} step={2}
              value={[config.repeatUnitMm]}
              onValueChange={([v]) => handleConfigChange('repeatUnitMm', v)}
              className="[&_[role=slider]]:bg-amber-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={redraw}
            className="w-full gap-2 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Render Ulang
          </Button>
        </div>

        {/* ── Canvas ───────────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f5f7fb]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0f172a]">Preview Pola 2D</span>
              <span className="text-xs text-[#64748b]">— {dims.sizeCode} | {config.type}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs h-7">
                <Download className="w-3 h-3" />
                Unduh PNG
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 text-xs h-7"
              >
                <Save className="w-3 h-3" />
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="relative bg-[#1a1a1a] flex items-center justify-center" style={{ minHeight: 400 }}>
            <canvas
              ref={canvasRef}
              width={700}
              height={380}
              className="max-w-full"
              style={{ imageRendering: 'crisp-edges' }}
            />
            {/* Dimension overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs">
              <div className="bg-black/60 text-white px-2 py-1 rounded font-mono">
                ← {dims.treadWidthMm} mm (tapak) →
              </div>
              <div className="bg-black/60 text-white px-2 py-1 rounded font-mono">
                ∮ {dims.circumferenceMm.toLocaleString()} mm (keliling)
              </div>
            </div>
          </div>

          {/* Info bar */}
          <div className="px-4 py-3 border-t bg-[#f5f7fb] grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Tipe', value: config.type },
              { label: 'Sudut Alur', value: `${config.grooveAngle}°` },
              { label: 'Lebar Alur', value: `${config.grooveWidthMm} mm` },
              { label: 'Dalam Alur', value: `${config.grooveDepthMm} mm` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[#64748b]">{label}</p>
                <p className="text-sm font-bold text-[#0f172a] font-mono">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────────── */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button onClick={handleNext} className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 gap-2">
          Preview 3D
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
