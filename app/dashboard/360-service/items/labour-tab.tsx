"use client"

import React, { useState } from "react"
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

  // Get unique sites for the filter dropdowns (sections are provided by props)
  const sites = Array.from(new Set((employees || []).map(e => e.siteName || "Unassigned"))).sort()

  const filteredEmployees = (employees || []).filter(emp => {
    const siteMatch = filterSite ? (emp.siteName || "Unassigned") === filterSite : true
    const sectionMatch = filterSection ? (emp.section || "Unassigned") === filterSection : true
    return siteMatch && sectionMatch
  })

  // Group by site
  const groupedBySite = filteredEmployees.reduce((acc, emp) => {
    const site = emp.siteName || "Unassigned"
    if (!acc[site]) acc[site] = []
    acc[site].push(emp)
    return acc
  }, {} as Record<string, EmployeeLabour[]>)

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
      <div className="flex gap-4 mb-6">
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium mb-1 block">Filter Site Location</label>
          <select 
            value={filterSite} 
            onChange={e => setFilterSite(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All Sites</option>
            {sites.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 max-w-xs">
          <label className="text-sm font-medium mb-1 block">Filter Section</label>
          <select 
            value={filterSection} 
            onChange={e => setFilterSection(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">All Sections...</option>
            {(sections || []).map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>
      </div>

      <MinimalTableShell label="Labour Data">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lokasi / Site</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead className="w-[300px]">Level Assignment</TableHead>
              <TableHead className="w-[200px]">Calculated Price</TableHead>
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
                        <select
                          value={isEditingCustom ? "others" : String(emp.level)}
                          onChange={(e) => handleLevelChange(emp.id, e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {availableLevels.map(lvl => (
                            <option key={lvl} value={lvl}>
                              {lvl === "0" ? "Default" : lvl === "1" ? "Level 1" : lvl === "2" ? "Level 2" : lvl === "3" ? "Level 3" : lvl}
                            </option>
                          ))}
                          <option value="others">Others (Input Manual)</option>
                        </select>
                        {isEditingCustom && (
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="text" 
                              value={customLevels[emp.id]} 
                              onChange={e => setCustomLevels(prev => ({ ...prev, [emp.id]: e.target.value }))}
                              placeholder="Ketik level..."
                              className="h-8 text-sm"
                            />
                            <Button size="sm" onClick={() => handleCustomLevelSave(emp.id)} className="h-8">Save</Button>
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
