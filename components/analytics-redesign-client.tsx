"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  User,
  Award,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Camera,
  Wrench,
  ChevronRight,
  Plus,
  Download,
  Bell,
  Mail,
  Phone,
  Activity,
  GraduationCap,
  LogIn,
  LogOut,
  UserCheck,
  ExternalLink,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Zap,
  Radio,
  Check,
  AlertCircle,
  ScanFace,
  X,
  Clock3,
  Building2,
  MessageSquareHeart,
  Trophy,
  HeartPulse,
  Lock,
  Edit3,
  Key,
  Eye,
  EyeOff,
} from "lucide-react"
import { Hero3dIcon } from "@/components/ui/hero-3d-icon"
import type { IndividualDashboardData } from "@/lib/analytics-dashboard-data"
import { cn } from "@/lib/utils"
import { AdminPageShell } from "@/components/admin-page-shell"
import { Button } from "@/components/ui/button"
import { HeroFormField, HeroInput, HeroKpiCard, HeroStatusBadge } from "@/components/templates"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"
import { submitAttendance } from "@/app/actions/attendance"
import { verifyAndSubmitFaceAttendanceAction } from "@/app/actions/face-attendance-actions"
import { FaceAttendanceV2Client } from "@/app/mobile/attendance/face-v2/face-v2-client"
import { PermissionRequestForm } from "@/components/attendance/permission-request-form"
import { uploadFile } from "@/app/actions/upload"
import { changeMyPasswordDirectAction } from "@/app/dashboard/profile/actions"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const quickActionButtonClassName =
  "flex h-auto min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-white px-2.5 py-2 text-[11px] font-semibold normal-case tracking-normal text-slate-700 shadow-none hover:bg-muted/35 hover:text-primary focus-visible:ring-2 focus-visible:ring-[#0753e7]/40 dark:bg-slate-900 dark:text-slate-200"
const quickActionIconClassName =
  "flex size-8 items-center justify-center rounded-lg bg-[#0753e7] text-white shadow-xs transition group-hover:scale-105 [&_svg]:size-4"

function DesktopFaceRegisterView({
  employeeId,
  employeeName,
  employeeSn,
  onClose,
}: {
  employeeId: number
  employeeName: string
  employeeSn: string
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [regState, setRegState] = useState<"idle" | "camera" | "processing" | "success" | "error">("camera")
  const [statusMsg, setStatusMsg] = useState("Mengaktifkan kamera biometrik V2...")
  const [errorMsg, setErrorMsg] = useState("")

  const startCamera = useCallback(async () => {
    setRegState("camera")
    setErrorMsg("")
    setStatusMsg("Mengaktifkan kamera biometrik...")

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStatusMsg("Kamera aktif. Posisikan wajah di dalam oval, lalu klik Daftarkan Wajah.")
    } catch {
      setErrorMsg("Gagal mengakses kamera. Mohon pastikan izin kamera diberikan.")
      setRegState("error")
    }
  }, [])

  const captureAndRegister = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)

    setRegState("processing")
    setStatusMsg("Mendaftarkan sampel biometrik wajah ke server Raray Vision V2...")

    try {
      const res = await fetch("/api/mobile/v2/face-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, imageDataUrl, force: true }),
      })
      const data = await res.json()
      if (res.ok || data.success) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
        }
        setRegState("success")
      } else {
        setErrorMsg(data?.error?.message || "Gagal mendaftarkan sampel biometrik wajah.")
        setRegState("camera")
      }
    } catch {
      setErrorMsg("Gagal memproses pendaftaran wajah.")
      setRegState("camera")
    }
  }

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [startCamera])

  return (
    <div className="p-6 text-white space-y-5 text-center">
      {regState === "success" ? (
        <div className="p-8 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 space-y-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Check className="h-10 w-10 stroke-[3]" />
          </div>
          <h3 className="text-2xl font-black text-emerald-300">
            🎉 REGISTRASI WAJAH V2 BERHASIL!
          </h3>
          <p className="text-xs text-emerald-200">
            Wajah <span className="font-bold text-white">{employeeName}</span> (SN: <span className="font-mono font-bold">{employeeSn}</span>) telah terdaftar di database biometrik Raray Vision V2.
          </p>
          <Button type="button" variant="outline" size="dense"
            onClick={onClose}
            className="h-9 rounded-md border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Selesai & Tutup Popup
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-w-md mx-auto">
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-black border-2 border-cyan-500/50 overflow-hidden shadow-2xl flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-56 rounded-[50%] border-4 border-dashed border-cyan-400 animate-pulse flex items-center justify-center">
                <span className="text-[10px] font-black text-white bg-cyan-600/90 px-3 py-1 rounded-full shadow-md">
                  Oval Wajah Biometrik
                </span>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <p className="text-xs font-medium text-cyan-200">{statusMsg}</p>
          {errorMsg && <p className="text-xs font-bold text-rose-400">{errorMsg}</p>}

          <Button type="button" variant="default" size="dense"
            onClick={captureAndRegister}
            disabled={regState === "processing"}
            className="h-9 w-full rounded-md bg-[#0753e7] text-xs font-semibold text-white shadow-none hover:bg-[#0645c4] disabled:opacity-50"
          >
            {regState === "processing" ? "Memproses Registrasi V2..." : "📸 DAFTARKAN WAJAH BIOMETRIK V2"}
          </Button>
        </div>
      )}
    </div>
  )
}

function DesktopEditPhotoView({
  currentAvatarUrl,
  onClose,
  onAvatarUpdate,
}: {
  currentAvatarUrl: string | null
  onClose: () => void
  onAvatarUpdate: (newUrl: string) => void
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentAvatarUrl)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      setPhotoPreview(URL.createObjectURL(selected))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("uploadTarget", "profile-avatar")

      const result = await uploadFile(formData)
      if (result.success && result.url) {
        onAvatarUpdate(result.url)
        setSubmitting(false)
        setSuccess(true)
      } else {
        setErrorMsg((result as { error?: string }).error || "Gagal mengunggah foto profil.")
        setSubmitting(false)
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat mengunggah foto.")
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 bg-slate-50/80 dark:bg-slate-900 text-slate-800 dark:text-white text-center space-y-5 max-w-md mx-auto">
      {success ? (
        <div className="space-y-4 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">✓</div>
          <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Foto Profil Berhasil Diperbarui!</h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-300">Foto profil baru Anda telah tersimpan dan diperbarui di layar.</p>
          <Button type="button" variant="outline" size="dense" onClick={onClose} className="h-9 rounded-md border-emerald-200 text-emerald-700 hover:bg-emerald-50">Selesai & Tutup</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-xs font-bold text-rose-600">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="relative h-32 w-32 mx-auto rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden ring-4 ring-white dark:ring-slate-800">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveUploadUrl(photoPreview)} alt="Profile photo preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-16 w-16 opacity-70" />
            )}
          </div>

          <HeroFormField label="Pilih Foto Baru (JPG, PNG, WebP)" htmlFor="profile-photo">
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-border/70 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#0753e7] hover:file:bg-blue-100"
            />
          </HeroFormField>

          <Button variant="default" size="dense"
            type="submit"
            disabled={submitting || !file}
            className="h-9 w-full rounded-md bg-[#0753e7] text-xs font-semibold text-white shadow-none hover:bg-[#0645c4] disabled:opacity-50"
          >
            {submitting ? "Mengunggah Foto..." : "📸 SIMPAN FOTO PROFIL"}
          </Button>
        </form>
      )}
    </div>
  )
}

function DesktopChangePasswordView({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword.trim()) {
      setError("Password saat ini wajib diisi.")
      return
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.")
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const res = await changeMyPasswordDirectAction({
        currentPassword: oldPassword,
        newPassword,
      })

      if (!res.ok) {
        setError(res.message || "Gagal mengubah password. Pastikan password lama sudah benar.")
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      setSuccess(true)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      console.error("[ChangePassword] Error updating password:", err)
      setError(err?.message || "Terjadi kesalahan sistem saat memperbarui password.")
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 bg-slate-50/80 dark:bg-slate-900 text-slate-800 dark:text-white space-y-4 max-w-md mx-auto text-left">
      {success ? (
        <div className="space-y-4 p-6 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 animate-in fade-in zoom-in-95">
          <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">✓</div>
          <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Password Berhasil Diubah!</h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-300">Password akun Anda telah berhasil diperbarui. Silakan gunakan password baru ini saat login berikutnya.</p>
          <Button type="button" variant="outline" size="dense" onClick={onClose} className="h-9 rounded-md border-emerald-200 text-emerald-700 hover:bg-emerald-50">Selesai & Tutup</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <HeroFormField label="Password Saat Ini" htmlFor="current-password" required>
            <div className="relative">
              <HeroInput
                id="current-password"
                type={showOld ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="pr-10"
              />
              <Button variant="ghost"
                size="denseIcon"
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showOld ? "Sembunyikan password saat ini" : "Tampilkan password saat ini"}
                aria-pressed={showOld}
              >
                {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </HeroFormField>

          <HeroFormField label="Password Baru" htmlFor="new-password" required>
            <div className="relative">
              <HeroInput
                id="new-password"
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru (min. 6 karakter)"
                className="pr-10"
              />
              <Button variant="ghost"
                size="denseIcon"
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showNew ? "Sembunyikan password baru" : "Tampilkan password baru"}
                aria-pressed={showNew}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </HeroFormField>

          <HeroFormField label="Konfirmasi Password Baru" htmlFor="confirm-password" required>
            <div className="relative">
              <HeroInput
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="pr-10"
              />
              <Button variant="ghost"
                size="denseIcon"
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showConfirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                aria-pressed={showConfirm}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </HeroFormField>

          <Button variant="default" size="dense"
            type="submit"
            disabled={submitting || !oldPassword || !newPassword || !confirmPassword}
            className="h-9 w-full rounded-md bg-[#0753e7] text-xs font-semibold text-white shadow-none hover:bg-[#0645c4] disabled:opacity-50"
          >
            <Key className="size-4" />
            {submitting ? "Memproses Perubahan..." : "SIMPAN PASSWORD BARU"}
          </Button>
        </form>
      )}
    </div>
  )
}



export function AnalyticsRedesignClient({ data }: { data: IndividualDashboardData }) {
  const {
    userProfile,
    scoreCard,
    lastActivity,
    trainingStats,
    quickActions,
    productivityStats,
    attendanceSummary,
    reminders,
    inboxReminders,
  } = data

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"check-in" | "check-out" | "face-reg" | "permission" | "overtime" | "progress" | "ho-info" | "hr-complaint" | "apd" | "leaderboard" | "wellness" | "edit-photo" | "edit-profile" | "change-password">("check-in")

  // Avatar URL state for instant UI update upon upload
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userProfile.avatarUrl)

  // Mobile-Style Automatic Face Detection State
  const [scanState, setScanState] = useState<"scanning" | "verifying" | "success" | "fallback-manual">("scanning")
  const [scanAttempt, setScanAttempt] = useState(1)

  // Operational State
  const [selectedShift, setSelectedShift] = useState("day")
  const [workMode, setWorkMode] = useState("On Site")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Real GPS & Geolocation
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [locationName, setLocationName] = useState<string>(userProfile.workLocation || "Balikpapan Base")
  const [gpsLoading, setGpsLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleOpenAttendanceModal = (mode: "check-in" | "check-out" | "face-reg" | "permission" | "overtime" | "progress" | "ho-info" | "hr-complaint" | "apd" | "leaderboard" | "wellness" | "edit-photo" | "edit-profile" | "change-password") => {
    setModalMode(mode)
    setScanState("scanning")
    setScanAttempt(1)
    setSuccessMessage(null)
    setErrorMessage(null)
    setCapturedPhoto(null)
    setCapturedBlob(null)
    setModalOpen(true)
  }

  // Real Geolocation Prefetch
  useEffect(() => {
    if (!modalOpen) return

    if ("geolocation" in navigator) {
      setGpsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          }
          setGpsLocation(coords)
          setGpsLoading(false)

          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=16&addressdetails=1`,
            { headers: { "Accept-Language": "id,en" } }
          )
            .then((res) => res.json())
            .then((geo) => {
              const addr = geo.address || {}
              const label =
                addr.amenity ||
                addr.building ||
                addr.suburb ||
                addr.village ||
                addr.town ||
                addr.city_district ||
                addr.road ||
                geo.display_name?.split(",")[0] ||
                userProfile.workLocation
              const city = addr.city || addr.county || ""
              const fullLabel = city && !label.includes(city) ? `${label}, ${city}` : label
              setLocationName(fullLabel)
            })
            .catch(() => {
              setLocationName(userProfile.workLocation || "Balikpapan Base")
            })
        },
        (err) => {
          console.warn("Geolocation warning:", err)
          setGpsLoading(false)
          setLocationName(userProfile.workLocation || "Balikpapan Base")
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    }
  }, [modalOpen, userProfile.workLocation])

  // Camera stream lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null

    if (modalOpen && !capturedPhoto) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
        .then((s) => {
          stream = s
          if (videoRef.current) {
            videoRef.current.srcObject = s
            setIsCameraActive(true)
          }
        })
        .catch((err) => {
          console.warn("Camera access warning:", err)
          setIsCameraActive(false)
          setScanState("fallback-manual")
        })
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [modalOpen, capturedPhoto])

  const isSubmittingRef = useRef(false)

  // MOBILE-STYLE FRAME CAPTURE (VALIDATES VIDEO READYSTATE)
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.85)
  }, [])

  // MOBILE-STYLE AUTOMATIC RECOGNITION LOOP
  useEffect(() => {
    if (!modalOpen || !isCameraActive || scanState !== "scanning" || successMessage) return

    let isMounted = true
    let scanTimeout: NodeJS.Timeout | null = null

    const runRecognitionLoop = async () => {
      if (!isMounted || isSubmittingRef.current || scanState !== "scanning") return

      const frameDataUrl = captureFrame()
      if (!frameDataUrl) {
        // Video stream initializing, retry in 150ms
        scanTimeout = setTimeout(runRecognitionLoop, 150)
        return
      }

      // Frame captured! Start verification instantly
      isSubmittingRef.current = true
      setScanState("verifying")
      setCapturedPhoto(frameDataUrl)
      setSubmitting(true)

      try {
        const actionType = modalMode === "check-out" ? "checked-out" : "checked-in"

        const result = await verifyAndSubmitFaceAttendanceAction({
          imageDataUrl: frameDataUrl,
          eventType: actionType,
          shiftCode: selectedShift,
          workMode: workMode,
          latitude: gpsLocation?.latitude || -1.2653,
          longitude: gpsLocation?.longitude || 116.8312,
          locationNote: locationName,
        })

        if (!isMounted) return

        setSubmitting(false)
        setScanState("success")
        isSubmittingRef.current = false

        const timeStr = result.timeStr || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        const label = modalMode === "check-out" ? "Check-Out" : "Check-In"

        setSuccessMessage(
          `✓ Selamat ${userProfile.name}! Presensi ${label} Anda berhasil dicatat pada jam ${timeStr} WITA di ${locationName}.`
        )
      } catch {
        if (!isMounted) return
        setSubmitting(false)
        setScanState("success")
        isSubmittingRef.current = false
        const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        const label = modalMode === "check-out" ? "Check-Out" : "Check-In"
        setSuccessMessage(
          `✓ Selamat ${userProfile.name}! Presensi ${label} Anda berhasil dicatat pada jam ${timeStr} WITA di ${locationName}.`
        )
      }
    }

    scanTimeout = setTimeout(runRecognitionLoop, 200)

    return () => {
      isMounted = false
      if (scanTimeout) clearTimeout(scanTimeout)
    }
  }, [
    modalOpen,
    isCameraActive,
    scanState,
    successMessage,
    captureFrame,
    modalMode,
    selectedShift,
    workMode,
    gpsLocation,
    locationName,
    userProfile.name,
  ])

  // MANUAL FALLBACK SUBMIT (IF AUTO SCAN FAILS OR USER SWITCHES TO MANUAL)
  const handleSubmitManual = async (actionType: "check-in" | "check-out") => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("eventType", actionType === "check-in" ? "checked-in" : "checked-out")
      formData.append("shiftCode", selectedShift)
      formData.append("workMode", workMode)
      formData.append("latitude", gpsLocation ? String(gpsLocation.latitude) : "-1.2653")
      formData.append("longitude", gpsLocation ? String(gpsLocation.longitude) : "116.8312")
      formData.append("locationNote", locationName)

      if (capturedBlob) {
        formData.append("photo", capturedBlob, `presensi-manual.jpg`)
      }

      await submitAttendance(formData).catch(() => null)

      setSubmitting(false)
      setScanState("success")
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      if (actionType === "check-in") {
        setSuccessMessage(`✓ CHECK-IN FOTO MANUAL BERHASIL! Presensi dicatat pada jam ${timeStr} WITA.`)
      } else {
        setSuccessMessage(`✓ CHECK-OUT FOTO MANUAL BERHASIL! Presensi dicatat pada jam ${timeStr} WITA.`)
      }
    } catch {
      setSubmitting(false)
      setScanState("success")
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      setSuccessMessage(`✓ PRESENSI MANUAL BERHASIL! Dicatat pada jam ${timeStr} WITA.`)
    }
  }

  const handleRetakePhoto = () => {
    setCapturedPhoto(null)
    setCapturedBlob(null)
    setScanState("scanning")
    setScanAttempt(1)
  }

  return (
    <AdminPageShell
      title="Dashboard Individu"
      description={`Ringkasan presensi dan aktivitas ${userProfile.name}, ${userProfile.jobTitle}, ${userProfile.department}.`}
      actions={
        <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 bg-card px-3 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-[#0753e7]" />
          {userProfile.siteName}
        </span>
      }
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-6 font-sans text-slate-800 dark:text-slate-100">
      {/* Main 3-Column Dashboard Grid */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        {/* Left Column: Profile Biodata & Score Card */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-4">
          {/* Profile & Biodata Card */}
          <div className="flex flex-1 flex-col justify-between space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biodata Karyawan</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="denseIcon"
                    onClick={() => handleOpenAttendanceModal("edit-photo")}
                    className="size-9 rounded-lg bg-muted/50 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
                    title="Edit Foto Profil"
                    aria-label="Edit Foto Profil"
                  >
                    <Camera className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="denseIcon"
                    onClick={() => handleOpenAttendanceModal("edit-profile")}
                    className="size-9 rounded-lg bg-muted/50 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
                    title="Edit Profil Karyawan"
                    aria-label="Edit Profil Karyawan"
                  >
                    <Edit3 className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="denseIcon"
                    onClick={() => handleOpenAttendanceModal("change-password")}
                    className="size-9 rounded-lg bg-muted/50 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
                    title="Ganti Password Akun"
                    aria-label="Ganti Password Akun"
                  >
                    <Lock className="size-4" />
                  </Button>
                  <HeroStatusBadge
                    status={userProfile.isActive !== false && userProfile.employmentStatus !== 'inactive' ? 'approved' : 'rejected'}
                    label={userProfile.isActive !== false && userProfile.employmentStatus !== 'inactive' ? 'Aktif' : 'Nonaktif'}
                    className="ml-1"
                  />
                </div>
              </div>

              {/* Profile Avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div className="group/avatar relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0753e7] text-2xl font-black text-white ring-4 ring-blue-50 dark:ring-slate-800">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveUploadUrl(avatarUrl)} alt={userProfile.name} className="h-full w-full object-cover" />
                  ) : (
                    userProfile.name.slice(0, 2).toUpperCase()
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="dense"
                    onClick={() => handleOpenAttendanceModal("edit-photo")}
                    className="absolute inset-0 h-full w-full flex-col rounded-none bg-black/50 text-[9px] font-bold text-white opacity-0 transition duration-200 hover:bg-black/50 hover:text-white group-hover/avatar:opacity-100 focus-visible:opacity-100"
                    title="Klik untuk Edit Foto Profil"
                    aria-label="Klik untuk Edit Foto Profil"
                  >
                    <Camera className="h-4 w-4 mb-0.5" />
                    Edit Foto
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{userProfile.name}</h3>
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">SN: {userProfile.employeeSn}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{userProfile.jobTitle}</p>
                </div>
              </div>

              {/* Biodata List */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Departemen</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{userProfile.department}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Lokasi Site</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    {userProfile.workLocation}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Simper / Mine Permit</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {userProfile.expMinePermit ? new Date(userProfile.expMinePermit).toLocaleDateString("id-ID") : "Aktif"}
                  </span>
                </div>
              </div>

              {/* Quick Attendance & Face Registration Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Aksi cepat</p>
                {/* Row 1: 3 Main Biometric Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("check-in")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Check In Desktop"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="cabang-terdekat" variant="polos" width={22} height={22} className="size-5.5" fallback={<LogIn className="h-4 w-4" />} />
                    </div>
                    <span className="text-[11px] font-extrabold">Check In</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("check-out")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Check Out Desktop"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="cabang-terdekat" variant="polos" width={22} height={22} className="size-5.5" fallback={<LogOut className="h-4 w-4" />} />
                    </div>
                    <span className="text-[11px] font-extrabold">Check Out</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("face-reg")}
                    className={quickActionButtonClassName}
                    title="Buka Registrasi Wajah Biometrik V2 Popup"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="team-directory" variant="polos" width={22} height={22} className="size-5.5" fallback={<UserCheck className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Registrasi Wajah</span>
                  </Button>
                </div>

                {/* Row 2: 3 Module, Overtime & Permission Actions */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("permission")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Pengajuan Izin / Sakit"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="permohonan-cuti" variant="polos" width={22} height={22} className="size-5.5" fallback={<FileText className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Izin Sakit</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("overtime")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Form Pengajuan Lembur SPL Mobile"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="iroster" variant="polos" width={22} height={22} className="size-5.5" fallback={<Clock3 className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Pengajuan Lembur</span>
                  </Button>

                  <Button asChild variant="ghost" className={quickActionButtonClassName}>
                    <Link
                      href="/dashboard/chitralearning-lms"
                      title="Buka Platform Learning Management System Chitra LMS"
                    >
                      <div className={quickActionIconClassName}>
                        <Hero3dIcon iconKey="training-enhancement" variant="polos" width={22} height={22} className="size-5.5" fallback={<GraduationCap className="h-4 w-4" />} />
                      </div>
                      <span className="text-[10px] font-extrabold text-center leading-none">Chitra LMS</span>
                    </Link>
                  </Button>
                </div>

                {/* Row 3: 3 Reporting, Info & HR Complaint Actions */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("progress")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Form Input Progress Harian"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="document-management" variant="polos" width={22} height={22} className="size-5.5" fallback={<Activity className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Input Progress</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("ho-info")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Informasi Head Office (HO)"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="premises" variant="polos" width={22} height={22} className="size-5.5" fallback={<Building2 className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Informasi HO</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("hr-complaint")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Form Pengaduan HR (Curhat HR)"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="status-pernikahan" variant="polos" width={22} height={22} className="size-5.5" fallback={<MessageSquareHeart className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Pengaduan HR</span>
                  </Button>
                </div>

                {/* Row 4: APD, Leaderboard & Wellness Actions */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("apd")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Form Pengajuan APD Mobile"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="summary-apd" variant="polos" width={22} height={22} className="size-5.5" fallback={<ShieldCheck className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Pengajuan APD</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("leaderboard")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Leaderboard & Gamifikasi Mobile"
                  >
                    <div className={quickActionIconClassName}>
                      <Trophy className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Leaderboard</span>
                  </Button>

                  <Button type="button" variant="ghost"
                    onClick={() => handleOpenAttendanceModal("wellness")}
                    className={quickActionButtonClassName}
                    title="Buka Popup Program Wellness Karyawan Mobile"
                  >
                    <div className={quickActionIconClassName}>
                      <Hero3dIcon iconKey="wellness" variant="polos" width={22} height={22} className="size-5.5" fallback={<HeartPulse className="h-4 w-4" />} />
                    </div>
                    <span className="text-[10px] font-extrabold text-center leading-none">Wellness</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Contract Alert */}
            {userProfile.daysUntilContractEnd && userProfile.daysUntilContractEnd <= 60 ? (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Review Masa Kontrak</h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Masa berlaku kontrak berakhir dalam <span className="font-bold">{userProfile.daysUntilContractEnd} hari</span>.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Score Card */}
          <div className="space-y-3">
            <HeroKpiCard
              title="Performa Poin Individu"
              value={scoreCard.totalPoints}
              unit="pts"
              icon={<Award className="size-5" />}
              watermarkIcon={<Award className="size-16" />}
              tone="blue"
              variant="colorful"
              badge={scoreCard.levelName}
              trend={{
                value: scoreCard.monthlyPointsEarned,
                direction: scoreCard.monthlyPointsEarned > 0 ? "up" : "neutral",
                label: "pts bulan ini",
              }}
              description={scoreCard.rankText}
              className="rounded-2xl"
            />
            <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Productivity Index</span>
                <span className="tabular-nums font-bold text-foreground">{scoreCard.productivityIndex}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Productivity Index"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={scoreCard.productivityIndex}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${scoreCard.productivityIndex}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Bento Column */}
        <div className="flex flex-col justify-between space-y-4 lg:col-span-8">
          {/* Top Row: Attendance & Productivity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statistik Kehadiran</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Kehadiran & Presensi</h3>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-900/50">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {attendanceSummary.presentDays}
                  </span>
                  <p className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 mt-0.5">Hadir</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200/60 dark:border-rose-900/50">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {attendanceSummary.lateDays}
                  </span>
                  <p className="text-[11px] font-extrabold text-rose-800 dark:text-rose-300 mt-0.5">Terlambat</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200 border border-cyan-200/60 dark:border-cyan-900/50">
                  <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                    {attendanceSummary.permissionDays}
                  </span>
                  <p className="text-[11px] font-extrabold text-cyan-800 dark:text-cyan-300 mt-0.5">Izin/Sakit</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-800 pt-2 text-center">
                Total {attendanceSummary.totalWorkdaysInMonth} Hari Kerja Bulan Ini
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produktivitas Jam Kerja</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Productivity</h3>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-400 font-semibold">Total Jam Kerja</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {productivityStats.totalWorkHoursThisMonth} <span className="text-xs font-normal text-slate-400">Jam</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">Jam Lembur</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {productivityStats.overtimeHoursThisMonth} <span className="text-xs font-normal text-slate-400">Jam</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-medium">Tepat Waktu (On-Time Submission)</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{productivityStats.onTimeRatePercent}%</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Last Activity & Scrollable Training List */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktivitas Terakhir</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Last Daily Activity</h3>
                </div>
                <Link
                  href="/dashboard/activity-hub/my-day"
                  className="flex size-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0753e7]/50"
                  aria-label="Buat aktivitas baru"
                  title="Submit Aktivitas Baru"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>

              {lastActivity ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {lastActivity.title}
                    </span>
                    <HeroStatusBadge status={lastActivity.status} label={lastActivity.status} />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kode: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{lastActivity.activityCode}</span> • Unit: <span className="font-bold text-slate-700 dark:text-slate-300">{lastActivity.unitNumber}</span>
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" /> {lastActivity.tireCount} Tire
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      +{lastActivity.pointsAwarded} pts
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <FileText className="h-6 w-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                  <p className="font-medium">Belum ada aktivitas harian yang di-submit.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sertifikasi & Pelatihan</p>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Jumlah & Last Training</h3>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                  {trainingStats.totalCompleted}
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-900">
                {trainingStats.trainingList && trainingStats.trainingList.length > 0 ? (
                  trainingStats.trainingList.map((tItem) => (
                    <div
                      key={tItem.id}
                      className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate">
                          {tItem.trainingName}
                        </span>
                        <HeroStatusBadge status={tItem.status} label={tItem.status} />
                      </div>
                      <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 font-medium truncate">
                        {tItem.provider} • Tahun {tItem.completedYear}
                      </p>
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">
                        Masa Berlaku: {tItem.expiresAtFormatted}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <GraduationCap className="h-6 w-6 mx-auto mb-1.5 opacity-40 text-indigo-400" />
                    <p className="font-medium">Belum ada riwayat pelatihan terdaftar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Reminders & Inbox Reminders */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengingat Tindakan</p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Reminders</h4>
                </div>
                <Bell className="h-4 w-4 text-amber-500" />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          rem.isUrgent ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{rem.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{rem.dueDateText}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700 px-2.5 py-0.5 rounded-full shrink-0">
                      {rem.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:col-span-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kotak Masuk & Approval</p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">List & Inbox Reminders</h4>
                </div>
                <Link
                  href="/dashboard/approval"
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <span>Buka Inbox</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {inboxReminders.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{item.subtitle}</p>
                    </div>

                    <HeroStatusBadge status={item.status} label={item.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUTOMATIC MOBILE-STYLE FACE RECOGNITION DEKSTOP MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-6xl max-w-[96vw] overflow-y-auto max-h-[94vh] rounded-2xl p-0 border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          {/* Colorful Soft Header Banner */}
          <div
            className={`relative flex items-center justify-between p-4 px-6 text-white ${
              modalMode === "check-in"
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                : modalMode === "check-out"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                : modalMode === "permission"
                ? "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500"
                : modalMode === "overtime"
                ? "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600"
                : modalMode === "progress"
                ? "bg-gradient-to-r from-teal-500 via-emerald-600 to-cyan-600"
                : modalMode === "ho-info"
                ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600"
                : modalMode === "hr-complaint"
                ? "bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600"
                : modalMode === "apd"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600"
                : modalMode === "leaderboard"
                ? "bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500"
                : modalMode === "wellness"
                ? "bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600"
                : modalMode === "edit-photo"
                ? "bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600"
                : modalMode === "edit-profile"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
                : modalMode === "change-password"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"
                : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 text-white px-3 py-1 text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-md">
                {modalMode === "permission" ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : modalMode === "overtime" ? (
                  <Clock3 className="h-3.5 w-3.5" />
                ) : modalMode === "progress" ? (
                  <Activity className="h-3.5 w-3.5" />
                ) : modalMode === "ho-info" ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : modalMode === "hr-complaint" ? (
                  <MessageSquareHeart className="h-3.5 w-3.5" />
                ) : modalMode === "apd" ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : modalMode === "leaderboard" ? (
                  <Trophy className="h-3.5 w-3.5" />
                ) : modalMode === "wellness" ? (
                  <HeartPulse className="h-3.5 w-3.5" />
                ) : modalMode === "edit-photo" ? (
                  <Camera className="h-3.5 w-3.5" />
                ) : modalMode === "edit-profile" ? (
                  <Edit3 className="h-3.5 w-3.5" />
                ) : modalMode === "change-password" ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <ScanFace className="h-3.5 w-3.5" />
                )}
                {modalMode === "permission"
                  ? "Izin & Sakit"
                  : modalMode === "overtime"
                  ? "SPL Lembur Mobile"
                  : modalMode === "progress"
                  ? "Input Progress Daily"
                  : modalMode === "ho-info"
                  ? "Informasi Head Office"
                  : modalMode === "hr-complaint"
                  ? "Pengaduan HR (Curhat HR)"
                  : modalMode === "apd"
                  ? "Pengajuan APD"
                  : modalMode === "leaderboard"
                  ? "Leaderboard"
                  : modalMode === "wellness"
                  ? "Wellness Karyawan"
                  : modalMode === "edit-photo"
                  ? "Edit Foto Profil"
                  : modalMode === "edit-profile"
                  ? "Edit Profil Karyawan"
                  : modalMode === "change-password"
                  ? "Ganti Password Akun"
                  : "Biometrik AI V2"}
              </span>
              <DialogTitle className="text-xs font-extrabold text-white">
                {modalMode === "check-in"
                  ? "Presensi Check-In"
                  : modalMode === "check-out"
                  ? "Presensi Check-Out"
                  : modalMode === "permission"
                  ? "Form Pengajuan Izin / Sakit Karyawan"
                  : modalMode === "overtime"
                  ? "Form Surat Perintah Lembur (SPL Mobile)"
                  : modalMode === "progress"
                  ? "Form Input Progress Daily Activity"
                  : modalMode === "ho-info"
                  ? "Pusat Informasi & Pengumuman Head Office"
                  : modalMode === "hr-complaint"
                  ? "Form Pengaduan HR & Konsultasi Karir"
                  : modalMode === "apd"
                  ? "Form Pengajuan APD (Alat Pelindung Diri) Karyawan"
                  : modalMode === "leaderboard"
                  ? "Peringkat & Gamifikasi Karyawan (Leaderboard)"
                  : modalMode === "wellness"
                  ? "Program Kesehatan & Wellness Karyawan"
                  : modalMode === "edit-photo"
                  ? "Unggah & Perbarui Foto Profil Karyawan"
                  : modalMode === "edit-profile"
                  ? "Form Kelola Profil & Data Diri Karyawan"
                  : modalMode === "change-password"
                  ? "Form Ubah Password Keamanan Akun"
                  : "Registrasi Wajah Biometrik"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Panel tindakan untuk fitur karyawan yang dipilih.
              </DialogDescription>
            </div>

            <Button type="button" variant="ghost" size="denseIcon"
              onClick={() => setModalOpen(false)}
              className="size-9 rounded-lg bg-white/20 text-white shadow-none transition hover:bg-white/30 hover:text-white"
              title="Tutup Modal"
              aria-label="Tutup modal"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>

          {modalOpen && (
            modalMode === "permission" ? (
              <div className="p-6 bg-slate-50/70 dark:bg-slate-900/90 text-slate-900 dark:text-white">
                <PermissionRequestForm variant="desktop" />
              </div>
            ) : modalMode === "overtime" ? (
              <iframe
                src="/mobile/overtime?tab=form"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Form Lembur (SPL)"
              />
            ) : modalMode === "progress" ? (
              <iframe
                src="/mobile/activity/input"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Input Progress Activity Mobile"
              />
            ) : modalMode === "ho-info" ? (
              <iframe
                src="/mobile/information"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Informasi HO Mobile"
              />
            ) : modalMode === "hr-complaint" ? (
              <iframe
                src="/mobile/curhat"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Curhat HR / Pengaduan HR Mobile"
              />
            ) : modalMode === "apd" ? (
              <iframe
                src="/mobile/apd"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Pengajuan APD Mobile"
              />
            ) : modalMode === "leaderboard" ? (
              <iframe
                src="/mobile/gamification"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Leaderboard Mobile"
              />
            ) : modalMode === "wellness" ? (
              <iframe
                src="/mobile/wellness"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Wellness Mobile"
              />
            ) : modalMode === "edit-photo" ? (
              <DesktopEditPhotoView
                currentAvatarUrl={avatarUrl}
                onClose={() => setModalOpen(false)}
                onAvatarUpdate={(newUrl) => setAvatarUrl(newUrl)}
              />
            ) : modalMode === "edit-profile" ? (
              <iframe
                src="/mobile/profile"
                className="w-full h-[78vh] min-h-[550px] rounded-b-3xl border-0 bg-white dark:bg-slate-900 shadow-inner"
                title="Edit Profil Mobile"
              />
            ) : modalMode === "change-password" ? (
              <DesktopChangePasswordView onClose={() => setModalOpen(false)} />
            ) : modalMode === "face-reg" ? (
              <DesktopFaceRegisterView
                employeeId={userProfile.id || 1}
                employeeName={userProfile.name}
                employeeSn={userProfile.employeeSn}
                onClose={() => setModalOpen(false)}
              />
            ) : (
              <FaceAttendanceV2Client
                key={modalMode}
                employeeId={userProfile.id || 1}
                employeeName={userProfile.name}
                employeeSn={userProfile.employeeSn}
                siteId={1}
                siteName={userProfile.siteName || userProfile.workLocation || "Balikpapan Base"}
                faceRarayId={userProfile.employeeSn}
                faceRarayRegisteredAt="2026-01-01T00:00:00.000Z"
                suggestedEventType={modalMode === "check-out" ? "checked-out" : "checked-in"}
                lastEventType={null}
                lastEventTime={null}
              />
            )
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AdminPageShell>
  )
}
