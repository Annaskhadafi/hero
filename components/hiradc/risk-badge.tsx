import { cn } from "@/lib/utils"
import type { SystemRiskLevel } from "@/lib/hiradc/risk"

const RISK_BADGE_CLASS: Record<string, string> = {
  EXTREME: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
  HIGH: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
  MODERATE: "bg-sky-100 text-sky-900 ring-1 ring-sky-300",
  LOW: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
}

const RISK_LABEL: Record<string, string> = {
  EXTREME: "Extreme",
  HIGH: "High",
  MODERATE: "Moderate",
  LOW: "Low",
}

export function RiskBadge({
  level,
  score,
  className,
}: {
  level: SystemRiskLevel | string | null | undefined
  score?: number | null
  className?: string
}) {
  const value = (level ?? "").toUpperCase()
  if (!value) {
    return <span className="text-xs text-muted-foreground">-</span>
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]",
        RISK_BADGE_CLASS[value] ?? "bg-muted text-foreground ring-1 ring-border",
        className,
      )}
    >
      {RISK_LABEL[value] ?? value}
      {typeof score === "number" ? <span className="tabular-nums opacity-70">· {score}</span> : null}
    </span>
  )
}

export function RiskScoreCell({
  likelihood,
  severity,
  score,
  level,
}: {
  likelihood: string | null | undefined
  severity: number | null | undefined
  score: number | null | undefined
  level: string | null | undefined
}) {
  return (
    <div className="flex flex-col gap-1">
      <RiskBadge level={level} score={score} />
      <span className="text-[11px] text-muted-foreground tabular-nums">
        L {likelihood || "-"} · S {severity ?? "-"}
      </span>
    </div>
  )
}
