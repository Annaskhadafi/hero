'use client'

import { useState, useEffect } from 'react'
import { X, Camera, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface FaceRegistrationReminderPopupProps {
  isRegistered: boolean
  employeeId?: number | string | null
  siteId?: number | string | null
}

export function FaceRegistrationReminderPopup({ isRegistered, employeeId, siteId }: FaceRegistrationReminderPopupProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isRegistered) return
    const timer = setTimeout(() => setShow(true), 1500)
    return () => clearTimeout(timer)
  }, [isRegistered])

  if (!show) return null

  const dismiss = () => {
    setShow(false)
  }

  // Construct the correct destination URL based on user instructions
  let targetUrl = '/mobile/attendance/face-v2/register?reregister=true'
  if (employeeId) targetUrl += `&employeeId=${employeeId}`
  if (siteId) targetUrl += `&siteId=${siteId}`

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[340px] rounded-[1.5rem] bg-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-[#f4b183]" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Aksi Diperlukan
            </span>
          </div>
          <button
            onClick={dismiss}
            className="text-white/80 hover:text-white bg-black/20 hover:bg-black/35 transition-colors p-1.5 rounded-full z-10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <Camera className="size-6 text-slate-700" />
          </div>
          <h4 className="text-base font-bold text-slate-900 leading-tight mb-2">
            Registrasi Wajah Belum Selesai
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Anda belum mendaftarkan data wajah. Registrasi wajah diperlukan untuk menggunakan fitur absensi melalui perangkat mobile Anda.
          </p>

          <div className="flex gap-2 w-full mt-5">
            <Button variant="outline" className="flex-1 rounded-xl h-10 text-xs font-semibold" onClick={dismiss}>
              Nanti Saja
            </Button>
            <Button asChild className="flex-1 rounded-xl h-10 text-xs font-semibold bg-[#0f172a] hover:bg-slate-800 text-white">
              <Link href={targetUrl} onClick={dismiss}>
                Registrasi Sekarang
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
