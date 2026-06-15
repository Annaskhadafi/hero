'use client'

import { useState, useCallback, useReducer } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TireSizePreset } from '@/db/schema/tire-pattern'

import Step1ReferenceInput from '@/components/tire-designer/step1-reference-input'
import Step2TireSize from '@/components/tire-designer/step2-tire-size'
import Step3PatternCanvas from '@/components/tire-designer/step3-pattern-canvas'
import Step4ThreeDViewer from '@/components/tire-designer/step4-3d-viewer'
import Step5WorkDrawing from '@/components/tire-designer/step5-work-drawing'
import Step6PrintTemplate from '@/components/tire-designer/step6-print-template'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  patternType: string
  grooveAngle: number
  grooveWidthRatio: number
  patternDensity: number
  blockShape: string
  isDirectional: boolean
  hasLateralGrooves: boolean
  hasCenterGroove: boolean
  primaryDirection: string
  estimatedGrooveDepthCategory: string
  patternDescription: string
  suggestedGrooveAngle: number
  suggestedGrooveWidthMm: number
  suggestedGrooveDepthMm: number
  confidence: number
}

export interface TireDimensions {
  sectionWidthMm: number
  aspectRatio: number
  rimDiameterMm: number
  circumferenceMm: number
  treadWidthMm: number
  sizeCode: string // e.g. "1000-20"
}

export interface PatternConfig {
  type: string // zig-zag, lug, rib, block, mixed, custom
  grooveAngle: number // degrees
  grooveWidthMm: number
  grooveDepthMm: number
  patternDensity: number // 0-100
  repeatUnitMm: number
  hasCenterGroove: boolean
  hasLateralGrooves: boolean
}

export interface DesignerState {
  // Step 1
  referenceImageBase64?: string
  referenceImageUrl?: string
  analysisResult?: AnalysisResult
  analysisSource: 'upload' | 'preset' | 'manual'
  selectedPatternPreset?: string // quick-select

  // Step 2
  tireDimensions?: TireDimensions

  // Step 3
  patternConfig?: PatternConfig
  patternSvg?: string
  patternCanvasDataUrl?: string // rendered PNG from canvas

  // Step 4
  screenshot3dUrl?: string

  // Step 5
  workDrawingDataUrl?: string

  // Meta
  designName: string
  savedId?: number
}

type DesignerAction =
  | { type: 'SET_REFERENCE'; image?: string; imageUrl?: string; analysis?: AnalysisResult; source: 'upload' | 'preset' | 'manual'; preset?: string }
  | { type: 'SET_TIRE_SIZE'; dimensions: TireDimensions }
  | { type: 'SET_PATTERN_CONFIG'; config: PatternConfig }
  | { type: 'SET_PATTERN_SVG'; svg: string; dataUrl?: string }
  | { type: 'SET_SCREENSHOT_3D'; url: string }
  | { type: 'SET_WORK_DRAWING'; url: string }
  | { type: 'SET_DESIGN_NAME'; name: string }
  | { type: 'SET_SAVED_ID'; id: number }
  | { type: 'RESET' }

function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case 'SET_REFERENCE':
      return {
        ...state,
        referenceImageBase64: action.image,
        referenceImageUrl: action.imageUrl,
        analysisResult: action.analysis,
        analysisSource: action.source,
        selectedPatternPreset: action.preset,
      }
    case 'SET_TIRE_SIZE':
      return { ...state, tireDimensions: action.dimensions }
    case 'SET_PATTERN_CONFIG':
      return { ...state, patternConfig: action.config }
    case 'SET_PATTERN_SVG':
      return { ...state, patternSvg: action.svg, patternCanvasDataUrl: action.dataUrl }
    case 'SET_SCREENSHOT_3D':
      return { ...state, screenshot3dUrl: action.url }
    case 'SET_WORK_DRAWING':
      return { ...state, workDrawingDataUrl: action.url }
    case 'SET_DESIGN_NAME':
      return { ...state, designName: action.name }
    case 'SET_SAVED_ID':
      return { ...state, savedId: action.id }
    case 'RESET':
      return { analysisSource: 'manual', designName: 'Pola Baru' }
    default:
      return state
  }
}

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Referensi Pola', short: 'Referensi' },
  { id: 2, label: 'Ukuran Ban', short: 'Ukuran' },
  { id: 3, label: 'Generate Pola', short: 'Pola 2D' },
  { id: 4, label: 'Preview 3D', short: '3D View' },
  { id: 5, label: 'Gambar Kerja', short: 'G. Kerja' },
  { id: 6, label: 'Cetak A2', short: 'Cetak' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  presets: TireSizePreset[]
  userEmail: string
}

export default function PatternDesignerClient({ presets, userEmail }: Props) {
  const [currentStep, setCurrentStep] = useState(1)
  const [state, dispatch] = useReducer(designerReducer, {
    analysisSource: 'manual',
    designName: 'Pola Baru',
  })

  const canGoToStep = useCallback(
    (step: number) => {
      if (step <= 1) return true
      if (step === 2) return true // always can go back
      if (step === 3) return !!state.tireDimensions
      if (step === 4) return !!(state.tireDimensions && state.patternConfig)
      if (step === 5) return !!(state.patternConfig && state.tireDimensions)
      if (step === 6) return !!(state.patternConfig && state.tireDimensions)
      return false
    },
    [state],
  )

  const goNext = useCallback(() => {
    if (currentStep < 6) setCurrentStep((s) => s + 1)
  }, [currentStep])

  const goBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }, [currentStep])

  const goToStep = useCallback(
    (step: number) => {
      if (canGoToStep(step)) setCurrentStep(step)
      else toast.info('Selesaikan langkah sebelumnya terlebih dahulu')
    },
    [canGoToStep],
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f7fb]">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] font-['Manrope',sans-serif]">
            Pattern Designer
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Repair &amp; Retread — Rancang &amp; Cetak Pola Ban
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-700 font-medium text-xs">
            {state.designName}
          </span>
          {state.savedId && (
            <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700 text-xs">
              Tersimpan #{state.savedId}
            </span>
          )}
        </div>
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isAccessible = canGoToStep(step.id)

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={!isAccessible}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isCompleted && 'text-green-700 hover:bg-green-50 cursor-pointer',
                    isCurrent && 'bg-[#0f172a] text-white shadow-sm cursor-default',
                    !isCompleted && !isCurrent && isAccessible && 'text-[#64748b] hover:bg-gray-100 cursor-pointer',
                    !isCompleted && !isCurrent && !isAccessible && 'text-gray-300 cursor-not-allowed',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Circle className={cn('w-4 h-4 flex-shrink-0', isCurrent && 'text-white')} />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.short}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Step Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        {currentStep === 1 && (
          <Step1ReferenceInput
            state={state}
            dispatch={dispatch}
            onNext={goNext}
          />
        )}
        {currentStep === 2 && (
          <Step2TireSize
            state={state}
            dispatch={dispatch}
            presets={presets}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <Step3PatternCanvas
            state={state}
            dispatch={dispatch}
            onNext={goNext}
            onBack={goBack}
            userEmail={userEmail}
          />
        )}
        {currentStep === 4 && (
          <Step4ThreeDViewer
            state={state}
            dispatch={dispatch}
            presets={presets}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 5 && (
          <Step5WorkDrawing
            state={state}
            dispatch={dispatch}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 6 && (
          <Step6PrintTemplate
            state={state}
            dispatch={dispatch}
            onBack={goBack}
          />
        )}
      </div>
    </div>
  )
}
