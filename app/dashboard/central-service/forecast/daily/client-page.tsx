'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  getRealtimeExchangeRate,
  updateForecastItemStatus,
  addForecastActual,
  updateForecastActual,
  deleteForecastActual,
} from '@/app/actions/central-service-forecast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}
import {
  Calendar,
  FileText,
  Banknote,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  TrendingUp,
  Wallet,
  Trophy,
  Target,
  Download,
  TableProperties,
} from 'lucide-react'
import { getSapInvoices } from '@/app/actions/central-service-forecast'

const getForecastAmountIdr = (item: any) => {
  if (item.isProductAccessories) return Number(item.accessoriesAmountIdr || 0)
  return (
    Number(item.osInvoicePrevMonth || 0) +
    Number(item.repairForecast || 0) +
    Number(item.retreadForecast || 0) +
    Number(item.serviceForecast || 0)
  )
}

// ponytail: carry-over = next month, exclude from current scorecards
const isCarryOverItem = (item: any) =>
  (item?.status || '').trim().toLowerCase() === 'carry over'

export function DailyClientPage({
  initialItems,
  periods,
  initialSapInvoices,
}: {
  initialItems: any[]
  periods: any[]
  initialSapInvoices: any[]
}) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isActualsDialogOpen, setIsActualsDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [globalRate, setGlobalRate] = useState<string>('15000')
  const [isFetchingGlobalRate, setIsFetchingGlobalRate] = useState(false)
  const [isFetchingActualRate, setIsFetchingActualRate] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods.length > 0 ? periods[0].id.toString() : ''
  )
  const [customerFilter, setCustomerFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'forecast' | 'sap'>('forecast')
  const [sapInvoices, setSapInvoices] = useState(initialSapInvoices)
  const [isLoadingSap, setIsLoadingSap] = useState(false)
  const [sapSearch, setSapSearch] = useState('')
  const [sapCustomerFilter, setSapCustomerFilter] = useState('')
  const [sapSalesmanFilter, setSapSalesmanFilter] = useState('')

  const searchParams = useSearchParams()
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (autoOpenedRef.current) return
    const valueNonVat = searchParams.get('valueNonVat')
    const poNumber = searchParams.get('poNumber')
    const customer = searchParams.get('customer')
    const category = searchParams.get('category') || 'outstanding'
    if (!valueNonVat) return
    autoOpenedRef.current = true
    const today = new Date().toISOString().split('T')[0]
    const catKey = category.toLowerCase()
    const prefix = ['outstanding', 'service', 'repair', 'retread'].includes(catKey) ? catKey : 'outstanding'
    const idrKey = `${prefix}AmountIdr`
    const remarkKey = `${prefix}Remark`
    setActualsForm((prev) => ({
      ...prev,
      updateDate: today,
      [idrKey]: valueNonVat,
      [remarkKey]: poNumber || '',
      customer: customer || '',
      periodId: periods.length > 0 ? periods[0].id.toString() : '',
    }))
    setIsActualsDialogOpen(true)
  }, [searchParams, periods])

  const filteredItems = React.useMemo(() => {
    return initialItems.filter((wrapper) => {
      if (wrapper.period.id.toString() !== selectedPeriodId) return false
      const query = customerFilter.trim().toLowerCase()
      if (
        query &&
        !wrapper.item.customer.toLowerCase().includes(query) &&
        !wrapper.actuals?.some((actual: any) => actual.invoiceNumber?.toLowerCase().includes(query))
      ) return false
      return true
    })
  }, [initialItems, selectedPeriodId, customerFilter])

  useEffect(() => {
    const saved = localStorage.getItem('daily_usd_rate')
    if (saved) setGlobalRate(saved)
  }, [])

  useEffect(() => {
    const period = periods.find((p) => p.id.toString() === selectedPeriodId)
    if (!period) return
    setIsLoadingSap(true)
    getSapInvoices(period.monthYear)
      .then(setSapInvoices)
      .finally(() => setIsLoadingSap(false))
  }, [selectedPeriodId, periods])

  const handleFetchGlobalRate = async () => {
    setIsFetchingGlobalRate(true)
    try {
      const result = await getRealtimeExchangeRate()
      if (result.success && result.rate) {
        setGlobalRate(result.rate.toString())
        toast.success('Realtime rate fetched: ' + result.rate)
      } else {
        toast.error(result.error || 'Failed to fetch API')
      }
    } catch (_error) {
      toast.error('Failed to fetch API')
    } finally {
      setIsFetchingGlobalRate(false)
    }
  }

  const handleSaveGlobalRate = () => {
    localStorage.setItem('daily_usd_rate', globalRate)
    toast.success('Rate saved locally')
  }

  const [statusForm, setStatusForm] = useState({ status: '', remark: '' })
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const CATEGORIES = ['Outstanding', 'Repair', 'Service', 'Retread'] as const
  type Category = (typeof CATEGORIES)[number]

  const normalizeStatusDoc = (status?: string | null) => {
    if (status === 'Complete') return 'Invoice'
    if (status === 'Pending') return 'Waiting PO'
    return status || '-'
  }

  const formatStatusDoc = (status?: string | null, poNumber?: string | null) => {
    const normalized = normalizeStatusDoc(status)
    const po = (poNumber || '').trim()
    return ['PO Release', 'Invoice'].includes(normalized) && po ? `${normalized} / ${po}` : normalized
  }

  const isCancelStatusDoc = (status?: string | null) =>
    (status || '').trim().toLowerCase() === 'cancel'

  const [actualsForm, setActualsForm] = useState({
    updateDate: new Date().toISOString().split('T')[0],
    exchangeRate: '15000',
    outstandingAmountIdr: '0',
    outstandingAmountUsd: '0',
    outstandingRemark: '',
    outstandingStatus: '-',
    outstandingSection: '-',
    outstandingPoNumber: '',
    repairAmountIdr: '0',
    repairAmountUsd: '0',
    repairRemark: '',
    repairStatus: '-',
    repairPoNumber: '',
    serviceAmountIdr: '0',
    serviceAmountUsd: '0',
    serviceRemark: '',
    serviceStatus: '-',
    servicePoNumber: '',
    retreadAmountIdr: '0',
    retreadAmountUsd: '0',
    retreadRemark: '',
    retreadStatus: '-',
    retreadPoNumber: '',
    customer: '',
    periodId: '',
  })

  const [editingActualIds, setEditingActualIds] = useState<Record<string, number | null>>({
    Outstanding: null,
    Repair: null,
    Service: null,
    Retread: null,
  })

  type SortField = 'picSales' | 'customer' | 'forecast' | 'actual' | 'sisa'
  type SortOrder = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField | null>('picSales')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleExpand = (id: number) => {
    const next = new Set(expandedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedItems(next)
  }

  const handleUpdateStatus = async () => {
    if (!selectedItem || !statusForm.status) return
    try {
      await updateForecastItemStatus(selectedItem.item.id, statusForm.status, statusForm.remark)
      toast.success('Status updated')
      setIsStatusDialogOpen(false)
      window.location.reload()
    } catch (e) {
      toast.error('Failed to update status')
    }
  }

  const handleAmountIdrChange = (cat: Category, val: string) => {
    const idrKey = `${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm
    const usdKey = `${cat.toLowerCase()}AmountUsd` as keyof typeof actualsForm
    const amountIdr = Number(val)
    const rate = Number(actualsForm.exchangeRate) || 15000
    const amountUsd = rate && amountIdr > 0 ? (amountIdr / rate).toFixed(2) : '0'
    setActualsForm({ ...actualsForm, [idrKey]: val, [usdKey]: amountUsd })
  }

  const handleActualRateChange = (val: string) => {
    const rate = Number(val) || 0
    const next: any = { ...actualsForm, exchangeRate: val }
    if (rate) {
      for (const cat of CATEGORIES) {
        const idrKey = `${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm
        const usdKey = `${cat.toLowerCase()}AmountUsd` as keyof typeof actualsForm
        const idr = Number(actualsForm[idrKey])
        if (idr > 0) next[usdKey] = (idr / rate).toFixed(2)
      }
    }
    setActualsForm(next)
  }

  const handleFetchActualRate = async () => {
    setIsFetchingActualRate(true)
    try {
      const result = await getRealtimeExchangeRate()
      if (result.success && result.rate) {
        const rate = result.rate.toString()
        setActualsForm((prev) => {
          const amountIdr = Number(prev.amountIdr)
          return {
            ...prev,
            exchangeRate: rate,
            amountUsd: amountIdr > 0 ? (amountIdr / Number(rate)).toFixed(2) : prev.amountUsd,
          }
        })
        toast.success('Kurs API terbaru: ' + result.rate)
      } else {
        toast.error(result.error || 'Failed to fetch API')
      }
    } catch (_error) {
      toast.error('Failed to fetch API')
    } finally {
      setIsFetchingActualRate(false)
    }
  }

  const hasData = (cat: Category) => {
    const idrKey = `${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm
    return Number(actualsForm[idrKey]) > 0
  }

  const handleSaveActuals = async () => {
    if (!actualsForm.updateDate) return
    if (!selectedItem && (!actualsForm.customer || !actualsForm.periodId)) {
      toast.error('Customer dan period wajib diisi')
      return
    }
    try {
      const itemId = selectedItem ? selectedItem.item.id : null
      const periodId = selectedItem ? selectedItem.period.id : Number(actualsForm.periodId)
      const cust = selectedItem ? selectedItem.item.customer : actualsForm.customer
      const basePayload = {
        updateDate: new Date(actualsForm.updateDate),
        jobCode: '',
        invoiceNumber: '',
        exchangeRate: actualsForm.exchangeRate,
        createdById: undefined,
      }

      for (const cat of CATEGORIES) {
        const idrKey = `${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm
        const usdKey = `${cat.toLowerCase()}AmountUsd` as keyof typeof actualsForm
        const remarkKey = `${cat.toLowerCase()}Remark` as keyof typeof actualsForm
        const statusKey = `${cat.toLowerCase()}Status` as keyof typeof actualsForm
        const sectionKey = `${cat.toLowerCase()}Section` as keyof typeof actualsForm
        const poKey = `${cat.toLowerCase()}PoNumber` as keyof typeof actualsForm
        const existingId = editingActualIds[cat]
        const amtIdr = Number(actualsForm[idrKey])
        const itemStatus = normalizeStatusDoc(String(actualsForm[statusKey] || '-'))
        const poNumber = ['PO Release', 'Invoice'].includes(itemStatus)
          ? String(actualsForm[poKey] || '').trim()
          : ''
        const hasPayload =
          amtIdr > 0 ||
          String(actualsForm[remarkKey] || '').trim().length > 0 ||
          itemStatus !== '-' ||
          String(actualsForm[sectionKey] || '-') !== '-' ||
          poNumber.length > 0

        if (existingId && !hasPayload) {
          await deleteForecastActual(existingId)
        } else if (existingId && hasPayload) {
          await updateForecastActual(existingId, {
            ...basePayload,
            jobCode: cat === 'Outstanding' ? actualsForm[sectionKey] : '',
            invoiceNumber: poNumber,
            amountIdr: actualsForm[idrKey],
            amountUsd: actualsForm[usdKey],
            remark: actualsForm[remarkKey],
            itemStatus,
            category: cat,
            forecastItemId: itemId,
            periodId,
            customer: cust,
          })
        } else if (!existingId && hasPayload) {
          await addForecastActual({
            ...basePayload,
            jobCode: cat === 'Outstanding' ? actualsForm[sectionKey] : '',
            invoiceNumber: poNumber,
            amountIdr: actualsForm[idrKey],
            amountUsd: actualsForm[usdKey],
            remark: actualsForm[remarkKey],
            itemStatus,
            category: cat,
            forecastItemId: itemId,
            periodId,
            customer: cust,
          })
        }
      }

      toast.success('Actuals saved and remaining recalculated')
      setIsActualsDialogOpen(false)
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save actuals')
    }
  }

  const handleDeleteActual = async (actualId: number) => {
    if (!confirm('Are you sure you want to delete this SAP Actual?')) return
    try {
      await deleteForecastActual(actualId)
      toast.success('Actual deleted and remaining recalculated')
      window.location.reload()
    } catch (e) {
      toast.error('Failed to delete actual')
    }
  }

  const openStatusDialog = (item: any) => {
    setSelectedItem(item)
    setStatusForm({ status: item.item.status, remark: item.item.remark || '' })
    setIsStatusDialogOpen(true)
  }

  const openActualsDialog = (item: any, editDateKey?: string) => {
    setSelectedItem(item)
    const existingActuals = editDateKey
      ? (item?.actuals || []).filter((a: any) => {
          const dateKey = new Date(a.updateDate).toISOString().split('T')[0]
          return dateKey === editDateKey
        })
      : []
    const getActual = (cat: Category) => existingActuals.find((a: any) => a.category === cat)

    const ids: Record<string, number | null> = {}
    const form: any = {
      updateDate: editDateKey || new Date().toISOString().split('T')[0],
      exchangeRate: globalRate,
      customer: '',
      periodId: item?.period.id?.toString() || (periods.length > 0 ? periods[0].id.toString() : ''),
    }
    for (const cat of CATEGORIES) {
      const a = getActual(cat)
      ids[cat] = a?.id || null
      form[`${cat.toLowerCase()}AmountIdr`] = a?.amountIdr?.toString() || '0'
      form[`${cat.toLowerCase()}AmountUsd`] = a?.amountUsd?.toString() || '0'
      form[`${cat.toLowerCase()}Remark`] = a?.remark || ''
      form[`${cat.toLowerCase()}Status`] = normalizeStatusDoc(a?.itemStatus || '-')
      form[`${cat.toLowerCase()}PoNumber`] = a?.invoiceNumber || ''
      if (cat === 'Outstanding') form.outstandingSection = a?.jobCode || '-'
    }

    setEditingActualIds(ids)
    setActualsForm(form)
    void handleFetchActualRate()
    setIsActualsDialogOpen(true)
  }

  let totalForecast = 0
  let totalActual = 0
  let totalRemaining = 0

  // ponytail: scorecards skip carry-over (moved to next month)
  filteredItems.forEach((wrapper: any) => {
    if (isCarryOverItem(wrapper.item)) return
    const forecastIdr = getForecastAmountIdr(wrapper.item)
    const actualIdr = wrapper.actuals
      ? wrapper.actuals.reduce(
          (sum: number, a: any) =>
            isCancelStatusDoc(a.itemStatus) ? sum : sum + Number(a.amountIdr),
          0
        )
      : 0

    totalForecast += forecastIdr
    totalRemaining += forecastIdr - actualIdr
    totalActual += actualIdr
  })

  const getForecastActual = (wrapper: any) => {
    const forecast = getForecastAmountIdr(wrapper.item)
    const actual = wrapper.actuals
      ? wrapper.actuals.reduce(
          (sum: number, a: any) =>
            isCancelStatusDoc(a.itemStatus) ? sum : sum + Number(a.amountIdr),
          0
        )
      : 0
    return { forecast, actual }
  }

  const getSortValue = (wrapper: any, field: SortField) => {
    const { forecast, actual } = getForecastActual(wrapper)
    if (field === 'picSales') return (wrapper.item.picSales || '').toLowerCase()
    if (field === 'customer') return wrapper.item.customer.toLowerCase()
    if (field === 'forecast') return forecast
    if (field === 'sisa') return forecast - actual
    if (field === 'actual') return actual
    return 0
  }

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0
    const valA = getSortValue(a, sortField)
    const valB = getSortValue(b, sortField)

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // SAP Invoice computed values
  const sapCustomerOptions = useMemo(() => {
    const names = Array.from(new Set(sapInvoices.map((r: any) => r.customerName).filter(Boolean)))
    return names.sort()
  }, [sapInvoices])

  const sapSalesmanOptions = useMemo(() => {
    const names = Array.from(new Set(sapInvoices.map((r: any) => r.salesman).filter(Boolean)))
    return names.sort()
  }, [sapInvoices])

  const sapFiltered = useMemo(() => {
    return sapInvoices.filter((r: any) => {
      if (sapSearch) {
        const q = sapSearch.toLowerCase()
        if (
          !r.billingNo?.toLowerCase().includes(q) &&
          !r.materialNo?.toLowerCase().includes(q) &&
          !r.customerName?.toLowerCase().includes(q) &&
          !r.poNo?.toLowerCase().includes(q)
        )
          return false
      }
      if (
        sapCustomerFilter &&
        sapCustomerFilter !== '__all__' &&
        r.customerName !== sapCustomerFilter
      )
        return false
      if (sapSalesmanFilter && sapSalesmanFilter !== '__all__' && r.salesman !== sapSalesmanFilter)
        return false
      return true
    })
  }, [sapInvoices, sapSearch, sapCustomerFilter, sapSalesmanFilter])

  const sapTotalUsd = useMemo(() => {
    return sapFiltered.reduce((s: number, r: any) => s + (Number(r.revenueUsd) || 0), 0)
  }, [sapFiltered])

  const sapTotalIdr = useMemo(() => {
    return sapFiltered.reduce((s: number, r: any) => s + (Number(r.revenueIdr) || 0), 0)
  }, [sapFiltered])

  const handleExportSapExcel = () => {
    const headers = [
      'No',
      'Billing Date',
      'Billing No',
      'Customer',
      'Customer Name',
      'Material No',
      'Material Desc',
      'Qty',
      'UOM',
      'Revenue IDR',
      'Revenue USD',
      'Rev Type',
      'Salesman',
      'PO No',
    ]
    const rows = sapFiltered.map((r: any, i: number) => [
      i + 1,
      r.billingDate,
      r.billingNo,
      r.customer,
      r.customerName,
      r.materialNo,
      r.materialDesc,
      r.qty,
      r.uom,
      r.revenueIdr,
      r.revenueUsd,
      r.revType,
      r.salesman,
      r.poNo,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `sap-invoices-${periods.find((p) => p.id.toString() === selectedPeriodId)?.monthYear || 'export'}.csv`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const fmtIdr = (v: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(v)
  const fmtUsd = (v: number) =>
    '$' +
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Daily Update</h2>
          <div className="w-[180px]">
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.monthYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search customer / No PO..."
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-9 w-[200px]"
          />
        </div>
        <div className="bg-muted/30 flex items-center gap-3 rounded-md border p-2 px-3">
          <Label className="text-xs whitespace-nowrap">Kurs USD (View Only)</Label>
          <Input
            type="number"
            className="bg-background h-8 w-24 text-xs"
            value={globalRate}
            onChange={(e) => setGlobalRate(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleFetchGlobalRate}
            disabled={isFetchingGlobalRate}
          >
            <RefreshCw className="mr-1 h-3 w-3" /> {isFetchingGlobalRate ? 'Fetching' : 'Fetch'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSaveGlobalRate}
          >
            Save
          </Button>
          <div className="bg-border mx-2 h-6 w-px"></div>
          <Button
            onClick={() => openActualsDialog(null)}
            variant="secondary"
            size="sm"
            className="h-8"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Unplanned SAP Actual
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Forecast
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span>{formatCurrency(totalForecast)}</span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-blue-600">
                $
                {(totalForecast / (Number(globalRate) || 15000)).toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Document Completed
            </CardTitle>
            <Banknote className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
                <span className="text-green-600">{formatCurrency(totalActual)}</span>
                <span className="text-muted-foreground text-xl font-light">|</span>
                <span className="text-emerald-600">
                  $
                  {(totalActual / (Number(globalRate) || 15000)).toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              {totalForecast > 0 && (
                <div className="flex flex-col items-end">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                    <Trophy className="h-3 w-3 text-blue-500" />
                    Achiev.
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-100 px-2 py-1 text-sm font-bold text-blue-700">
                    {((totalActual / totalForecast) * 100).toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Revenue SAP</CardTitle>
            <TableProperties className="h-6 w-6 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span className="text-sky-700">{formatCurrency(sapTotalIdr)}</span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-blue-600">{fmtUsd(sapTotalUsd)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Sisa (Remaining)
            </CardTitle>
            <Wallet className="h-6 w-6 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span className="text-orange-600">{formatCurrency(totalRemaining)}</span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-amber-600">
                $
                {(totalRemaining / (Number(globalRate) || 15000)).toLocaleString('en-US', {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 flex w-fit gap-1 rounded-md border p-1">
        <button
          className={`rounded-sm px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'forecast' ? 'bg-background shadow-sm' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTab('forecast')}
        >
          Forecast & Actuals
        </button>
        <button
          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'sap' ? 'bg-background shadow-sm' : 'hover:bg-muted/50'}`}
          onClick={() => setActiveTab('sap')}
        >
          <TableProperties className="h-4 w-4" />
          Detail Invoice Central Service SAP
        </button>
      </div>

      {activeTab === 'forecast' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[40px]">No.</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center">
                        Customer <ArrowUpDown className="text-muted-foreground ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleSort('picSales')}
                    >
                      <div className="flex items-center">
                        Sales <ArrowUpDown className="text-muted-foreground ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead
                      className="hover:bg-muted/50 cursor-pointer text-right transition-colors"
                      onClick={() => handleSort('forecast')}
                    >
                      <div className="flex items-center justify-end">
                        Forecast <ArrowUpDown className="text-muted-foreground ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">O/S Prev Month</TableHead>
                    <TableHead
                      className="hover:bg-muted/50 cursor-pointer text-right transition-colors"
                      onClick={() => handleSort('actual')}
                    >
                      <div className="flex items-center justify-end">
                        Actual <ArrowUpDown className="text-muted-foreground ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="hover:bg-muted/50 cursor-pointer text-right transition-colors"
                      onClick={() => handleSort('sisa')}
                    >
                      <div className="flex items-center justify-end">
                        Sisa <ArrowUpDown className="text-muted-foreground ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Status Forecast</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="py-8 text-center">
                        No pending items.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedItems.map((wrapper: any, index: number) => (
                      <React.Fragment key={wrapper.item.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(wrapper.item.id)}
                            >
                              {expandedItems.has(wrapper.item.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{wrapper.period.monthYear}</TableCell>
                          <TableCell>
                            <div className="font-bold">{wrapper.item.customer}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{wrapper.item.picSales}</div>
                          </TableCell>
                          <TableCell>
                            {wrapper.item.isProductAccessories ? 'Accessories' : 'Core Services'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(getForecastActual(wrapper).forecast)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right">
                            {formatCurrency(Number(wrapper.item.osInvoicePrevMonth || 0))}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(getForecastActual(wrapper).actual)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            {formatCurrency(
                              getForecastActual(wrapper).forecast -
                                getForecastActual(wrapper).actual
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                              {wrapper.item.status === 'Waiting' ? 'Pending' : wrapper.item.status}
                            </span>
                          </TableCell>
                          <TableCell>{wrapper.item.remark}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStatusDialog(wrapper)}
                              >
                                <RefreshCw className="mr-1 h-4 w-4" /> Status Forecast
                              </Button>
                              <Button size="sm" onClick={() => openActualsDialog(wrapper)}>
                                <FileText className="mr-1 h-4 w-4" /> SAP Actual
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedItems.has(wrapper.item.id) && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={13} className="border-b p-0">
                              <div className="p-4">
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                  <Banknote className="text-primary h-4 w-4" /> SAP Actuals Progress
                                </h4>
                                {wrapper.actuals && wrapper.actuals.length > 0 ? (
                                  <div className="space-y-2">
                                    {(() => {
                                      const byDate: Record<
                                        string,
                                        { items: any[]; label: string; ts: number }
                                      > = {}
                                      wrapper.actuals.forEach((a: any) => {
                                        const d = new Date(a.updateDate)
                                        const key = d.toISOString().split('T')[0]
                                        if (!byDate[key])
                                          byDate[key] = {
                                            items: [],
                                            label: d.toLocaleDateString('id-ID'),
                                            ts: d.getTime(),
                                          }
                                        byDate[key].items.push(a)
                                      })
                                      return Object.entries(byDate)
                                        .sort(([, a], [, b]) => b.ts - a.ts)
                                        .map(([dateKey, { items, label: dateLabel }]) => {
                                          const getCat = (cat: string) => {
                                            const c = items.filter((a: any) => a.category === cat)
                                            const sumIdr = c.reduce(
                                              (s: number, a: any) => s + Number(a.amountIdr),
                                              0
                                            )
                                            const sumUsd = c.reduce(
                                              (s: number, a: any) => s + Number(a.amountUsd),
                                              0
                                            )
                                            const rmk = c
                                              .map((a: any) => a.remark)
                                              .filter(Boolean)
                                              .join(', ')
                                            const section =
                                              c.map((a: any) => a.jobCode).find(Boolean) || '—'
                                            const status =
                                              c
                                                .map((a: any) => a.itemStatus)
                                                .find((value: string) => value && value !== '-') ||
                                              '—'
                                            const poNumber =
                                              c.map((a: any) => a.invoiceNumber).find(Boolean) || ''
                                            return {
                                              sumIdr,
                                              sumUsd,
                                              rmk,
                                              section,
                                              status,
                                              poNumber,
                                              hasData: c.length > 0,
                                            }
                                          }
                                          const os = getCat('Outstanding'),
                                            s = getCat('Service'),
                                            r = getCat('Repair'),
                                            rt = getCat('Retread')
                                          const totalIdr = items.reduce(
                                            (s: number, a: any) => s + Number(a.amountIdr),
                                            0
                                          )
                                          const totalUsd = items.reduce(
                                            (s: number, a: any) => s + Number(a.amountUsd),
                                            0
                                          )
                                          const renderActualMeta = (entry: {
                                            hasData: boolean
                                            section: string
                                            status: string
                                            poNumber: string
                                          }) =>
                                            entry.hasData ? (
                                              <div className="flex flex-wrap gap-1 pt-1">
                                                <Badge
                                                  variant="secondary"
                                                  className="px-1.5 py-0 text-[10px]"
                                                >
                                                  {entry.section}
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="px-1.5 py-0 text-[10px]"
                                                >
                                                  {formatStatusDoc(entry.status, entry.poNumber)}
                                                </Badge>
                                              </div>
                                            ) : null
                                          return (
                                            <div
                                              key={dateLabel}
                                              className="bg-background w-full rounded-md border"
                                            >
                                              <div className="bg-muted/20 text-muted-foreground border-b px-4 py-1.5 text-xs font-semibold">
                                                {dateLabel}
                                              </div>
                                              <div className="w-full">
                                                <div className="text-muted-foreground bg-muted/5 grid grid-cols-5 gap-0 border-b text-[11px] font-semibold tracking-wider uppercase">
                                                  <div className="border-r py-2 text-center">
                                                    Outstanding
                                                  </div>
                                                  <div className="border-r py-2 text-center">
                                                    Service
                                                  </div>
                                                  <div className="border-r py-2 text-center">
                                                    Repair
                                                  </div>
                                                  <div className="border-r py-2 text-center">
                                                    Retread
                                                  </div>
                                                  <div className="py-2 text-center">Total</div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-0 divide-x text-xs">
                                                  <div
                                                    className={`space-y-1 p-2 ${!os.hasData ? 'opacity-40' : ''}`}
                                                  >
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-medium text-green-600">
                                                        {os.hasData
                                                          ? formatCurrency(os.sumIdr)
                                                          : '—'}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-blue-600">
                                                        $
                                                        {os.hasData
                                                          ? os.sumUsd.toLocaleString('en-US', {
                                                              maximumFractionDigits: 2,
                                                            })
                                                          : '—'}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-primary">
                                                        {os.hasData ? os.section : '—'}
                                                      </span>
                                                    </div>
                                                    <div className="text-muted-foreground truncate">
                                                      {os.rmk || '—'}
                                                    </div>
                                                    {renderActualMeta(os)}
                                                  </div>
                                                  <div
                                                    className={`space-y-1 p-2 ${!s.hasData ? 'opacity-40' : ''}`}
                                                  >
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-medium text-green-600">
                                                        {s.hasData ? formatCurrency(s.sumIdr) : '—'}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-blue-600">
                                                        $
                                                        {s.hasData
                                                          ? s.sumUsd.toLocaleString('en-US', {
                                                              maximumFractionDigits: 2,
                                                            })
                                                          : '—'}
                                                      </span>
                                                    </div>
                                                    <div className="text-muted-foreground truncate">
                                                      {s.rmk || '—'}
                                                    </div>
                                                    {renderActualMeta(s)}
                                                  </div>
                                                  <div
                                                    className={`space-y-1 p-2 ${!r.hasData ? 'opacity-40' : ''}`}
                                                  >
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-medium text-green-600">
                                                        {r.hasData ? formatCurrency(r.sumIdr) : '—'}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-blue-600">
                                                        $
                                                        {r.hasData
                                                          ? r.sumUsd.toLocaleString('en-US', {
                                                              maximumFractionDigits: 2,
                                                            })
                                                          : '—'}
                                                      </span>
                                                    </div>
                                                    <div className="text-muted-foreground truncate">
                                                      {r.rmk || '—'}
                                                    </div>
                                                    {renderActualMeta(r)}
                                                  </div>
                                                  <div
                                                    className={`space-y-1 p-2 ${!rt.hasData ? 'opacity-40' : ''}`}
                                                  >
                                                    <div className="flex items-center gap-1">
                                                      <span className="font-medium text-green-600">
                                                        {rt.hasData
                                                          ? formatCurrency(rt.sumIdr)
                                                          : '—'}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-blue-600">
                                                        $
                                                        {rt.hasData
                                                          ? rt.sumUsd.toLocaleString('en-US', {
                                                              maximumFractionDigits: 2,
                                                            })
                                                          : '—'}
                                                      </span>
                                                    </div>
                                                    <div className="text-muted-foreground truncate">
                                                      {rt.rmk || '—'}
                                                    </div>
                                                    {renderActualMeta(rt)}
                                                  </div>
                                                  <div className="bg-primary/5 p-2 font-bold">
                                                    <div className="mb-1 flex items-center gap-1 text-xs">
                                                      <span className="text-green-600">
                                                        {formatCurrency(totalIdr)}
                                                      </span>
                                                      <span className="text-muted-foreground">
                                                        |
                                                      </span>
                                                      <span className="text-blue-600">
                                                        $
                                                        {totalUsd.toLocaleString('en-US', {
                                                          maximumFractionDigits: 2,
                                                        })}
                                                      </span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px]"
                                                        onClick={() =>
                                                          openActualsDialog(wrapper, dateKey)
                                                        }
                                                      >
                                                        Edit
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        onClick={async () => {
                                                          if (
                                                            !confirm("Delete this date's actuals?")
                                                          )
                                                            return
                                                          for (const a of items)
                                                            await deleteForecastActual(a.id)
                                                          window.location.reload()
                                                        }}
                                                      >
                                                        Delete
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        })
                                    })()}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground py-2 text-sm italic">
                                    No actuals recorded yet.
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="bg-muted/20 flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-sm font-semibold">DATA VALIDASI SALES REVENUE SAP</h3>
                <p className="text-muted-foreground text-xs">
                  {sapFiltered.length} records | Rev Type: Repair, Service, Retread Job
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Total Revenue USD:</span>
                <span className="text-sm font-bold">{fmtUsd(sapTotalUsd)}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b p-4">
              <Input
                placeholder="Search billing, material, No PO..."
                className="h-8 w-[200px] text-xs"
                value={sapSearch}
                onChange={(e) => setSapSearch(e.target.value)}
              />
              <Select value={sapCustomerFilter} onValueChange={setSapCustomerFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="Filter: Customer Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Customers</SelectItem>
                  {sapCustomerOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sapSalesmanFilter} onValueChange={setSapSalesmanFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="Filter: Salesman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Salesmen</SelectItem>
                  {sapSalesmanOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleExportSapExcel}
              >
                <Download className="mr-1 h-3 w-3" />
                Export Excel
              </Button>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-600 hover:bg-blue-600">
                    <TableHead className="w-[30px] text-xs font-bold text-white">No</TableHead>
                    <TableHead className="text-xs font-bold text-white">Billing Date</TableHead>
                    <TableHead className="text-xs font-bold text-white">Billing No</TableHead>
                    <TableHead className="text-xs font-bold text-white">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-white">Customer Name</TableHead>
                    <TableHead className="text-xs font-bold text-white">Material No</TableHead>
                    <TableHead className="text-xs font-bold text-white">Material Desc</TableHead>
                    <TableHead className="text-right text-xs font-bold text-white">Qty</TableHead>
                    <TableHead className="text-xs font-bold text-white">UOM</TableHead>
                    <TableHead className="text-right text-xs font-bold text-white">
                      Revenue IDR
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-white">
                      Revenue USD
                    </TableHead>
                    <TableHead className="text-xs font-bold text-white">Rev Type</TableHead>
                    <TableHead className="text-xs font-bold text-white">Salesman</TableHead>
                    <TableHead className="text-xs font-bold text-white">PO No</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sapFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-muted-foreground py-8 text-center">
                        {isLoadingSap
                          ? 'Loading SAP data...'
                          : 'No SAP invoice data for this period'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sapFiltered.map((row, i) => (
                      <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs">{row.billingDate}</TableCell>
                        <TableCell className="text-xs font-medium">{row.billingNo}</TableCell>
                        <TableCell className="text-xs">{row.customer}</TableCell>
                        <TableCell className="text-xs font-medium">{row.customerName}</TableCell>
                        <TableCell className="text-xs">{row.materialNo}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs"
                          title={row.materialDesc}
                        >
                          {row.materialDesc}
                        </TableCell>
                        <TableCell className="text-right text-xs">{row.qty}</TableCell>
                        <TableCell className="text-xs">{row.uom}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-green-700">
                          {fmtIdr(row.revenueIdr)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold">
                          {fmtUsd(row.revenueUsd)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              row.revType.toLowerCase().includes('repair')
                                ? 'bg-amber-100 text-amber-700'
                                : row.revType.toLowerCase().includes('service')
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {row.revType}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{row.salesman}</TableCell>
                        <TableCell className="text-xs">{row.poNo}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status Forecast for {selectedItem?.item.customer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status Forecast</Label>
              <Select
                value={statusForm.status}
                onValueChange={(val) => setStatusForm({ ...statusForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status Forecast" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Carry Over">Carry Over</SelectItem>
                  <SelectItem value="Cancel">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remark</Label>
              <Input
                value={statusForm.remark}
                onChange={(e) => setStatusForm({ ...statusForm, remark: e.target.value })}
                placeholder="e.g. Waiting PO, Done PO"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SAP Actuals Input Dialog */}
      <Dialog open={isActualsDialogOpen} onOpenChange={setIsActualsDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? `SAP Actual - ${selectedItem.item.customer}` : 'Unplanned SAP Actual'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-2">
            {!selectedItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    value={actualsForm.customer}
                    onChange={(e) => setActualsForm({ ...actualsForm, customer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={actualsForm.periodId}
                    onValueChange={(val) => setActualsForm({ ...actualsForm, periodId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.monthYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={actualsForm.updateDate}
                onChange={(e) => setActualsForm({ ...actualsForm, updateDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Kurs USD API / Manual</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={actualsForm.exchangeRate}
                  onChange={(e) => handleActualRateChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchActualRate}
                  disabled={isFetchingActualRate}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isFetchingActualRate ? 'Fetching' : 'API'}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                USD tersimpan mengikuti kurs saat submit. Edit manual jika kurs SAP berbeda.
              </p>
            </div>

            {CATEGORIES.map((cat) => {
              const idrKey = `${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm
              const usdKey = `${cat.toLowerCase()}AmountUsd` as keyof typeof actualsForm
              const remarkKey = `${cat.toLowerCase()}Remark` as keyof typeof actualsForm
              const statusKey = `${cat.toLowerCase()}Status` as keyof typeof actualsForm
              const sectionKey = `${cat.toLowerCase()}Section` as keyof typeof actualsForm
              const poKey = `${cat.toLowerCase()}PoNumber` as keyof typeof actualsForm
              const selectedStatus = normalizeStatusDoc(String(actualsForm[statusKey] || '-'))
              return (
                <div key={cat} className="bg-muted/10 rounded-md border p-3">
                  <h4 className="mb-2 text-sm font-semibold">{cat}</h4>
                  <div className="mb-2 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">IDR</Label>
                      <Input
                        type="number"
                        value={actualsForm[idrKey]}
                        onChange={(e) => handleAmountIdrChange(cat, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">USD</Label>
                      <Input
                        type="number"
                        value={actualsForm[usdKey]}
                        onChange={(e) =>
                          setActualsForm({ ...actualsForm, [usdKey]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div
                    className={`grid gap-3 ${cat === 'Outstanding' ? 'grid-cols-3' : 'grid-cols-2'}`}
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Remark</Label>
                      <Input
                        value={actualsForm[remarkKey]}
                        onChange={(e) =>
                          setActualsForm({ ...actualsForm, [remarkKey]: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status Doc</Label>
                      <Select
                        value={selectedStatus}
                        onValueChange={(v) =>
                          setActualsForm({
                            ...actualsForm,
                            [statusKey]: v,
                            [poKey]: ['PO Release', 'Invoice'].includes(v)
                              ? actualsForm[poKey]
                              : '',
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PO Release">PO Release</SelectItem>
                          <SelectItem value="Waiting PO">Waiting PO</SelectItem>
                          <SelectItem value="Invoice">Invoice</SelectItem>
                          <SelectItem value="Cancel">Cancel</SelectItem>
                          <SelectItem value="-">-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {cat === 'Outstanding' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Section</Label>
                        <Select
                          value={actualsForm[sectionKey]}
                          onValueChange={(v) => setActualsForm({ ...actualsForm, [sectionKey]: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">-</SelectItem>
                            <SelectItem value="Repair">Repair</SelectItem>
                            <SelectItem value="Retread">Retread</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {['PO Release', 'Invoice'].includes(selectedStatus) && (
                    <div className="mt-3 space-y-1">
                      <Label className="text-xs">No PO</Label>
                      <Input
                        value={actualsForm[poKey]}
                        onChange={(e) =>
                          setActualsForm({ ...actualsForm, [poKey]: e.target.value })
                        }
                        placeholder="No PO"
                      />
                    </div>
                  )}
                </div>
              )
            })}

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="flex gap-4">
                  <span className="text-primary">
                    {formatCurrency(
                      CATEGORIES.reduce(
                        (s, cat) =>
                          s +
                          Number(
                            actualsForm[`${cat.toLowerCase()}AmountIdr` as keyof typeof actualsForm]
                          ),
                        0
                      )
                    )}
                  </span>
                  <span className="text-blue-600">
                    $
                    {CATEGORIES.reduce(
                      (s, cat) =>
                        s +
                        Number(
                          actualsForm[`${cat.toLowerCase()}AmountUsd` as keyof typeof actualsForm]
                        ),
                      0
                    ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button onClick={handleSaveActuals}>Save Actuals</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
