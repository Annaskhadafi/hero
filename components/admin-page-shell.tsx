import { Activity, ChevronRight } from "lucide-react";

export function AdminPageShell({
  eyebrow,
  title,
  description,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 p-3 sm:p-5 lg:p-6">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold uppercase text-muted-foreground shadow-sm">
              <Activity className="size-3.5 text-primary" aria-hidden="true" />
              {eyebrow}
            </span>
            {badge ? (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-primary ring-1 ring-primary/15">
                {badge}
                <ChevronRight className="size-3" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="sr-only">{description}</p>
        </div>
      </header>

      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}
