import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  FileText,
  FormInput,
  Mail,
  Send,
  ShieldAlert,
  Timer,
  Trophy,
  Users,
  Workflow,
} from "lucide-react";

const metricIcons = [
  { match: ["approval", "approved", "pending", "review"], icon: CheckCircle2 },
  { match: ["overtime", "time", "hours", "tracked"], icon: Timer },
  { match: ["workforce", "employee", "user", "attendance", "manpower"], icon: Users },
  { match: ["hse", "incident", "open", "urgent", "correction"], icon: ShieldAlert },
  { match: ["report", "document", "form"], icon: FileText },
  { match: ["point", "score", "leaderboard", "top"], icon: Trophy },
  { match: ["notification", "alert", "reminder"], icon: Bell },
  { match: ["email", "sent", "delivery"], icon: Mail },
  { match: ["request", "submitted", "activity"], icon: Send },
  { match: ["workflow", "route", "matrix"], icon: Workflow },
  { match: ["field", "input", "studio"], icon: FormInput },
  { match: ["late", "overdue", "failed"], icon: AlertTriangle },
];

const accents = [
  "bg-primary/10 text-primary ring-primary/15 group-hover:bg-primary/15",
  "bg-tertiary-container text-on-tertiary-container ring-tertiary/15 group-hover:bg-tertiary-container/80",
  "bg-surface-container-low text-primary ring-outline-ghost group-hover:bg-surface-container",
  "bg-primary-container/10 text-primary-container ring-primary-container/15 group-hover:bg-primary-container/15",
];

function getMetricIcon(label?: string, meta?: string) {
  const source = `${label || ''} ${meta || ''}`.toLowerCase();
  return metricIcons.find((item) => item.match.some((keyword) => source.includes(keyword)))?.icon ?? BarChart3;
}

export function AdminMetricGrid({
  items = [],
  mode = "default",
}: {
  items?: {
    label: string;
    value: string;
    meta: string;
  }[];
  mode?: "default" | "compact";
}) {
  const safeItems = Array.isArray(items) ? items : [];

  if (mode === "compact") {
    return (
      <div className="flex flex-wrap gap-2.5 w-full">
        {safeItems.map((item, index) => {
          const Icon = getMetricIcon(item?.label, item?.meta);
          const accent = accents[index % accents.length];

          return (
            <div
              key={item.label}
              className="group flex flex-1 min-w-[170px] min-h-11 items-center gap-2.5 rounded-[1rem] bg-surface-container-lowest px-3.5 py-2 shadow-[0_8px_20px_rgba(8,32,51,0.05)] ring-1 ring-[rgba(66,71,80,0.08)] transition-all hover:shadow-md"
            >
              <div className={`grid size-7 shrink-0 place-items-center rounded-xl ring-1 transition ${accent}`}>
                <Icon className="size-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {item.label}
                </p>
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <p className="tabular-nums font-display text-base font-semibold leading-none text-foreground shrink-0">
                    {item.value}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.meta}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {safeItems.map((item, index) => {
        const Icon = getMetricIcon(item?.label, item?.meta);
        const accent = accents[index % accents.length];

        return (
          <div
            key={item.label}
            className="group surface-module-card flex min-h-[104px] items-start gap-3 rounded-[1.05rem] px-4 py-4 transition duration-200 hover:-translate-y-0.5"
          >
            <div className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition ${accent}`}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="truncate text-[0.68rem] font-semibold uppercase text-muted-foreground">
                {item.label}
              </p>
              <p className="tabular-nums truncate font-display text-[1.55rem] font-semibold leading-none text-foreground">
                {item.value}
              </p>
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {item.meta}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
