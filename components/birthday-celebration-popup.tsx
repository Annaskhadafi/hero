'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Cake, Sparkles, PartyPopper, Heart, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TodayBirthdayResponse } from '@/lib/birthday-service'
import { isBirthdayCelebrationTimeWindow } from '@/lib/birthday-time'

interface BirthdayCelebrationPopupProps {
  data: TodayBirthdayResponse | null
  currentUserId?: string | null
}

function BirthdayCelebrationPopupContent({ data, currentUserId }: BirthdayCelebrationPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const searchParams = useSearchParams()
  const previewParam = searchParams.get('preview_birthday')

  // Data efektif: jika ada parameter preview di URL, dukung simulasi instan
  const effectiveData: TodayBirthdayResponse | null =
    previewParam === 'colleagues'
      ? {
          isSelfBirthday: false,
          self: null,
          colleagues: [
            {
              id: 99991,
              name: 'Ahmad Fauzi',
              email: 'ahmad.fauzi@chitraparatama.com',
              jobTitle: 'Senior Technician',
              department: 'Technical & Maintenance',
              siteName: data?.siteName || 'Site Balikpapan',
              workLocation: 'Balikpapan',
              avatar: null,
              birthDate: '2026-11-23',
            },
            {
              id: 99992,
              name: 'Siti Rahmawati',
              email: 'siti.rahmawati@chitraparatama.com',
              jobTitle: 'Logistics Officer',
              department: 'Supply Chain & Warehouse',
              siteName: data?.siteName || 'Site Balikpapan',
              workLocation: 'Balikpapan',
              avatar: null,
              birthDate: '2026-11-23',
            },
          ],
          currentDateStr: data?.currentDateStr || '2026-11-23',
          siteName: data?.siteName || 'Site Balikpapan',
        }
      : previewParam === 'self'
        ? {
            isSelfBirthday: true,
            self: data?.self || {
              id: 99990,
              name: 'Muhammad',
              email: 'user@chitraparatama.com',
              jobTitle: 'Staff Operations',
              department: 'Operations',
              siteName: data?.siteName || 'Head Office',
              avatar: null,
              birthDate: '2026-11-23',
            },
            colleagues: data?.colleagues || [],
            currentDateStr: data?.currentDateStr || '2026-11-23',
            siteName: data?.siteName || 'Head Office',
          }
        : data

  useEffect(() => {
    if (!effectiveData) return

    // Jika mode testing / preview via URL, selalu tampilkan
    if (previewParam) {
      setIsOpen(true)
      return
    }

    // Batasan Waktu: Popup ulang tahun HANYA boleh muncul pada jam 08.00 - 10.00 pagi
    if (!isBirthdayCelebrationTimeWindow()) {
      return
    }

    // Cek apakah sudah pernah dilihat hari ini oleh user ini di local storage
    const storageKey = `hero_birthday_seen_${currentUserId || 'guest'}_${effectiveData.currentDateStr}`
    const alreadySeen = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null

    if (!alreadySeen) {
      // Munculkan popup dengan sedikit delay (600ms) agar transisi halaman mulus
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [effectiveData, currentUserId, previewParam])

  // Efek Animasi Canvas Confetti Selebrasi 60FPS
  useEffect(() => {
    if (!isOpen) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Palet warna cerah confetti
    const colors = [
      '#f59e0b', // amber-500
      '#ec4899', // pink-500
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#8b5cf6', // purple-500
      '#06b6d4', // cyan-500
      '#e11d48', // rose-600
      '#eab308', // yellow-500
    ]

    const particleCount = effectiveData?.isSelfBirthday ? 85 : 45
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * -1 - 20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2.5 + 2,
      tilt: Math.random() * 10 - 5,
      tiltAngle: Math.random() * Math.PI,
      tiltAngleInc: Math.random() * 0.08 + 0.03,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    }))

    let isRunning = true
    const startTime = Date.now()
    const MAX_DURATION = 4500 // Otomatis berhenti setelah 4.5 detik agar hemat CPU/GPU

    const render = () => {
      if (!isRunning) return

      if (Date.now() - startTime > MAX_DURATION) {
        // Fade out confetti pelan-pelan
        ctx.clearRect(0, 0, width, height)
        return
      }

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y += p.vy
        p.x += Math.sin(p.tiltAngle) * 1.5 + p.vx
        p.tiltAngle += p.tiltAngleInc
        p.tilt = Math.sin(p.tiltAngle) * 12

        // Loop partikel jika keluar layar bawah
        if (p.y > height + 20) {
          p.y = -20
          p.x = Math.random() * width
        }

        ctx.beginPath()
        ctx.fillStyle = p.color
        if (p.shape === 'circle') {
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.tiltAngle)
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          ctx.restore()
        }
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      isRunning = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, effectiveData?.isSelfBirthday])

  if (!isOpen || !effectiveData) return null

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && effectiveData && !previewParam) {
      const storageKey = `hero_birthday_seen_${currentUserId || 'guest'}_${effectiveData.currentDateStr}`
      localStorage.setItem(storageKey, 'true')
    }
    setIsOpen(false)
  }

  const { isSelfBirthday, self, colleagues, siteName } = effectiveData

  return (
    <div
      data-testid="birthday-celebration-modal"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300"
    >
      {/* Canvas Confetti */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[100000] h-full w-full"
      />

      {/* Konten Dialog */}
      <div className="relative z-[100001] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border/80 shadow-2xl animate-in zoom-in-95 duration-300 scrollbar-none">
        {/* Tombol Tutup Silang di Sudut Kanan Atas */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex size-8 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/45 transition-colors"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>

        {isSelfBirthday && self ? (
          /* ========================================================= */
          /* MODE 1: BINTANG UTAMA (USER LOGIN YANG SEDANG ULANG TAHUN) */
          /* ========================================================= */
          <div>
            {/* Header Banner Spektakuler */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-blue-600 to-amber-500 px-5 sm:px-6 pt-8 sm:pt-10 pb-7 sm:pb-8 text-center text-white">
              <div className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-white/10 blur-xl" />
              <div className="pointer-events-none absolute -bottom-12 -right-12 size-40 rounded-full bg-amber-400/20 blur-xl" />

              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/25 shadow-sm mb-2.5">
                <PartyPopper className="size-3.5 text-amber-300 animate-bounce" />
                <span>Special Birthday Celebration</span>
                <Sparkles className="size-3.5 text-amber-300 animate-pulse" />
              </div>

              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                Selamat Ulang Tahun!
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-blue-100 font-medium">
                Hari spesial perayaan untuk Anda dari Keluarga Besar PT Chitra Paratama
              </p>
            </div>

            {/* Profile Avatar & Wishes Body */}
            <div className="relative px-5 sm:px-6 pt-0 pb-6 text-center">
              {/* Foto Profil dengan Animated Glowing Ring */}
              <div className="-mt-10 sm:-mt-12 mb-3 sm:mb-4 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 opacity-80 blur-sm animate-pulse" />
                  <div className="relative size-20 sm:size-24 rounded-full border-4 border-card bg-muted shadow-xl overflow-hidden flex items-center justify-center">
                    {self.avatar ? (
                      <Image
                        src={self.avatar}
                        alt={self.name}
                        width={96}
                        height={96}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl sm:text-2xl">
                        {self.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 flex size-7 sm:size-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-md border-2 border-card">
                    <Cake className="size-3.5 sm:size-4" />
                  </div>
                </div>
              </div>

              {/* Nama & Posisi */}
              <h3 className="text-lg sm:text-xl font-bold text-foreground">{self.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[self.jobTitle, self.department, self.siteName || self.workLocation].filter(Boolean).join(' • ')}
              </p>

              {/* Box Pesan Ucapan Hangat */}
              <div className="mt-4 sm:mt-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-background to-muted/40 p-3.5 sm:p-4 border border-amber-500/20 text-left">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                    <Heart className="size-4 sm:size-5 fill-amber-500/20" />
                  </div>
                  <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    <span className="font-semibold text-foreground">Doa & Harapan Terbaik:</span>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      "Semoga senantiasa diberikan kesehatan prima, umur panjang yang penuh berkah, kebahagiaan berlimpah, serta kemudahan dalam setiap langkah dan karya. Terima kasih atas dedikasi dan kontribusi terbaik Anda bagi kemajuan perusahaan!"
                    </p>
                  </div>
                </div>
              </div>

              {/* Tombol Aksi Seragam HERO h-9 */}
              <div className="mt-5 sm:mt-6 flex justify-center">
                <Button
                  onClick={handleDismiss}
                  className="w-full sm:w-auto h-9 px-6 sm:px-8 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-200"
                >
                  <PartyPopper className="size-4 mr-2" />
                  Terima Kasih Banyak! 🎉
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* MODE 2: REKAN KERJA DI LOKASI KERJA YANG SAMA            */
          /* ========================================================= */
          <div>
            {/* Header Rekan Se-Lokasi */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-5 sm:px-6 pt-7 sm:pt-8 pb-5 sm:pb-6 text-center text-white border-b border-white/10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 mb-2">
                <Cake className="size-3.5" />
                <span>Hari Spesial Rekan Kerja</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
                Rekan Kita Berulang Tahun Hari Ini! 🎂
              </h2>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-300">
                <MapPin className="size-3.5 text-amber-400" />
                <span>Lokasi Kerja: <strong className="text-white font-medium">{siteName || 'Satu Lokasi'}</strong></span>
              </div>
            </div>

            {/* List Rekan Kerja yang Ultah */}
            <div className="p-5 sm:p-6">
              <p className="text-xs text-muted-foreground text-center mb-3 sm:mb-4">
                Mari kita sampaikan doa dan ucapan selamat kepada rekan kerja kita yang sedang berulang tahun hari ini:
              </p>

              <div className="space-y-2.5 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1">
                {colleagues.map((colleague) => (
                  <div
                    key={colleague.id}
                    className="flex items-center gap-3 rounded-2xl bg-muted/40 hover:bg-muted/70 p-2.5 sm:p-3 border border-border/70 transition-colors"
                  >
                    <div className="relative size-10 sm:size-12 rounded-full border-2 border-primary/20 bg-background overflow-hidden flex items-center justify-center shrink-0">
                      {colleague.avatar ? (
                        <Image
                          src={colleague.avatar}
                          alt={colleague.name}
                          width={48}
                          height={48}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-sm">
                          {colleague.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {colleague.name}
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          Ultah Hari Ini
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                        {[colleague.jobTitle, colleague.department].filter(Boolean).join(' • ') || 'Karyawan'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ucapan Harapan Bersama */}
              <div className="mt-3.5 sm:mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 sm:p-3 text-center">
                <p className="text-[11px] sm:text-xs font-medium text-amber-900 dark:text-amber-200">
                  ✨ "Semoga sehat selalu, sukses berkarir, dan penuh kebahagiaan bersama keluarga!" ✨
                </p>
              </div>

              {/* Tombol Tutup / Mengerti */}
              <div className="mt-4 sm:mt-5 flex justify-center">
                <Button
                  onClick={handleDismiss}
                  className="w-full sm:w-auto h-9 px-6 sm:px-8 rounded-xl font-medium bg-[#0f172a] hover:bg-slate-800 text-white shadow-sm transition-all"
                >
                  Tutup / Mengerti
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function BirthdayCelebrationPopup(props: BirthdayCelebrationPopupProps) {
  return (
    <Suspense fallback={null}>
      <BirthdayCelebrationPopupContent {...props} />
    </Suspense>
  )
}
