"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      suppressHydrationWarning
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      suppressHydrationWarning
      className={cn(
        "bg-surface-container-low text-muted-foreground inline-flex min-h-9 w-fit items-center justify-center rounded-md p-0.5 shadow-[inset_0_0_0_1px_var(--outline-ghost)]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      suppressHydrationWarning
      className={cn(
        "text-muted-foreground inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[6px] border-0 px-3 py-1.5 text-[13px] font-medium normal-case tracking-normal whitespace-nowrap transition-[background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface-container-lowest data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_14px_rgba(0,52,97,0.06)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      suppressHydrationWarning
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
