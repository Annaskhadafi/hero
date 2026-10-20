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
import { HeroKpiCard, HeroKpiTone } from "@/components/templates/hero-kpi-card";

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

const tones: HeroKpiTone[] = ['blue', 'emerald', 'amber', 'purple', 'cyan', 'rose'];

function getMetricIcon(label?: string, meta?: string) {
  const source = `${label || ''} ${meta || ''}`.toLowerCase();
  return metricIcons.find((item) => item.match.some((keyword) => source.includes(keyword)))?.icon ?? BarChart3;
}

function getMetricTone(label?: string, index: number = 0): HeroKpiTone {
  const l = (label || '').toLowerCase();
  if (l.includes('reject') || l.includes('overdue') || l.includes('failed') || l.includes('incident') || l.includes('batal')) return 'rose';
  if (l.includes('pending') || l.includes('menunggu') || l.includes('review') || l.includes('proses')) return 'amber';
  if (l.includes('approve') || l.includes('selesai') || l.includes('success') || l.includes('hadir') || l.includes('aktif')) return 'emerald';
  if (l.includes('total') || l.includes('semua') || l.includes('pengguna') || l.includes('karyawan')) return 'blue';
  return tones[index % tones.length];
}

export function AdminMetricGrid({
  items = [],
  metrics,
  mode = "default",
}: {
  items?: {
    label: string;
    value: string;
    meta: string;
  }[];
  metrics?: {
    label: string;
    value: string | number;
    detail?: string;
  }[];
  mode?: "default" | "compact";
}) {
  const safeItems = Array.isArray(metrics) && metrics.length > 0
    ? metrics.map((m) => ({
        label: m.label,
        value: String(m.value),
        meta: m.detail || '',
      }))
    : Array.isArray(items)
    ? items
    : [];

  if (mode === "compact") {
    return (
      <div className="flex flex-wrap gap-2.5 w-full">
        {safeItems.map((item, index) => {
          const Icon = getMetricIcon(item?.label, item?.meta);
          const tone = getMetricTone(item?.label, index);

          return (
            <div
              key={item.label}
              className="group flex flex-1 min-w-[170px] min-h-11 items-center gap-2.5 rounded-[1rem] bg-surface-container-lowest px-3.5 py-2 shadow-[0_8px_20px_rgba(8,32,51,0.05)] ring-1 ring-[rgba(66,71,80,0.08)] transition-all hover:shadow-md"
            >
              <div className={`grid size-7 shrink-0 place-items-center rounded-xl ring-1 transition ${tone === 'emerald' ? 'bg-emerald-500/10 text-emerald-600' : tone === 'amber' ? 'bg-amber-500/10 text-amber-600' : tone === 'rose' ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'}`}>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {safeItems.map((item, index) => {
        const Icon = getMetricIcon(item?.label, item?.meta);
        const tone = getMetricTone(item?.label, index);

        return (
          <HeroKpiCard
            key={item.label}
            title={item.label}
            value={item.value}
            description={item.meta}
            icon={<Icon className="size-5" />}
            tone={tone}
          />
        );
      })}
    </div>
  );
}
