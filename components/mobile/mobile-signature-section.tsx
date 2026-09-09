'use client'

import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  FileSignature,
  PenTool,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/mobile/collapsible-section'
import { MobileSignaturePadDialog } from '@/components/mobile/mobile-signature-pad-dialog'
import { getUserSignatureAction } from '@/app/actions/user-signature'

interface MobileSignatureSectionProps {
  initialSignatureDataUrl?: string | null
  initialRegisteredAt?: string | null
}

export function MobileSignatureSection({
  initialSignatureDataUrl,
  initialRegisteredAt,
}: MobileSignatureSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(
    initialSignatureDataUrl || null
  )
  const [registeredAt, setRegisteredAt] = useState<string | null>(
    initialRegisteredAt || null
  )
  const [isLoading, setIsLoading] = useState(!initialSignatureDataUrl)

  const reloadSignature = async () => {
    try {
      setIsLoading(true)
      const res = await getUserSignatureAction()
      if (res.success) {
        setSignatureUrl(res.signatureDataUrl || null)
        setRegisteredAt(res.signatureRegisteredAt || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (initialSignatureDataUrl && initialSignatureDataUrl !== signatureUrl) {
      setSignatureUrl(initialSignatureDataUrl)
      if (initialRegisteredAt) {
        setRegisteredAt(initialRegisteredAt)
      }
    }
  }, [initialSignatureDataUrl, initialRegisteredAt])

  useEffect(() => {
    reloadSignature()
  }, [])

  return (
    <>
      <CollapsibleSection title="Tanda Tangan Digital">
        <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3.5 shadow-xs">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <PenTool className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Status TTD Digital</p>
                <p className="text-[10px] text-gray-500">Persetujuan & Approval Dokumen</p>
              </div>
            </div>

            {signatureUrl ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                <CheckCircle2 className="size-3 mr-1" /> Aktif
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold"
              >
                Belum Terdaftar
              </Badge>
            )}
          </div>

          {/* Signature Content */}
          {signatureUrl ? (
            <div className="space-y-3">
              <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/50 p-2 shadow-inner">
                <img
                  src={signatureUrl}
                  alt="Tanda Tangan Saya"
                  className="max-h-16 max-w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <p className="text-[10px] text-gray-500">
                  {registeredAt
                    ? `Terdaftar: ${new Date(registeredAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'Siap digunakan otomatis'}
                </p>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsOpen(true)}
                  className="h-8 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg gap-1.5 active:scale-95"
                >
                  <PenTool className="size-3.5" /> Ubah TTD
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3.5 text-center space-y-2.5">
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Anda belum mendaftarkan tanda tangan digital. Daftarkan sekarang agar approval form & surat tugas dapat diproses instan.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
              >
                <Plus className="size-4" /> Daftarkan TTD Sekarang
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <MobileSignaturePadDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSignatureSaved={(newSig) => {
          setSignatureUrl(newSig)
          setRegisteredAt(new Date().toISOString())
        }}
        onSignatureDeleted={() => {
          setSignatureUrl(null)
          setRegisteredAt(null)
        }}
      />
    </>
  )
}
