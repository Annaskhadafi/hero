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
        <Card key={item.label} className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{item.meta}</p>
        </Card>
      ))}
    </div>
  );
}
