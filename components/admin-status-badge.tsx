import { Badge } from "@/components/ui/badge";

const toneMap: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-900",
  approved_today: "bg-emerald-100 text-emerald-900",
  approved_today_display: "bg-emerald-100 text-emerald-900",
  pending: "bg-amber-100 text-amber-900",
  pending_l2: "bg-amber-100 text-amber-900",
  draft_ready: "bg-sky-100 text-sky-900",
  ready_for_payroll: "bg-emerald-100 text-emerald-900",
  needs_correction: "bg-rose-100 text-rose-900",
  expiring_soon: "bg-amber-100 text-amber-900",
  urgent: "bg-rose-100 text-rose-900",
  active: "bg-emerald-100 text-emerald-900",
  inactive: "bg-slate-200 text-slate-900",
  probation: "bg-sky-100 text-sky-900",
  contract: "bg-violet-100 text-violet-900",
  on_leave: "bg-amber-100 text-amber-900",
  resigned: "bg-slate-200 text-slate-900",
  healthy: "bg-emerald-100 text-emerald-900",
  follow_up: "bg-amber-100 text-amber-900",
  attention: "bg-rose-100 text-rose-900",
  open: "bg-rose-100 text-rose-900",
  action_taken: "bg-emerald-100 text-emerald-900",
  investigating: "bg-amber-100 text-amber-900",
  closed: "bg-emerald-100 text-emerald-900",
  verified: "bg-emerald-100 text-emerald-900",
  needs_review: "bg-amber-100 text-amber-900",
  overtime: "bg-sky-100 text-sky-900",
  emergency: "bg-rose-100 text-rose-900",
  safety: "bg-amber-100 text-amber-900",
  submitted: "bg-amber-100 text-amber-900",
};

function normalize(value: string) {
  return value.toLowerCase().replaceAll(" ", "_");
}

export function AdminStatusBadge({ value }: { value: string }) {
  const key = normalize(value);
  const className = toneMap[key] ?? "bg-slate-100 text-slate-800";

  return (
    <Badge className={`rounded-full border-0 px-3 py-1 font-medium ${className}`}>
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
