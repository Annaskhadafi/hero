import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type HcWorkspaceBannerProps = {
  eyebrow?: string;
  title: string;
  description: string;
  items?: Array<{ label: string; value: ReactNode; tone?: "slate" | "emerald" | "amber" | "rose" | "sky" }>;
  className?: string;
};

type BannerTone = NonNullable<HcWorkspaceBannerProps["items"]>[number]["tone"] & string;

const toneClassName: Record<BannerTone, string> = {
  slate: "bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]",
  emerald: "bg-emerald-50 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.14)]",
  amber: "bg-amber-50 text-amber-950 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.16)]",
  rose: "bg-rose-50 text-rose-950 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.16)]",
  sky: "bg-sky-50 text-sky-950 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.16)]",
};

export function HcWorkspaceBanner({ eyebrow = "Human Capital", title, description, items = [], className }: HcWorkspaceBannerProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_18px_44px_rgba(15,23,42,0.07)] sm:p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.10),transparent_45%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {items.length ? (
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
            {items.map((item) => (
              <div key={item.label} className={cn("rounded-2xl px-3 py-2.5", toneClassName[item.tone ?? "slate"])}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">{item.label}</p>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums tracking-tight">{item.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export const hcPrimaryActionClassName =
  "gap-2 rounded-xl bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800";

export const hcTableRowClassName = "transition-colors hover:bg-slate-50/80";
export const hcMutedPanelClassName =
  "rounded-[1.1rem] bg-white shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)]";
