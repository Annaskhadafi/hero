'use client'

import { useMemo, useState, useTransition } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { MultiSelectSearch } from '@/components/ui/multi-select-search'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { registerMaestroCustomerUserAction } from './actions'

type CustomerOption = { id: number | null; name: string; customerCode: string }
type LocationOption = { id: number; name: string; location: string }
type RoleOption = { id: number; code: string; name: string; description: string }
type UserRow = {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: Date | string
  customer: { customerId: number; customerName: string; customerCode: string } | null
  roles: string[]
  locations: string[]
}

type UserTab = 'all' | 'active' | 'inactive'

const tabs: Array<{ id: UserTab; label: string }> = [
  { id: 'all', label: 'Semua User' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Nonaktif' },
]

function formatRegisteredAt(value: Date | string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function MaestroUserManagementClient({
  customers,
  locations,
  roles,
  users,
}: {
  customers: CustomerOption[]
  locations: LocationOption[]
  roles: RoleOption[]
  users: UserRow[]
}) {
  const [activeTab, setActiveTab] = useState<UserTab>('all')
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [customerCode, setCustomerCode] = useState('')
  const [roleCode, setRoleCode] = useState(roles[0]?.code ?? '')
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const visibleUsers = useMemo(
    () => users.filter((user) => activeTab === 'all' || (activeTab === 'active') === user.isActive),
    [activeTab, users],
  )

  function resetForm() {
    setCustomerCode('')
    setRoleCode(roles[0]?.code ?? '')
    setSelectedLocationIds([])
    setName('')
    setEmail('')
    setPassword('')
  }

  function submit() {
    startTransition(async () => {
      try {
        await registerMaestroCustomerUserAction({
          name,
          email,
          password,
          customerCode,
          roleCode,
          locationIds: selectedLocationIds,
        })
        toast.success('User customer MAESTRO berhasil didaftarkan')
        setIsOpen(false)
        resetForm()
        window.location.reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Gagal mendaftarkan user customer')
      }
    })
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <nav className="flex items-end gap-1 overflow-x-auto pt-1" aria-label="Filter status user">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id
              ? 'rounded-t-xl bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-[0_-1px_0_rgba(66,71,80,0.06)]'
              : 'rounded-t-xl bg-surface-container-high px-5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-surface-container-highest hover:text-foreground'}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-outline-ghost">
        <MinimalTableShell
          key={activeTab}
          label="user customer"
          fileName="maestro-user-management"
          searchPlaceholder="Cari nama, email, customer, atau lokasi..."
          showImport={false}
          dateFilter={false}
          filters={
            <>
              <select data-table-filter-key="customer" className="h-9 min-w-44 rounded-lg bg-muted/30 px-3 text-[13px] text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]">
                <option value="">Semua customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.name}>{customer.name}</option>)}
              </select>
              <select data-table-filter-key="role" className="h-9 min-w-36 rounded-lg bg-muted/30 px-3 text-[13px] text-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]">
                <option value="">Semua role</option>
                {roles.map((role) => <option key={role.code} value={role.name}>{role.name}</option>)}
              </select>
            </>
          }
          primaryAction={
            <Button type="button" size="dense" onClick={() => setIsOpen(true)}>
              <Plus className="size-4" />
              Daftarkan user
            </Button>
          }
        >
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-container-low text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nama user</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Lokasi</th>
                <th className="px-4 py-3 font-medium">Terdaftar</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/50 transition-colors hover:bg-surface-container-low/50"
                  data-filter-customer={user.customer?.customerName ?? ''}
                  data-filter-role={user.roles.join('|')}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-foreground">{user.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-foreground">{user.customer?.customerName ?? '-'}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{user.customer?.customerCode ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{user.roles.join(', ') || '-'}</td>
                  <td className="max-w-[260px] px-4 py-3.5 text-muted-foreground">{user.locations.join(', ') || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">{formatRegisteredAt(user.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <span className={user.isActive
                      ? 'rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'
                      : 'rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground'}
                    >
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    Belum ada user pada status ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </MinimalTableShell>
      </section>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>Daftarkan user customer</DialogTitle>
            <DialogDescription>
              Akun ini digunakan untuk masuk ke maestro.chitraparatama.com. Customer diambil dari Master Data Customer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer</Label>
              <SearchableSelect
                label="Customer"
                value={customerCode}
                onValueChange={(value) => { setCustomerCode(value); setSelectedLocationIds([]) }}
                options={customers.map((customer) => ({ value: customer.customerCode, label: `${customer.name} · ${customer.customerCode}` }))}
                placeholder="Pilih customer"
                widthClassName="h-12 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maestro-user-name">Nama user</Label>
              <Input id="maestro-user-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama PIC customer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maestro-user-email">Email login</Label>
              <Input id="maestro-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pic@customer.co.id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maestro-user-password">Password awal</Label>
              <Input id="maestro-user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maestro-user-role">Role MAESTRO</Label>
              <select id="maestro-user-role" value={roleCode} onChange={(event) => setRoleCode(event.target.value)} className="h-12 w-full rounded-md bg-surface-container-low px-4 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)]">
                {roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Lokasi yang boleh dilihat</Label>
              <span className="text-xs text-muted-foreground">
                {locations.length} lokasi master
                {selectedLocationIds.length ? ` · ${selectedLocationIds.length} dipilih` : ''}
              </span>
            </div>
            <MultiSelectSearch
              label="Lokasi"
              values={selectedLocationIds.map(String)}
              onValuesChange={(values) => setSelectedLocationIds(values.map(Number).filter(Number.isInteger))}
              options={locations.map((location) => ({ value: String(location.id), label: `${location.name}${location.location ? ` · ${location.location}` : ''}` }))}
              placeholder="Pilih lokasi dari master data..."
              className="min-h-12 bg-surface-container-low"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button type="button" disabled={isPending} onClick={submit}>
              <KeyRound className="size-4" />
              {isPending ? 'Menyimpan...' : 'Simpan user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
