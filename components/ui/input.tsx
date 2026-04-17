import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-12 w-full min-w-0 rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-4 py-3 text-base shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] transition-[background-color,border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-b-primary focus-visible:bg-surface-container-lowest focus-visible:ring-0 focus-visible:shadow-[0_12px_24px_rgba(0,52,97,0.12)]",
        "aria-invalid:border-b-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
