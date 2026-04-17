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
    <div className="space-y-8 p-6 lg:p-8">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-4">
          <p className="industrial-label">{eyebrow}</p>
          <div className="space-y-3">
            <h1 className="font-display max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="command-panel rounded-2xl bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] p-5 text-primary-foreground shadow-[0_20px_34px_rgba(0,52,97,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
            Live Status
          </p>
          <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
            {badge ?? "Operational"}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/72">
            Industrial authority layout applied across command surfaces.
          </p>
        </div>
      </header>

      <div className="rounded-[1.4rem] bg-surface-container-low p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
        <div className="space-y-6 rounded-[1.15rem] bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}
