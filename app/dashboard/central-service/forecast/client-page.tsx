'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { RefreshCw, Save, TrendingUp, Banknote, Wallet, Trophy } from 'lucide-react'
import {
  getRealtimeExchangeRate,
  updatePeriodExchangeRate,
} from '@/app/actions/central-service-forecast'

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const formatShort = (val: number) => {
  if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return '$' + (val / 1000).toFixed(1) + 'K'
  return '$' + val.toFixed(0)
}

const renderBarLabel = (props: any) => {
  const { x, y, width, value } = props
  if (!value || value === 0) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#374151"
      fontSize={10}
      fontWeight={600}
    >
      {formatShort(value)}
    </text>
  )
}

const renderPieLabel = ({ name, value }: { name: string; value: number }) => {
  return `${name}: ${formatShort(value)}`
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

const isCancelStatusDoc = (status?: string | null) =>
  (status || '').trim().toLowerCase() === 'cancel'

export function DashboardClientPage({
  periods,
  allItems,
  allActuals,
}: {
  periods: any[]
  allItems: any[]
  allActuals: any[]
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    periods.length > 0 ? periods[0].id.toString() : ''
  )
  const [editRate, setEditRate] = useState<string>('')
  const [isFetchingRate, setIsFetchingRate] = useState(false)

  const selectedPeriod = periods.find((p) => p.id.toString() === selectedPeriodId)

  // Set edit rate when period changes
  useEffect(() => {
    if (selectedPeriod?.exchangeRateIdrToUsd) {
      setEditRate(selectedPeriod.exchangeRateIdrToUsd)
    }
  }, [selectedPeriodId, selectedPeriod])

  const handleFetchRate = async () => {
    setIsFetchingRate(true)
    try {
      const result = await getRealtimeExchangeRate()
      if (result.success && result.rate) {
        setEditRate(result.rate.toString())
        toast.success('Realtime rate fetched: ' + result.rate)
      } else {
        toast.error(result.error || 'Failed to fetch API')
      }
    } catch (_error) {
      toast.error('Failed to fetch API')
    } finally {
      setIsFetchingRate(false)
    }
  }

  const handleSaveRate = async () => {
    if (!selectedPeriodId || !editRate) return
    try {
      await updatePeriodExchangeRate(Number(selectedPeriodId), editRate)
      toast.success('Rate saved to Period')
    } catch (e) {
      toast.error('Failed to save rate')
    }
  }

  const itemsInPeriod = allItems.filter((i) => i.periodId.toString() === selectedPeriodId)
  const actualsInPeriod = allActuals.filter(
    (a) => a.periodId.toString() === selectedPeriodId && !isCancelStatusDoc(a.itemStatus)
  )

  const kpi = useMemo(() => {
    let totalForecast = 0
    let totalActuals = 0
    let totalPending = 0

    itemsInPeriod.forEach((item) => {
      totalForecast += getForecastAmountIdr(item)

      if (item.status === 'Pending') {
        totalPending += 1
      }
    })

    actualsInPeriod.forEach((actual) => {
      if (actual.forecastItemId) {
        totalActuals += Number(actual.amountIdr)
      }
    })

    const achievement = totalForecast > 0 ? (totalActuals / totalForecast) * 100 : 0

    return { totalForecast, totalActuals, totalPending, achievement }
  }, [itemsInPeriod, actualsInPeriod])

  // Bar Chart Data (in USD)
  const categoryData = useMemo(() => {
    const rate = Number(selectedPeriod?.exchangeRateIdrToUsd) || 15000
    const categories = ['Outstanding', 'Repair', 'Retread', 'Service', 'Accessories']
    const data = categories.map((cat) => ({ name: cat, Forecast: 0, Actual: 0 }))

    itemsInPeriod.forEach((item) => {
      if (!item.isProductAccessories) {
        data[0].Forecast += Number(item.osInvoicePrevMonth || 0) / rate
        data[1].Forecast += Number(item.repairForecast) / rate
        data[2].Forecast += Number(item.retreadForecast) / rate
        data[3].Forecast += Number(item.serviceForecast) / rate
      } else {
        data[4].Forecast += Number(item.accessoriesAmountIdr) / rate
      }
    })

    actualsInPeriod.forEach((actual) => {
      if (!actual.forecastItemId) return
      const idx = categories.indexOf(actual.category)
      if (idx !== -1) {
        data[idx].Actual += Number(actual.amountIdr) / rate
      }
    })

    return data
  }, [itemsInPeriod, actualsInPeriod])

  // Donut Chart
  const pieData = useMemo(() => {
    return categoryData.map((c) => ({ name: c.name, value: c.Forecast })).filter((c) => c.value > 0)
  }, [categoryData])

  const outstandingItems = itemsInPeriod
    .filter((i) => i.status === 'Pending')
    .sort((a, b) => {
      return getForecastAmountIdr(b) - getForecastAmountIdr(a)
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="w-[200px]">
          <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
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
      <div className="bg-muted/30 mb-4 flex items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-4">
          <Label>Kurs USD ke IDR</Label>
          <Input
            type="number"
            className="bg-background w-32"
            value={editRate}
            onChange={(e) => setEditRate(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={handleFetchRate} disabled={isFetchingRate}>
            <RefreshCw className="mr-2 h-3 w-3" />{' '}
            {isFetchingRate ? 'Fetching...' : 'Fetch Realtime'}
          </Button>
          <Button variant="default" size="sm" onClick={handleSaveRate}>
            <Save className="mr-2 h-3 w-3" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Forecast
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-6 w-6" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span>{formatCurrency(kpi.totalForecast)}</span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-blue-600">
                $
                {(
                  kpi.totalForecast / (Number(selectedPeriod?.exchangeRateIdrToUsd) || 15000)
                ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Actual
            </CardTitle>
            <Banknote className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span className="text-green-600">{formatCurrency(kpi.totalActuals)}</span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-emerald-600">
                $
                {(
                  kpi.totalActuals / (Number(selectedPeriod?.exchangeRateIdrToUsd) || 15000)
                ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Sisa Target</CardTitle>
            <Wallet className="h-6 w-6 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              <span className="text-orange-600">
                {formatCurrency(Math.max(0, kpi.totalForecast - kpi.totalActuals))}
              </span>
              <span className="text-muted-foreground text-xl font-light">|</span>
              <span className="text-amber-600">
                $
                {(
                  Math.max(0, kpi.totalForecast - kpi.totalActuals) /
                  (Number(selectedPeriod?.exchangeRateIdrToUsd) || 15000)
                ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Achievement</CardTitle>
            <Trophy className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpi.achievement.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Forecast vs Actual (By Category)</CardTitle>
            <CardDescription>Comparison in IDR</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => formatShort(val)} />
                <Tooltip
                  formatter={(val: number) =>
                    '$' +
                    val.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }
                />
                <Legend />
                <Bar dataKey="Forecast" fill="#8884d8" label={renderBarLabel} />
                <Bar dataKey="Actual" fill="#82ca9d" label={renderBarLabel} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Forecast Composition</CardTitle>
            <CardDescription>Share of forecast per category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={renderPieLabel}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) =>
                    '$' +
                    val.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Outstanding (Pending) Items</CardTitle>
          <CardDescription>Largest forecasted revenue items still pending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {outstandingItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No outstanding items.</p>
            ) : (
              outstandingItems.map((item) => {
                const total = getForecastAmountIdr(item)
                return (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{item.customer}</p>
                      <p className="text-muted-foreground text-xs">
                        PIC: {item.picSales} | Remark: {item.remark || 'None'}
                      </p>
                    </div>
                    <div className="font-bold">{formatCurrency(total)}</div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
