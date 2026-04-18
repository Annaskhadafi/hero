import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground aria-invalid:border-b-destructive flex field-sizing-content min-h-28 w-full rounded-lg border-0 border-b-2 border-b-transparent bg-surface-container-low px-4 py-3 text-base shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] transition-[background-color,border-color,box-shadow] outline-none focus-visible:border-b-primary focus-visible:bg-surface-container-lowest focus-visible:ring-0 focus-visible:shadow-[0_12px_24px_rgba(0,52,97,0.12)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
