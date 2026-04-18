import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import {
  cn,
  inferBackgroundResetClassName,
  inferInteractiveTextClassName,
} from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold uppercase tracking-normal transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)] text-primary-foreground shadow-[0_12px_24px_rgba(0,52,97,0.18)] hover:brightness-110",
        destructive:
          "bg-tertiary-container text-on-tertiary-container shadow-[0_12px_24px_rgba(90,34,0,0.14)] hover:brightness-105 focus-visible:ring-[rgba(90,34,0,0.2)]",
        outline:
          "border-0 bg-surface-container-low text-foreground shadow-[inset_0_-2px_0_rgba(66,71,80,0.08),0_10px_20px_rgba(0,52,97,0.05)] ring-1 ring-outline-ghost hover:bg-surface-container-lowest",
        secondary:
          "border-0 bg-surface-container-high text-foreground shadow-[0_10px_18px_rgba(0,52,97,0.05)] hover:bg-surface-container-highest",
        ghost:
          "shadow-none hover:bg-surface-container-high hover:text-foreground dark:hover:bg-surface-container-high",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 min-w-12 px-5 py-3 has-[>svg]:px-4",
        sm: "h-11 min-w-11 gap-1.5 px-4 has-[>svg]:px-3.5",
        lg: "h-12 min-w-12 px-7 has-[>svg]:px-5",
        icon: "size-12 min-h-12 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        inferBackgroundResetClassName(className),
        inferInteractiveTextClassName(className),
        className
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
