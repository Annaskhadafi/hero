'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, Download, BadgeCheck, XCircle, Clock, BookOpen, GraduationCap, MapPin, Award, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type ReportRow = {
  id: number
  courseTitle: string
  employeeName: string
  employeeSn: string
  siteId?: number | null
  siteName?: string | null
  status: string
  progress: number
  pretestScore: number | null
  posttestScore: number | null
  posttestAttempts?: number | null
  finalScore: number | null
  isPassed: boolean
  completedAt: Date | null
  certificateNumber: string | null
  certificateIssuedAt: Date | null
}

export interface EmployeeReportGroup {
  employeeName: string
  employeeSn: string
  siteId?: number | null
  siteName?: string | null
  courses: ReportRow[]
  totalCourses: number
  passedCourses: number
  inProgressCourses: number
  failedCourses: number
  averageProgress: number
  averageScore: number | null
}

export function ReportsClient({
  data,
  sites = [],
}: {
  data: ReportRow[]
  sites?: { id: number; name: string }[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedGroup, setSelectedGroup] = useState<EmployeeReportGroup | null>(null)

  // 1. Group data by employee
  const groupedEmployees = useMemo(() => {
    const map = new Map<string, EmployeeReportGroup>()

    for (const row of data) {
      const key = row.employeeSn || row.employeeName
      if (!map.has(key)) {
        map.set(key, {
          employeeName: row.employeeName,
          employeeSn: row.employeeSn,
          siteId: row.siteId,
          siteName: row.siteName,
          courses: [],
          totalCourses: 0,
          passedCourses: 0,
          inProgressCourses: 0,
          failedCourses: 0,
          averageProgress: 0,
          averageScore: null,
        })
      }
      map.get(key)!.courses.push(row)
    }

    return Array.from(map.values()).map((group) => {
      const total = group.courses.length
      const passed = group.courses.filter((c) => c.isPassed || c.status === 'passed').length
      const failed = group.courses.filter((c) => c.status === 'failed').length
      const inProgress = group.courses.filter(
        (c) => c.status !== 'passed' && !c.isPassed && c.status !== 'failed'
      ).length

      const totalProgress = group.courses.reduce((sum, c) => sum + (c.progress || 0), 0)
      const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0

      const scoredCourses = group.courses.filter((c) => c.finalScore != null || c.posttestScore != null)
      const avgScore = scoredCourses.length > 0
        ? Math.round(
            scoredCourses.reduce((sum, c) => sum + (c.finalScore ?? c.posttestScore ?? 0), 0) /
              scoredCourses.length
          )
        : null

      return {
        ...group,
        totalCourses: total,
        passedCourses: passed,
        inProgressCourses: inProgress,
        failedCourses: failed,
        averageProgress: avgProgress,
        averageScore: avgScore,
      }
    })
  }, [data])

  // 2. Filter grouped employees
  const filteredGroups = useMemo(() => {
    return groupedEmployees.filter((group) => {
      const matchesSite =
        selectedSiteId === 'all' || !selectedSiteId || String(group.siteId) === selectedSiteId

      if (!matchesSite) return false

      if (!searchTerm.trim()) return true

      const q = searchTerm.toLowerCase().trim()
      const matchesName = group.employeeName.toLowerCase().includes(q)
      const matchesSn = group.employeeSn.toLowerCase().includes(q)
      const matchesCourse = group.courses.some((c) => c.courseTitle.toLowerCase().includes(q))

      return matchesName || matchesSn || matchesCourse
    })
  }, [groupedEmployees, selectedSiteId, searchTerm])

  const handleExportCsv = () => {
    const headers = [
      'Nama Karyawan',
      'SN',
      'Site',
      'Kursus',
      'Progress',
      'Pre-test',
      'Post-test',
      'Percobaan',
      'Nilai Akhir',
      'Status',
      'No Sertifikat',
    ]

    const rows: string[][] = []
    for (const group of filteredGroups) {
      for (const r of group.courses) {
        rows.push([
          `"${r.employeeName}"`,
          `"${r.employeeSn}"`,
          `"${r.siteName || '-'}"`,
          `"${r.courseTitle.replace(/"/g, '""')}"`,
          `${r.progress}%`,
          r.pretestScore != null ? `${r.pretestScore}%` : '-',
          r.posttestScore != null ? `${r.posttestScore}%` : '-',
          r.posttestAttempts != null ? `${r.posttestAttempts}x` : '-',
          r.finalScore != null ? `${r.finalScore}` : '-',
          r.status,
          `"${r.certificateNumber || '-'}"`,
        ])
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan-lms-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari nama, SN, atau kursus..." 
              className="pl-9 bg-slate-50 border-slate-200 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {sites.length > 0 && (
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Semua Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Site</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="size-3.5 text-primary" />
            <strong>{filteredGroups.length}</strong> Karyawan
          </span>
          <Button variant="outline" onClick={handleExportCsv} className="gap-2 rounded-xl text-xs font-semibold">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Grouped Table: 1 Row per Employee */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Site</th>
                <th className="px-6 py-4">Total Kursus</th>
                <th className="px-6 py-4">Rata-rata Progress</th>
                <th className="px-6 py-4">Rata-rata Nilai</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGroups.map((group) => {
                const isAllPassed = group.passedCourses === group.totalCourses && group.totalCourses > 0
                const isFailed = group.failedCourses > 0 && group.passedCourses === 0 && group.inProgressCourses === 0

                return (
                  <tr
                    key={group.employeeSn || group.employeeName}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedGroup(group)}
                  >
                    {/* Karyawan */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{group.employeeName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {group.employeeSn || '-'}
                      </div>
                    </td>

                    {/* Site */}
                    <td className="px-6 py-4">
                      {group.siteName ? (
                        <Badge variant="outline" className="bg-slate-50 font-medium text-slate-700 border-slate-200 gap-1 text-[11px] px-2 py-0.5">
                          <MapPin className="size-3 text-slate-400" />
                          {group.siteName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Total Kursus */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-primary" />
                        <span>{group.totalCourses} Kursus</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="text-emerald-700 font-semibold">{group.passedCourses} Lulus</span>
                        {group.inProgressCourses > 0 && (
                          <span> • {group.inProgressCourses} Berjalan</span>
                        )}
                        {group.failedCourses > 0 && (
                          <span className="text-rose-600"> • {group.failedCourses} Gagal</span>
                        )}
                      </div>
                    </td>

                    {/* Rata-rata Progress */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${group.averageProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${group.averageProgress}%` }} 
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{group.averageProgress}%</span>
                      </div>
                    </td>

                    {/* Rata-rata Nilai */}
                    <td className="px-6 py-4">
                      {group.averageScore != null ? (
                        <div>
                          <span
                            className={
                              group.averageScore >= 80
                                ? 'font-bold text-emerald-600'
                                : 'font-bold text-slate-800'
                            }
                          >
                            {group.averageScore}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({group.courses.filter((c) => c.finalScore != null || c.posttestScore != null).length} dievaluasi)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {isAllPassed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1 font-semibold">
                          <BadgeCheck className="size-3.5" />
                          Lulus Semua ({group.passedCourses}/{group.totalCourses})
                        </Badge>
                      ) : isFailed ? (
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 gap-1 font-semibold">
                          <XCircle className="size-3.5" />
                          Gagal
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1 font-semibold">
                          <Clock className="size-3.5" />
                          Berjalan ({group.passedCourses}/{group.totalCourses} Lulus)
                        </Badge>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGroup(group)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
                      >
                        <Eye className="h-4 w-4 mr-1.5" /> Detail
                      </Button>
                    </td>
                  </tr>
                )
              })}

              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data peserta LMS yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Detail Dialog for Employee's Courses */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <GraduationCap className="size-4" />
              <span>Detail Progres Kursus Karyawan</span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mt-1">
              {selectedGroup?.employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
              <span>SN: <strong className="text-slate-800">{selectedGroup?.employeeSn || '-'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-primary" />
                <strong className="text-slate-800">{selectedGroup?.siteName || 'Tanpa Site'}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Total Kursus</span>
                    <BookOpen className="size-3.5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{selectedGroup.totalCourses}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Kursus terdaftar</p>
                </div>

                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Lulus</span>
                    <BadgeCheck className="size-3.5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{selectedGroup.passedCourses}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Selesai dievaluasi</p>
                </div>

                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Sedang Berjalan</span>
                    <Clock className="size-3.5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{selectedGroup.inProgressCourses}</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Dalam proses belajar</p>
                </div>

                <div className="bg-violet-50/50 p-3.5 rounded-xl border border-violet-100">
                  <div className="flex items-center justify-between text-violet-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-rata Nilai</span>
                    <GraduationCap className="size-3.5 text-violet-600" />
                  </div>
                  <p className="text-2xl font-bold text-violet-900">
                    {selectedGroup.averageScore != null ? selectedGroup.averageScore : '-'}
                  </p>
                  <p className="text-[10px] text-violet-600 mt-0.5">
                    Progress: {selectedGroup.averageProgress}%
                  </p>
                </div>
              </div>

              {/* Courses Breakdown List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="size-4 text-primary" />
                  <span>Daftar Kursus & Evaluasi ({selectedGroup.courses.length})</span>
                </h4>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  {selectedGroup.courses.map((course, idx) => {
                    const isPassed = course.isPassed || course.status === 'passed'
                    const isFailed = course.status === 'failed'

                    return (
                      <div key={course.id || idx} className="p-4 hover:bg-slate-50/60 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">{course.courseTitle}</h5>
                              {course.completedAt && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Selesai: {new Date(course.completedAt).toLocaleDateString('id-ID')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {isPassed ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-bold text-xs">
                                <BadgeCheck className="size-3.5 mr-1" /> LULUS
                              </Badge>
                            ) : isFailed ? (
                              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 font-bold text-xs">
                                <XCircle className="size-3.5 mr-1" /> GAGAL
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 font-bold text-xs">
                                <Clock className="size-3.5 mr-1" /> BERJALAN
                              </Badge>
                            )}

                            {course.certificateNumber && (
                              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-emerald-800 text-[11px] font-semibold">
                                <Award className="size-3 text-emerald-600" />
                                Sertifikat Ada
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Progress and Scores Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs">
                          {/* Progress */}
                          <div className="sm:col-span-4 space-y-1">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="font-medium">Kemajuan</span>
                              <span className="font-bold text-slate-900">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2 bg-slate-200/70" />
                          </div>

                          {/* Pre-test */}
                          <div className="sm:col-span-2 space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Pre-test</span>
                            <div className="font-bold text-slate-800 text-sm">
                              {course.pretestScore != null ? `${course.pretestScore}%` : '-'}
                            </div>
                          </div>

                          {/* Post-test */}
                          <div className="sm:col-span-3 space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Post-test</span>
                            <div>
                              {course.posttestScore != null ? (
                                <span className="font-bold text-slate-800 text-sm">{course.posttestScore}%</span>
                              ) : (
                                <span className="font-medium text-slate-400">-</span>
                              )}
                              {course.posttestAttempts != null && course.posttestAttempts > 0 && (
                                <span className="text-[10px] text-muted-foreground block font-medium">
                                  {course.posttestAttempts}x percobaan
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Nilai Akhir */}
                          <div className="sm:col-span-3 space-y-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Nilai Akhir</span>
                            <div className="font-black text-slate-900 text-sm">
                              {course.finalScore != null ? course.finalScore : '-'}
                            </div>
                          </div>
                        </div>

                        {/* Certificate Details */}
                        {course.certificateNumber && (
                          <div className="flex items-center justify-between text-xs bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Award className="size-3.5 text-emerald-600" />
                              <span>No. Sertifikat: <strong className="font-mono text-emerald-950">{course.certificateNumber}</strong></span>
                            </div>
                            {course.certificateIssuedAt && (
                              <span className="text-emerald-700 text-[11px]">
                                Terbit: {new Date(course.certificateIssuedAt).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Total <strong>{selectedGroup.courses.length}</strong> kursus terdaftar untuk {selectedGroup.employeeName}.</span>
                <span>ChitraLearning LMS Platform</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
