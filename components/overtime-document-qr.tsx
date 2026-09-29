'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode } from 'lucide-react'
import { OvertimeEvidenceModal } from '@/components/overtime-evidence-modal'

export function SplEvidenceQrBox({
  splId,
  splNumber,
  className = '',
  size = 56,
}: {
  splId: number | string
  splNumber?: string
  className?: string
  size?: number
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [evidenceUrl, setEvidenceUrl] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  useEffect(() => {
    if (!splId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const targetUrl = `${origin}/overtime-evidence/${splId}`
    setEvidenceUrl(targetUrl)

    QRCode.toDataURL(targetUrl, {
      margin: 0,
      width: 140,
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate SPL QR code:', err))
  }, [splId])

  if (!splId) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
      <a
        href={evidenceUrl || `/overtime-evidence/${splId}`}
        onClick={handleClick}
        className={`inline-block transition-opacity hover:opacity-80 cursor-pointer select-none ${className}`}
        title="Klik untuk membuka jendela galeri foto bukti lembur (atau scan dengan HP untuk membuka halaman web)"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Validasi SPL"
            style={{ width: `${size}px`, height: `${size}px`, display: 'block' }}
            className="object-contain"
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center text-[7px] font-mono text-slate-400"
          >
            <QrCode className="size-6 text-slate-400" />
          </div>
        )}
      </a>

      {/* Floating Evidence Modal */}
      <OvertimeEvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        splId={splId}
      />
    </>
  )
}
