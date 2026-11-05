import React from "react"
import { Package } from "lucide-react"

export function WarehouseRepairPageShell({
  title,
  description,
  badge = "Warehouse Repair",
  children,
}: {
  title: string
  description: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            <Package className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {badge}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
