"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryComboboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  history: string[]
  onDeleteHistory: (value: string) => void
  onValueChange: (value: string) => void
  value: string
}

export function HistoryCombobox({
  history,
  onDeleteHistory,
  onValueChange,
  value,
  className,
  ...props
}: HistoryComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  // Filter history based on current value
  const filteredHistory = history.filter((item) =>
    item.toLowerCase().includes((value || "").toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value)
              if (!open) setOpen(true)
            }}
            onClick={() => setOpen(true)}
            className={cn("w-full pr-8", className)}
            {...props}
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 cursor-pointer pointer-events-none" />
        </div>
      </PopoverTrigger>
      {filteredHistory.length > 0 && (
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-60 rounded-md border">
            <div className="p-1 flex flex-col">
              {filteredHistory.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-slate-100 cursor-pointer group"
                  onClick={() => {
                    onValueChange(item)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{item}</span>
                  <div 
                    role="button"
                    tabIndex={0}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-full transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteHistory(item)
                    }}
                  >
                    <X className="h-3 w-3 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      )}
    </Popover>
  )
}
