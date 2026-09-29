'use client'

import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Camera, ExternalLink, QrCode } from 'lucide-react'

export function SplEvidenceQrBox({
  splId,
  splNumber,
  className = '',
}: {
  splId: number | string
  splNumber?: string
  className?: string
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [evidenceUrl, setEvidenceUrl] = useState<string>('')

  useEffect(() => {
    if (!splId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const targetUrl = `${origin}/overtime-evidence/${splId}`
    setEvidenceUrl(targetUrl)

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate SPL QR code:', err))
  }, [splId])

  if (!splId) return null

  return (
    <a
      href={evidenceUrl || `/overtime-evidence/${splId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex flex-col items-center justify-center p-1.5 rounded-lg border border-slate-300 bg-white/95 hover:bg-slate-50 transition-all group text-decoration-none ${className}`}
      title="Klik untuk membuka galeri foto bukti lembur atau scan dengan kamera HP"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="size-14 flex items-center justify-center bg-white rounded border border-slate-200 p-0.5 shadow-2xs group-hover:border-[#003f78] transition-colors">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Validasi SPL" className="size-full object-contain" />
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-[7px] font-mono text-slate-400">
            <QrCode className="size-5 mb-0.5 text-slate-400" />
            <span>QR CODE</span>
          </div>
        )}
      </div>
      <div className="mt-1 text-center leading-tight">
        <span className="text-[6.5pt] font-black text-[#003f78] uppercase tracking-wider block flex items-center justify-center gap-0.5">
          Scan / Klik Bukti ↗
        </span>
        <span className="text-[5.5pt] text-slate-500 font-medium block">
          Validasi Digital
        </span>
      </div>
    </a>
  )
}
