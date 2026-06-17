'use client'

import React, { useMemo } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Users,
  FileText,
  Award,
  Scale,
  Building2,
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
} from 'recharts'
import type { SecurityUserRecord } from '@/lib/hero-admin'

interface SecurityUserDashboardProps {
  users: SecurityUserRecord[]
}

// Extract site name from workLocation
function extractSiteName(workLocation: string | null | undefined): string {
  if (!workLocation) return '-'
  const parts = workLocation.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : workLocation.trim()
}

// Normalize gender
function getGenderLabel(gender: string | null | undefined): 'Male' | 'Female' | 'Unknown' {
  if (!gender) return 'Unknown'
  const g = gender.toLowerCase().trim()
  if (g === '1' || g === 'l' || g === 'm' || g === 'male' || g === 'laki-laki' || g === 'laki - laki') return 'Male'
  if (g === '2' || g === 'p' || g === 'f' || g === 'female' || g === 'perempuan') return 'Female'
  return 'Unknown'
}

// Calculate age from birth date string
function getAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null
  try {
    const birthDate = new Date(birthDateStr)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  } catch {
    return null
  }
}

// Get age bucket
function getAgeBucket(age: number): string {
  if (age <= 22) return '18-22'
  if (age <= 27) return '23-27'
  if (age <= 32) return '28-32'
  if (age <= 37) return '33-37'
  if (age <= 42) return '38-42'
  if (age <= 47) return '43-47'
  if (age <= 52) return '48-52'
  if (age <= 57) return '53-57'
  return '58+'
}

// Colors from reference image
const COLOR_MALE = '#0b4c8c' // Deep Navy Blue
const COLOR_FEMALE = '#8ec343' // Lime Green
const RELIGION_COLORS = [
  '#09315d', // Very dark blue
  '#0b4c8c', // Deep blue
  '#3a86c8', // Muted blue
  '#7cb9e8', // Light blue
  '#b3d9ff', // Pale blue
  '#e6f2ff', // Very light blue
]

export function SecurityUserDashboard({ users }: SecurityUserDashboardProps) {
  // 1. Calculate General Metrics
  const metrics = useMemo(() => {
    const total = users.length
    const maleUsers = users.filter((u) => getGenderLabel(u.gender) === 'Male')
    const femaleUsers = users.filter((u) => getGenderLabel(u.gender) === 'Female')

    // Contract (Kontrak) vs Permanent (Permanen)
    const isContract = (status: string | null | undefined) => {
      if (!status) return false
      const s = status.toLowerCase()
      return s.includes('kontrak') || s.includes('contract') || s.includes('pkwt')
    }

    const isPermanent = (status: string | null | undefined) => {
      if (!status) return false
      const s = status.toLowerCase()
      return s.includes('permanen') || s.includes('tetap') || s.includes('permanent') || s.includes('pkwtt')
    }

    const contractList = users.filter((u) => isContract(u.employeeStatusType))
    const permanentList = users.filter((u) => isPermanent(u.employeeStatusType))

    const contractMale = contractList.filter((u) => getGenderLabel(u.gender) === 'Male').length
    const contractFemale = contractList.filter((u) => getGenderLabel(u.gender) === 'Female').length

    const permanentMale = permanentList.filter((u) => getGenderLabel(u.gender) === 'Male').length
    const permanentFemale = permanentList.filter((u) => getGenderLabel(u.gender) === 'Female').length

    // Status difference calculation: (Contract - Permanent) / Total
    const difference = total > 0 ? ((contractList.length - permanentList.length) / total) * 100 : 0

    return {
      total,
      maleCount: maleUsers.length,
      femaleCount: femaleUsers.length,
      malePct: total > 0 ? (maleUsers.length / total) * 100 : 0,
      femalePct: total > 0 ? (femaleUsers.length / total) * 100 : 0,
      contract: contractList.length,
      contractMale,
      contractFemale,
      contractMalePct: contractList.length > 0 ? (contractMale / contractList.length) * 100 : 0,
      contractFemalePct: contractList.length > 0 ? (contractFemale / contractList.length) * 100 : 0,
      permanent: permanentList.length,
      permanentMale,
      permanentFemale,
      permanentMalePct: permanentList.length > 0 ? (permanentMale / permanentList.length) * 100 : 0,
      permanentFemalePct: permanentList.length > 0 ? (permanentFemale / permanentList.length) * 100 : 0,
      difference,
    }
  }, [users])

  // 2. Calculate Min & Max Join Date
  const joinDateRangeStr = useMemo(() => {
    const validDates = users
      .map((u) => (u.joinDate ? new Date(u.joinDate) : null))
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))

    if (validDates.length === 0) return '05 May 1997 - 05 May 2025'

    const minDate = new Date(Math.min(...validDates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())))

    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
    const format = (d: Date) => d.toLocaleDateString('en-GB', options)

    return `${format(minDate)} - ${format(maxDate)}`
  }, [users])

  // 3. Current Date for Header display
  const currentDateStr = useMemo(() => {
    const today = new Date()
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    return today.toLocaleDateString('en-GB', options)
  }, [])

  // 4. Age Data
  const ageData = useMemo(() => {
    const buckets = ['18-22', '23-27', '28-32', '33-37', '38-42', '43-47', '48-52', '53-57', '58+']
    const dataMap = buckets.reduce((acc, b) => {
      acc[b] = { name: b, Male: 0, Female: 0 }
      return acc
    }, {} as Record<string, { name: string; Male: number; Female: number }>)

    users.forEach((u) => {
      const age = getAge(u.birthDate)
      if (age !== null) {
        const bucket = getAgeBucket(age)
        const gender = getGenderLabel(u.gender)
        if (gender === 'Male') dataMap[bucket].Male++
        if (gender === 'Female') dataMap[bucket].Female++
      }
    })

    return buckets.map((b) => dataMap[b])
  }, [users])

  // 5. Marital Status Data
  const maritalData = useMemo(() => {
    const map: Record<string, { name: string; Male: number; Female: number }> = {
      'Single': { name: 'Single', Male: 0, Female: 0 },
      'Married': { name: 'Married', Male: 0, Female: 0 },
      'Widow': { name: 'Widow', Male: 0, Female: 0 },
      'Widower': { name: 'Widower', Male: 0, Female: 0 },
    }

    users.forEach((u) => {
      let status = 'Single'
      const raw = u.maritalStatus?.toLowerCase().trim() || ''
      if (raw.includes('married') || raw.startsWith('k') || raw.includes('nikah') || raw.includes('kawin')) {
        status = 'Married'
      } else if (raw.includes('widow') || raw.includes('janda')) {
        status = 'Widow'
      } else if (raw.includes('widower') || raw.includes('duda')) {
        status = 'Widower'
      }

      const gender = getGenderLabel(u.gender)
      if (gender === 'Male') map[status].Male++
      if (gender === 'Female') map[status].Female++
    })

    return Object.values(map)
  }, [users])

  // 6. Education Data
  const educationData = useMemo(() => {
    const counts: Record<string, { name: string; Male: number; Female: number }> = {}

    users.forEach((u) => {
      let edu = u.education?.toUpperCase().trim() || 'BELUM DIATUR'
      if (edu === 'SLTA' || edu === 'SLTP' || edu === 'SEKOLAH MENENGAH ATAS') edu = 'SMA'
      if (edu === 'SEKOLAH MENENGAH KEJURUAN') edu = 'SMK'

      if (!counts[edu]) {
        counts[edu] = { name: edu, Male: 0, Female: 0 }
      }

      const gender = getGenderLabel(u.gender)
      if (gender === 'Male') counts[edu].Male++
      if (gender === 'Female') counts[edu].Female++
    })

    return Object.values(counts)
      .sort((a, b) => (b.Male + b.Female) - (a.Male + a.Female))
      .slice(0, 8)
  }, [users])

  // 7. Religion Data
  const religionData = useMemo(() => {
    const counts: Record<string, number> = {}
    users.forEach((u) => {
      let rel = u.religion?.trim() || 'Belum Diatur'
      rel = rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase()
      counts[rel] = (counts[rel] || 0) + 1
    })

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [users])

  // 8. Location Data
  const locationData = useMemo(() => {
    const counts: Record<string, { name: string; Male: number; Female: number }> = {}

    users.forEach((u) => {
      const loc = u.siteName || 'Belum Diatur'
      if (!counts[loc]) {
        counts[loc] = { name: loc, Male: 0, Female: 0 }
      }

      const gender = getGenderLabel(u.gender)
      if (gender === 'Male') counts[loc].Male++
      if (gender === 'Female') counts[loc].Female++
    })

    return Object.values(counts)
      .sort((a, b) => (b.Male + b.Female) - (a.Male + a.Female))
      .slice(0, 8)
  }, [users])

  // 9. Department Data
  const departmentData = useMemo(() => {
    const counts: Record<string, { name: string; Male: number; Female: number }> = {}

    users.forEach((u) => {
      const dept = u.department || 'Belum Diatur'
      if (!counts[dept]) {
        counts[dept] = { name: dept, Male: 0, Female: 0 }
      }

      const gender = getGenderLabel(u.gender)
      if (gender === 'Male') counts[dept].Male++
      if (gender === 'Female') counts[dept].Female++
    })

    return Object.values(counts)
      .sort((a, b) => (b.Male + b.Female) - (a.Male + a.Female))
      .slice(0, 8)
  }, [users])

  // 10. Level Data
  const levelData = useMemo(() => {
    const counts: Record<string, { name: string; Male: number; Female: number }> = {}

    users.forEach((u) => {
      const lvl = u.levelName || 'Staff'
      if (!counts[lvl]) {
        counts[lvl] = { name: lvl, Male: 0, Female: 0 }
      }

      const gender = getGenderLabel(u.gender)
      if (gender === 'Male') counts[lvl].Male++
      if (gender === 'Female') counts[lvl].Female++
    })

    return Object.values(counts)
      .sort((a, b) => (b.Male + b.Female) - (a.Male + a.Female))
      .slice(0, 8)
  }, [users])

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header Control */}
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0e4886] tracking-tight">Employee Demographics Dashboard</h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span>Join Date: {joinDateRangeStr}</span>
          </div>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          {currentDateStr}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees */}
        <div className="rounded-[1rem] bg-[#0e4886] p-5 text-white shadow-md transition-all hover:shadow-lg relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white pointer-events-none">
            <Users className="size-24" />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Users className="size-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">Total Karyawan</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">{metrics.total}</span>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-white" />
              <span className="font-semibold">{metrics.maleCount} Men ({metrics.malePct.toFixed(2)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#8ec343]" />
              <span className="font-semibold">{metrics.femaleCount} Women ({metrics.femalePct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Contract Employees */}
        <div className="rounded-[1rem] bg-[#0e4886] p-5 text-white shadow-md transition-all hover:shadow-lg relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white pointer-events-none">
            <FileText className="size-24" />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2">
              <FileText className="size-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">Karyawan Kontrak</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">{metrics.contract}</span>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-white" />
              <span className="font-semibold">{metrics.contractMale} Men ({metrics.contractMalePct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#8ec343]" />
              <span className="font-semibold">{metrics.contractFemale} Women ({metrics.contractFemalePct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Permanent Employees */}
        <div className="rounded-[1rem] bg-[#0e4886] p-5 text-white shadow-md transition-all hover:shadow-lg relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white pointer-events-none">
            <Award className="size-24" />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Award className="size-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">Karyawan Permanen</span>
            </div>
            <span className="text-3xl font-bold tracking-tight">{metrics.permanent}</span>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-white" />
              <span className="font-semibold">{metrics.permanentMale} Men ({metrics.permanentMalePct.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-[#8ec343]" />
              <span className="font-semibold">{metrics.permanentFemale} Women ({metrics.permanentFemalePct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Difference Card */}
        <div className="rounded-[1rem] bg-[#0e4886] p-5 text-white shadow-md transition-all hover:shadow-lg relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white pointer-events-none">
            <Scale className="size-24" />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Scale className="size-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">Selisih Status Karyawan</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-bold tracking-tight">
                {metrics.difference >= 0 ? '+' : ''}
                {metrics.difference.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4 text-xs relative z-10">
            <div className="flex items-center gap-1">
              {metrics.difference >= 0 ? <TrendingUp className="size-4 text-emerald-400" /> : <TrendingDown className="size-4 text-rose-400" />}
              <span className="font-semibold">Trend Kepegawaian</span>
            </div>
            <span className="font-bold opacity-80">Kontrak vs Tetap</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections - Row 1: Umur, Status Nikah, Pendidikan */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Age Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Umur</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={ageData} margin={{ left: 15, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={14} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marital Status Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Status Nikah</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maritalData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={20} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={20} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Education Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Pendidikan</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={educationData} margin={{ left: 20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={14} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections - Row 2: Agama & Level (50/50 Split) */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Religion Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Agama</h3>
          <div className="flex h-64 w-full items-center justify-between">
            <div className="relative size-full max-w-[60%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={religionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {religionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RELIGION_COLORS[index % RELIGION_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex max-w-[40%] flex-col gap-2.5 overflow-y-auto pr-2 text-xs">
              {religionData.slice(0, 6).map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full shrink-0"
                    style={{ backgroundColor: RELIGION_COLORS[index % RELIGION_COLORS.length] }}
                  />
                  <span className="truncate text-slate-600 font-medium">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Level</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={levelData} margin={{ left: 60, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={14} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Visual Analytics Sections - Row 3 & 4: Full-width Lokasi & Departemen */}
      <div className="grid gap-6 mt-6">
        {/* Location Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Lokasi</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={locationData} margin={{ left: 160, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={14} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Demographics */}
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Total Karyawan Berdasarkan Departemen</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={departmentData} margin={{ left: 160, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Male" stackId="a" fill={COLOR_MALE} barSize={14} radius={[0, 2, 2, 0]} />
                <Bar dataKey="Female" stackId="a" fill={COLOR_FEMALE} barSize={14} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
