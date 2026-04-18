import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import {
  cn,
  inferBackgroundResetClassName,
  inferSurfaceTextClassName,
} from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border-0 px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start ring-1 ring-outline-ghost [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-surface-container-lowest text-card-foreground shadow-[0_10px_24px_rgba(0,52,97,0.07)]",
        destructive:
          "bg-tertiary-container text-on-tertiary-container [&>svg]:text-current *:data-[slot=alert-description]:text-on-tertiary-container/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        alertVariants({ variant }),
        inferBackgroundResetClassName(className),
        inferSurfaceTextClassName(className),
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
