"use client"

import { useState } from "react"
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

type RateSetting = {
  id: number
  workLocation: string
  section: string
  level: number
  price: string
  isDefault?: boolean
}

export function RateSettingsTab({ settings, locations, sections }: { settings: RateSetting[], locations: string[], sections: string[] }) {
  const [workLocation, setWorkLocation] = useState("")
  const [section, setSection] = useState("")
  const [level, setLevel] = useState("1")
  const [price, setPrice] = useState("")
  const [level, setLevel] = useState("0")
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workLocation || !section || !price) return
    setLoading(true)
    try {
      await updateRateSetting(workLocation, section, parseInt(level), Number(price))
      setPrice("") // Reset price on success
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
  const groupedSettings = (settings || []).reduce((acc, s) => {
    const loc = s.workLocation || "Unknown"
    const sec = s.section || "Unknown"
    const key = `${loc}###${sec}`
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, RateSetting[]>)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Site Location</label>
              <select 
                value={workLocation} 
                onChange={e => setWorkLocation(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select a Location...</option>
                {(locations || []).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Section</label>
              <select 
                value={section} 
                onChange={e => setSection(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select a Section...</option>
                {(sections || []).map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-sm font-medium block mb-1">Level</label>
              <select 
                value={level} 
                onChange={e => setLevel(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="0">Default</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Price (IDR)</label>
              <Input 
                type="number" 
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. 1500000"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Setting"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <MinimalTableShell label="Rates">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Location</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Default Rate</TableHead>
              <TableHead>Level 1</TableHead>
              <TableHead>Level 2</TableHead>
              <TableHead>Level 3</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedSettings || {}).map(([key, siteSettings]) => {
              const [siteName, sectionName] = key.split("###")
              const getPrice = (lvl: number) => {
                const setting = siteSettings.find(s => s.level === lvl)
                return setting ? Number(setting.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "-"
              }
              return (
                <TableRow key={key}>
                  <TableCell className="font-semibold">{siteName}</TableCell>
                  <TableCell>{sectionName}</TableCell>
                  <TableCell>{getPrice(0)}</TableCell>
                  <TableCell>{getPrice(1)}</TableCell>
                  <TableCell>{getPrice(2)}</TableCell>
                  <TableCell>{getPrice(3)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(
                      siteName, 
                      sectionName, 
                      siteSettings.find(s => s.level === 0)?.price || "",
                      siteSettings.find(s => s.level === 1)?.price || "",
                      siteSettings.find(s => s.level === 2)?.price || "",
                      siteSettings.find(s => s.level === 3)?.price || ""
                    )}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDuplicate(siteName, sectionName)}>
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(siteName, sectionName)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {(settings || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
              <select 
                value={targetLoc} 
                onChange={e => setTargetLoc(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select a Location...</option>
                {(locations || []).map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Section</label>
              <select 
                value={targetSec} 
                onChange={e => setTargetSec(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Select a Section...</option>
                {(sections || []).map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2" onClick={() => setDuplicateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !targetLoc || !targetSec}>
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
                <select 
                  value={editLoc} 
                  onChange={e => setEditLoc(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">Select a Location...</option>
                  {(locations || []).map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Section</label>
                <select 
                  value={editSec} 
                  onChange={e => setEditSec(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">Select a Section...</option>
                  {(sections || []).map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
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
                />
              </div>
            </div>



            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !editLoc || !editSec}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
