'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  updateForecastItemStatus,
  addForecastActual,
  updateForecastActual,
  deleteForecastActual,
  upsertForecastItem,
  getSapInvoices,
} from '@/app/actions/central-service-forecast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// ponytail: removed Badge (Radix Slot) — replaced with plain spans to fix infinite setRef loop
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Banknote,
  Search,
  Plus,
  Trash2,
  Edit,
  Edit2,
  ChevronDown,
  ChevronUp,
  Target,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Settings2,
  FileSignature,
} from 'lucide-react'

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

const formatUsd = (val: number) => {
  return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val)
}

const formatSisaCurrency = (val: number) => {
  if (val < 0) {
    const absVal = Math.abs(val)
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(absVal)
    return `+${formatted}`
  }
  return formatCurrency(val)
}

const formatDateDisplay = (val: any) => {
  if (!val) return 'No Date'
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    return val.split('T')[0]
  }
  return String(val)
}

const getForecastAmountIdr = (item: any) => {
  if (item.isProductAccessories) return Number(item.accessoriesAmountIdr || 0)
  return (
    Number(item.osInvoicePrevMonth || 0) +
    Number(item.repairForecast || 0) +
    Number(item.retreadForecast || 0) +
    Number(item.serviceForecast || 0)
  )
}

const isCarryOverItem = (item: any) =>
  (item?.status || '').trim().toLowerCase() === 'carry over'

const normalizeStatusDoc = (status?: string | null) => {
  if (!status) return '-'
  const s = status.trim()
  if (s === 'Complete' || s === 'Done') return 'Invoice'
  if (s === 'Pending' || s === 'Waiting') return 'Waiting PO'
  return s || '-'
}

const formatStatusDoc = (status?: string | null, poNumber?: string | null) => {
  const normalized = normalizeStatusDoc(status)
  const po = (poNumber || '').trim()
  return ['PO Release', 'Invoice'].includes(normalized) && po ? `${normalized} / ${po}` : normalized
}

export function MobileDailyClientPage({
  initialItems,
  periods,
  initialSapInvoices,
}: {
  initialItems: any[]
  periods: any[]
  initialSapInvoices: any[]
}) {
  const [items, setItems] = useState(initialItems)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods[0]?.id ? String(periods[0].id) : ''
  )
  const [sapInvoices, setSapInvoices] = useState(initialSapInvoices)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})

  // Actual Form Modal State
  const [actualModalOpen, setActualModalOpen] = useState(false)
  const [editingActual, setEditingActual] = useState<any | null>(null)
  const [selectedItemForActual, setSelectedItemForActual] = useState<any | null>(null)
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [actualCategory, setActualCategory] = useState('Repair')
  const [statusDoc, setStatusDoc] = useState('-')
  const [amountIdr, setAmountIdr] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [note, setNote] = useState('')
  const [isSubmittingActual, setIsSubmittingActual] = useState(false)

  // Item Edit Modal State (Edit Forecast Item)
  const [itemEditModalOpen, setItemEditModalOpen] = useState(false)
  const [editingItemData, setEditingItemData] = useState<any | null>(null)
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)

  // Status Change Dialog State
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [itemForStatusChange, setItemForStatusChange] = useState<any | null>(null)
  const [newStatus, setNewStatus] = useState('')

  // Delete Confirm Dialog State
  const [deleteActualId, setDeleteActualId] = useState<number | null>(null)

  const selectedPeriod = useMemo(() => {
    return periods.find((p) => String(p.id) === selectedPeriodId) || periods[0]
  }, [periods, selectedPeriodId])

  const exchangeRate = Number(selectedPeriod?.exchangeRateIdrToUsd || 15000)

  const [selectedSapInvoice, setSelectedSapInvoice] = useState('')

  // Fetch SAP Invoices when period changes
  useEffect(() => {
    let isMounted = true
    if (selectedPeriod?.monthYear) {
      getSapInvoices(selectedPeriod.monthYear)
        .then((res: any) => {
          if (!isMounted) return
          const list = Array.isArray(res) ? res : res?.data || []
          setSapInvoices(list)
        })
        .catch(() => {
          if (isMounted) setSapInvoices([])
        })
    }
    return () => {
      isMounted = false
    }
  }, [selectedPeriod?.monthYear])

  const validSapInvoices = useMemo(() => {
    return sapInvoices.filter(
      (s: any) => s && typeof s.invoiceNumber === 'string' && s.invoiceNumber.trim() !== ''
    )
  }, [sapInvoices])

  // Filter items by period, search query, status
  const filteredItems = useMemo(() => {
    return items.filter((entry) => {
      const { item, period } = entry
      if (selectedPeriodId && String(period.id) !== selectedPeriodId) return false

      if (selectedStatusFilter !== 'ALL') {
        const itemSt = (item.status || '').trim().toLowerCase()
        const filterSt = selectedStatusFilter.toLowerCase()
        if (filterSt === 'pending') {
          if (itemSt !== 'pending' && itemSt !== 'waiting') return false
        } else if (filterSt === 'complete') {
          if (itemSt !== 'complete' && itemSt !== 'done') return false
        } else if (itemSt !== filterSt) {
          return false
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchCustomer = (item.customerName || item.customer || '').toLowerCase().includes(q)
        const matchDesc = (item.description || '').toLowerCase().includes(q)
        const matchPo = (item.poNumber || '').toLowerCase().includes(q)
        const matchPr = (item.prNumber || '').toLowerCase().includes(q)
        if (!matchCustomer && !matchDesc && !matchPo && !matchPr) return false
      }

      return true
    })
  }, [items, selectedPeriodId, selectedStatusFilter, searchQuery])

  // Scorecards Calculation
  const scorecards = useMemo(() => {
    let totalFc = 0
    let totalAct = 0

    filteredItems.forEach((entry) => {
      const { item, actuals } = entry
      if (isCarryOverItem(item)) return

      const fc = getForecastAmountIdr(item)
      const act = (actuals || []).reduce(
        (sum: number, a: any) => sum + Number(a.amountIdr || 0),
        0
      )

      totalFc += fc
      totalAct += act
    })

    const outstanding = totalFc - totalAct
    const progress = totalFc > 0 ? Math.min(100, Math.round((totalAct / totalFc) * 100)) : 0

    return { totalFc, totalAct, outstanding, progress }
  }, [filteredItems])

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // --- EDIT FORECAST ITEM ---
  const handleOpenEditItem = (item: any) => {
    setEditingItemData({
      id: item.id,
      customer: item.customer || item.customerName || '',
      picSales: item.picSales || item.salesmanName || '',
      poNumber: item.poNumber || '',
      prNumber: item.prNumber || '',
      description: item.description || '',
      osInvoicePrevMonth: item.osInvoicePrevMonth || '0',
      repairForecast: item.repairForecast || '0',
      retreadForecast: item.retreadForecast || '0',
      serviceForecast: item.serviceForecast || '0',
      accessoriesAmountIdr: item.accessoriesAmountIdr || '0',
      accessoriesAmountUsd: item.accessoriesAmountUsd || '0',
      status: item.status || 'Waiting',
      remark: item.remark || '',
      isProductAccessories: item.isProductAccessories || false,
    })
    setItemEditModalOpen(true)
  }

  const handleSaveEditItem = async () => {
    if (!editingItemData) return
    setIsSubmittingItem(true)
    try {
      const res = await upsertForecastItem(editingItemData)
      if (res && res.success === false) {
        toast.error(res.error || 'Gagal merubah item forecast')
        return
      }
      toast.success('Forecast item berhasil diperbarui')
      setItems((prev) =>
        prev.map((e) => {
          if (e.item.id === editingItemData.id) {
            return {
              ...e,
              item: {
                ...e.item,
                customer: editingItemData.customer,
                customerName: editingItemData.customer,
                picSales: editingItemData.picSales,
                salesmanName: editingItemData.picSales,
                poNumber: editingItemData.poNumber,
                prNumber: editingItemData.prNumber,
                description: editingItemData.description,
                osInvoicePrevMonth: editingItemData.osInvoicePrevMonth,
                repairForecast: editingItemData.repairForecast,
                retreadForecast: editingItemData.retreadForecast,
                serviceForecast: editingItemData.serviceForecast,
                accessoriesAmountIdr: editingItemData.accessoriesAmountIdr,
                accessoriesAmountUsd: editingItemData.accessoriesAmountUsd,
                status: editingItemData.status,
                remark: editingItemData.remark,
              },
            }
          }
          return e
        })
      )
      setItemEditModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Gagal merubah item forecast')
    } finally {
      setIsSubmittingItem(false)
    }
  }

  // --- ACTUAL ACTIONS ---
  const handleOpenAddActual = (entry: any) => {
    setSelectedItemForActual(entry.item)
    setEditingActual(null)
    setSelectedSapInvoice('')
    setActualCategory('Repair')
    setStatusDoc('-')
    setActualDate(new Date().toISOString().split('T')[0])
    setInvoiceNumber('')
    setAmountIdr('')
    setAmountUsd('')
    setNote('')
    setActualModalOpen(true)
  }

  const handleOpenEditActual = (entry: any, actual: any) => {
    setSelectedItemForActual(entry.item)
    setEditingActual(actual)
    setSelectedSapInvoice('')
    setActualCategory(actual.category || 'Repair')
    setStatusDoc(actual.itemStatus || actual.statusDoc || '-')
    setActualDate(formatDateDisplay(actual.updateDate))
    setInvoiceNumber(actual.invoiceNumber || '')
    setAmountIdr(actual.amountIdr !== undefined && actual.amountIdr !== null ? String(actual.amountIdr) : '0')
    setAmountUsd(actual.amountUsd !== undefined && actual.amountUsd !== null ? String(actual.amountUsd) : '0')
    setNote(actual.remark || actual.note || '')
    setActualModalOpen(true)
  }

  const handleSelectSapInvoice = (invNum: string) => {
    setInvoiceNumber(invNum)
    const match = sapInvoices.find((s) => s.invoiceNumber === invNum)
    if (match) {
      setAmountIdr(String(match.amountIdr ?? '0'))
      if (exchangeRate > 0) {
        setAmountUsd((match.amountIdr / exchangeRate).toFixed(2))
      }
    }
  }

  const handleAmountIdrChange = (val: string) => {
    setAmountIdr(val)
    const num = Number(val)
    if (!isNaN(num) && exchangeRate > 0) {
      setAmountUsd((num / exchangeRate).toFixed(2))
    }
  }

  const handleSaveActual = async () => {
    if (!selectedItemForActual) return
    const rawIdr = amountIdr !== undefined && amountIdr !== null && amountIdr !== '' ? amountIdr : '0'
    const rawUsd = amountUsd !== undefined && amountUsd !== null && amountUsd !== '' ? amountUsd : String(Number(rawIdr) / (exchangeRate || 1))

    if (isNaN(Number(rawIdr))) {
      toast.error('Masukkan jumlah nominal IDR yang valid')
      return
    }

    setIsSubmittingActual(true)
    try {
      if (editingActual) {
        const res = await updateForecastActual(editingActual.id, {
          updateDate: actualDate,
          category: actualCategory,
          itemStatus: statusDoc,
          statusDoc: statusDoc,
          invoiceNumber,
          amountIdr: rawIdr,
          amountUsd: rawUsd,
          remark: note,
          note,
        })
        if (res.success) {
          toast.success('Actual revenue berhasil diperbarui')
          setItems((prev) =>
            prev.map((e) => {
              if (e.item.id === selectedItemForActual.id) {
                return {
                  ...e,
                  actuals: e.actuals.map((a: any) =>
                    a.id === editingActual.id
                      ? {
                          ...a,
                          updateDate: actualDate,
                          category: actualCategory,
                          itemStatus: statusDoc,
                          statusDoc: statusDoc,
                          invoiceNumber,
                          amountIdr: Number(rawIdr),
                          amountUsd: Number(rawUsd),
                          remark: note,
                          note,
                        }
                      : a
                  ),
                }
              }
              return e
            })
          )
        } else {
          toast.error(res.error || 'Gagal memperbarui actual')
        }
      } else {
        const res = await addForecastActual({
          forecastItemId: selectedItemForActual.id,
          periodId: Number(selectedPeriodId),
          category: actualCategory,
          itemStatus: statusDoc,
          statusDoc: statusDoc,
          updateDate: actualDate,
          invoiceNumber,
          amountIdr: rawIdr,
          amountUsd: rawUsd,
          remark: note,
          note,
        })
        if (res.success && res.data) {
          toast.success('Actual revenue berhasil ditambahkan')
          setItems((prev) =>
            prev.map((e) => {
              if (e.item.id === selectedItemForActual.id) {
                return {
                  ...e,
                  actuals: [{ ...res.data, itemStatus: statusDoc, statusDoc }, ...(e.actuals || [])],
                }
              }
              return e
            })
          )
        } else {
          toast.error(res.error || 'Gagal menambahkan actual')
        }
      }
      setActualModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmittingActual(false)
    }
  }

  const handleDeleteActual = async () => {
    if (!deleteActualId) return
    try {
      await deleteForecastActual(deleteActualId)
      toast.success('Actual revenue dihapus')
      setItems((prev) =>
        prev.map((e) => ({
          ...e,
          actuals: e.actuals.filter((a: any) => a.id !== deleteActualId),
        }))
      )
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus')
    } finally {
      setDeleteActualId(null)
    }
  }

  const handleUpdateStatus = async () => {
    if (!itemForStatusChange || !newStatus) return
    try {
      await updateForecastItemStatus(
        itemForStatusChange.id,
        newStatus,
        itemForStatusChange.remark || ''
      )
      toast.success(`Status item diubah menjadi ${newStatus}`)
      setItems((prev) =>
        prev.map((e) =>
          e.item.id === itemForStatusChange.id
            ? { ...e, item: { ...e.item, status: newStatus } }
            : e
        )
      )
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setStatusDialogOpen(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Site',
      'Salesman',
      'PR/PO',
      'Category/Desc',
      'Forecast (IDR)',
      'Actual (IDR)',
      'Outstanding (IDR)',
      'Status',
    ]
    const rows = filteredItems.map(({ item, actuals }) => {
      const fc = getForecastAmountIdr(item)
      const act = (actuals || []).reduce(
        (sum: number, a: any) => sum + Number(a.amountIdr || 0),
        0
      )
      return [
        `"${item.customerName || item.customer || ''}"`,
        `"${item.site || ''}"`,
        `"${item.salesmanName || item.picSales || ''}"`,
        `"${item.poNumber || item.prNumber || ''}"`,
        `"${item.description || ''}"`,
        fc,
        act,
        fc - act,
        `"${item.status || ''}"`,
      ]
    })
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `CS_Forecast_Daily_${selectedPeriod?.monthYear || 'report'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status?: string) => {
    const st = (status || '').trim().toLowerCase()
    const base = 'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border'
    if (st === 'complete' || st === 'done' || st === 'invoice')
      return <span className={`${base} bg-emerald-100 text-emerald-700 border-emerald-200`}>Complete</span>
    if (st === 'in progress' || st === 'po release')
      return <span className={`${base} bg-[#eaf4fb] text-[#003f78] border-blue-200`}>In Progress</span>
    if (st === 'carry over')
      return <span className={`${base} bg-purple-100 text-purple-700 border-purple-200`}>Carry Over</span>
    if (st === 'cancel')
      return <span className={`${base} bg-rose-100 text-rose-700 border-rose-200`}>Cancel</span>
    return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>Pending</span>
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Period Control (HERO Light Theme) */}
      <section className="rounded-2xl bg-[#ffffff] p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <Label className="text-[11px] font-bold text-[#486275]">Periode Forecast</Label>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-full h-10 bg-[#f8fafc] border-slate-200 text-xs font-bold text-[#003461] mt-1 rounded-xl">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-[#003461]">
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">
                    {p.monthYear} {p.status ? `(${p.status})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-10 mt-5 border-slate-200 bg-[#f8fafc] text-[#003461] hover:bg-slate-100 text-xs font-bold gap-1.5 rounded-xl"
          >
            <Download className="w-4 h-4 text-[#0ea5b0]" />
            Export CSV
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#486275]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari customer, PR/PO, deskripsi..."
            className="pl-9 h-10 text-xs bg-[#f8fafc] border-slate-200 text-[#003461] placeholder:text-slate-400 rounded-xl"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['ALL', 'Pending', 'In Progress', 'Complete', 'Carry Over', 'Cancel'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border',
                selectedStatusFilter === st
                  ? 'bg-[#003461] text-white border-[#003461] shadow-sm'
                  : 'bg-[#f8fafc] text-[#486275] border-slate-200 hover:text-[#003461]'
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </section>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3.5 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100">
          <div className="flex items-center justify-between text-[#486275] mb-1">
            <span className="text-[11px] font-bold">Total Forecast</span>
            <Target className="w-4 h-4 text-[#0ea5b0]" />
          </div>
          <div className="text-base font-black text-[#003461] tracking-tight">
            {formatCurrency(scorecards.totalFc)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Excl. Carry Over</div>
        </div>

        <div className="rounded-2xl bg-white p-3.5 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold">Total Actual</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-emerald-600 tracking-tight">
            {formatCurrency(scorecards.totalAct)}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-bold mt-1">
            Achievement: {scorecards.progress}%
          </div>
        </div>
      </div>

      {/* Progress Bar Banner */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100">
        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
          <span className="text-[#003461]">Pencapaian Revenue</span>
          <span className="text-[#0ea5b0]">{scorecards.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#0ea5b0] to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${scorecards.progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-[#486275] mt-2">
          <span>Outstanding: {formatSisaCurrency(scorecards.outstanding)}</span>
          <span>USD Rate: Rp {exchangeRate.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Item List Header */}
      <div className="flex items-center justify-between text-xs text-[#486275] font-bold px-1 pt-1">
        <span>Item Forecast ({filteredItems.length})</span>
        <span className="text-[11px] text-[#0ea5b0]">Klik "Edit" untuk merubah data</span>
      </div>

      {/* Forecast Item Cards (With FULL EDIT Focus) */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-slate-400 text-xs font-semibold">
            Tidak ada item forecast yang sesuai filter.
          </div>
        ) : (
          filteredItems.map(({ item, actuals }) => {
            const fc = getForecastAmountIdr(item)
            const actList = actuals || []
            const totalAct = actList.reduce(
              (sum: number, a: any) => sum + Number(a.amountIdr || 0),
              0
            )
            const remaining = fc - totalAct
            const isExpanded = !!expandedItems[item.id]

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100 space-y-3"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-[#003461] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#0ea5b0] shrink-0" />
                      {item.customerName || item.customer || 'No Customer'}
                    </h3>
                    <p className="text-xs font-semibold text-[#486275] mt-0.5">
                      {item.description || item.poNumber || item.prNumber || 'Tanpa Keterangan'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setItemForStatusChange(item)
                      setNewStatus(item.status || 'Waiting')
                      setStatusDialogOpen(true)
                    }}
                    className="shrink-0"
                  >
                    {getStatusBadge(item.status)}
                  </button>
                </div>

                {/* Info & Category Amounts Grid */}
                <div className="grid grid-cols-2 gap-2 bg-[#f8fafc] p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[#486275] block text-[10px] font-bold">Total Forecast</span>
                    <span className="font-black text-[#003461]">{formatCurrency(fc)}</span>
                  </div>
                  <div>
                    <span className="text-[#486275] block text-[10px] font-bold">Total Actual</span>
                    <span className="font-black text-emerald-600">{formatCurrency(totalAct)}</span>
                  </div>
                  <div>
                    <span className="text-[#486275] block text-[10px] font-bold">Sisa Outstanding</span>
                    <span className="font-bold text-[#003f78]">{formatSisaCurrency(remaining)}</span>
                  </div>
                  <div>
                    <span className="text-[#486275] block text-[10px] font-bold">Status Doc</span>
                    <span className="text-[#003461] font-bold truncate block">
                      {formatStatusDoc(item.status, item.poNumber || item.prNumber)}
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-1.5 mt-0.5">
                    <span className="text-[#486275] block text-[10px] font-bold">Salesman / Site</span>
                    <span className="text-[#003461] font-semibold truncate block">
                      {item.salesmanName || item.picSales || item.site || '-'}
                    </span>
                  </div>
                  {item.remark && (
                    <div className="col-span-2 bg-white p-2 rounded-lg border border-slate-200/60 text-[11px]">
                      <span className="font-bold text-[#003461]">Remark Item: </span>
                      <span className="text-[#486275]">{item.remark}</span>
                    </div>
                  )}
                </div>

                {/* Direct EDIT Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* EDIT FORECAST ITEM BUTTON */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditItem(item)}
                      className="h-8 text-xs border-[#003461] text-[#003461] bg-[#eaf4fb] hover:bg-[#003461] hover:text-white rounded-xl px-3 font-bold gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Item
                    </Button>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-xs font-bold text-[#486275] hover:text-[#003461] flex items-center gap-1 px-1 py-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-[#0ea5b0]" />
                          Actuals ({actList.length})
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-[#0ea5b0]" />
                          Actuals ({actList.length})
                        </>
                      )}
                    </button>
                  </div>

                  {/* + ADD ACTUAL BUTTON */}
                  <Button
                    size="sm"
                    onClick={() => handleOpenAddActual({ item, actuals })}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 font-bold gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Actual
                  </Button>
                </div>

                {/* Accordion Actuals List */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-[#486275] font-black uppercase tracking-wider">
                      Riwayat Update Actual Revenue
                    </div>
                    {actList.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1">
                        Belum ada data actual revenue.
                      </div>
                    ) : (
                      actList.map((a: any) => (
                        <div
                          key={a.id}
                          className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-[#003461]">
                              <Calendar className="w-3.5 h-3.5 text-[#486275]" />
                              {formatDateDisplay(a.updateDate)}
                              {a.invoiceNumber && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold bg-slate-200 text-[#003461] h-4">
                                  PO: {a.invoiceNumber}
                                </span>
                              )}
                              {a.category && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold bg-blue-100 text-[#003461] h-4">
                                  {a.category}
                                </span>
                              )}
                            </div>
                            <div className="text-emerald-600 font-black text-xs">
                              {formatCurrency(Number(a.amountIdr || 0))}{' '}
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({formatUsd(Number(a.amountUsd || 0))})
                              </span>
                            </div>
                            {(a.remark || a.note) && (
                              <div className="text-[11px] text-[#003461] font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 mt-1 shadow-2xs">
                                <span className="font-bold text-[#0ea5b0]">Remark Daily: </span>
                                <span>{a.remark || a.note}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditActual({ item }, a)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#003461] hover:bg-slate-50 shadow-sm"
                              title="Edit Actual"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteActualId(a.id)}
                              className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100"
                              title="Hapus Actual"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* --- EDIT FORECAST ITEM DIALOG --- */}
      {itemEditModalOpen && (
        <Dialog open={itemEditModalOpen} onOpenChange={setItemEditModalOpen}>
          <DialogContent className="bg-white text-[#003461] border-slate-200 max-w-sm rounded-2xl p-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-[#003461] flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-[#0ea5b0]" />
                Edit Forecast Item
              </DialogTitle>
            </DialogHeader>

            {editingItemData && (
              <div className="space-y-3 py-2 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-[#486275]">Nama Customer</Label>
                  <Input
                    value={editingItemData.customer || ''}
                    onChange={(e) =>
                      setEditingItemData({ ...editingItemData, customer: e.target.value })
                    }
                    className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-bold text-[#486275]">Salesman / PIC</Label>
                    <Input
                      value={editingItemData.picSales || ''}
                      onChange={(e) =>
                        setEditingItemData({ ...editingItemData, picSales: e.target.value })
                      }
                      className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#486275]">No. PR / PO</Label>
                    <Input
                      value={editingItemData.poNumber || editingItemData.prNumber || ''}
                      onChange={(e) =>
                        setEditingItemData({
                          ...editingItemData,
                          poNumber: e.target.value,
                          prNumber: e.target.value,
                        })
                      }
                      className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-[#486275]">Deskripsi Item</Label>
                  <Input
                    value={editingItemData.description || ''}
                    onChange={(e) =>
                      setEditingItemData({ ...editingItemData, description: e.target.value })
                    }
                    className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                  />
                </div>

                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-black text-[#003461] block">
                    Nilai Forecast Categories (IDR)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-[#486275]">Repair Forecast</Label>
                      <Input
                        type="number"
                        value={editingItemData.repairForecast || ''}
                        onChange={(e) =>
                          setEditingItemData({ ...editingItemData, repairForecast: e.target.value })
                        }
                        className="h-8 bg-white border-slate-200 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-[#486275]">Retread Forecast</Label>
                      <Input
                        type="number"
                        value={editingItemData.retreadForecast || ''}
                        onChange={(e) =>
                          setEditingItemData({ ...editingItemData, retreadForecast: e.target.value })
                        }
                        className="h-8 bg-white border-slate-200 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-[#486275]">Service Forecast</Label>
                      <Input
                        type="number"
                        value={editingItemData.serviceForecast || ''}
                        onChange={(e) =>
                          setEditingItemData({ ...editingItemData, serviceForecast: e.target.value })
                        }
                        className="h-8 bg-white border-slate-200 text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-[#486275]">OS Invoice Prev</Label>
                      <Input
                        type="number"
                        value={editingItemData.osInvoicePrevMonth || ''}
                        onChange={(e) =>
                          setEditingItemData({
                            ...editingItemData,
                            osInvoicePrevMonth: e.target.value,
                          })
                        }
                        className="h-8 bg-white border-slate-200 text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-bold text-[#486275]">Status Item</Label>
                    <Select
                      value={editingItemData.status || ''}
                      onValueChange={(val) => setEditingItemData({ ...editingItemData, status: val })}
                    >
                      <SelectTrigger className="h-9 bg-[#f8fafc] border-slate-200 text-xs font-bold text-[#003461] mt-1">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-[#003461]">
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                        <SelectItem value="Carry Over">Carry Over</SelectItem>
                        <SelectItem value="Cancel">Cancel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#486275]">Remark</Label>
                    <Input
                      value={editingItemData.remark || ''}
                      onChange={(e) =>
                        setEditingItemData({ ...editingItemData, remark: e.target.value })
                      }
                      placeholder="Catatan..."
                      className="h-9 bg-[#f8fafc] border-slate-200 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItemEditModalOpen(false)}
                className="text-[#486275] hover:text-[#003461] text-xs h-9"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditItem}
                disabled={isSubmittingItem}
                className="bg-[#003461] hover:bg-[#002342] text-white text-xs h-9 font-bold"
              >
                {isSubmittingItem ? 'Menyimpan...' : 'Simpan Perubahan Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* --- ADD / EDIT ACTUAL MODAL --- */}
      {actualModalOpen && (
        <Dialog open={actualModalOpen} onOpenChange={setActualModalOpen}>
          <DialogContent className="bg-white text-[#003461] border-slate-200 max-w-sm rounded-2xl p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-[#003461] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#0ea5b0]" />
                {editingActual ? 'Edit Actual Revenue' : 'Tambah Actual Revenue'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {selectedItemForActual && (
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-[#486275] font-bold block">Customer</span>
                  <span className="font-black text-[#003461] block truncate">
                    {selectedItemForActual.customerName || selectedItemForActual.customer}
                  </span>
                </div>
              )}

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Tanggal Update / Invoice</Label>
                <Input
                  type="date"
                  value={actualDate || ''}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                />
              </div>

              {/* Category Selector (Outstanding / Repair / Retread / Service) */}
              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Kategori Revenue / Actual</Label>
                <select
                  value={actualCategory}
                  onChange={(e) => setActualCategory(e.target.value)}
                  className="w-full h-9 bg-[#f8fafc] border border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl px-2.5 outline-none focus:ring-1 focus:ring-[#003461]"
                >
                  <option value="Outstanding">Outstanding (OS)</option>
                  <option value="Repair">Repair</option>
                  <option value="Retread">Retread</option>
                  <option value="Service">Service</option>
                </select>
              </div>

              {/* Status Doc Selector */}
              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Status Doc</Label>
                <select
                  value={statusDoc}
                  onChange={(e) => setStatusDoc(e.target.value)}
                  className="w-full h-9 bg-[#f8fafc] border border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl px-2.5 outline-none focus:ring-1 focus:ring-[#003461]"
                >
                  <option value="-">-</option>
                  <option value="PO Release">PO Release</option>
                  <option value="Waiting PO">Waiting PO</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Cancel">Cancel</option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Nomor PO / SAP Ref</Label>
                <Input
                  value={invoiceNumber || ''}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: PO-2026-001"
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-bold text-[#486275]">Amount (IDR)</Label>
                  <Input
                    type="number"
                    value={amountIdr ?? ''}
                    onChange={(e) => handleAmountIdrChange(e.target.value)}
                    placeholder="0"
                    className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1 font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-[#486275]">Amount (USD)</Label>
                  <Input
                    type="number"
                    value={amountUsd ?? ''}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder="0.00"
                    className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Remark Daily / Catatan</Label>
                <Input
                  value={note || ''}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan / Remark daily..."
                  className="h-9 bg-[#f8fafc] border-slate-200 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActualModalOpen(false)}
                className="text-[#486275] hover:text-[#003461] text-xs h-9"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveActual}
                disabled={isSubmittingActual}
                className="bg-[#003461] hover:bg-[#002342] text-white text-xs h-9 font-bold"
              >
                {isSubmittingActual ? 'Menyimpan...' : editingActual ? 'Update Actual' : 'Simpan Actual'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* --- STATUS CHANGE DIALOG --- */}
      {statusDialogOpen && (
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="bg-white text-[#003461] border-slate-200 max-w-xs rounded-2xl p-4">
            <DialogHeader>
              <DialogTitle className="text-xs font-black text-[#003461]">Ubah Status Item</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-2">
              <Label className="text-[11px] font-bold text-[#486275]">Pilih Status Baru</Label>
              <Select value={newStatus || ''} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#003461]">
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Carry Over">Carry Over</SelectItem>
                  <SelectItem value="Cancel">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-2">
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                className="bg-[#003461] hover:bg-[#002342] text-white text-xs h-9 w-full font-bold"
              >
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      {deleteActualId !== null && (
        <Dialog
          open={deleteActualId !== null}
          onOpenChange={(open) => !open && setDeleteActualId(null)}
        >
          <DialogContent className="bg-white text-[#003461] border-slate-200 max-w-xs rounded-2xl p-4">
            <DialogHeader>
              <DialogTitle className="text-xs font-black text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Hapus Actual Revenue?
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-[#486275] py-1 font-semibold">
              Data actual revenue yang dihapus tidak dapat dikembalikan.
            </p>
            <DialogFooter className="gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteActualId(null)}
                className="text-[#486275] hover:text-[#003461] text-xs h-9"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteActual}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 font-bold"
              >
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
