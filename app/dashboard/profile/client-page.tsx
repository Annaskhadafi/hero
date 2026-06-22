'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, Key, Save, User } from 'lucide-react'
import { updateMyProfileAction, changeMyPasswordAction, type ProfileActionState } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  }
}) {
  const [profileState, profileAction] = useActionState(updateMyProfileAction, INITIAL)
  const [passwordState, passwordAction] = useActionState(changeMyPasswordAction, INITIAL)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:p-5 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-surface-container-lowest text-primary shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
          <User className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Profil Saya</h1>
          <p className="text-muted-foreground text-sm">Kelola informasi profil dan password Anda</p>
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

          <form action={profileAction} className="surface-muted-card space-y-4 rounded-[1.2rem] p-5">
            <p className="font-medium">Edit Profil</p>

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
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Status Pernikahan</span>
                <Select name="maritalStatus" defaultValue={profile.maritalStatus || 'none'}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <SubmitBtn>
                <Save className="mr-2 size-4" />
                Simpan Profil
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
