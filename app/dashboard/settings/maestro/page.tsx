import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { listMaestroPages, syncMaestroFoundation } from '@/lib/maestro-pages'

export const dynamic = 'force-dynamic'

export default async function MaestroSettingsPage() {
  const [access, role] = await Promise.all([
    getCurrentMenuPermission('settings_maestro'),
    getCurrentEmployeeAccessRole(),
  ])

  if (!access.canView && !isSuperAdminRole(role)) redirect('/dashboard')

  await syncMaestroFoundation()
  const pages = await listMaestroPages()

  return (
    <div className="space-y-6">
      <div>
        <p className="industrial-label">Portal Customer</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-normal">MAESTRO Foundation</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Registry halaman dan permission MAESTRO tersinkron dari HERO. Permission baru tetap ditolak
          sampai diberikan ke role customer.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="dense">
          <Link href="/dashboard/settings/maestro/users">User management</Link>
        </Button>
        <Button asChild size="dense" className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Link href="/dashboard/settings/maestro/tickets">Ticketing Problem (Live Queue)</Link>
        </Button>
        <Button asChild size="dense" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Link href="/dashboard/settings/maestro/tickets/settings">Pengaturan AI &amp; Routing PIC</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Halaman terdaftar" value={pages.length} />
        <SummaryCard label="Domain" value="maestro.chitraparatama.com" />
        <SummaryCard label="Mode akses" value="Customer scope + site scope" />
      </div>

      <section className="surface-card overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">MAESTRO Page Registry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan entry ke registry saat membuat halaman atau API MAESTRO baru.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Halaman</th>
                <th className="px-5 py-3 font-semibold">Module</th>
                <th className="px-5 py-3 font-semibold">Permission</th>
                <th className="px-5 py-3 font-semibold">Scope</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.code} className="border-t border-border/50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{page.label}</div>
                    <div className="text-xs text-muted-foreground">{page.path}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{page.module}</td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{page.permissionCode}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {page.requiresSiteScope ? 'Customer + site' : 'Customer'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-display text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
