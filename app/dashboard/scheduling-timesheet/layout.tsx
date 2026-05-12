import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

const tabs = [
  { label: 'Overview', href: '/dashboard/scheduling-timesheet' },
  { label: 'Setup', href: '/dashboard/scheduling-timesheet/setup' },
  { label: 'Schedule', href: '/dashboard/scheduling-timesheet/schedule' },
  { label: 'Attendance', href: '/dashboard/scheduling-timesheet/attendance' },
  { label: 'Field Break', href: '/dashboard/scheduling-timesheet/field-break' },
  { label: 'MSA + OT', href: '/dashboard/scheduling-timesheet/payroll' },
]

export default function SchedulingTimesheetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <header className="surface-muted-card flex flex-col gap-4 rounded-[1rem] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
            HC • Scheduling Timesheet
          </p>
          <h1 className="font-display text-foreground mt-1 flex items-center gap-3 text-2xl font-semibold tracking-normal sm:text-3xl">
            <span className="bg-surface-container-lowest text-primary grid size-9 place-items-center rounded-xl shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            Scheduling Time Sheet
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="bg-surface-container-lowest text-muted-foreground hover:text-foreground rounded-full px-4 py-2 text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  )
}
