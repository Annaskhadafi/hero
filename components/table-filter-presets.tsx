"use client"

import { Button } from "@/components/ui/button"

type TableFilterPreset = {
  label: string
  filters: Record<string, string>
}

export function TableFilterPresets({ presets }: { presets: TableFilterPreset[] }) {
  const applyPreset = (filters: Record<string, string>) => {
    const controls = Array.from(document.querySelectorAll<HTMLElement>("[data-table-filter-key]"))
    for (const control of controls) {
      const key = control.dataset.tableFilterKey ?? ""
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) {
        continue
      }
      control.value = filters[key] ?? ""
      control.dispatchEvent(new Event("input", { bubbles: true }))
      control.dispatchEvent(new Event("change", { bubbles: true }))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          type="button"
          variant="outline"
          className="h-9 rounded-lg border-0 bg-white px-3 text-[13px] font-medium normal-case tracking-normal shadow-[inset_0_0_0_1px_rgba(66,71,80,0.12)]"
          onClick={() => applyPreset(preset.filters)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
