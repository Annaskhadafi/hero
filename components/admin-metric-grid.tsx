import { Card } from "@/components/ui/card";

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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="command-panel rounded-2xl p-5">
          <p className="industrial-label">{item.label}</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <p className="font-display text-4xl font-semibold tracking-[-0.05em]">{item.value}</p>
            <div className="rounded-full bg-surface-container-low px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Live
            </div>
          </div>
          <p className="mt-2 max-w-[32ch] text-sm leading-6 text-muted-foreground">{item.meta}</p>
        </Card>
      ))}
    </div>
  );
}
