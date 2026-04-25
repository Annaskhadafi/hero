"use client"

import * as React from "react"
import { PanelRightOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type AdminDetailDrawerProps = {
  title: string
  description?: string
  trigger?: React.ReactNode
  width?: "default" | "wide"
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AdminDetailDrawer({
  title,
  description,
  trigger,
  width = "default",
  footer,
  children,
}: AdminDetailDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="denseIcon" aria-label={`Buka detail ${title}`}>
            <PanelRightOpen className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 border-l border-outline-ghost bg-surface-container-lowest p-0 sm:max-w-[520px]",
          width === "wide" && "sm:max-w-[640px]",
        )}
      >
        <SheetHeader className="border-b border-outline-ghost/70 px-4 py-3 text-left">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <SheetFooter className="border-t border-outline-ghost/70 p-4">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  )
}
