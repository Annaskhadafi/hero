import { Card } from "@/components/ui/card";
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
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item, index) => {
        const Icon = getMetricIcon(item.label, item.meta);
        const accent = accents[index % accents.length];

        return (
          <Card
            key={item.label}
            className="group min-h-[76px] rounded-lg border border-border bg-card p-3 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[0.65rem] font-semibold uppercase text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 truncate font-display text-2xl font-semibold leading-none tracking-normal text-foreground">
                  {item.value}
                </p>
              </div>
              <div className={`grid size-7 shrink-0 place-items-center rounded-lg ring-1 transition ${accent}`}>
                <Icon className="size-3.5" aria-hidden="true" />
              </div>
            </div>
            <p className="sr-only">{item.meta}</p>
            <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-primary transition-all duration-300 group-hover:w-full" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
