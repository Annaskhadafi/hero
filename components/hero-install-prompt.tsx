'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Download,
  X,
  Zap,
  MapPin,
  Bell,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Smartphone,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 jam cooldown jika user klik 'Nanti Saja'
const DISMISS_KEY = 'hero:pwa-install-dismissed-at'
const INSTALLED_KEY = 'hero:pwa-installed'

export function HeroInstallPrompt() {
  const [show, setShow] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [hasNativePrompt, setHasNativePrompt] = useState(false)
  const [installedSuccess, setInstalledSuccess] = useState(false)
  const deferredPromptRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Skip jika di domain/path portal MAESTRO
    if (
      window.location.hostname.includes('maestro') ||
      window.location.pathname.startsWith('/maestro')
    ) {
      return
    }

    // 2. Deteksi apakah sudah terpasang dan berjalan dalam mode PWA Standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      // User sudah menggunakan aplikasi HERO terinstall
      return
    }

    // 3. Deteksi platform OS
    const ua = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream
    const androidDevice = /android/.test(ua)
    const isMobileViewport = window.innerWidth < 768

    setIsIos(iosDevice)
    setIsAndroid(androidDevice)

    // 4. Cek cooldown dismissal
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const timeSinceDismiss = Date.now() - Number(dismissedAt)
      if (timeSinceDismiss < DISMISS_COOLDOWN_MS) {
        return
      }
    }

    // 5. Tangkap event native PWA 'beforeinstallprompt' (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setHasNativePrompt(true)
      // Tampilkan popup setelah delay singkat agar halaman selesai termuat
      setTimeout(() => setShow(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 6. Tangkap event ketika instalasi selesai
    const handleAppInstalled = () => {
      setInstalledSuccess(true)
      deferredPromptRef.current = null
      localStorage.setItem(INSTALLED_KEY, 'true')
      setTimeout(() => setShow(false), 2500)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // 7. Listener kustom untuk memanggil popup secara manual (misal dari menu)
    const handleCustomOpen = () => {
      setShow(true)
    }
    window.addEventListener('hero:open-install-prompt', handleCustomOpen)

    // 8. Untuk perangkat mobile (iOS Safari / Android) jika event native tidak otomatis muncul
    // Munculkan popup dengan delay 2.5 detik
    let timer: NodeJS.Timeout | null = null
    if (iosDevice || (androidDevice && isMobileViewport)) {
      timer = setTimeout(() => {
        setShow(true)
      }, 2500)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('hero:open-install-prompt', handleCustomOpen)
      if (timer) clearTimeout(timer)
    }
  }, [])

  if (!show) return null

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    }
    setShow(false)
  }

  const handleInstallClick = async () => {
    // Jika browser mendukung native install prompt (Chrome / Android / Edge)
    if (deferredPromptRef.current) {
      try {
        const promptEvent = deferredPromptRef.current
        promptEvent.prompt()
        const choice = await promptEvent.userChoice
        if (choice.outcome === 'accepted') {
          setInstalledSuccess(true)
          localStorage.setItem(INSTALLED_KEY, 'true')
          setTimeout(() => setShow(false), 2000)
        } else {
          handleDismiss()
        }
      } catch (err) {
        console.error('Error saat memicu prompt instalasi:', err)
        setShowGuide(true)
      }
      return
    }

    // Jika di iOS Safari atau browser tanpa native prompt, tampilkan panduan langkah demi langkah
    setShowGuide(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-install-title"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={cn(
          'relative flex w-full max-w-sm flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl transition-all duration-300 border border-slate-200',
          'animate-in zoom-in-95 slide-in-from-bottom-6 sm:slide-in-from-bottom-0'
        )}
      >
        {/* ─── HEADER / BANNER ─── */}
        <div className="relative bg-gradient-to-br from-[#002447] via-[#003461] to-[#004e8c] p-4 text-white">
          {/* Subtle background glow effect */}
          <div className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-blue-400/20 blur-2xl" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 shadow-lg ring-2 ring-white/20">
                <Image
                  src="/icon-192.png"
                  alt="HERO App Icon"
                  width={48}
                  height={48}
                  className="rounded-xl object-contain"
                  priority
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 id="hero-install-title" className="text-base font-black tracking-tight text-white">
                    HERO Mobile
                  </h3>
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                    <ShieldCheck className="size-2.5" /> Resmi
                  </span>
                </div>
                <p className="text-[11px] font-medium text-blue-100/90">
                  Chitra Paratama Hub
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Tutup popup"
              className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 active:scale-95"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── BODY CONTENT ─── */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {installedSuccess ? (
            <div className="flex flex-col items-center py-4 text-center space-y-2 animate-in fade-in">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Aplikasi Berhasil Dipasang!
              </h4>
              <p className="text-xs text-slate-600">
                Ikon aplikasi HERO kini tersedia di layar utama perangkat Anda.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  Pasang Aplikasi HERO di Layar Utama HP
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dapatkan pengalaman absensi dan pelaporan harian yang lebih cepat, ringan, dan stabil tanpa perlu membuka browser.
                </p>
              </div>

              {/* ─── FITUR UTAMA ─── */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                    <Zap className="size-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">Akses Langsung 1 Ketuk</span>
                  <span className="text-[11px] text-slate-500">tanpa ketik URL</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-700">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#005bb5]">
                    <MapPin className="size-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">GPS & Absen Wajah</span>
                  <span className="text-[11px] text-slate-500">lebih responsif</span>
                </div>

                <div className="flex items-center gap-2.5 text-slate-700">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Bell className="size-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">Notifikasi Real-time</span>
                  <span className="text-[11px] text-slate-500">approval & berita</span>
                </div>
              </div>

              {/* ─── PANDUAN LANGKAH (JIKA DI iOS ATAU KLIK CARA PASANG) ─── */}
              {showGuide && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#003461] flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Smartphone className="size-3.5 text-[#005bb5]" />
                      Cara Pasang di {isIos ? 'iPhone / Safari' : 'Android / Chrome'}:
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowGuide(false)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Tutup
                    </button>
                  </div>

                  {isIos ? (
                    <ol className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          1
                        </span>
                        <span>
                          Ketuk tombol <strong>Bagikan (Share)</strong>{' '}
                          <Share2 className="inline size-3.5 text-[#005bb5] -mt-0.5 mx-0.5" /> di menu bawah Safari.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          2
                        </span>
                        <span>
                          Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama</strong> (
                          <em>Add to Home Screen</em>{' '}
                          <PlusSquare className="inline size-3.5 text-[#005bb5] -mt-0.5 mx-0.5" />).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          3
                        </span>
                        <span>
                          Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.
                        </span>
                      </li>
                    </ol>
                  ) : (
                    <ol className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          1
                        </span>
                        <span>
                          Ketuk menu titik tiga{' '}
                          <MoreVertical className="inline size-3.5 text-slate-800 -mt-0.5" /> di sudut kanan atas browser Chrome.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          2
                        </span>
                        <span>
                          Pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#003461] text-[9px] font-bold text-white">
                          3
                        </span>
                        <span>
                          Konfirmasi dengan mengetuk tombol <strong>Instal</strong>.
                        </span>
                      </li>
                    </ol>
                  )}
                </div>
              )}

              {/* ─── ACTION BUTTONS ─── */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#003461] to-[#005bb5] px-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-900/20 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Download className="size-4" />
                  <span>Instal HERO Sekarang</span>
                </button>

                <div className="flex items-center justify-between px-1">
                  {!showGuide && (
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005bb5] hover:underline"
                    >
                      <span>Panduan cara pasang</span>
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-700 py-1"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
