import { Activity, ChevronRight } from "lucide-react";

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
      <header className="admin-daily-card overflow-hidden rounded-lg px-4 py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="surface-chip inline-flex h-8 items-center gap-2 rounded-full px-3 text-[0.68rem] font-semibold uppercase text-muted-foreground">
                <Activity className="size-3.5 text-primary" aria-hidden="true" />
                {eyebrow}
              </span>
              {badge ? (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-[0.68rem] font-semibold uppercase text-primary ring-1 ring-primary/10">
                  {badge}
                  <ChevronRight className="size-3" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <h1 className="max-w-4xl font-display text-xl font-semibold leading-tight text-foreground [text-wrap:balance] sm:text-2xl">
                {title}
              </h1>
              <span className="sr-only">{description}</span>
            </div>
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
