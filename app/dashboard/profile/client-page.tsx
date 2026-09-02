'use client'

import { useActionState, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, Eye, EyeOff, Key, Loader2, PenTool, Save, Trash2, Upload, User } from 'lucide-react'
import { toast } from 'sonner'
import { updateMyProfileAction, changeMyPasswordAction, type ProfileActionState } from './actions'
import { deleteUserSignatureAction, saveUserSignatureAction } from '@/app/dashboard/activity-hub/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProfilePhotoField } from '@/components/profile-photo-field'

const INITIAL: ProfileActionState = { ok: false, message: '' }

function SubmitBtn({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Menyimpan...' : children}
    </Button>
  )
}

function getUserInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

export function ProfilePageClient({
  profile,
}: {
  profile: {
    id: number
    name: string
    email: string
    employeeSn: string
    phoneNumber: string
    domicile: string
    birthPlaceDate: string
    religion: string
    education: string
    maritalStatus: string
    gender: string
    department: string
    section: string
    jobTitle: string
    workLocation: string
    joinDate: string
    contractDurationStart: string
    contractDurationEnd: string
    profileImage: string
    employmentStatus: string
    signatureDataUrl?: string | null
    signatureRegisteredAt?: string | null
  }
}) {
  const [profileState, profileAction] = useActionState(updateMyProfileAction, INITIAL)
  const [passwordState, passwordAction] = useActionState(changeMyPasswordAction, INITIAL)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Signature state & canvas
  const [currentSignature, setCurrentSignature] = useState<string | null>(profile.signatureDataUrl || null)
  const [signatureDate, setSignatureDate] = useState<string | null>(profile.signatureRegisteredAt || null)
  const [savingSig, setSavingSig] = useState(false)
  const [deletingSig, setDeletingSig] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? (e.touches[0]?.clientX || 0) : e.clientX
    const clientY = 'touches' in e ? (e.touches[0]?.clientY || 0) : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (!dataUrl) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const hRatio = canvas.width / img.width
        const vRatio = canvas.height / img.height
        const ratio = Math.min(hRatio, vRatio, 1)
        const centerShiftX = (canvas.width - img.width * ratio) / 2
        const centerShiftY = (canvas.height - img.height * ratio) / 2
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio)
        setHasDrawn(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.error('Silakan gambar atau upload tanda tangan terlebih dahulu.')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setSavingSig(true)
    try {
      const res = await saveUserSignatureAction(dataUrl)
      if (res.success) {
        toast.success('Tanda tangan digital berhasil diperbarui!')
        setCurrentSignature(dataUrl)
        setSignatureDate((res as any).signatureRegisteredAt || new Date().toISOString())
        clearCanvas()
      } else {
        toast.error(res.error || 'Gagal menyimpan tanda tangan.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem.')
    } finally {
      setSavingSig(false)
    }
  }

  const handleDeleteSignature = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus tanda tangan digital Anda?')) return

    setDeletingSig(true)
    try {
      const res = await deleteUserSignatureAction()
      if (res.success) {
        toast.success('Tanda tangan digital berhasil dihapus.')
        setCurrentSignature(null)
        setSignatureDate(null)
        clearCanvas()
      } else {
        toast.error(res.error || 'Gagal menghapus tanda tangan.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem.')
    } finally {
      setDeletingSig(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-5 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-surface-container-lowest text-primary shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
          <User className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Profil Saya</h1>
          <p className="text-muted-foreground text-sm">Kelola informasi profil, password, dan tanda tangan digital Anda</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {profileState.message ? (
            <Alert className={profileState.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-destructive/30 bg-destructive/10 text-destructive'}>
              <AlertDescription>{profileState.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="surface-muted-card rounded-[1.2rem] p-5">
            <div className="mb-4 flex items-center gap-4">
              <Avatar className="border-border size-16 border">
                <AvatarImage src={profile.profileImage || undefined} alt={profile.name} />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                  {getUserInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{profile.name}</p>
                <p className="text-muted-foreground text-sm">{profile.email}</p>
                <p className="text-muted-foreground text-xs">SN: {profile.employeeSn}</p>
              </div>
            </div>

            <div className="text-muted-foreground mb-4 grid grid-cols-2 gap-2 text-sm">
              <div>Department: {profile.department}</div>
              <div>Section: {profile.section}</div>
              <div>Jabatan: {profile.jobTitle}</div>
              <div>Lokasi: {profile.workLocation}</div>
              <div>Status: {profile.employmentStatus}</div>
              <div>Join: {profile.joinDate}</div>
            </div>
          </div>

          <form action={profileAction} className="surface-muted-card space-y-5 rounded-[1.2rem] p-5">
            <p className="font-medium text-base">Edit Profil</p>

            <ProfilePhotoField fallbackName={profile.name} initialValue={profile.profileImage} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Nama</span>
                <Input name="name" defaultValue={profile.name} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">No. Telepon</span>
                <Input name="phoneNumber" defaultValue={profile.phoneNumber} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Domisili</span>
                <Input name="domicile" defaultValue={profile.domicile} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Tempat/Tgl Lahir</span>
                <Input name="birthPlaceDate" defaultValue={profile.birthPlaceDate} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Agama</span>
                <Input name="religion" defaultValue={profile.religion} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Pendidikan</span>
                <Input name="education" defaultValue={profile.education} />
              </label>
              <div className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Gender</span>
                <Select name="gender" defaultValue={profile.gender || 'none'}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pilih</SelectItem>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Status Pernikahan</span>
                <Select name="maritalStatus" defaultValue={profile.maritalStatus || 'none'}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pilih</SelectItem>
                    <SelectItem value="TK">Belum Menikah (TK)</SelectItem>
                    <SelectItem value="K/0">Menikah (K/0)</SelectItem>
                    <SelectItem value="K/1">Menikah Anak 1 (K/1)</SelectItem>
                    <SelectItem value="K/2">Menikah Anak 2 (K/2)</SelectItem>
                    <SelectItem value="K/3">Menikah Anak 3 (K/3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── TANDA TANGAN DIGITAL (DIBAWAH STATUS PERNIKAHAN) ── */}
            <div className="border-t border-slate-200/80 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenTool className="size-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-900">Tanda Tangan Digital</span>
                </div>
                {currentSignature ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <CheckCircle2 className="size-3 mr-1" /> Terdaftar & Aktif
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                    Belum Terdaftar
                  </Badge>
                )}
              </div>

              {/* Current Signature Card */}
              {currentSignature && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-28 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 p-1 shadow-inner">
                      <img src={currentSignature} alt="TTD Saya" className="max-h-12 max-w-full object-contain" />
                    </div>
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p className="font-semibold text-slate-800">Tanda Tangan Aktif Akun</p>
                      <p className="text-[10px] text-slate-400">
                        {signatureDate ? `Terdaftar: ${new Date(signatureDate).toLocaleDateString('id-ID')}` : 'Siap digunakan'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteSignature}
                    disabled={deletingSig}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5 mr-1" /> {deletingSig ? 'Menghapus...' : 'Hapus TTD'}
                  </Button>
                </div>
              )}

              {/* Canvas / Upload Area */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    {currentSignature ? 'Ubah / Gambar Tanda Tangan Baru:' : 'Goreskan Tanda Tangan Anda:'}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      <Upload className="size-3" />
                      <span>Upload Gambar</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="h-6 px-2 text-xs text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 className="size-3 mr-1" /> Bersihkan
                    </Button>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-indigo-400 transition-colors shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="touch-none cursor-crosshair w-full block bg-white"
                    style={{ height: '160px' }}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSignature}
                    disabled={savingSig || !hasDrawn}
                    className="bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    {savingSig ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Menyimpan TTD...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 size-3.5" /> Simpan Tanda Tangan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <SubmitBtn>
                <Save className="mr-2 size-4" />
                Simpan Perubahan Profil
              </SubmitBtn>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="password" className="space-y-4">
          {passwordState.message ? (
            <Alert className={passwordState.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-destructive/30 bg-destructive/10 text-destructive'}>
              <AlertDescription>{passwordState.message}</AlertDescription>
            </Alert>
          ) : null}

          <form action={passwordAction} className="surface-muted-card mx-auto max-w-md space-y-4 rounded-[1.2rem] p-5">
            <div className="flex items-center gap-2">
              <Key className="text-muted-foreground size-4" />
              <p className="font-medium">Ganti Password</p>
            </div>

            <label className="grid gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Password Saat Ini</span>
              <div className="relative">
                <Input name="currentPassword" type={showCurrent ? 'text' : 'password'} placeholder="Masukkan password saat ini" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">Password Baru</span>
              <div className="relative">
                <Input name="newPassword" type={showNew ? 'text' : 'password'} placeholder="Minimal 8 karakter" />
                <button type="button" onClick={() => setShowNew(!showNew)} className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <div className="flex justify-end">
              <SubmitBtn>
                <Key className="mr-2 size-4" />
                Ubah Password
              </SubmitBtn>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
