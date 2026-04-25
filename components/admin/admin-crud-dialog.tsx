"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type AdminCrudDialogProps = {
  title: string
  description?: string
  trigger?: React.ReactNode
  size?: "sm" | "md" | "lg"
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AdminCrudDialog({
  title,
  description,
  trigger,
  size = "sm",
  footer,
  children,
}: AdminCrudDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="dense">
            <Plus className="size-4" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "p-0",
          size === "sm" && "sm:max-w-[520px]",
          size === "md" && "sm:max-w-[680px]",
          size === "lg" && "sm:max-w-[840px]",
        )}
      >
        <DialogHeader className="border-b border-outline-ghost/70 px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer ? <DialogFooter className="border-t border-outline-ghost/70 p-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
