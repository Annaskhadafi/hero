'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { classifyEwh, formatMinutesToHours } from '@/lib/ewh/calculate-ewh'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  createEwhTeamAction,
  updateEwhTeamAction,
  deleteEwhTeamAction,
} from './actions'
import { Activity, Clock, TrendingUp, Users, Search, Download, Plus, Trash2, Edit2 } from 'lucide-react'

interface EwhRow {
  employeeId: number
  employeeName: string
  employeeSn: string
  section: string
  department: string
  shiftCode: string
  clockIn: string | null
  clockOut: string | null
  availabilityMinutes: number
  clockDurationMinutes: number
  breakMinutes: number
  effectiveMinutes: number
  idleMinutes: number
  ewhPercent: number
  ewhPercentStr: string
  activitySessionCount: number
  checkedItemCount: number
  totalItemCount: number
  overtimeMinutes: number
  workDate: Date
  period: string
}

interface TeamMember {
  id: number
  employeeId: number
  role: string
  name: string
  employeeSn: string
  jobTitle: string
}

interface EwhTeam {
  id: number
  name: string
  siteId: number
  section: string
  createdAt: Date
  updatedAt: Date
  members: TeamMember[]
}

interface Props {
  rows: EwhRow[]
  siteId: number
  period: string
  employeeSiteId: number
  teams: EwhTeam[]
  allEmployees: {
    id: number
    name: string
    employeeSn: string
    jobTitle: string
    department: string;
    section: string;
  }[]
}

const EWH_CLASS_CONFIG = {
  excellent: { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Baik', color: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Cukup', color: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Rendah', color: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  absent: { label: 'Tidak Hadir', color: 'bg-slate-300', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
}

export function EwhDashboardClient({ rows, siteId, period, employeeSiteId, teams, allEmployees }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual')
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')

  // Team Management dialog states
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<EwhTeam | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamSection, setTeamSection] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)

  // Delete Confirm States
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<EwhTeam | null>(null)

  // Aggregate EWH per employee (average EWH across all days in period)
  const employeeAggregates = useMemo(() => {
    const map = new Map<number, { rows: EwhRow[]; employee: EwhRow }>()
    for (const row of rows) {
      if (!map.has(row.employeeId)) {
        map.set(row.employeeId, { rows: [], employee: row })
      }
      map.get(row.employeeId)!.rows.push(row)
    }

    return Array.from(map.values()).map(({ rows: empRows, employee }) => {
      const avgEwh =
        empRows.reduce((sum, r) => sum + r.ewhPercent, 0) / empRows.length
      const totalEffective = empRows.reduce((sum, r) => sum + r.effectiveMinutes, 0)
      const totalClock = empRows.reduce((sum, r) => sum + r.clockDurationMinutes, 0)
      const totalOt = empRows.reduce((sum, r) => sum + r.overtimeMinutes, 0)
      const workDays = empRows.filter((r) => r.clockDurationMinutes > 0).length
      return {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        employeeSn: employee.employeeSn,
        section: employee.section,
        department: employee.department,
        avgEwh: Math.round(avgEwh * 100) / 100,
        totalEffectiveMinutes: totalEffective,
        totalClockMinutes: totalClock,
        totalOvertimeMinutes: totalOt,
        workDays,
        totalDays: empRows.length,
        ewhClass: classifyEwh(avgEwh),
      }
    })
  }, [rows])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employeeAggregates.filter((e) => {
      const matchSearch =
        !search ||
        e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeSn.toLowerCase().includes(search.toLowerCase())
      const matchSection = sectionFilter === 'all' || e.section === sectionFilter
      return matchSearch && matchSection
    })
  }, [employeeAggregates, search, sectionFilter])

  // Aggregate EWH per Team
  const teamAggregates = useMemo(() => {
    return teams.map((team) => {
      const memberIds = team.members.map((m) => m.employeeId)
      const teamEmpSnapshots = employeeAggregates.filter((emp) =>
        memberIds.includes(emp.employeeId)
      )

      if (teamEmpSnapshots.length === 0) {
        return {
          ...team,
          avgEwh: 0,
          totalEffectiveMinutes: 0,
          totalClockMinutes: 0,
          totalOvertimeMinutes: 0,
          avgWorkDays: 0,
          ewhClass: classifyEwh(0) as keyof typeof EWH_CLASS_CONFIG,
        }
      }

      const totalEwh = teamEmpSnapshots.reduce((sum, emp) => sum + emp.avgEwh, 0)
      const avgEwh = totalEwh / teamEmpSnapshots.length

      const totalEffective = teamEmpSnapshots.reduce(
        (sum, emp) => sum + emp.totalEffectiveMinutes,
        0
      )
      const totalClock = teamEmpSnapshots.reduce(
        (sum, emp) => sum + emp.totalClockMinutes,
        0
      )
      const totalOt = teamEmpSnapshots.reduce(
        (sum, emp) => sum + emp.totalOvertimeMinutes,
        0
      )
      const avgWorkDays =
        teamEmpSnapshots.reduce((sum, emp) => sum + emp.workDays, 0) /
        teamEmpSnapshots.length

      return {
        ...team,
        avgEwh: Math.round(avgEwh * 100) / 100,
        totalEffectiveMinutes: totalEffective,
        totalClockMinutes: totalClock,
        totalOvertimeMinutes: totalOt,
        avgWorkDays: Math.round(avgWorkDays * 10) / 10,
        ewhClass: classifyEwh(avgEwh) as keyof typeof EWH_CLASS_CONFIG,
      }
    })
  }, [teams, employeeAggregates])

  // Sections
  const sections = useMemo(() => {
    const empSections = employeeAggregates.map((e) => e.section)
    const teamSections = teams.map((t) => t.section)
    return ['all', ...Array.from(new Set([...empSections, ...teamSections].filter(Boolean)))]
  }, [employeeAggregates, teams])

  // Filtered team aggregates
  const filteredTeamAggregates = useMemo(() => {
    return teamAggregates.filter((t) => {
      const matchSection = sectionFilter === 'all' || t.section === sectionFilter
      const matchSearch =
        !search || t.name.toLowerCase().includes(search.toLowerCase())
      return matchSection && matchSearch
    })
  }, [teamAggregates, sectionFilter, search])

  // Summary stats (based on active view tab)
  const summary = useMemo(() => {
    if (activeTab === 'individual') {
      const totalEmployees = filteredEmployees.length
      const avgEwh =
        filteredEmployees.length > 0
          ? filteredEmployees.reduce((sum, e) => sum + e.avgEwh, 0) / filteredEmployees.length
          : 0
      const highPerformers = filteredEmployees.filter((e) => e.ewhClass === 'excellent').length
      const lowPerformers = filteredEmployees.filter(
        (e) => e.ewhClass === 'low' || e.ewhClass === 'absent'
      ).length
      return { totalEmployees, avgEwh: Math.round(avgEwh * 100) / 100, highPerformers, lowPerformers }
    } else {
      const totalTeams = filteredTeamAggregates.length
      const avgEwh =
        filteredTeamAggregates.length > 0
          ? filteredTeamAggregates.reduce((sum, t) => sum + t.avgEwh, 0) / filteredTeamAggregates.length
          : 0
      const highPerformers = filteredTeamAggregates.filter((t) => t.ewhClass === 'excellent').length
      const lowPerformers = filteredTeamAggregates.filter(
        (t) => t.ewhClass === 'low' || t.ewhClass === 'absent'
      ).length
      return { totalEmployees: totalTeams, avgEwh: Math.round(avgEwh * 100) / 100, highPerformers, lowPerformers }
    }
  }, [activeTab, filteredEmployees, filteredTeamAggregates])

  // Team Member Dropdown Filter
  const filteredEmployeesForDropdown = useMemo(() => {
    return allEmployees.filter((emp) => {
      const isAlreadySelected = selectedMembers.includes(emp.id)
      const matchesSection = !teamSection || emp.section === teamSection
      const matchesSearch =
        !memberSearch ||
        emp.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        emp.employeeSn.toLowerCase().includes(memberSearch.toLowerCase())
      return (matchesSection || isAlreadySelected) && matchesSearch
    })
  }, [allEmployees, memberSearch, teamSection, selectedMembers])

  // Get list of sections for dialog dropdown
  const teamSectionsList = useMemo(() => {
    return Array.from(new Set(allEmployees.map((emp) => emp.section).filter(Boolean)))
  }, [allEmployees])

  // Open Create/Edit dialog
  function openCreateTeam() {
    setEditingTeam(null)
    setTeamName('')
    setTeamSection('')
    setSelectedMembers([])
    setMemberSearch('')
    setTeamDialogOpen(true)
  }

  function openEditTeam(team: EwhTeam) {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamSection(team.section || '')
    setSelectedMembers(team.members.map((m) => m.employeeId))
    setMemberSearch('')
    setTeamDialogOpen(true)
  }

  // Create or Update Team
  async function handleSaveTeam() {
    if (!teamName.trim()) {
      toast.error('Nama Team wajib diisi')
      return
    }
    if (!teamSection.trim()) {
      toast.error('Section Team wajib diisi')
      return
    }
    setSavingTeam(true)
    try {
      if (editingTeam) {
        await updateEwhTeamAction(editingTeam.id, {
          name: teamName,
          section: teamSection,
          employeeIds: selectedMembers,
        })
        toast.success('Team berhasil diupdate')
      } else {
        await createEwhTeamAction({
          name: teamName,
          siteId,
          section: teamSection,
          employeeIds: selectedMembers,
        })
        toast.success('Team baru berhasil ditambahkan')
      }
      setTeamDialogOpen(false)
      router.refresh()
    } catch (err) {
      toast.error('Gagal menyimpan team', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSavingTeam(false)
    }
  }

  // Delete Team
  async function handleDeleteTeam() {
    if (!deleteConfirmTeam) return
    try {
      await deleteEwhTeamAction(deleteConfirmTeam.id)
      toast.success('Team berhasil dihapus')
      setDeleteConfirmTeam(null)
      router.refresh()
    } catch (err) {
      toast.error('Gagal menghapus team')
    }
  }

  // Toggle member selection
  function toggleMember(employeeId: number) {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  // Export CSV
  function exportCsv() {
    if (activeTab === 'individual') {
      const headers = ['No', 'Nama Karyawan', 'SN', 'Section', 'Hari Hadir', 'Total Jam Efektif', 'Total Lembur', 'Rata-rata EWH %', 'Kategori']
      const csvRows = filteredEmployees.map((e, i) => [
        i + 1,
        e.employeeName,
        e.employeeSn,
        e.section,
        e.workDays,
        formatMinutesToHours(e.totalEffectiveMinutes),
        formatMinutesToHours(e.totalOvertimeMinutes),
        e.avgEwh.toFixed(2) + '%',
        EWH_CLASS_CONFIG[e.ewhClass].label,
      ])
      const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EWH_Individu_${period}_${siteId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const headers = ['No', 'Nama Team', 'Section', 'Jumlah Anggota', 'Rata-rata Hari Hadir', 'Total Jam Efektif', 'Total Jam Lembur', 'Rata-rata EWH %', 'Kategori']
      const csvRows = filteredTeamAggregates.map((t, i) => [
        i + 1,
        t.name,
        t.section,
        t.members.length,
        t.avgWorkDays,
        formatMinutesToHours(t.totalEffectiveMinutes),
        formatMinutesToHours(t.totalOvertimeMinutes),
        t.avgEwh.toFixed(2) + '%',
        EWH_CLASS_CONFIG[t.ewhClass].label,
      ])
      const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EWH_Team_${period}_${siteId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function handlePeriodChange(newPeriod: string) {
    router.push(`/dashboard/ewh?siteId=${siteId}&period=${newPeriod}`)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher & Action Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <Button
            variant={activeTab === 'individual' ? 'default' : 'ghost'}
            className="rounded-lg px-4"
            size="sm"
            onClick={() => setActiveTab('individual')}
          >
            <Users className="mr-2 h-4 w-4" />
            Individu
          </Button>
          <Button
            variant={activeTab === 'team' ? 'default' : 'ghost'}
            className="rounded-lg px-4"
            size="sm"
            onClick={() => setActiveTab('team')}
          >
            <Activity className="mr-2 h-4 w-4" />
            Per Team
          </Button>
        </div>

        {activeTab === 'team' && (
          <Button size="sm" onClick={openCreateTeam}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Team
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {activeTab === 'individual' ? 'Total Karyawan' : 'Total Team'}
              </p>
              <p className="text-2xl font-bold">{summary.totalEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata EWH</p>
              <p className="text-2xl font-bold">{summary.avgEwh.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Excellent (≥70%)</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.highPerformers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perlu Perhatian</p>
              <p className="text-2xl font-bold text-orange-600">{summary.lowPerformers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {activeTab === 'individual' && (
          <>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau SN karyawan…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? 'Semua Section' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <Input
          type="month"
          className="w-[160px]"
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Main Table Views */}
      {activeTab === 'individual' ? (
        /* INDIVIDUAL VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
                  <th className="px-4 py-3 text-left font-semibold">Section</th>
                  <th className="px-4 py-3 text-center font-semibold">Hari Hadir</th>
                  <th className="px-4 py-3 text-center font-semibold">Jam Kerja Efektif</th>
                  <th className="px-4 py-3 text-center font-semibold">Lembur (OT)</th>
                  <th className="px-4 py-3 text-center font-semibold">Rata-rata EWH</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada data EWH untuk periode ini.
                    </td>
                  </tr>
                )}
                {filteredEmployees.map((emp) => {
                  const cfg = EWH_CLASS_CONFIG[emp.ewhClass]
                  return (
                    <tr key={emp.employeeId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{emp.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeSn}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.section || '—'}</td>
                      <td className="px-4 py-3 text-center">{emp.workDays}/{emp.totalDays}</td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {formatMinutesToHours(emp.totalEffectiveMinutes)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {formatMinutesToHours(emp.totalOvertimeMinutes)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-base">{emp.avgEwh.toFixed(1)}%</span>
                          <div className="w-full max-w-[120px] h-2 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all ${cfg.color}`}
                              style={{ width: `${Math.min(emp.avgEwh, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/ewh/${emp.employeeId}?period=${period}`
                            )
                          }
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* TEAM VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Nama Team</th>
                  <th className="px-4 py-3 text-center font-semibold">Jumlah Anggota</th>
                  <th className="px-4 py-3 text-center font-semibold">Rata-rata Kehadiran</th>
                  <th className="px-4 py-3 text-center font-semibold">Total Jam Efektif</th>
                  <th className="px-4 py-3 text-center font-semibold">Total Lembur (OT)</th>
                  <th className="px-4 py-3 text-center font-semibold">Rata-rata EWH Team</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamAggregates.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Belum ada team yang terdaftar. Tambahkan team baru untuk mulai tracking.
                    </td>
                  </tr>
                )}
                {filteredTeamAggregates.map((t) => {
                  const cfg = EWH_CLASS_CONFIG[t.ewhClass]
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{t.name}</span>
                          {t.section && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/20 text-primary bg-primary/5">
                              {t.section}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.members.map((m) => (
                            <Badge key={m.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{t.members.length} Karyawan</td>
                      <td className="px-4 py-3 text-center">{t.avgWorkDays} Hari</td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {formatMinutesToHours(t.totalEffectiveMinutes)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-xs">
                        {formatMinutesToHours(t.totalOvertimeMinutes)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-base">{t.avgEwh.toFixed(1)}%</span>
                          <div className="w-full max-w-[120px] h-2 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all ${cfg.color}`}
                              style={{ width: `${Math.min(t.avgEwh, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditTeam(t)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmTeam(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? 'Edit Team EWH' : 'Tambah Team Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label>Nama Team</Label>
              <Input
                placeholder="Contoh: Crew A Hauling, Tim Workshop 2…"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Section</Label>
              <Select value={teamSection} onValueChange={setTeamSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Section Team…" />
                </SelectTrigger>
                <SelectContent>
                  {teamSectionsList.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                  {teamSection && !teamSectionsList.includes(teamSection) && (
                    <SelectItem value={teamSection}>{teamSection}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pilih Anggota Team</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari karyawan berdasarkan nama atau SN…"
                  className="pl-8 text-xs h-9"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </div>

              <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-2 bg-muted/20">
                {filteredEmployeesForDropdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Karyawan tidak ditemukan
                  </p>
                ) : (
                  filteredEmployeesForDropdown.map((emp) => {
                    const isChecked = selectedMembers.includes(emp.id)
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleMember(emp.id)}
                      >
                        <Checkbox
                          id={`member-${emp.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleMember(emp.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`member-${emp.id}`} className="text-xs font-semibold truncate cursor-pointer block">{emp.name}</label>
                          <p className="text-[10px] text-muted-foreground truncate">
                            SN: {emp.employeeSn} | {emp.jobTitle}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveTeam} disabled={savingTeam}>
              {savingTeam ? 'Menyimpan…' : editingTeam ? 'Simpan Perubahan' : 'Tambah Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={deleteConfirmTeam !== null} onOpenChange={() => setDeleteConfirmTeam(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Team</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus team <strong className="text-foreground">{deleteConfirmTeam?.name}</strong>?
            Tindakan ini hanya menghapus pengelompokan team, data EWH karyawan individu tidak akan hilang.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTeam(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-4">
        <span className="font-semibold">Kategori EWH (basis 24 jam):</span>
        {Object.entries(EWH_CLASS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${cfg.color}`} />
            {cfg.label}
            {key === 'excellent' && ' (≥70%)'}
            {key === 'good' && ' (55–70%)'}
            {key === 'fair' && ' (40–55%)'}
            {key === 'low' && ' (<40%)'}
          </span>
        ))}
      </div>
    </div>
  )
}
