export function AdminPageShell({
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 p-4 lg:p-5">
      <header className="admin-daily-card overflow-hidden rounded-[1.1rem] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="max-w-4xl font-display text-[1.9rem] font-semibold leading-tight text-foreground [text-wrap:balance] sm:text-[2rem]">
              {title}
            </h1>
            <span className="sr-only">
              {eyebrow} {badge} {description}
            </span>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-5 lg:space-y-6">
        {children}
      </div>
    </div>
  );
}
