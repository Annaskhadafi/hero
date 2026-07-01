"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createItem } from "@/app/actions/service360"
import { Plus } from "lucide-react"

export function CreateItemDialog({ siteList }: { siteList: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const price = formData.get("price") as string
    const siteIdStr = formData.get("siteId") as string
    const siteId = siteIdStr ? parseInt(siteIdStr) : null
    const jobTitle = formData.get("jobTitle") as string | null

    try {
      if (name && category && price) {
        await createItem({ name, category, price, siteId, jobTitle })
        setOpen(false) // Close modal on success
      }
    } catch (error) {
      console.error(error)
      alert("Failed to create item")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>Enter details for a new item or service.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select 
              name="category" 
              required 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
            >
              <option value="">Select Category</option>
              <option value="Rental">Rental</option>
              <option value="Tools">Tools</option>
              <option value="Accessories">Accessories</option>
              <option value="Consumable Parts">Consumable Parts</option>
            </select>
          </div>

          {selectedCategory === "Labour Cost" && (
            <div>
              <label className="text-sm font-medium">Section / Job Title</label>
              <Input name="jobTitle" required placeholder="e.g. Tireman, Repairman" className="mt-1.5" />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Site (Optional)</label>
            <select name="siteId" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5">
              <option value="">No specific site</option>
              {siteList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input name="name" required placeholder="Item/Service Name" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">Price</label>
            <Input name="price" type="number" step="0.01" required placeholder="0.00" className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Saving..." : "Save Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
