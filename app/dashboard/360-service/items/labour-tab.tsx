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

type EmployeeLabour = {
  id: number
  name: string
  section: string
  jobTitle: string
  level: number
  siteName: string | null
  price: string
}

export function LabourTab({ employees, sections }: { employees: EmployeeLabour[], sections: string[] }) {
  const [filterSite, setFilterSite] = useState("")
  const [filterSection, setFilterSection] = useState("")

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
    await updateEmployeeLevel(employeeId, parseInt(newLevel))
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

      <MinimalTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lokasi / Site</TableHead>
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Level Assignment</TableHead>
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
                {siteEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="text-muted-foreground">{emp.siteName || "-"}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.section || "-"}</TableCell>
                    <TableCell>{emp.jobTitle || "-"}</TableCell>
                    <TableCell>
                      <select
                        value={emp.level}
                        onChange={(e) => handleLevelChange(emp.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {Number(emp.price) > 0 ? (
                        Number(emp.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive">Not Set</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
