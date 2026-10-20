"use client"

import React, { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { Input } from "@/components/ui/input"
import { updateEmployeeLevel } from "@/app/actions/service360"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { HeroSearchableSelect } from "@/components/templates"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type RateSetting = {
  workLocation: string
  section: string
  level: string
  price: string
}

type EmployeeLabour = {
  id: number
  name: string
  section: string
  jobTitle: string
  level: string
  siteName: string | null
  price: string
}

export function LabourTab({ employees, sections, rateSettings }: { employees: EmployeeLabour[], sections: string[], rateSettings?: RateSetting[] }) {
  const [filterSite, setFilterSite] = useState("")
  const [filterSection, setFilterSection] = useState("")
  const [customLevels, setCustomLevels] = useState<Record<number, string>>({})
  const [sortField, setSortField] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  // Get unique sites for the filter dropdowns (sections are provided by props)
  const sites = Array.from(new Set((employees || []).map(e => e.siteName || "Unassigned"))).sort()

  const siteOptions = useMemo(() => [
    { value: "", label: "All Sites" },
    ...sites.map(s => ({ value: s, label: s }))
  ], [sites])

  const sectionOptions = useMemo(() => [
    { value: "", label: "All Sections..." },
    ...(sections || []).map(sec => ({ value: sec, label: sec }))
  ], [sections])

  const filteredEmployees = useMemo(() => {
    return (employees || []).filter(emp => {
      const siteMatch = filterSite ? (emp.siteName || "Unassigned") === filterSite : true
      const sectionMatch = filterSection ? (emp.section || "Unassigned") === filterSection : true
      return siteMatch && sectionMatch
    })
  }, [employees, filterSite, filterSection])

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aVal: any = a[sortField as keyof EmployeeLabour]
      let bVal: any = b[sortField as keyof EmployeeLabour]
      if (sortField === "price") {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      } else {
        aVal = String(aVal || "").toLowerCase()
        bVal = String(bVal || "").toLowerCase()
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [filteredEmployees, sortField, sortDir])

  // Group by site
  const groupedBySite = useMemo(() => {
    return sortedEmployees.reduce((acc, emp) => {
      const site = emp.siteName || "Unassigned"
      if (!acc[site]) acc[site] = []
      acc[site].push(emp)
      return acc
    }, {} as Record<string, EmployeeLabour[]>)
  }, [sortedEmployees])

  const handleLevelChange = async (employeeId: number, newLevel: string) => {
    if (newLevel === "others") {
      setCustomLevels(prev => ({ ...prev, [employeeId]: "" }))
      return
    }
    
    // Remove from custom levels if switching back to a standard option
    if (customLevels[employeeId] !== undefined) {
      setCustomLevels(prev => {
        const next = { ...prev }
        delete next[employeeId]
        return next
      })
    }
    
    await updateEmployeeLevel(employeeId, newLevel)
  }

  const handleCustomLevelSave = async (employeeId: number) => {
    const lvl = customLevels[employeeId]?.trim()
    if (!lvl) return
    
    await updateEmployeeLevel(employeeId, lvl)
    
    // Remove from editing state
    setCustomLevels(prev => {
      const next = { ...prev }
      delete next[employeeId]
      return next
    })
  }

  const getAvailableLevels = (site: string | null, section: string) => {
    const standardLevels = ["0", "1", "2", "3"]
    if (!rateSettings) return standardLevels
    
    const customOptions = rateSettings
      .filter(s => s.workLocation === (site || "Unassigned") && s.section === section && !standardLevels.includes(s.level))
      .map(s => s.level)
      
    return [...standardLevels, ...customOptions]
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium mb-1 block">Filter Site Location</label>
          <HeroSearchableSelect
            value={filterSite}
            onChange={(val: any) => setFilterSite(val || "")}
            options={siteOptions}
            placeholder="All Sites"
          />
        </div>
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium mb-1 block">Filter Section</label>
          <HeroSearchableSelect
            value={filterSection}
            onChange={(val: any) => setFilterSection(val || "")}
            options={sectionOptions}
            placeholder="All Sections..."
          />
        </div>
      </div>

      <MinimalTableShell label="Labour Data">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lokasi / Site</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent"
                  onClick={() => handleSort("name")}
                >
                  Nama Karyawan
                  {sortField === "name" ? (
                    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent"
                  onClick={() => handleSort("section")}
                >
                  Section
                  {sortField === "section" ? (
                    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent"
                  onClick={() => handleSort("jobTitle")}
                >
                  Job Title
                  {sortField === "jobTitle" ? (
                    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="w-[300px]">Level Assignment</TableHead>
              <TableHead className="w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent"
                  onClick={() => handleSort("price")}
                >
                  Calculated Price
                  {sortField === "price" ? (
                    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedBySite || {}).map(([siteName, siteEmployees]) => (
              <React.Fragment key={siteName}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={6} className="font-semibold text-primary py-3">
                    {siteName}
                  </TableCell>
                </TableRow>
                {siteEmployees.map((emp) => {
                  const availableLevels = getAvailableLevels(emp.siteName, emp.section)
                  // If current level is not in available options, add it so the select doesn't default to wrong value
                  if (!availableLevels.includes(String(emp.level))) {
                    availableLevels.push(String(emp.level))
                  }
                  const isEditingCustom = customLevels[emp.id] !== undefined

                  return (
                  <TableRow key={emp.id}>
                    <TableCell className="text-muted-foreground">{emp.siteName || "-"}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.section || "-"}</TableCell>
                    <TableCell>{emp.jobTitle || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={isEditingCustom ? "others" : String(emp.level)}
                          onValueChange={(val) => handleLevelChange(emp.id, val)}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLevels.map(lvl => (
                              <SelectItem key={lvl} value={lvl}>
                                {lvl === "0" ? "Default" : lvl === "1" ? "Level 1" : lvl === "2" ? "Level 2" : lvl === "3" ? "Level 3" : lvl}
                              </SelectItem>
                            ))}
                            <SelectItem value="others">Others (Input Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                        {isEditingCustom && (
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="text" 
                              value={customLevels[emp.id]} 
                              onChange={e => setCustomLevels(prev => ({ ...prev, [emp.id]: e.target.value }))}
                              placeholder="Ketik level..."
                              className="h-9 text-sm"
                            />
                            <Button size="sm" onClick={() => handleCustomLevelSave(emp.id)} className="h-9">Save</Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Number(emp.price) > 0 ? (
                        Number(emp.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive">Not Set</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </React.Fragment>
            ))}
            {filteredEmployees?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No employees found matching the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </div>
  )
}
