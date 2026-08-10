'use client'

import { useState, useMemo } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface EmployeeOption {
  id: number
  name: string
  role?: string
  email?: string
  siteId?: number
  employeeSn?: string | null
}

export function SearchableEmployeeSelect({
  employees,
  defaultValue,
  name = "employeeId",
  label = "Karyawan",
  value,
  onValueChange,
  placeholder = "Pilih karyawan...",
  showLabel = true,
}: {
  employees: EmployeeOption[]
  defaultValue?: string
  name?: string
  label?: string
  value?: string
  onValueChange?: (val: string) => void
  placeholder?: string
  showLabel?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(defaultValue || "")
  const [searchQuery, setSearchQuery] = useState("")

  const isControlled = value !== undefined
  const currentId = isControlled ? value : selectedId

  // De-duplicate employees list by employee name (case-insensitive, trimmed)
  const uniqueEmployees = useMemo(() => {
    const seen = new Set<string>()
    const result: EmployeeOption[] = []
    
    // Sort so we prioritize records with more complete details (e.g. has role/SN)
    const sorted = [...(employees || [])].sort((a, b) => {
      const aScore = (a.role ? 2 : 0) + (a.employeeSn ? 1 : 0)
      const bScore = (b.role ? 2 : 0) + (b.employeeSn ? 1 : 0)
      return bScore - aScore
    })

    for (const emp of sorted) {
      const key = emp.name.toLowerCase().trim()
      if (!seen.has(key)) {
        seen.add(key)
        result.push(emp)
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [employees])

  const selectedEmployee = uniqueEmployees.find(
    (e) => String(e.id) === currentId
  )

  const filteredEmployees = uniqueEmployees.filter((e) =>
    `${e.name} ${e.role || ""} ${e.employeeSn || ""} ${e.email || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  return (
    <div className="grid gap-2 text-sm font-medium">
      {showLabel && <span>{label}</span>}
      <input type="hidden" name={name} value={currentId} />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-foreground h-10 px-3 border-input bg-background rounded-lg"
          >
            <span className="truncate">
              {selectedEmployee
                ? `${selectedEmployee.name}${selectedEmployee.employeeSn ? ` (${selectedEmployee.employeeSn})` : ""} - ${selectedEmployee.role || "Karyawan"}`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 rounded-xl" align="start">
          <div className="flex items-center border-b border-border px-3 py-2 gap-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari nama, SN, atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-foreground"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto p-1 space-y-0.5">
            {filteredEmployees.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Karyawan tidak ditemukan.</p>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = String(emp.id) === currentId
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      if (isControlled) {
                        onValueChange?.(String(emp.id))
                      } else {
                        setSelectedId(String(emp.id))
                      }
                      setOpen(false)
                      setSearchQuery("")
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-2.5 py-2 text-xs rounded-md text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                      isSelected && "bg-primary/5 text-primary font-semibold"
                    )}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-semibold truncate text-foreground">
                        {emp.name} {emp.employeeSn ? `(${emp.employeeSn})` : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.role || "Karyawan"}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
