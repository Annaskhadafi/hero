import { cn } from '@/lib/utils'

export function AdminPageShell({
  eyebrow = '',
  title = '',
  description = '',
  badge,
  actions,
  header,
  compact = false,
  children,
}: {
  eyebrow?: string
  title?: string
  description?: string
  badge?: string
  actions?: React.ReactNode
  header?: React.ReactNode
  compact?: boolean
  children: React.ReactNode
}) {
  const showHeader = title ? true : Boolean(header)

  return (
    <div className={cn('space-y-4', compact ? 'p-0' : 'p-4 lg:p-5')}>
      {showHeader ? (
        <header className={cn('admin-daily-card overflow-hidden rounded-[1.1rem] print:hidden no-print', compact && 'rounded-xl')}>
          {header ? (
            header
          ) : (
            <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <h1 className={cn('font-display text-foreground max-w-4xl leading-tight font-semibold [text-wrap:balance]', compact ? 'text-[1.45rem] sm:text-[1.65rem]' : 'text-[1.9rem] sm:text-[2rem]')}>
                  {title}
                </h1>
                <span className="sr-only">
                  {eyebrow} {badge} {description}
                </span>
              </div>

              {actions ? (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>
              ) : null}
            </div>
          )}
        </header>
      ) : null}

      <div className="space-y-5 lg:space-y-6">{children}</div>
    </div>
  )
}
