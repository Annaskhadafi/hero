'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Check, KeyRound, MapPin as MapPinIcon, RefreshCw, Search, ScanFace, Wand2 } from 'lucide-react'
import { manageSecurityUserAction, type AdminMutationState } from '@/app/dashboard/admin-actions'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MinimalTableShell, exportRowsToFile } from '@/components/ui/minimal-table-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SecurityUserRecord } from '@/lib/hero-admin'

const initialState: AdminMutationState = { status: 'idle', message: '' }

function QuickActionForm({ user, intent, label, children }: { user: SecurityUserRecord; intent: 'reset-face' | 'ban-user' | 'activate-user' | 'send-magic-link'; label: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(manageSecurityUserAction, initialState)
  const router = useRouter()
  useEffect(() => { if (state.status === 'success') router.refresh() }, [router, state.status])
  return <form action={action} className="contents"><input type="hidden" name="intent" value={intent} /><input type="hidden" name="employeeId" value={user.id} /><Button type="submit" variant={intent === 'activate-user' ? 'default' : 'outline'} disabled={pending} aria-label={label} title={label} className="size-9 rounded-lg p-0 active:scale-[0.96] transition-transform">{pending ? <RefreshCw className="size-4 animate-spin" /> : children}</Button></form>
}

function PasswordDialog({ user }: { user: SecurityUserRecord }) {
  const [open, setOpen] = useState(false)
  const [useDefaultPassword, setUseDefaultPassword] = useState(false)
  const [state, action, pending] = useActionState(manageSecurityUserAction, initialState)
  const router = useRouter()
  useEffect(() => { if (state.status === 'success') { setOpen(false); setUseDefaultPassword(false); router.refresh() } }, [router, state.status])
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" aria-label="Reset password" title="Reset password" className="size-9 rounded-lg p-0 active:scale-[0.96] transition-transform"><KeyRound className="size-4" /></Button></DialogTrigger><DialogContent className="w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Reset password</DialogTitle><DialogDescription>{user.name} · {user.employeeSn}</DialogDescription></DialogHeader><form action={action} className="space-y-4"><input type="hidden" name="intent" value="change-password" /><input type="hidden" name="employeeId" value={user.id} /><label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium"><input type="checkbox" name="useDefaultPassword" value="true" checked={useDefaultPassword} onChange={(event) => setUseDefaultPassword(event.target.checked)} className="size-4 accent-slate-900" />Kembalikan ke Default Password</label><p className="text-xs text-muted-foreground">Default: <span className="font-mono">Chitra#{user.employeeSn || '<SN>'}</span></p><label className="grid gap-2 text-sm font-medium">Password baru<Input name="newPassword" type="password" minLength={8} placeholder="Minimal 8 karakter" required={!useDefaultPassword} disabled={useDefaultPassword} /></label>{state.status === 'error' ? <p className="text-sm text-destructive">{state.message}</p> : null}<Button type="submit" disabled={pending} className="min-h-11 w-full rounded-xl">{pending ? 'Menyimpan...' : 'Simpan password'}</Button></form></DialogContent></Dialog>
}

function LocationDialog({ user, sites }: { user: SecurityUserRecord; sites: Array<{ id: number; name: string; location: string }> }) {
  const [state, action, pending] = useActionState(manageSecurityUserAction, initialState)
  const [siteId, setSiteId] = useState(user.siteId ? String(user.siteId) : '')
  const [locationChangeReason, setLocationChangeReason] = useState('Pemindahan Lokasi')
  const [open, setOpen] = useState(false)
  const router = useRouter()
  useEffect(() => { if (state.status === 'success') { setOpen(false); router.refresh() } }, [router, state.status])
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Ganti lokasi" title="Ganti lokasi" className="size-9 rounded-lg p-0 active:scale-[0.96] transition-transform">
          <MapPinIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ganti lokasi site</DialogTitle>
          <DialogDescription>{user.name} · {user.employeeSn}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="intent" value="change-site" />
          <input type="hidden" name="employeeId" value={user.id} />
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger className="min-h-11 rounded-xl">
              <SelectValue placeholder="Pilih lokasi site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={String(site.id)}>
                  {site.name}{site.location ? ` · ${site.location}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="siteId" value={siteId} />
          {siteId && siteId !== String(user.siteId) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
              <span className="font-semibold text-amber-800">Alasan Perubahan:</span>
              <Select value={locationChangeReason} onValueChange={setLocationChangeReason}>
                <SelectTrigger className="bg-white border-amber-300 min-h-9">
                  <SelectValue placeholder="Pilih alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pemindahan Lokasi">Pemindahan Lokasi (Masuk Riwayat)</SelectItem>
                  <SelectItem value="Perbaikan Data">Perbaikan Data (Tanpa Riwayat)</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="locationChangeReason" value={locationChangeReason} />
            </div>
          ) : null}
          {state.status === 'error' ? <p className="text-sm text-destructive">{state.message}</p> : null}
          <Button type="submit" disabled={pending || !siteId} className="min-h-11 w-full rounded-xl">
            {pending ? 'Menyimpan...' : 'Simpan lokasi'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export function SecurityQuickActions({ users, sites, canEdit = false, mobile = false }: { users: SecurityUserRecord[]; sites: Array<{ id: number; name: string; location: string }>; canEdit?: boolean; mobile?: boolean }) {
  const [query, setQuery] = useState('')
  const filteredUsers = useMemo(() => { const q = query.trim().toLowerCase(); return users.filter((u) => !q || `${u.employeeSn} ${u.name} ${u.siteName} ${u.accessRole}`.toLowerCase().includes(q)) }, [query, users])
  const [visibleCount, setVisibleCount] = useState(30)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  useEffect(() => setVisibleCount(30), [query])
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setVisibleCount((current) => Math.min(current + 30, filteredUsers.length))
    }, { rootMargin: '240px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [filteredUsers.length])
  const visibleUsers = filteredUsers.slice(0, visibleCount)
  const exportData = () => exportRowsToFile({ columns: ['SN', 'Nama', 'Lokasi', 'Role', 'Status'], rows: filteredUsers.map((u) => [u.employeeSn, u.name, u.siteName, u.accessRole, u.isActive ? 'Aktif' : 'Nonaktif']), fileName: 'quick-actions-users' })
  const actions = (user: SecurityUserRecord) => canEdit ? <div className="flex flex-wrap gap-1.5"><PasswordDialog user={user} /><QuickActionForm user={user} intent="send-magic-link" label="Kirim magic link"><Wand2 className="size-4" /></QuickActionForm><LocationDialog user={user} sites={sites} /><QuickActionForm user={user} intent="reset-face" label="Reset biometric"><ScanFace className="size-4" /></QuickActionForm><QuickActionForm user={user} intent={user.isActive ? 'ban-user' : 'activate-user'} label={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}>{user.isActive ? <Ban className="size-4" /> : <Check className="size-4" />}</QuickActionForm></div> : null
  return <AdminPageShell title="Quick Action Admin" actions={<Badge className="rounded-full bg-slate-900 px-3 py-1 text-white">Super Admin</Badge>}><MinimalTableShell label="Quick actions" title="Akses cepat pengguna" description="Kelola kredensial, biometric, dan status akun dari satu tempat." searchEnabled={false} showImport={false} showExport={false} paginationEnabled={false} actions={<div className="flex w-full gap-2 sm:w-auto"><div className="relative min-w-0 flex-1 sm:w-64"><Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari SN, nama, lokasi..." className="h-9 rounded-lg pl-9" /></div><Button variant="outline" onClick={() => setQuery('')} className="h-9 rounded-lg px-3">Reset</Button><Button variant="outline" onClick={exportData} className="h-9 rounded-lg px-3">Export</Button></div>} access={{ canEdit, canDelete: false, canView: true }} tableViewportClassName="overflow-x-auto"><Table className={mobile ? 'hidden' : 'md:table'}><TableHeader><TableRow><TableHead>SN</TableHead><TableHead>Nama</TableHead><TableHead>Lokasi</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Quick action</TableHead></TableRow></TableHeader><TableBody>{visibleUsers.map((user) => <TableRow key={user.id} className="align-top"><TableCell className="font-mono text-xs">{user.employeeSn || '-'}</TableCell><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.siteName || user.workLocation || '-'}</TableCell><TableCell><Badge variant="secondary" className="rounded-full">{user.accessRole}</Badge></TableCell><TableCell><AdminStatusBadge value={user.isActive ? 'active' : 'inactive'} /></TableCell><TableCell className="text-right">{actions(user)}</TableCell></TableRow>)}{filteredUsers.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Tidak ada pengguna yang cocok.</TableCell></TableRow> : null}</TableBody></Table><div className={mobile ? 'grid gap-3' : 'hidden md:grid md:gap-3'}>{visibleUsers.map((user) => <div key={user.id} className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{user.employeeSn || '-'}</p><p className="truncate font-semibold">{user.name}</p><p className="truncate text-sm text-muted-foreground">{user.siteName || user.workLocation || '-'} · {user.accessRole}</p></div><AdminStatusBadge value={user.isActive ? 'active' : 'inactive'} /></div><div className="mt-4">{actions(user)}</div></div>)}</div>{visibleUsers.length < filteredUsers.length ? <div ref={loadMoreRef} className="py-3 text-center text-xs text-muted-foreground">Memuat data berikutnya…</div> : null}</MinimalTableShell></AdminPageShell>
}
