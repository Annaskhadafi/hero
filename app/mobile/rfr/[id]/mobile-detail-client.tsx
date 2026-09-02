'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  Calendar,
  Download,
  Maximize2,
  ExternalLink,
  Paperclip,
  Briefcase,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'

type MobileRfrDetailClientProps = {
  rfr: any
  approvals: any[]
}

function ScaledRfrDocument({ rfr, approvals }: { rfr: any; approvals: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.45)
  const [measuredHeight, setMeasuredHeight] = useState(350)
  const baseDocWidth = 800

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return
    const updateScaleAndHeight = () => {
      if (containerRef.current && contentRef.current) {
        const width = containerRef.current.clientWidth
        if (width > 0) {
          const computedScale = width / baseDocWidth
          setScale(computedScale)
          const actualHeight = contentRef.current.scrollHeight || 700
          setMeasuredHeight(Math.ceil(actualHeight * computedScale))
        }
      }
    }
    updateScaleAndHeight()
    const observer = new ResizeObserver(updateScaleAndHeight)
    observer.observe(containerRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative rounded-xl bg-white"
      style={{ height: `${measuredHeight}px` }}
    >
      <div
        ref={contentRef}
        style={{
          width: `${baseDocWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        className="pointer-events-none select-none"
      >
        <RfrDocumentPreview rfr={rfr} approvals={approvals} />
      </div>
    </div>
  )
}

function formatIndoDateTime(val?: string | Date | null): string {
  if (!val) return '-'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  return `${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — ${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export function MobileRfrDetailClient({ rfr, approvals }: MobileRfrDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'document' | 'timeline'>('document')
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

  const currentStep = approvals.find((a) => a.stepOrder === rfr.currentStepOrder)

  return (
    <div className="space-y-3.5">
      {/* 1. Header Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {rfr.positionTitle}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {rfr.level?.replace('_', ' ')}
              </span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700">
                {rfr.numberOfPersons} Person(s)
              </span>
            </div>
          </div>

          {rfr.status === 'approved' ? (
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-xs py-0.5 px-2 flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Disetujui</span>
            </Badge>
          ) : rfr.status === 'rejected' ? (
            <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-xs py-0.5 px-2 flex items-center gap-1 shadow-2xs">
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>Ditolak</span>
            </Badge>
          ) : (
            <Badge className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-xs py-0.5 px-2 flex items-center gap-1 shadow-2xs">
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Step {rfr.currentStepOrder}/6</span>
            </Badge>
          )}
        </div>

        {/* Current Pending Step Indicator */}
        {rfr.status === 'in_progress' && currentStep && (
          <div className="rounded-xl bg-sky-50/70 border border-sky-200 p-2.5 text-xs text-sky-950 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600 shrink-0" />
            <div className="truncate">
              <span className="font-semibold">Sedang menunggu: </span>
              <strong>{currentStep.approverName || currentStep.roleLabel}</strong> ({currentStep.approverTitle || currentStep.roleLabel})
            </div>
          </div>
        )}
      </div>

      {/* 2. Segmented Navigation */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('document')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'document'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Lembar Dokumen</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Alur Persetujuan</span>
        </button>
      </div>

      {/* 3. Tab Content: Document View */}
      {activeTab === 'document' && (
        <div className="space-y-2.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 px-1 border-b border-slate-100 mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Pratinjau Dokumen Resmi
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreenOpen(true)}
                className="h-7 px-2 text-[11px] font-bold rounded-lg border-slate-300 text-slate-700 gap-1"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Perbesar</span>
              </Button>
            </div>

            {/* Scaled Sheet */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-1">
              <ScaledRfrDocument rfr={rfr} approvals={approvals} />
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Content: Timeline View */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
            Riwayat 6 Tahap Persetujuan RFR
          </h3>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {approvals.map((step: any, idx: number) => {
              const isApproved = step.status === 'approved'
              const isRejected = step.status === 'rejected'
              const isCurrent = step.stepOrder === rfr.currentStepOrder && rfr.status === 'in_progress'

              return (
                <div key={step.id || idx} className="relative flex items-start gap-3 pl-1">
                  {/* Step Status Icon Badge */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black z-10 ${
                      isApproved
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isRejected
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : isCurrent
                        ? 'border-sky-600 bg-white text-sky-600 ring-2 ring-sky-200 animate-pulse'
                        : 'border-slate-300 bg-white text-slate-400'
                    }`}
                  >
                    {isApproved ? '✓' : isRejected ? '✕' : step.stepOrder}
                  </div>

                  {/* Step Info Card */}
                  <div
                    className={`flex-1 rounded-xl border p-3 text-xs ${
                      isCurrent
                        ? 'border-sky-200 bg-sky-50/50 shadow-2xs'
                        : isApproved
                        ? 'border-emerald-100 bg-emerald-50/30'
                        : isRejected
                        ? 'border-rose-100 bg-rose-50/30'
                        : 'border-slate-100 bg-slate-50/50 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">
                        Step {step.stepOrder}: {step.roleLabel}
                      </span>
                      {isApproved ? (
                        <span className="text-[10px] font-bold text-emerald-700">Disetujui</span>
                      ) : isRejected ? (
                        <span className="text-[10px] font-bold text-rose-700">Ditolak</span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold text-sky-700">Menunggu</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Antrean</span>
                      )}
                    </div>

                    <div className="mt-1 font-semibold text-slate-900">
                      {step.approverName || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {step.approverTitle || '-'}
                    </div>

                    {/* Signature Thumbnail */}
                    {isApproved && step.signatureDataUrl && (
                      <div className="mt-2 inline-block rounded border border-slate-200 bg-white p-1">
                        <img
                          src={step.signatureDataUrl}
                          alt="TTD"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      </div>
                    )}

                    {/* Timestamp */}
                    {step.signedAt && (
                      <div className="mt-1.5 text-[10px] text-slate-400">
                        {formatIndoDateTime(step.signedAt)}
                      </div>
                    )}

                    {/* Decision Note */}
                    {step.decisionNotes && (
                      <div className="mt-2 p-2 bg-white rounded border border-slate-200 text-slate-700 text-[11px]">
                        <span className="font-semibold">Catatan:</span> {step.decisionNotes}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Fullscreen Zoom Dialog */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-2 sm:p-4 rounded-2xl">
          <DialogHeader className="p-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-slate-900">
              Dokumen: {rfr.rfrNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 bg-slate-100 flex justify-center overflow-x-auto">
            <RfrDocumentPreview rfr={rfr} approvals={approvals} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
