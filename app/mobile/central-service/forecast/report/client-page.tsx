'use client'

import React, { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Search,
  Download,
  Building2,
  ChevronDown,
  ChevronUp,
  Target,
  CheckCircle2,
  TrendingUp,
  Layers,
} from 'lucide-react'

const fmtIdr = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)

const fmtUsd = (v: number) =>
  '$' +
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

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

export function MobileReportClientPage({
  periods,
  dailyItems,
  initialSapRevenue,
  exchangeRate: initialExchangeRate,
}: {
  periods: any[]
  dailyItems: any[]
  initialSapRevenue: any
  exchangeRate: string
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods[0]?.id ? String(periods[0].id) : ''
  )
  const [currencyMode, setCurrencyMode] = useState<'IDR' | 'USD'>('IDR')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({})

  const selectedPeriod = useMemo(() => {
    return periods.find((p) => String(p.id) === selectedPeriodId) || periods[0]
  }, [periods, selectedPeriodId])

  const rate = Number(selectedPeriod?.exchangeRateIdrToUsd || initialExchangeRate || 15000)

  const formatCurrency = (val: number) => {
    if (currencyMode === 'USD') return fmtUsd(val / rate)
    return fmtIdr(val)
  }

  // Filter items by selected period
  const filteredDailyItems = useMemo(() => {
    return dailyItems.filter(({ period }) => {
      if (selectedPeriodId && String(period.id) !== selectedPeriodId) return false
      return true
    })
  }, [dailyItems, selectedPeriodId])

  // Category Summary Calculation (Matching Desktop Category Distribution)
  const categorySummary = useMemo(() => {
    const categories: Record<
      string,
      { label: string; forecast: number; actual: number }
    > = {
      accessories: { label: 'Accessories', forecast: 0, actual: 0 },
      osInvoice: { label: 'OS Invoice Prev', forecast: 0, actual: 0 },
      repair: { label: 'Repair Forecast', forecast: 0, actual: 0 },
      retread: { label: 'Retread Forecast', forecast: 0, actual: 0 },
      service: { label: 'Service Forecast', forecast: 0, actual: 0 },
    }

    filteredDailyItems.forEach(({ item, actuals }) => {
      if (isCarryOverItem(item)) return

      const repFc = Number(item.repairForecast || 0)
      const srvFc = Number(item.serviceForecast || 0)
      const retFc = Number(item.retreadForecast || 0)
      const osFc = Number(item.osInvoicePrevMonth || 0)
      const accFc = Number(item.accessoriesAmountIdr || 0)

      if (item.isProductAccessories) {
        categories.accessories.forecast += accFc
      } else {
        categories.osInvoice.forecast += osFc
        categories.repair.forecast += repFc
        categories.retread.forecast += retFc
        categories.service.forecast += srvFc
      }

      ;(actuals || []).forEach((a: any) => {
        const amt = Number(a.amountIdr || 0)
        if (amt <= 0) return

        const catStr = (a.category || '').toLowerCase().trim()
        if (catStr.includes('repair')) {
          categories.repair.actual += amt
        } else if (catStr.includes('retread')) {
          categories.retread.actual += amt
        } else if (catStr.includes('service')) {
          categories.service.actual += amt
        } else if (catStr.includes('os') || catStr.includes('invoice')) {
          categories.osInvoice.actual += amt
        } else if (catStr.includes('acc')) {
          categories.accessories.actual += amt
        } else {
          // If actual entry has no explicit category, map to item's primary forecast category
          if (item.isProductAccessories) {
            categories.accessories.actual += amt
          } else {
            const maxFc = Math.max(repFc, srvFc, retFc, osFc)
            if (maxFc > 0 && maxFc === srvFc) {
              categories.service.actual += amt
            } else if (maxFc > 0 && maxFc === repFc) {
              categories.repair.actual += amt
            } else if (maxFc > 0 && maxFc === retFc) {
              categories.retread.actual += amt
            } else if (maxFc > 0 && maxFc === osFc) {
              categories.osInvoice.actual += amt
            } else {
              categories.service.actual += amt
            }
          }
        }
      })
    })

    return categories
  }, [filteredDailyItems])

  // Overall Totals
  const totals = useMemo(() => {
    let totalFc = 0
    let totalAct = 0

    filteredDailyItems.forEach(({ item, actuals }) => {
      if (isCarryOverItem(item)) return
      const fc = getForecastAmountIdr(item)
      const act = (actuals || []).reduce(
        (sum: number, a: any) => sum + Number(a.amountIdr || 0),
        0
      )
      totalFc += fc
      totalAct += act
    })

    const variance = totalFc - totalAct
    const achievement = totalFc > 0 ? Math.min(100, (totalAct / totalFc) * 100) : 0

    return { totalFc, totalAct, variance, achievement }
  }, [filteredDailyItems])

  // Customer Grouping Breakdown with Per-Category Remarks
  const customerBreakdown = useMemo(() => {
    type CategoryData = { amount: number; remarkMonthly: string; remarkDaily: string }
    const map = new Map<
      string,
      {
        customerName: string
        salesmen: string
        totalForecast: number
        totalActual: number
        itemsCount: number
        categories: {
          accessories: CategoryData
          osInvoice: CategoryData
          repair: CategoryData
          retread: CategoryData
          service: CategoryData
        }
      }
    >()

    filteredDailyItems.forEach(({ item, actuals }) => {
      if (isCarryOverItem(item)) return

      const name = (item.customerName || item.customer || 'Other / General').trim()
      const salesman = (item.salesmanName || item.picSales || '').trim()
      const fc = getForecastAmountIdr(item)
      const act = (actuals || []).reduce(
        (sum: number, a: any) => sum + Number(a.amountIdr || 0),
        0
      )

      const existing = map.get(name) || {
        customerName: name,
        salesmen: salesman,
        totalForecast: 0,
        totalActual: 0,
        itemsCount: 0,
        categories: {
          accessories: { amount: 0, remarkMonthly: '', remarkDaily: '' },
          osInvoice: { amount: 0, remarkMonthly: '', remarkDaily: '' },
          repair: { amount: 0, remarkMonthly: '', remarkDaily: '' },
          retread: { amount: 0, remarkMonthly: '', remarkDaily: '' },
          service: { amount: 0, remarkMonthly: '', remarkDaily: '' },
        },
      }

      if (salesman && !existing.salesmen.includes(salesman)) {
        existing.salesmen = existing.salesmen
          ? `${existing.salesmen}, ${salesman}`
          : salesman
      }

      existing.totalForecast += fc
      existing.totalActual += act
      existing.itemsCount += 1

      if (item.isProductAccessories) {
        const accAmt = Number(item.accessoriesAmountIdr || 0)
        existing.categories.accessories.amount += accAmt
        if (item.remark && !existing.categories.accessories.remarkMonthly.includes(item.remark)) {
          existing.categories.accessories.remarkMonthly = existing.categories.accessories.remarkMonthly
            ? `${existing.categories.accessories.remarkMonthly}; ${item.remark}`
            : item.remark
        }
      } else {
        const osAmt = Number(item.osInvoicePrevMonth || 0)
        const repAmt = Number(item.repairForecast || 0)
        const retAmt = Number(item.retreadForecast || 0)
        const srvAmt = Number(item.serviceForecast || 0)

        existing.categories.osInvoice.amount += osAmt
        existing.categories.repair.amount += repAmt
        existing.categories.retread.amount += retAmt
        existing.categories.service.amount += srvAmt

        const osRem = item.osRemark || item.remark
        if (osRem && !existing.categories.osInvoice.remarkMonthly.includes(osRem)) {
          existing.categories.osInvoice.remarkMonthly = existing.categories.osInvoice.remarkMonthly
            ? `${existing.categories.osInvoice.remarkMonthly}; ${osRem}`
            : osRem
        }

        const repRem = item.repairRemark || item.remark
        if (repRem && !existing.categories.repair.remarkMonthly.includes(repRem)) {
          existing.categories.repair.remarkMonthly = existing.categories.repair.remarkMonthly
            ? `${existing.categories.repair.remarkMonthly}; ${repRem}`
            : repRem
        }

        const retRem = item.retreadRemark || item.remark
        if (retRem && !existing.categories.retread.remarkMonthly.includes(retRem)) {
          existing.categories.retread.remarkMonthly = existing.categories.retread.remarkMonthly
            ? `${existing.categories.retread.remarkMonthly}; ${retRem}`
            : retRem
        }

        const srvRem = item.serviceRemark || item.remark
        if (srvRem && !existing.categories.service.remarkMonthly.includes(srvRem)) {
          existing.categories.service.remarkMonthly = existing.categories.service.remarkMonthly
            ? `${existing.categories.service.remarkMonthly}; ${srvRem}`
            : srvRem
        }
      }

      ;(actuals || []).forEach((a: any) => {
        if (!a.remark) return
        const catStr = (a.category || '').toLowerCase()
        let targetKey: keyof typeof existing.categories = 'service'
        if (catStr.includes('repair')) targetKey = 'repair'
        else if (catStr.includes('retread')) targetKey = 'retread'
        else if (catStr.includes('os') || catStr.includes('invoice')) targetKey = 'osInvoice'
        else if (catStr.includes('acc') || item.isProductAccessories) targetKey = 'accessories'

        const curRem = existing.categories[targetKey].remarkDaily
        if (!curRem.includes(a.remark)) {
          existing.categories[targetKey].remarkDaily = curRem
            ? `${curRem}; ${a.remark}`
            : a.remark
        }
      })

      map.set(name, existing)
    })

    const list = Array.from(map.values()).sort(
      (a, b) => b.totalForecast - a.totalForecast
    )

    if (!searchQuery) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        (c.salesmen && c.salesmen.toLowerCase().includes(q))
    )
  }, [filteredDailyItems, searchQuery])

  const toggleExpandCustomer = (name: string) => {
    setExpandedCustomers((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Items Count',
      'Total Forecast (IDR)',
      'Total Actual (IDR)',
      'Variance (IDR)',
      'Realization %',
    ]
    const rows = customerBreakdown.map((c) => {
      const varAmt = c.totalForecast - c.totalActual
      const pct = c.totalForecast > 0 ? (c.totalActual / c.totalForecast) * 100 : 0
      return [
        `"${c.customerName}"`,
        c.itemsCount,
        c.totalForecast,
        c.totalActual,
        varAmt,
        pct.toFixed(1) + '%',
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
      `CS_Forecast_Daily_Report_${selectedPeriod?.monthYear || 'summary'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Period Selection & Currency Toggle (HERO Light Theme) */}
      <section className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <Label className="text-[11px] font-bold text-[#486275]">Periode Report</Label>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="w-full h-10 bg-[#f8fafc] border-slate-200 text-xs font-bold text-[#003461] mt-1 rounded-xl">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#003461] border-slate-200">
                {periods.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">
                    {p.monthYear} {p.status ? `(${p.status})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency Toggle */}
          <div className="mt-5 flex items-center bg-[#f8fafc] p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCurrencyMode('IDR')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                currencyMode === 'IDR'
                  ? 'bg-[#003461] text-white shadow-sm'
                  : 'text-[#486275] hover:text-[#003461]'
              )}
            >
              IDR
            </button>
            <button
              onClick={() => setCurrencyMode('USD')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                currencyMode === 'USD'
                  ? 'bg-[#0ea5b0] text-white shadow-sm'
                  : 'text-[#486275] hover:text-[#003461]'
              )}
            >
              USD
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] font-bold text-[#486275]">
            Rate USD: <span className="text-[#003461]">Rp {rate.toLocaleString('id-ID')}</span>
          </div>
          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs bg-[#003461] hover:bg-[#002342] text-white font-bold gap-1.5 rounded-xl shadow-sm"
          >
            <Download className="w-4 h-4 text-[#0ea5b0]" />
            Export Report
          </Button>
        </div>
      </section>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100">
          <div className="flex items-center justify-between text-[#486275] mb-1">
            <span className="text-[11px] font-bold">Target Revenue</span>
            <Target className="w-4 h-4 text-[#0ea5b0]" />
          </div>
          <div className="text-base font-black text-[#003461] tracking-tight">
            {formatCurrency(totals.totalFc)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">Forecast periode ini</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold">Actual Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-emerald-600 tracking-tight">
            {formatCurrency(totals.totalAct)}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-bold mt-1">
            Realisasi: {totals.achievement.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Achievement Metric Card */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#003461] font-black flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#0ea5b0]" />
            Achievement Rate
          </span>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black">
            {totals.achievement.toFixed(1)}%
          </Badge>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#0ea5b0] to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${totals.achievement}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold text-[#486275] pt-1">
          <span>Variance (Sisa Target): {formatCurrency(totals.variance)}</span>
          <span>{filteredDailyItems.length} Item Forecast</span>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
          <h3 className="font-black text-[#003461] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#0ea5b0]" />
            Rincian per Kategori
          </h3>
          <span className="text-[10px] font-bold text-[#486275]">Forecast vs Actual</span>
        </div>

        <div className="space-y-2.5">
          {Object.entries(categorySummary).map(([key, cat]) => {
            const pct = cat.forecast > 0 ? Math.min(100, (cat.actual / cat.forecast) * 100) : 0
            const barColor =
              pct >= 100
                ? 'bg-emerald-500'
                : pct >= 80
                ? 'bg-blue-500'
                : pct >= 50
                ? 'bg-amber-500'
                : pct > 0
                ? 'bg-[#0ea5b0]'
                : 'bg-slate-300'

            const textColor =
              pct >= 100
                ? 'text-emerald-600'
                : pct >= 80
                ? 'text-blue-600'
                : pct >= 50
                ? 'text-amber-600'
                : pct > 0
                ? 'text-[#0ea5b0]'
                : 'text-slate-400'

            return (
              <div
                key={key}
                className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200/80 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#003461]">{cat.label}</span>
                  <span className={cn('text-[11px] font-extrabold', textColor)}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', barColor)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                <div className="flex items-[#003461] justify-between text-[10px] font-bold">
                  <div>
                    <span>FC: {fmtIdr(cat.forecast)}</span>
                    <span className="text-[9px] text-[#486275] block font-semibold">
                      {fmtUsd(cat.forecast / rate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={textColor}>Act: {fmtIdr(cat.actual)}</span>
                    <span className="text-[9px] text-[#486275] block font-semibold">
                      {fmtUsd(cat.actual / rate)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Customer Breakdown Section */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_12px_30px_rgba(8,32,51,0.08)] border border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-black text-[#003461] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#0ea5b0]" />
            Breakdown Customer ({customerBreakdown.length})
          </h3>
        </div>

        {/* Search Customer or Salesman Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#486275]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari customer atau nama sales..."
            className="pl-9 h-10 text-xs bg-[#f8fafc] border-slate-200 text-[#003461] placeholder:text-slate-400 rounded-xl"
          />
        </div>

        {/* Customer Cards */}
        <div className="space-y-3 pt-1">
          {customerBreakdown.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              Tidak ada data customer.
            </div>
          ) : (
            customerBreakdown.map((cust) => {
              const isExpanded = !!expandedCustomers[cust.customerName]
              const custPct =
                cust.totalForecast > 0
                  ? Math.min(100, (cust.totalActual / cust.totalForecast) * 100)
                  : 0

              return (
                <div
                  key={cust.customerName}
                  className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-[#003461] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#0ea5b0] shrink-0" />
                        {cust.customerName}
                      </h4>
                      <p className="text-[10px] font-bold text-[#486275] mt-0.5">
                        {cust.salesmen ? (
                          <>
                            Sales: <span className="text-[#003461]">{cust.salesmen}</span> •{' '}
                          </>
                        ) : null}
                        {cust.itemsCount} item forecast
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold">
                      {custPct.toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-[#486275] font-bold block">Forecast</span>
                      <span className="font-black text-[#003461]">
                        {fmtIdr(cust.totalForecast)}
                      </span>
                      <span className="text-[9px] text-[#486275] block font-semibold">
                        {fmtUsd(cust.totalForecast / rate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#486275] font-bold block">Actual</span>
                      <span className="font-black text-emerald-600">
                        {fmtIdr(cust.totalActual)}
                      </span>
                      <span className="text-[9px] text-[#486275] block font-semibold">
                        {fmtUsd(cust.totalActual / rate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => toggleExpandCustomer(cust.customerName)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#486275] hover:text-[#003461]"
                    >
                      <span>{isExpanded ? 'Sembunyikan Rincian' : 'Lihat Rincian Kategori'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#0ea5b0]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#0ea5b0]" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-200 space-y-2 text-[11px]">
                      {[
                        { key: 'accessories', label: 'Accessories', cat: cust.categories.accessories },
                        { key: 'osInvoice', label: 'OS Invoice Prev', cat: cust.categories.osInvoice },
                        { key: 'repair', label: 'Repair', cat: cust.categories.repair },
                        { key: 'retread', label: 'Retread', cat: cust.categories.retread },
                        { key: 'service', label: 'Service', cat: cust.categories.service },
                      ]
                        .filter(
                          ({ cat }) =>
                            cat.amount > 0 || cat.remarkDaily || cat.remarkMonthly
                        )
                        .map(({ key, label, cat }) => (
                          <div
                            key={key}
                            className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1"
                          >
                            <div className="flex justify-between items-center text-[#486275] font-bold">
                              <span>{label}:</span>
                              <span className="text-[#003461] font-black">
                                {fmtIdr(cat.amount)}
                              </span>
                            </div>
                            {cat.remarkDaily ? (
                              <div className="text-[10px] text-[#003461] font-medium bg-[#f0f9ff] px-2 py-1 rounded border border-blue-100 mt-1">
                                <span className="font-bold text-[#0ea5b0]">Remark Daily:</span>{' '}
                                {cat.remarkDaily}
                              </div>
                            ) : null}
                            {cat.remarkMonthly ? (
                              <div className="text-[10px] text-[#486275] font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200 mt-0.5">
                                <span className="font-bold text-[#003461]">Remark Monthly:</span>{' '}
                                {cat.remarkMonthly}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
