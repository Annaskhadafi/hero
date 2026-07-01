"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createQuotation, createCustomer } from "@/app/actions/service360"

type SelectedItem = {
  id: number
  itemId: number | null
  category: string
  monthPeriod: string
  startDate?: string
  endDate?: string
  level: string
  customDescription: string
  quantity: number
  price: number
  isBackup?: boolean
  backupStartDate?: string
  backupEndDate?: string
  backupLevel?: string
  backupDescription?: string
  backupPrice?: number
}

export function QuotationForm({ customers: initialCustomers, items, siteList, initialQuotationNumber }: { customers: any[]; items: any[]; siteList?: any[]; initialQuotationNumber?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [customers, setCustomers] = useState(initialCustomers)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [manualCustomerName, setManualCustomerName] = useState("")
  
  const [selectedProjectSite, setSelectedProjectSite] = useState<string>("")
  const [manualProjectName, setManualProjectName] = useState("")

  const [poPeriodStart, setPoPeriodStart] = useState("")
  const [poPeriodEnd, setPoPeriodEnd] = useState("")

  const [taxRate, setTaxRate] = useState(11)

  const handlePoPeriodChange = (start: string, end: string) => {
    setPoPeriodStart(start)
    setPoPeriodEnd(end)
    setSelectedItems(prev => prev.map(item => ({ ...item, startDate: start, endDate: end })))
  }

  const calculateDays = (start?: string, end?: string) => {
    if (!start || !end) return 31;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  const getRowSubtotal = (item: SelectedItem) => {
    if (item.category === "Labour Cost") {
      const primaryDays = calculateDays(item.startDate, item.endDate)
      const primaryProrate = (primaryDays / 31) * item.price * item.quantity
      
      let backupProrate = 0
      if (item.isBackup) {
        const backupDays = calculateDays(item.backupStartDate, item.backupEndDate)
        backupProrate = (backupDays / 31) * (item.backupPrice || 0) * item.quantity
      }
      return primaryProrate + backupProrate
    }
    return item.price * item.quantity
  }

  const handleAddBlankRow = () => {
    setSelectedItems(prev => [
      ...prev,
      {
        id: Date.now(),
        itemId: null,
        category: "",
        monthPeriod: "",
        startDate: "",
        endDate: "",
        level: "",
        customDescription: "",
        quantity: 1,
        price: 0
      }
    ])
  }

  const handleAddItem = (itemIdStr: string) => {
    if (!itemIdStr) return
    const itemId = parseInt(itemIdStr)
    const itemDef = items.find(i => i.id === itemId)
    if (!itemDef) return

    setSelectedItems(prev => [
      ...prev,
      {
        id: Date.now(),
        itemId,
        category: itemDef.category,
        monthPeriod: "",
        startDate: poPeriodStart,
        endDate: poPeriodEnd,
        level: itemDef.level || "",
        customDescription: itemDef.name, // pre-fill with master item name
        quantity: 1,
        price: Number(itemDef.price)
      }
    ])
  }

  const handleAddAllLabour = () => {
    if (!selectedProjectSite || selectedProjectSite === "manual") {
      alert("Please select a Site Location (Project) first from the Header Details.")
      return
    }
    
    const site = siteList?.find(s => s.id.toString() === selectedProjectSite)
    const projectName = site?.name || ""

    const labourItems = items.filter(i => i.category === "Labour Cost" && i.siteName === projectName)

    if (labourItems.length === 0) {
      alert(`No labour found for project: ${projectName}`)
      return
    }

    const newItems = labourItems.map((itemDef, idx) => ({
      id: Date.now() + idx,
      itemId: itemDef.id,
      category: itemDef.category,
      monthPeriod: "",
      startDate: poPeriodStart,
      endDate: poPeriodEnd,
      level: itemDef.level || "",
      customDescription: `Labour cost ${itemDef.jobTitle || ''} (${itemDef.name})`,
      quantity: 1,
      price: Number(itemDef.price)
    }))

    setSelectedItems(prev => [...prev, ...newItems])
  }

  const updateItem = (id: number, field: keyof SelectedItem, value: any) => {
    setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id))
  }

  const subTotal = selectedItems.reduce((acc, item) => acc + getRowSubtotal(item), 0)
  const taxAmount = (subTotal * taxRate) / 100
  const totalAmount = subTotal + taxAmount

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      let finalCustomerId = selectedCustomerId
      if (selectedCustomerId === "manual" && manualCustomerName) {
        // Create new customer and get its ID
        const newCustomer = await createCustomer({ customerName: manualCustomerName })
        if (newCustomer && newCustomer.id) {
          finalCustomerId = newCustomer.id.toString()
        }
      }
      
      let finalProjectName = formData.get("projectName") as string
      if (selectedProjectSite && selectedProjectSite !== "manual") {
        const site = siteList?.find(s => s.id.toString() === selectedProjectSite)
        if (site) {
          finalProjectName = site.name
        }
      }

      const formatDt = (d?: string) => {
        if (!d) return ""
        const date = new Date(d)
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      }

      const data = {
        quotationNumber: formData.get("quotationNumber"),
        customerId: parseInt(finalCustomerId),
        quotationDate: formData.get("quotationDate"),
      attn: formData.get("attn"),
      cc: formData.get("cc"),
      fromName: formData.get("fromName"),
      subject: formData.get("subject"),
      poNumber: formData.get("poNumber"),
      projectName: finalProjectName,
      poPeriod: (poPeriodStart && poPeriodEnd) ? `${formatDt(poPeriodStart)} - ${formatDt(poPeriodEnd)}` : (formData.get("poPeriod") || ""),
      taxRate: taxRate,
      taxAmount: taxAmount,
      subTotal: subTotal,
      totalAmount: totalAmount,
      status: "Draft",
      items: selectedItems.map(item => ({
        itemId: item.itemId,
        monthPeriod: (item.startDate && item.endDate) ? `${formatDt(item.startDate)} - ${formatDt(item.endDate)}` : item.monthPeriod,
        level: item.level,
        customDescription: item.customDescription,
        quantity: item.quantity,
        price: item.price,
        subtotal: getRowSubtotal(item),
        isBackup: item.isBackup,
        backupStartDate: item.backupStartDate,
        backupEndDate: item.backupEndDate,
        backupMonthPeriod: (item.backupStartDate && item.backupEndDate) ? `${formatDt(item.backupStartDate)} - ${formatDt(item.backupEndDate)}` : "",
        backupLevel: item.backupLevel,
        backupDescription: item.backupDescription,
        backupPrice: item.backupPrice,
      }))
    }

      const newQuotation = await createQuotation(data)
      if (newQuotation && newQuotation.id) {
        router.push(`/dashboard/360-service/quotations/${newQuotation.id}`)
      } else {
        router.push("/dashboard/360-service/quotations")
      }
    } catch (error) {
      console.error(error)
      alert("Failed to create quotation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Header Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Quotation Number</label>
              <Input name="quotationNumber" required defaultValue={initialQuotationNumber || ""} placeholder="e.g. 298/SSA-SRV-CKBMB/VI/26/AP" />
            </div>
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input name="quotationDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="text-sm font-medium">Customer (To)</label>
              <select 
                name="customerId" 
                required 
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.customerName}</option>
                ))}
                <option value="manual">+ Add Manual Customer</option>
              </select>
              {selectedCustomerId === "manual" && (
                <Input 
                  placeholder="Type new customer name..." 
                  className="mt-2"
                  value={manualCustomerName}
                  onChange={e => setManualCustomerName(e.target.value)}
                  required
                />
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Attn</label>
              <Input name="attn" placeholder="e.g. Mr. Irawanto" />
            </div>
            <div>
              <label className="text-sm font-medium">Cc</label>
              <Input name="cc" placeholder="e.g. Mr. M Julia Wanda" />
            </div>
            <div>
              <label className="text-sm font-medium">From</label>
              <Input name="fromName" placeholder="e.g. Nur Sabrina F.U" />
            </div>

            <div className="lg:col-span-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-t pt-4 mt-2">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input name="subject" placeholder="e.g. Quotation for SSA" />
              </div>
              <div>
                <label className="text-sm font-medium">PO Number</label>
                <Input name="poNumber" placeholder="e.g. 4501075835" />
              </div>
              <div>
                <label className="text-sm font-medium">Tax</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 grid gap-4 md:grid-cols-2 border-t pt-4 mt-2">
              <div>
                <label className="text-sm font-medium">Project Name (for intro text)</label>
                <select 
                  value={selectedProjectSite}
                  onChange={e => setSelectedProjectSite(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mb-2"
                >
                  <option value="">Select Site Location (Optional)</option>
                  {siteList?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="manual">Manual Input</option>
                </select>
                {selectedProjectSite === "manual" && (
                  <Input name="projectName" placeholder="e.g. CK BMB Project" />
                )}
              </div>
              <div>
                <label className="text-sm font-medium">PO Period (Date Range)</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input 
                    type="date" 
                    value={poPeriodStart}
                    onChange={e => handlePoPeriodChange(e.target.value, poPeriodEnd)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input 
                    type="date" 
                    value={poPeriodEnd}
                    onChange={e => handlePoPeriodChange(poPeriodStart, e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Add Item from Master Data</label>
                <select 
                  id="itemSelect"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onChange={(e) => {
                    handleAddItem(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Select an item to add...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.name} - {Number(item.price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleAddAllLabour}>
                  + Add All Labour for Project
                </Button>
                <Button type="button" variant="outline" onClick={handleAddBlankRow}>
                  + Add Blank Row
                </Button>
              </div>
            </div>

            <div className="border rounded-md mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Month</TableHead>
                    <TableHead className="min-w-[250px] w-auto">Description</TableHead>
                    <TableHead className="w-[120px]">Level</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="min-w-[180px]">Price / Month</TableHead>
                    <TableHead className="w-[150px]">Labor Price</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((selItem) => {
                    return (
                      <TableRow key={selItem.id}>
                        <TableCell className="min-w-[150px] align-top">
                          <div className="flex flex-col gap-1">
                            <Input 
                              type="date" 
                              value={selItem.startDate || ''} 
                              onChange={(e) => updateItem(selItem.id, 'startDate', e.target.value)} 
                              title="Start Date"
                            />
                            <Input 
                              type="date" 
                              value={selItem.endDate || ''} 
                              onChange={(e) => updateItem(selItem.id, 'endDate', e.target.value)} 
                              title="End Date"
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col gap-1 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Date</span>
                                <Input type="date" value={selItem.backupStartDate || ''} onChange={(e) => updateItem(selItem.id, 'backupStartDate', e.target.value)} />
                                <Input type="date" value={selItem.backupEndDate || ''} onChange={(e) => updateItem(selItem.id, 'backupEndDate', e.target.value)} />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[250px] align-top">
                          <div className="flex flex-col h-full">
                            <Textarea 
                              value={selItem.customDescription} 
                              onChange={(e) => updateItem(selItem.id, 'customDescription', e.target.value)} 
                              placeholder="Description"
                              rows={3}
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Desc</span>
                                <Textarea 
                                  value={selItem.backupDescription || ''} 
                                  onChange={(e) => updateItem(selItem.id, 'backupDescription', e.target.value)} 
                                  placeholder="Backup Description"
                                  rows={3}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <Input 
                              value={selItem.level} 
                              onChange={(e) => updateItem(selItem.id, 'level', e.target.value)} 
                              placeholder="Level"
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Lvl</span>
                                <Input 
                                  value={selItem.backupLevel || ''} 
                                  onChange={(e) => updateItem(selItem.id, 'backupLevel', e.target.value)} 
                                  placeholder="Level"
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Input 
                            type="number" 
                            min="0.01" 
                            step="0.01" 
                            value={selItem.quantity} 
                            onChange={(e) => updateItem(selItem.id, 'quantity', Number(e.target.value))} 
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col">
                            <Input 
                              type="number" 
                              min="0" 
                              value={selItem.price} 
                              onChange={(e) => updateItem(selItem.id, 'price', Number(e.target.value))} 
                            />
                            {selItem.isBackup && (
                              <div className="mt-4 pt-4 border-t border-slate-200 relative">
                                <span className="absolute -top-[9px] bg-white px-1 text-[10px] font-bold text-teal-600 uppercase tracking-wider">Backup Price</span>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  value={selItem.backupPrice || 0} 
                                  onChange={(e) => updateItem(selItem.id, 'backupPrice', Number(e.target.value))} 
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top font-semibold text-teal-700">
                          {Number(getRowSubtotal(selItem)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            <Button variant="ghost" size="sm" type="button" onClick={() => removeItem(selItem.id)} className="text-red-500 hover:text-red-700">
                              X
                            </Button>
                            {selItem.category === "Labour Cost" && (
                              <Button 
                                variant={selItem.isBackup ? "default" : "outline"}
                                size="sm" 
                                type="button" 
                                onClick={() => updateItem(selItem.id, 'isBackup', !selItem.isBackup)}
                                className={selItem.isBackup ? "bg-teal-600 text-white text-[10px] h-6 px-2" : "text-[10px] h-6 px-2"}
                              >
                                {selItem.isBackup ? "Backup On" : "Backup Off"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {selectedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No items added yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-6">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">AMOUNT</span>
                  <span className="font-medium">{subTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT TAX {taxRate}%</span>
                  <span className="font-medium">{taxAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg text-primary">
                  <span className="font-bold">TOTAL</span>
                  <span className="font-bold">{totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/360-service/quotations")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedItems.length === 0}>
              {loading ? "Saving..." : "Create Quotation"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
