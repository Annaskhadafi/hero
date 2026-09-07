import { getPermittedSchedulingTabs } from '@/lib/hero-access'
import { SchedulingTabs, SchedulingHeaderTitle } from './tabs-nav'

export default async function SchedulingTimesheetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const permittedTabs = await getPermittedSchedulingTabs()
  const permittedHrefs = permittedTabs.map((tab) => tab.href)

  return (
    <div className="space-y-4 p-4 lg:p-5">
      <header className="admin-daily-card overflow-hidden rounded-[1.1rem] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <SchedulingHeaderTitle />
          </div>
        </div>
        <SchedulingTabs permittedHrefs={permittedHrefs} />
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
