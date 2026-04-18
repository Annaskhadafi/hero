import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import {
  cn,
  inferBackgroundResetClassName,
  inferInteractiveTextClassName,
} from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border-0 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-normal whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] text-primary-foreground [a&]:hover:brightness-110",
        secondary:
          "bg-surface-container-high text-foreground [a&]:hover:bg-surface-container-highest",
        destructive:
          "bg-tertiary-container text-on-tertiary-container [a&]:hover:brightness-105",
        outline:
          "bg-surface-container-low text-foreground ring-1 ring-outline-ghost [a&]:hover:bg-surface-container-lowest",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant }),
        inferBackgroundResetClassName(className),
        inferInteractiveTextClassName(className),
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
