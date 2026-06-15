'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Upload, ImagePlus, Zap, Loader2, ChevronRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DesignerState, AnalysisResult } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

// ─── Quick-select pola preset ────────────────────────────────────────────────
const PATTERN_PRESETS = [
  {
    id: 'zig-zag',
    label: 'Zig-Zag',
    desc: 'Alur diagonal berganti arah. Traksi all-terrain.',
    icon: '⚡',
    config: { grooveAngle: 45, grooveWidthMm: 8, grooveDepthMm: 12, patternDensity: 55 },
  },
  {
    id: 'lug',
    label: 'Lug',
    desc: 'Blok melintang besar. Traksi lumpur & off-road.',
    icon: '🟫',
    config: { grooveAngle: 90, grooveWidthMm: 10, grooveDepthMm: 14, patternDensity: 45 },
  },
  {
    id: 'rib',
    label: 'Rib',
    desc: 'Alur memanjang lurus. Stabil di jalan raya.',
    icon: '〰️',
    config: { grooveAngle: 0, grooveWidthMm: 6, grooveDepthMm: 10, patternDensity: 65 },
  },
  {
    id: 'block',
    label: 'Block',
    desc: 'Blok persegi/kotak. Serba guna.',
    icon: '⬛',
    config: { grooveAngle: 45, grooveWidthMm: 9, grooveDepthMm: 12, patternDensity: 50 },
  },
  {
    id: 'mixed',
    label: 'Mixed',
    desc: 'Kombinasi rib tengah + lug tepi.',
    icon: '🔀',
    config: { grooveAngle: 30, grooveWidthMm: 8, grooveDepthMm: 12, patternDensity: 55 },
  },
  {
    id: 'custom',
    label: 'Custom',
    desc: 'Atur parameter sendiri sepenuhnya.',
    icon: '✏️',
    config: { grooveAngle: 45, grooveWidthMm: 8, grooveDepthMm: 12, patternDensity: 50 },
  },
]

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  onNext: () => void
}

export default function Step1ReferenceInput({ state, dispatch, onNext }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(state.referenceImageUrl)
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(state.selectedPatternPreset)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Image upload & analysis ────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diizinkan (JPG, PNG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setPreviewUrl(dataUrl)

      // Start smart analysis
      setIsAnalyzing(true)
      toast.loading('Menganalisa pola...', { id: 'analyzing' })

      try {
        const res = await fetch('/api/tire-pattern/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
          }),
        })

        const data = await res.json()

        if (data.success && data.result) {
          const analysis = data.result as AnalysisResult
          dispatch({
            type: 'SET_REFERENCE',
            image: base64,
            imageUrl: dataUrl,
            analysis,
            source: 'upload',
          })
          setSelectedPreset(analysis.patternType)
          toast.success('Analisa pola selesai!', { id: 'analyzing' })
        } else {
          toast.error(`Analisa gagal: ${data.error || 'Coba lagi'}`, { id: 'analyzing' })
          dispatch({
            type: 'SET_REFERENCE',
            image: base64,
            imageUrl: dataUrl,
            source: 'upload',
          })
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal menghubungi server analisa', { id: 'analyzing' })
        dispatch({
          type: 'SET_REFERENCE',
          image: base64,
          imageUrl: dataUrl,
          source: 'upload',
        })
      } finally {
        setIsAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [dispatch])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const handlePresetSelect = useCallback(
    (preset: (typeof PATTERN_PRESETS)[0]) => {
      setSelectedPreset(preset.id)
      setPreviewUrl(undefined)
      dispatch({
        type: 'SET_REFERENCE',
        source: 'preset',
        preset: preset.id,
        analysis: {
          patternType: preset.id,
          grooveAngle: preset.config.grooveAngle,
          grooveWidthRatio: 20,
          patternDensity: preset.config.patternDensity,
          blockShape: 'rectangular',
          isDirectional: false,
          hasLateralGrooves: true,
          hasCenterGroove: preset.id === 'rib' || preset.id === 'mixed',
          primaryDirection: preset.id === 'zig-zag' ? 'diagonal' : preset.id === 'rib' ? 'longitudinal' : 'transverse',
          estimatedGrooveDepthCategory: 'medium (8-14mm)',
          patternDescription: `Pola ${preset.label}: ${preset.desc}`,
          suggestedGrooveAngle: preset.config.grooveAngle,
          suggestedGrooveWidthMm: preset.config.grooveWidthMm,
          suggestedGrooveDepthMm: preset.config.grooveDepthMm,
          confidence: 100,
        } as AnalysisResult,
      })
    },
    [dispatch],
  )

  const analysis = state.analysisResult
  const canProceed = !!selectedPreset || !!analysis || !!previewUrl

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Upload Area ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-[#0f172a]">Upload Referensi Pola</h2>
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              <Zap className="w-3 h-3 mr-1 inline" />
              Analisa Otomatis
            </Badge>
          </div>
          <p className="text-sm text-[#64748b]">
            Screenshot pola ban dari internet atau foto pola yang sudah ada — sistem akan membaca pola secara otomatis.
          </p>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden',
              isDragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30',
              previewUrl ? 'h-64' : 'h-48',
            )}
          >
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Referensi pola" className="w-full h-full object-contain p-2" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-sm font-medium text-[#0f172a]">Menganalisa pola...</p>
                    <p className="text-xs text-[#64748b]">Membaca sudut alur, tipe, & dimensi</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-4">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-[#0f172a] text-sm">Drag & drop atau klik untuk upload</p>
                  <p className="text-xs text-[#64748b] mt-1">JPG, PNG, WebP — Maks. 10MB</p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }}
          />

          {/* Analysis Result */}
          {analysis && !isAnalyzing && state.analysisSource === 'upload' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Analisa Selesai</span>
                <span className="text-xs ml-auto">Akurasi: {analysis.confidence}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                <div><span className="text-green-600">Tipe:</span> <strong>{analysis.patternType}</strong></div>
                <div><span className="text-green-600">Sudut:</span> <strong>{analysis.grooveAngle}°</strong></div>
                <div><span className="text-green-600">Lebar alur:</span> <strong>±{analysis.suggestedGrooveWidthMm}mm</strong></div>
                <div><span className="text-green-600">Kedalaman:</span> <strong>±{analysis.suggestedGrooveDepthMm}mm</strong></div>
              </div>
              <p className="text-xs text-green-700 border-t border-green-200 pt-2">{analysis.patternDescription}</p>
            </div>
          )}
        </div>

        {/* ── Quick Select Library ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h2 className="font-semibold text-[#0f172a]">Atau Pilih dari Library</h2>
          </div>
          <p className="text-sm text-[#64748b]">
            Pilih tipe pola dasar, lalu atur parameter di Step 3.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PATTERN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  'text-left p-3 rounded-xl border-2 transition-all duration-200 group',
                  selectedPreset === preset.id && state.analysisSource === 'preset'
                    ? 'border-[#0f172a] bg-[#0f172a] text-white'
                    : 'border-gray-100 hover:border-amber-300 hover:bg-amber-50/40',
                )}
              >
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className={cn('font-semibold text-sm', selectedPreset === preset.id && state.analysisSource === 'preset' ? 'text-white' : 'text-[#0f172a]')}>
                  {preset.label}
                </div>
                <div className={cn('text-xs mt-0.5 leading-tight', selectedPreset === preset.id && state.analysisSource === 'preset' ? 'text-gray-300' : 'text-[#64748b]')}>
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed || isAnalyzing}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 gap-2"
        >
          Lanjut ke Ukuran Ban
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
