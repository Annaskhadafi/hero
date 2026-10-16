"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
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
import { updateRateSetting, deleteRateSettingsGroup, duplicateRateSettingsGroup, updateRateSettingsGroupComplete } from "@/app/actions/service360"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { HeroSearchableSelect } from "@/components/templates"

type RateSetting = {
  id: number
  workLocation: string
  section: string
  level: string
  price: string
  isDefault?: boolean
}

export function RateSettingsTab({ settings, locations, sections }: { settings: RateSetting[], locations: string[], sections: string[] }) {
  const [workLocation, setWorkLocation] = useState("")
  const [section, setSection] = useState("")
  const [level, setLevel] = useState("0")
  const [customLevel, setCustomLevel] = useState("")
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<string>("siteName")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const locationOptions = useMemo(() => [
    { value: "", label: "Select a Location..." },
    ...(locations || []).map(loc => ({ value: loc, label: loc }))
  ], [locations])

  const sectionOptions = useMemo(() => [
    { value: "", label: "Select a Section..." },
    ...(sections || []).map(sec => ({ value: sec, label: sec }))
  ], [sections])

  const levelOptions = [
    { value: "0", label: "Default" },
    { value: "1", label: "Level 1" },
    { value: "2", label: "Level 2" },
    { value: "3", label: "Level 3" },
    { value: "others", label: "Others" },
  ]

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workLocation || !section || !price) return
    const finalLevel = level === "others" ? customLevel.trim() : level
    if (!finalLevel) return
    
    setLoading(true)
    try {
      await updateRateSetting(workLocation, section, finalLevel, Number(price))
      setPrice("") // Reset price on success
      if (level === "others") setCustomLevel("")
    } finally {
      setLoading(false)
    }
  }

  // Duplicate states
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [sourceLoc, setSourceLoc] = useState("")
  const [sourceSec, setSourceSec] = useState("")
  const [targetLoc, setTargetLoc] = useState("")
  const [targetSec, setTargetSec] = useState("")

  // Edit states
  const [editOpen, setEditOpen] = useState(false)
  const [editOldLoc, setEditOldLoc] = useState("")
  const [editOldSec, setEditOldSec] = useState("")
  const [editLoc, setEditLoc] = useState("")
  const [editSec, setEditSec] = useState("")
  const [editLvl0, setEditLvl0] = useState("")
  const [editLvl1, setEditLvl1] = useState("")
  const [editLvl2, setEditLvl2] = useState("")
  const [editLvl3, setEditLvl3] = useState("")

  async function handleDelete(loc: string, sec: string) {
    if (confirm(`Are you sure you want to delete all rate settings for ${loc} - ${sec}?`)) {
      await deleteRateSettingsGroup(loc, sec)
    }
  }

  function handleEdit(loc: string, sec: string, lvl0: string, lvl1: string, lvl2: string, lvl3: string) {
    const normalize = (val: string) => val && Number(val) > 0 ? Math.floor(Number(val)).toString() : ""
    
    setEditOldLoc(loc)
    setEditOldSec(sec)
    setEditLoc(loc)
    setEditSec(sec)
    setEditLvl0(normalize(lvl0))
    setEditLvl1(normalize(lvl1))
    setEditLvl2(normalize(lvl2))
    setEditLvl3(normalize(lvl3))
    setEditOpen(true)
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editLoc || !editSec) return
    setLoading(true)
    try {
      await updateRateSettingsGroupComplete(editOldLoc, editOldSec, editLoc, editSec, {
        level0: editLvl0,
        level1: editLvl1,
        level2: editLvl2,
        level3: editLvl3
      })
      setEditOpen(false)
    } finally {
      setLoading(false)
    }
  }

  function openDuplicate(loc: string, sec: string) {
    setSourceLoc(loc)
    setSourceSec(sec)
    setTargetLoc("")
    setTargetSec("")
    setDuplicateOpen(true)
  }

  async function handleDuplicate(e: React.FormEvent) {
    e.preventDefault()
    if (!targetLoc || !targetSec) return
    setLoading(true)
    try {
      await duplicateRateSettingsGroup(sourceLoc, sourceSec, targetLoc, targetSec)
      setDuplicateOpen(false)
    } finally {
      setLoading(false)
    }
  }

  // Group existing settings by site and section
  const groupedSettings = useMemo(() => {
    return (settings || []).reduce((acc, s) => {
      const loc = s.workLocation || "Unknown"
      const sec = s.section || "Unknown"
      const key = `${loc}###${sec}`
      if (!acc[key]) acc[key] = []
      acc[key].push(s)
      return acc
    }, {} as Record<string, RateSetting[]>)
  }, [settings])

  const sortedGroups = useMemo(() => {
    const entries = Object.entries(groupedSettings)
    return entries.sort(([keyA], [keyB]) => {
      const [siteA, secA] = keyA.split("###")
      const [siteB, secB] = keyB.split("###")
      let valA = sortField === "sectionName" ? secA : siteA
      let valB = sortField === "sectionName" ? secB : siteB
      valA = (valA || "").toLowerCase()
      valB = (valB || "").toLowerCase()
      if (valA < valB) return sortDir === "asc" ? -1 : 1
      if (valA > valB) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [groupedSettings, sortField, sortDir])

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm font-medium block mb-1">Site Location</label>
              <HeroSearchableSelect
                value={workLocation}
                onChange={(val: any) => setWorkLocation(val || "")}
                options={locationOptions}
                placeholder="Select a Location..."
              />
            </div>
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm font-medium block mb-1">Section</label>
              <HeroSearchableSelect
                value={section}
                onChange={(val: any) => setSection(val || "")}
                options={sectionOptions}
                placeholder="Select a Section..."
              />
            </div>
            <div className="w-full md:w-36 flex flex-col gap-2">
              <div>
                <label className="text-sm font-medium block mb-1">Level</label>
                <HeroSearchableSelect
                  value={level}
                  onChange={(val: any) => setLevel(val || "0")}
                  options={levelOptions}
                  placeholder="Select Level"
                />
              </div>
              {level === "others" && (
                <div>
                  <Input 
                    type="text" 
                    value={customLevel}
                    onChange={e => setCustomLevel(e.target.value)}
                    placeholder="e.g. Manager"
                    required
                    className="h-9"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 w-full md:w-auto">
              <label className="text-sm font-medium block mb-1">Price (IDR)</label>
              <Input 
                type="number" 
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 1500000"
                required
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto mt-4 md:mt-0 h-9">
              {loading ? "Saving..." : "Save Setting"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <MinimalTableShell label="Rates">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 text-xs font-semibold hover:bg-transparent"
                  onClick={() => handleSort("siteName")}
                >
                  Site Location
                  {sortField === "siteName" ? (
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
                  onClick={() => handleSort("sectionName")}
                >
                  Section
                  {sortField === "sectionName" ? (
                    sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Default Rate</TableHead>
              <TableHead>Level 1</TableHead>
              <TableHead>Level 2</TableHead>
              <TableHead>Level 3</TableHead>
              <TableHead>Other Levels</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.map(([key, siteSettings]) => {
              const [siteName, sectionName] = key.split("###")
              const getPrice = (lvl: string) => {
                const setting = siteSettings.find(s => String(s.level) === lvl)
                return setting ? Number(setting.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "-"
              }
              const standardLevels = ["0", "1", "2", "3"]
              const otherSettings = siteSettings.filter(s => !standardLevels.includes(String(s.level)))
              
              return (
                <TableRow key={key}>
                  <TableCell className="font-semibold">{siteName}</TableCell>
                  <TableCell>{sectionName}</TableCell>
                  <TableCell>{getPrice("0")}</TableCell>
                  <TableCell>{getPrice("1")}</TableCell>
                  <TableCell>{getPrice("2")}</TableCell>
                  <TableCell>{getPrice("3")}</TableCell>
                  <TableCell>
                    {otherSettings.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {otherSettings.map(s => (
                          <span key={s.level} className="text-xs bg-muted px-2 py-1 rounded-md border border-border">
                            {s.level}: {Number(s.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ))}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => handleEdit(
                      siteName, 
                      sectionName, 
                      siteSettings.find(s => s.level === "0")?.price || "",
                      siteSettings.find(s => s.level === "1")?.price || "",
                      siteSettings.find(s => s.level === "2")?.price || "",
                      siteSettings.find(s => s.level === "3")?.price || ""
                    )}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => openDuplicate(siteName, sectionName)}>
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(siteName, sectionName)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {(settings || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No rate settings configured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Rate Setting</DialogTitle>
            <DialogDescription>
              Copying rates from <strong>{sourceLoc} - {sourceSec}</strong> to a new location and section.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDuplicate} className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Target Site Location</label>
              <HeroSearchableSelect
                value={targetLoc}
                onChange={(val: any) => setTargetLoc(val || "")}
                options={locationOptions}
                placeholder="Select a Location..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Section</label>
              <HeroSearchableSelect
                value={targetSec}
                onChange={(val: any) => setTargetSec(val || "")}
                options={sectionOptions}
                placeholder="Select a Section..."
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2 h-9" onClick={() => setDuplicateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-9" disabled={loading || !targetLoc || !targetSec}>
                {loading ? "Duplicating..." : "Duplicate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Rate Setting</DialogTitle>
            <DialogDescription>
              Update location, section, and prices for Level 1, 2, and 3.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Site Location</label>
                <HeroSearchableSelect
                  value={editLoc}
                  onChange={(val: any) => setEditLoc(val || "")}
                  options={locationOptions}
                  placeholder="Select a Location..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Section</label>
                <HeroSearchableSelect
                  value={editSec}
                  onChange={(val: any) => setEditSec(val || "")}
                  options={sectionOptions}
                  placeholder="Select a Section..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Default Rate</label>
                <Input 
                  type="number"
                  min="0"
                  value={editLvl0}
                  onChange={e => setEditLvl0(e.target.value)}
                  placeholder="e.g. 1000000"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Level 1 Price</label>
                <Input 
                  type="number"
                  min="0"
                  value={editLvl1}
                  onChange={e => setEditLvl1(e.target.value)}
                  placeholder="e.g. 1500000"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Level 2 Price</label>
                <Input 
                  type="number"
                  min="0"
                  value={editLvl2}
                  onChange={e => setEditLvl2(e.target.value)}
                  placeholder="e.g. 1750000"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Level 3 Price</label>
                <Input 
                  type="number"
                  min="0"
                  value={editLvl3}
                  onChange={e => setEditLvl3(e.target.value)}
                  placeholder="e.g. 2000000"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2 h-9" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="h-9" disabled={loading || !editLoc || !editSec}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
