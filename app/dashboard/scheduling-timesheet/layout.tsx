import { SchedulingTabs } from './tabs-nav'

export default function SchedulingTimesheetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-4 lg:p-5">
      <header className="admin-daily-card overflow-hidden rounded-[1.1rem] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              HC · Scheduling Timesheet
            </p>
            <h1 className="font-display text-foreground mt-1 text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">
              Scheduling &amp; Timesheet
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              Kelola roster, kehadiran, field break, hingga rekap MSA dan overtime dalam satu alur.
            </p>
          </div>
        </div>
        <SchedulingTabs />
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
