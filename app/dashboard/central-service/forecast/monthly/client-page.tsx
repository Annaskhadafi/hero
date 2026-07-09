'use client'

import React, { useState, useEffect } from 'react'
import {
  createForecastPeriod,
  getForecastItems,
  updateForecastPeriodStatus,
  upsertForecastItem,
  deleteForecastItem,
  deleteForecastPeriod,
} from '@/app/actions/central-service-forecast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Save, Lock, Trash2, Edit, X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { bulkImportForecastItems } from '@/app/actions/central-service-forecast'
import { ImportExportButtons } from './import-export-buttons'
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

const displayMonthYear = (val: string) => {
  if (/^\d{4,5}-\d{2}$/.test(val)) {
    const [y, m] = val.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }
  return val
}

export function MonthlyClientPage({
  initialPeriods,
  salesEmployees = [],
}: {
  initialPeriods: any[]
  salesEmployees?: any[]
}) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  const selectedPeriod = periods.find((p) => p.id.toString() === selectedPeriodId)
  const isLocked = selectedPeriod?.status === 'Locked'

  // New period form state
  const [newMonthYear, setNewMonthYear] = useState('')
  const [newExchangeRate, setNewExchangeRate] = useState('15000')
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false)

  // Item form state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  const defaultItem = {
    customer: '',
    picSales: '',
    osInvoicePrevMonth: '0',
    osRemark: '',
    repairForecast: '0',
    repairRemark: '',
    retreadForecast: '0',
    retreadRemark: '',
    serviceForecast: '0',
    serviceRemark: '',
    isProductAccessories: false,
    accessoriesAmountIdr: '0',
    accessoriesAmountUsd: '0',
    remark: '',
  }
  const [formsData, setFormsData] = useState<any[]>([defaultItem])

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(periods[0].id.toString())
    }
  }, [periods])

  useEffect(() => {
    if (selectedPeriodId) {
      fetchItems(Number(selectedPeriodId))
    }
  }, [selectedPeriodId])

  const fetchItems = async (periodId: number) => {
    setIsLoading(true)
    try {
      const data = await getForecastItems(periodId)
      setItems(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePeriod = async () => {
    try {
      let formattedMonthYear = newMonthYear
      if (/^\d{4,5}-\d{2}$/.test(newMonthYear)) {
        const [y, m] = newMonthYear.split('-')
        const d = new Date(parseInt(y), parseInt(m) - 1)
        formattedMonthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }

      await createForecastPeriod({
        monthYear: formattedMonthYear,
        exchangeRateIdrToUsd: newExchangeRate,
      })
      toast.success('Period created')
      setIsPeriodDialogOpen(false)
      // Need a hard refresh or server action with revalidatePath handles it, but since we use initialProps we might just reload
      window.location.reload()
    } catch (e) {
      toast.error('Failed to create period')
    }
  }

  const handleLockPeriod = async () => {
    if (!selectedPeriodId) return
    try {
      await updateForecastPeriodStatus(Number(selectedPeriodId), 'Locked')
      toast.success('Period locked')
      window.location.reload()
    } catch (e) {
      toast.error('Failed to lock period')
    }
  }

  const handleUnlockPeriod = async () => {
    if (!selectedPeriodId) return
    try {
      await updateForecastPeriodStatus(Number(selectedPeriodId), 'Draft')
      toast.success('Period unlocked')
      window.location.reload()
    } catch (e) {
      toast.error('Failed to unlock period')
    }
  }

  const handleDeletePeriod = async () => {
    if (!selectedPeriodId) return
    if (!confirm('Are you sure you want to delete this entire period and all its data?')) return
    try {
      await deleteForecastPeriod(Number(selectedPeriodId))
      toast.success('Period deleted')
      window.location.reload()
    } catch (e) {
      toast.error('Failed to delete period')
    }
  }

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        const formData = formsData[0]
        const totalIdr =
          Number(formData.osInvoicePrevMonth) +
          Number(formData.repairForecast) +
          Number(formData.retreadForecast) +
          Number(formData.serviceForecast)
        const dataToSave = {
          ...formData,
          periodId: Number(selectedPeriodId),
          totalForecastIdr: totalIdr.toString(),
          remainingRepair: formData.repairForecast,
          remainingRetread: formData.retreadForecast,
          remainingService: formData.serviceForecast,
          remainingTotalIdr: totalIdr.toString(),
          remainingAccessoriesIdr: formData.accessoriesAmountIdr,
          remainingAccessoriesUsd: formData.accessoriesAmountUsd,
        }
        await upsertForecastItem(dataToSave)
      } else {
        await bulkImportForecastItems(Number(selectedPeriodId), formsData)
      }

      toast.success(editingItem ? 'Item updated' : `${formsData.length} items added`)
      setIsItemDialogOpen(false)
      fetchItems(Number(selectedPeriodId))
    } catch (e) {
      toast.error('Failed to save item(s)')
    }
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure?')) return
    try {
      await deleteForecastItem(id)
      toast.success('Item deleted')
      fetchItems(Number(selectedPeriodId))
    } catch (e) {
      toast.error('Failed to delete item')
    }
  }

  const openEdit = (item: any) => {
    setEditingItem(item)
    setFormsData([item])
    setIsItemDialogOpen(true)
  }

  const openNew = () => {
    setEditingItem(null)
    setFormsData([defaultItem])
    setIsItemDialogOpen(true)
  }

  const updateForm = (index: number, field: string, value: any) => {
    const newForms = [...formsData]
    newForms[index] = { ...newForms[index], [field]: value }
    setFormsData(newForms)
  }

  const removeForm = (index: number) => {
    setFormsData(formsData.filter((_, i) => i !== index))
  }

  const totalRepair = items.reduce((sum, item) => sum + Number(item.repairForecast || 0), 0)
  const totalRetread = items.reduce((sum, item) => sum + Number(item.retreadForecast || 0), 0)
  const totalService = items.reduce((sum, item) => sum + Number(item.serviceForecast || 0), 0)
  const totalOsPrevMonth = items.reduce(
    (sum, item) => sum + Number(item.osInvoicePrevMonth || 0),
    0
  )
  const grandTotalIdr = totalOsPrevMonth + totalRepair + totalRetread + totalService

  const filteredItems = items.filter((item) => {
    if (!filterQuery) return true
    const q = filterQuery.toLowerCase()
    return (
      item.customer?.toLowerCase().includes(q) ||
      item.picSales?.toLowerCase().includes(q) ||
      item.osRemark?.toLowerCase().includes(q) ||
      item.remark?.toLowerCase().includes(q)
    )
  })

  const coreItems = filteredItems.filter((i) => !i.isProductAccessories)
  const groupedByCustomer = coreItems.reduce<Record<string, any[]>>((acc, item) => {
    const key = item.customer || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const allCustomers = Object.keys(groupedByCustomer)
  const [expandAll, setExpandAll] = useState(false)
  const [collapsedCustomers, setCollapsedCustomers] = useState<Set<string>>(new Set(allCustomers))

  useEffect(() => {
    if (expandAll) {
      setCollapsedCustomers(new Set())
    } else {
      setCollapsedCustomers(new Set(allCustomers))
    }
  }, [selectedPeriodId, expandAll, allCustomers.join(',')])

  const toggleCustomer = (customer: string) => {
    setCollapsedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(customer)) next.delete(customer)
      else next.add(customer)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-4">
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {displayMonthYear(p.monthYear)} {p.status === 'Locked' ? '🔒' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPeriod && (
            <Badge variant={selectedPeriod.status === 'Locked' ? 'secondary' : 'default'}>
              {selectedPeriod.status}
            </Badge>
          )}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Filter customer, PIC, remark..."
              className="h-9 w-[250px] pl-9"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedPeriod && (
            <>
              {isLocked ? (
                <Button variant="outline" onClick={handleUnlockPeriod}>
                  <Lock className="mr-2 h-4 w-4" />
                  Unlock Period
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleLockPeriod}>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock Period
                  </Button>
                  <Button variant="destructive" onClick={handleDeletePeriod}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Period
                  </Button>
                </div>
              )}
            </>
          )}

          <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Forecast Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Month / Year</Label>
                  <Input
                    type="month"
                    value={newMonthYear}
                    onChange={(e) => setNewMonthYear(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exchange Rate (IDR to 1 USD)</Label>
                  <Input
                    type="number"
                    value={newExchangeRate}
                    onChange={(e) => setNewExchangeRate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreatePeriod}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {!isLocked && selectedPeriod && (
            <div className="flex items-center gap-2">
              <ImportExportButtons
                periodId={selectedPeriodId}
                items={items}
                salesEmployees={salesEmployees}
              />
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedPeriodId && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                O/S Prev Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(totalOsPrevMonth)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Repair
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRepair)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Retread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRetread)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalService)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-primary text-2xl font-bold">{formatCurrency(grandTotalIdr)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Core Services Forecast (IDR)</CardTitle>
          {coreItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setExpandAll((prev) => !prev)}>
              {expandAll ? (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" /> Collapse All
                </>
              ) : (
                <>
                  <ChevronRight className="mr-1 h-4 w-4" /> Expand All
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>PIC Sales</TableHead>
                  <TableHead className="text-right">O/S Prev Month</TableHead>
                  <TableHead className="text-right">Repair</TableHead>
                  <TableHead className="text-right">Retread</TableHead>
                  <TableHead className="text-right">Service</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Remark Monthly</TableHead>
                  {!isLocked && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : coreItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center">
                      No core service items.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedByCustomer).map(([customer, custItems]) => {
                    const isCollapsed = collapsedCustomers.has(customer)
                    const custTotal = custItems.reduce(
                      (s, i) =>
                        s +
                        Number(i.osInvoicePrevMonth) +
                        Number(i.repairForecast) +
                        Number(i.retreadForecast) +
                        Number(i.serviceForecast),
                      0
                    )
                    return (
                      <React.Fragment key={customer}>
                        <TableRow
                          className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleCustomer(customer)}
                        >
                          <TableCell className="px-2 py-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="py-2 font-bold">{customer}</TableCell>
                          <TableCell className="py-2">
                            {[...new Set(custItems.map((i) => i.picSales).filter(Boolean))].join(
                              ', '
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {formatCurrency(
                              custItems.reduce((s, i) => s + Number(i.osInvoicePrevMonth || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {formatCurrency(
                              custItems.reduce((s, i) => s + Number(i.repairForecast || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {formatCurrency(
                              custItems.reduce((s, i) => s + Number(i.retreadForecast || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {formatCurrency(
                              custItems.reduce((s, i) => s + Number(i.serviceForecast || 0), 0)
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right font-bold">
                            {formatCurrency(custTotal)}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {[...new Set(custItems.map((i) => i.remark).filter(Boolean))].join(
                              ', '
                            ) || '-'}
                          </TableCell>
                          {!isLocked && <TableCell className="py-2"></TableCell>}
                        </TableRow>
                        {!isCollapsed &&
                          custItems.map((item) => (
                            <TableRow key={item.id} className="bg-white">
                              <TableCell></TableCell>
                              <TableCell className="text-muted-foreground pl-8">
                                {item.picSales}
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-muted-foreground text-right text-[10px] break-words whitespace-normal">
                                {item.osRemark || ''}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-[10px] break-words whitespace-normal">
                                {item.repairRemark || ''}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-[10px] break-words whitespace-normal">
                                {item.retreadRemark || ''}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-[10px] break-words whitespace-normal">
                                {item.serviceRemark || ''}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right text-[10px] break-words whitespace-normal">
                                {item.remark || ''}
                              </TableCell>
                              <TableCell className="text-xs">{item.remark || '-'}</TableCell>
                              {!isLocked && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEdit(item)
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteItem(item.id)
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Accessories Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>PIC Sales</TableHead>
                  <TableHead className="text-right">Amount IDR</TableHead>
                  <TableHead className="text-right">Amount USD</TableHead>
                  <TableHead>Remark</TableHead>
                  {!isLocked && <TableHead className="w-[100px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.filter((i) => i.isProductAccessories).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      No accessories items.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems
                    .filter((i) => i.isProductAccessories)
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.customer}</TableCell>
                        <TableCell>{item.picSales}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.accessoriesAmountIdr))}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(item.accessoriesAmountUsd).toLocaleString()}
                        </TableCell>
                        <TableCell>{item.remark}</TableCell>
                        {!isLocked && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Forecast Item</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-6 overflow-y-auto py-4 pr-2">
            {formsData.map((formData, index) => (
              <div key={index} className="bg-muted/20 relative rounded-md border p-4">
                {!editingItem && formsData.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive absolute top-2 right-2"
                    onClick={() => removeForm(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {formsData.length > 1 && (
                  <h4 className="mb-4 text-sm font-semibold">Item #{index + 1}</h4>
                )}
                <div className="grid gap-4">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`isAcc-${index}`}
                      checked={formData.isProductAccessories}
                      onChange={(e) => updateForm(index, 'isProductAccessories', e.target.checked)}
                    />
                    <Label htmlFor={`isAcc-${index}`}>Is Product Accessories?</Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <Input
                        value={formData.customer}
                        onChange={(e) => updateForm(index, 'customer', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PIC Sales</Label>
                      <Input
                        list={`picSales-list-${index}`}
                        value={formData.picSales}
                        onChange={(e) => updateForm(index, 'picSales', e.target.value)}
                        placeholder="Type or select PIC Sales"
                      />
                      <datalist id={`picSales-list-${index}`}>
                        {salesEmployees.map((emp) => (
                          <option key={emp.id} value={emp.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {!formData.isProductAccessories ? (
                    <>
                      <div className="space-y-2">
                        <Label>O/S Invoice Prev Month (IDR)</Label>
                        <Input
                          type="number"
                          value={formData.osInvoicePrevMonth}
                          onChange={(e) => updateForm(index, 'osInvoicePrevMonth', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>O/S Remark</Label>
                        <Input
                          value={formData.osRemark || ''}
                          onChange={(e) => updateForm(index, 'osRemark', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Repair (IDR)</Label>
                          <Input
                            type="number"
                            value={formData.repairForecast}
                            onChange={(e) => updateForm(index, 'repairForecast', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Retread (IDR)</Label>
                          <Input
                            type="number"
                            value={formData.retreadForecast}
                            onChange={(e) => updateForm(index, 'retreadForecast', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Service (IDR)</Label>
                          <Input
                            type="number"
                            value={formData.serviceForecast}
                            onChange={(e) => updateForm(index, 'serviceForecast', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Repair Remark</Label>
                          <Input
                            value={formData.repairRemark}
                            onChange={(e) => updateForm(index, 'repairRemark', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Retread Remark</Label>
                          <Input
                            value={formData.retreadRemark}
                            onChange={(e) => updateForm(index, 'retreadRemark', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Service Remark</Label>
                          <Input
                            value={formData.serviceRemark}
                            onChange={(e) => updateForm(index, 'serviceRemark', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amount (IDR)</Label>
                        <Input
                          type="number"
                          value={formData.accessoriesAmountIdr}
                          onChange={(e) =>
                            updateForm(index, 'accessoriesAmountIdr', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount (USD)</Label>
                        <Input
                          type="number"
                          value={formData.accessoriesAmountUsd}
                          onChange={(e) =>
                            updateForm(index, 'accessoriesAmountUsd', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Remark Monthly</Label>
                    <Input
                      value={formData.remark}
                      onChange={(e) => updateForm(index, 'remark', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            {!editingItem && (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setFormsData([...formsData, defaultItem])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Row
              </Button>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <Button onClick={handleSaveItem}>
              <Save className="mr-2 h-4 w-4" /> Save{' '}
              {formsData.length > 1 ? `(${formsData.length} items)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
