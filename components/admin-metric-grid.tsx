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

function getMetricIcon(label: string, meta: string) {
  const source = `${label} ${meta}`.toLowerCase();
  return metricIcons.find((item) => item.match.some((keyword) => source.includes(keyword)))?.icon ?? BarChart3;
}

export function AdminMetricGrid({
  items,
}: {
  items: {
    label: string;
    value: string;
    meta: string;
  }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => {
        const Icon = getMetricIcon(item.label, item.meta);
        const accent = accents[index % accents.length];

        return (
          <div
            key={item.label}
            className="group flex min-h-10 min-w-[150px] items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)] transition duration-200 hover:bg-surface-container"
          >
            <div className={`grid size-7 shrink-0 place-items-center rounded-md ring-1 transition ${accent}`}>
              <Icon className="size-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] font-semibold uppercase text-muted-foreground">
                {item.label}
              </p>
              <p className="truncate font-display text-base font-semibold leading-tight text-foreground">
                {item.value}
              </p>
            </div>
            <p className="sr-only">{item.meta}</p>
          </div>
        );
      })}
    </div>
  );
}
