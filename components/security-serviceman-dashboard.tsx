'use client'

import React, { useMemo, useState } from 'react'
import {
  Users2,
  Award,
  Scroll,
  Trophy,
  Hourglass,
  ChevronDown,
  SlidersHorizontal,
  Layers3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LabelList,
} from 'recharts'
import type { SecurityUserRecord } from '@/lib/hero-admin'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface SecurityServicemanDashboardProps {
  users: SecurityUserRecord[]
}

// Helper to calculate tenure years
function getTenureYears(joinDateStr: string | null | undefined): number {
  if (!joinDateStr) return 0
  const joinDate = new Date(joinDateStr)
  if (isNaN(joinDate.getTime())) return 0
  const today = new Date()
  const diffTime = today.getTime() - joinDate.getTime()
  return diffTime / (1000 * 60 * 60 * 24 * 365.25)
}

// Helper to check employee status types
function isPermanent(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return s.includes('permanen') || s.includes('tetap') || s.includes('permanent') || s.includes('pkwtt')
}

function isContract(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return s.includes('kontrak') || s.includes('contract') || s.includes('pkwt')
}

export function SecurityServicemanDashboard({ users }: SecurityServicemanDashboardProps) {
  // Get all unique departments and sections
  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department).filter(Boolean))).sort()
  }, [users])

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [openDeptFilter, setOpenDeptFilter] = useState(false)
  const [openSectionFilter, setOpenSectionFilter] = useState(false)

  // Filter sections options based on selected departments
  const uniqueSections = useMemo(() => {
    const relevantUsers = selectedDepartments.length === 0
      ? users
      : users.filter((u) => u.department && selectedDepartments.includes(u.department))
    return Array.from(new Set(relevantUsers.map((u) => u.section).filter(Boolean))).sort()
  }, [users, selectedDepartments])

  // Filter users based on selected departments & sections
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchDept = selectedDepartments.length === 0 || (u.department && selectedDepartments.includes(u.department))
      const matchSec = selectedSections.length === 0 || (u.section && selectedSections.includes(u.section))
      return matchDept && matchSec
    })
  }, [users, selectedDepartments, selectedSections])

  // Compute metrics
  const metrics = useMemo(() => {
    const total = filteredUsers.length
    const permanentCount = filteredUsers.filter((u) => isPermanent(u.employeeStatusType)).length
    const contractCount = filteredUsers.filter((u) => isContract(u.employeeStatusType)).length

    const tenureOver5 = filteredUsers.filter((u) => getTenureYears(u.joinDate) >= 5).length
    const tenureUnder5 = total - tenureOver5

    // Tenure & Status mapping
    const permOver5 = filteredUsers.filter(
      (u) => isPermanent(u.employeeStatusType) && getTenureYears(u.joinDate) >= 5
    ).length
    const permUnder5 = filteredUsers.filter(
      (u) => isPermanent(u.employeeStatusType) && getTenureYears(u.joinDate) < 5
    ).length
    const contrOver5 = filteredUsers.filter(
      (u) => isContract(u.employeeStatusType) && getTenureYears(u.joinDate) >= 5
    ).length
    const contrUnder5 = filteredUsers.filter(
      (u) => isContract(u.employeeStatusType) && getTenureYears(u.joinDate) < 5
    ).length

    return {
      total,
      permanentCount,
      contractCount,
      tenureOver5,
      tenureUnder5,
      permOver5,
      permUnder5,
      contrOver5,
      contrUnder5,
    }
  }, [filteredUsers])

  // Chart Data
  const compositionData = [
    { name: 'Permanent', value: metrics.permanentCount, color: '#8ec343' },
    { name: 'Contract', value: metrics.contractCount, color: '#0b4c8c' },
  ]

  const tenureAnalysisData = [
    { name: '> 5 Years', value: metrics.tenureOver5, color: '#0b4c8c' },
    { name: '< 5 Years', value: metrics.tenureUnder5, color: '#8ec343' },
  ]

  const statusVsTenureData = [
    {
      name: 'Permanent',
      '> 5 Years': metrics.permOver5,
      '< 5 Years': metrics.permUnder5,
    },
    {
      name: 'Contract',
      '> 5 Years': metrics.contrOver5,
      '< 5 Years': metrics.contrUnder5,
    },
  ]

  // Calculate percentages safely
  const pct = (val: number, total: number) => (total > 0 ? (val / total) * 100 : 0)

  // Custom Label Renderer for Pie Chart to avoid truncation
  const renderCustomizedPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }: any) => {
    const RADIAN = Math.PI / 185
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const dataVal = compositionData[index]

    if (dataVal.value === 0) return null

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#0b4c8c]/8 px-3 py-1.5">
            <SlidersHorizontal className="size-4 text-[#0b4c8c]" />
            <span className="text-sm font-semibold text-[#0b4c8c]">Filter Dashboard:</span>
          </div>

          {/* Department Filter */}
          <Popover open={openDeptFilter} onOpenChange={setOpenDeptFilter}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-[180px] justify-between border-slate-200 text-xs shadow-none hover:bg-slate-50"
              >
                <span className="truncate flex items-center gap-1.5">
                  <Layers3 className="size-3 text-slate-400" />
                  {selectedDepartments.length === 0
                    ? 'Semua Departemen'
                    : `${selectedDepartments.length} Departemen`}
                </span>
                <ChevronDown className="ml-2 size-3.5 opacity-55" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari departemen..." className="h-9" />
                <CommandList className="max-h-[220px]">
                  <CommandEmpty>Tidak ada departemen.</CommandEmpty>
                  <CommandGroup>
                    {uniqueDepartments.map((dept) => (
                      <CommandItem
                        key={dept}
                        onSelect={() => {
                          if (selectedDepartments.includes(dept)) {
                            setSelectedDepartments(selectedDepartments.filter((d) => d !== dept))
                          } else {
                            setSelectedDepartments([...selectedDepartments, dept])
                          }
                          // Reset section when department changes to keep it valid
                          setSelectedSections([])
                        }}
                        className="flex items-center gap-2 px-2 py-2"
                      >
                        <Checkbox checked={selectedDepartments.includes(dept)} />
                        <span className="flex-1 truncate text-sm">{dept}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                {selectedDepartments.length > 0 && (
                  <div className="border-t border-slate-100 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDepartments([])
                        setSelectedSections([])
                      }}
                      className="h-8 w-full justify-center text-xs text-slate-500"
                    >
                      Bersihkan departemen
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>

          {/* Section Filter */}
          <Popover open={openSectionFilter} onOpenChange={setOpenSectionFilter}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-[180px] justify-between border-slate-200 text-xs shadow-none hover:bg-slate-50"
              >
                <span className="truncate">
                  {selectedSections.length === 0
                    ? 'Semua Section'
                    : `${selectedSections.length} Section`}
                </span>
                <ChevronDown className="ml-2 size-3.5 opacity-55" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cari section..." className="h-9" />
                <CommandList className="max-h-[220px]">
                  <CommandEmpty>Tidak ada section.</CommandEmpty>
                  <CommandGroup>
                    {uniqueSections.map((sec) => (
                      <CommandItem
                        key={sec}
                        onSelect={() => {
                          if (selectedSections.includes(sec)) {
                            setSelectedSections(selectedSections.filter((s) => s !== sec))
                          } else {
                            setSelectedSections([...selectedSections, sec])
                          }
                        }}
                        className="flex items-center gap-2 px-2 py-2"
                      >
                        <Checkbox checked={selectedSections.includes(sec)} />
                        <span className="flex-1 truncate text-sm">{sec}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                {selectedSections.length > 0 && (
                  <div className="border-t border-slate-100 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSections([])}
                      className="h-8 w-full justify-center text-xs text-slate-500"
                    >
                      Bersihkan section
                    </Button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-xs text-slate-500">
          Menampilkan <strong>{filteredUsers.length}</strong> dari <strong>{users.length}</strong> Karyawan
        </div>
      </div>

      {/* DASHBOARD KARYAWAN Banner */}
      <div className="rounded-lg bg-[#0b4c8c] py-4 text-center font-bold tracking-wider text-white shadow-sm text-lg md:text-xl">
        DASHBOARD KARYAWAN
      </div>

      {/* Metric Scorecards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* TOTAL KARYAWAN */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#36a2eb] bg-gradient-to-br from-white to-[#36a2eb]/5 p-4 shadow-sm">
          <div className="absolute right-3 top-3 opacity-6">
            <Users2 className="size-14 text-[#36a2eb]" />
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Karyawan
            </span>
            <div className="rounded-xl bg-[#36a2eb] p-2 text-white shadow-sm">
              <Users2 className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold text-slate-800">{metrics.total}</p>
          <p className="mt-1 text-[11px] text-slate-400">Seluruh karyawan terdaftar</p>
        </div>

        {/* TOTAL PERMANENT */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#8ec343] bg-gradient-to-br from-white to-[#8ec343]/5 p-4 shadow-sm">
          <div className="absolute right-3 top-3 opacity-6">
            <Award className="size-14 text-[#8ec343]" />
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Permanent
            </span>
            <div className="rounded-xl bg-[#8ec343] p-2 text-white shadow-sm">
              <Award className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold text-slate-800">{metrics.permanentCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">PKWTT / Tetap</p>
        </div>

        {/* TOTAL CONTRACT */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#ff9f40] bg-gradient-to-br from-white to-[#ff9f40]/5 p-4 shadow-sm">
          <div className="absolute right-3 top-3 opacity-6">
            <Scroll className="size-14 text-[#ff9f40]" />
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Contract
            </span>
            <div className="rounded-xl bg-[#ff9f40] p-2 text-white shadow-sm">
              <Scroll className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold text-slate-800">{metrics.contractCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">PKWT / Kontrak</p>
        </div>

        {/* TOTAL TENURE > 5 YEARS */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#9966ff] bg-gradient-to-br from-white to-[#9966ff]/5 p-4 shadow-sm">
          <div className="absolute right-3 top-3 opacity-6">
            <Trophy className="size-14 text-[#9966ff]" />
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tenure &gt; 5 Years
            </span>
            <div className="rounded-xl bg-[#9966ff] p-2 text-white shadow-sm">
              <Trophy className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold text-slate-800">{metrics.tenureOver5}</p>
          <p className="mt-1 text-[11px] text-slate-400">Masa kerja senior</p>
        </div>

        {/* TOTAL TENURE < 5 YEARS */}
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#ffcd56] bg-gradient-to-br from-white to-[#ffcd56]/5 p-4 shadow-sm">
          <div className="absolute right-3 top-3 opacity-6">
            <Hourglass className="size-14 text-[#ffcd56]" />
          </div>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tenure &lt; 5 Years
            </span>
            <div className="rounded-xl bg-[#ffcd56] p-2 text-white shadow-sm">
              <Hourglass className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold text-slate-800">{metrics.tenureUnder5}</p>
          <p className="mt-1 text-[11px] text-slate-400">Masa kerja junior</p>
        </div>
      </div>

      {/* Main Analysis Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel 1: Composition Permanent vs Contract */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0b4c8c] to-[#1a6cbf] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white rounded-lg shadow-sm">
            <Award className="size-3.5" />
            Composition Permanent vs Contract
          </h3>
          <div className="flex h-52 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedPieLabel}
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Karyawan`, 'Jumlah']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Annotation */}
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 border border-slate-100 leading-relaxed">
            <strong>Anotasi:</strong> Mayoritas staf berstatus <strong>Contract</strong> ({pct(metrics.contractCount, metrics.total).toFixed(1)}%) dibandingkan <strong>Permanent</strong> ({pct(metrics.permanentCount, metrics.total).toFixed(1)}%).
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-slate-100 text-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700">
                  <th className="p-2 border-b">Employee Status</th>
                  <th className="p-2 border-b text-right">Qty</th>
                  <th className="p-2 border-b text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">Permanent</td>
                  <td className="p-2 text-right">{metrics.permanentCount}</td>
                  <td className="p-2 text-right">{pct(metrics.permanentCount, metrics.total).toFixed(2)}%</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">Contract</td>
                  <td className="p-2 text-right">{metrics.contractCount}</td>
                  <td className="p-2 text-right">{pct(metrics.contractCount, metrics.total).toFixed(2)}%</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{metrics.total}</td>
                  <td className="p-2 text-right">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Tenure Analysis */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0b4c8c] to-[#1a6cbf] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white rounded-lg shadow-sm">
            <TrendingUp className="size-3.5" />
            Tenure Analysis
          </h3>
          <div className="flex h-52 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={tenureAnalysisData} 
                margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                style={{ overflow: 'visible' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip formatter={(value) => [`${value} Karyawan`, 'Jumlah']} />
                <Bar dataKey="value" barSize={35} radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    style={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                  />
                  {tenureAnalysisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Annotation */}
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 border border-slate-100 leading-relaxed">
            <strong>Anotasi:</strong> Proporsi terbesar adalah masa kerja baru <strong>&lt; 5 Tahun</strong> ({pct(metrics.tenureUnder5, metrics.total).toFixed(1)}%), menunjukkan pertumbuhan rekrutmen tinggi.
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-slate-100 text-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700">
                  <th className="p-2 border-b">Employee Status</th>
                  <th className="p-2 border-b text-right">Qty</th>
                  <th className="p-2 border-b text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">&gt; 5 Years</td>
                  <td className="p-2 text-right">{metrics.tenureOver5}</td>
                  <td className="p-2 text-right">{pct(metrics.tenureOver5, metrics.total).toFixed(2)}%</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">&lt; 5 Years</td>
                  <td className="p-2 text-right">{metrics.tenureUnder5}</td>
                  <td className="p-2 text-right">{pct(metrics.tenureUnder5, metrics.total).toFixed(2)}%</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{metrics.total}</td>
                  <td className="p-2 text-right">100.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3: Tenure vs Employee Status */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h3 className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0b4c8c] to-[#1a6cbf] py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white rounded-lg shadow-sm">
            <TrendingDown className="size-3.5" />
            Tenure vs Employee Status
          </h3>
          <div className="flex h-52 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={statusVsTenureData} 
                margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
                style={{ overflow: 'visible' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip formatter={(value) => [`${value} Karyawan`, 'Masa Kerja']} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="> 5 Years" fill="#0b4c8c" barSize={20} radius={[2, 2, 0, 0]}>
                  <LabelList 
                    dataKey="> 5 Years" 
                    position="top" 
                    style={{ fill: '#0b4c8c', fontSize: 10, fontWeight: 'bold' }} 
                  />
                </Bar>
                <Bar dataKey="< 5 Years" fill="#8ec343" barSize={20} radius={[2, 2, 0, 0]}>
                  <LabelList 
                    dataKey="< 5 Years" 
                    position="top" 
                    style={{ fill: '#8ec343', fontSize: 10, fontWeight: 'bold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Annotation */}
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 border border-slate-100 leading-relaxed">
            <strong>Anotasi:</strong> Pekerja <strong>Permanent</strong> didominasi masa kerja lama &gt; 5 tahun ({pct(metrics.permOver5, metrics.permanentCount).toFixed(0)}%), sedangkan <strong>Contract</strong> didominasi pekerja baru &lt; 5 tahun ({pct(metrics.contrUnder5, metrics.contractCount).toFixed(0)}%).
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-slate-100 text-xs">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 font-bold text-slate-700">
                  <th className="p-2 border-b" rowSpan={2}>Masa</th>
                  <th className="p-2 border-b text-center" colSpan={2}>Permanent</th>
                  <th className="p-2 border-b text-center" colSpan={2}>Contract</th>
                  <th className="p-2 border-b text-center" colSpan={2}>Total</th>
                </tr>
                <tr className="bg-slate-100 text-[10px] text-slate-600">
                  <th className="p-1 border-b text-right">Qty</th>
                  <th className="p-1 border-b text-right">%</th>
                  <th className="p-1 border-b text-right">Qty</th>
                  <th className="p-1 border-b text-right">%</th>
                  <th className="p-1 border-b text-right">Qty</th>
                  <th className="p-1 border-b text-right">%</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">&gt; 5 Years</td>
                  <td className="p-2 text-right">{metrics.permOver5}</td>
                  <td className="p-2 text-right">{pct(metrics.permOver5, metrics.permanentCount).toFixed(0)}%</td>
                  <td className="p-2 text-right">{metrics.contrOver5}</td>
                  <td className="p-2 text-right">{pct(metrics.contrOver5, metrics.contractCount).toFixed(0)}%</td>
                  <td className="p-2 text-right">{metrics.tenureOver5}</td>
                  <td className="p-2 text-right">{pct(metrics.tenureOver5, metrics.total).toFixed(0)}%</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium text-slate-600">&lt; 5 Years</td>
                  <td className="p-2 text-right">{metrics.permUnder5}</td>
                  <td className="p-2 text-right">{pct(metrics.permUnder5, metrics.permanentCount).toFixed(0)}%</td>
                  <td className="p-2 text-right">{metrics.contrUnder5}</td>
                  <td className="p-2 text-right">{pct(metrics.contrUnder5, metrics.contractCount).toFixed(0)}%</td>
                  <td className="p-2 text-right">{metrics.tenureUnder5}</td>
                  <td className="p-2 text-right">{pct(metrics.tenureUnder5, metrics.total).toFixed(0)}%</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="p-2">Total</td>
                  <td className="p-2 text-right">{metrics.permanentCount}</td>
                  <td className="p-2 text-right">100%</td>
                  <td className="p-2 text-right">{metrics.contractCount}</td>
                  <td className="p-2 text-right">100%</td>
                  <td className="p-2 text-right">{metrics.total}</td>
                  <td className="p-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
