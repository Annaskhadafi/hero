'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Eye,
  BookOpen,
  User,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Building2,
  GraduationCap,
  Calendar,
  ExternalLink,
  Search,
  Layers,
} from 'lucide-react'

export interface ChitraLearningProgressRow {
  id: number
  employeeId: number
  employeeName: string
  employeeSn: string | null
  siteId: number | null
  siteName: string | null
  department: string | null
  section: string | null
  courseTitle: string
  courseSlug?: string | null
  progress: number
  status: string
  pretestScore?: number | null
  pretestStatus?: string | null
  posttestScore?: number | null
  posttestStatus?: string | null
  posttestAttempts?: number | null
  finalScore?: number | null
  isPassed?: boolean | null
  passingScore: number
  startedAt?: Date | string | null
  completedAt?: Date | string | null
  updatedAt: Date | string | null
  certificateNumber?: string | null
  certificateIssuedAt?: Date | string | null
}

export interface EmployeeLmsProgressGroup {
  employeeId: number
  employeeName: string
  employeeSn: string | null
  siteId: number | null
  siteName: string | null
  department: string | null
  section: string | null
  courses: ChitraLearningProgressRow[]
  totalCourses: number
  passedCourses: number
  inProgressCourses: number
  failedCourses: number
  averageProgress: number
  averageScore: number | null
  latestUpdatedAt: Date | string | null
}

interface ChitraLearningProgressTableProps {
  rows: ChitraLearningProgressRow[]
}

const APP_TIME_ZONE = 'Asia/Makassar'

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '-'
  const dateObj = value instanceof Date ? value : new Date(value)
  if (isNaN(dateObj.getTime())) return '-'
  return dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  })
}

export function ChitraLearningProgressTable({ rows }: ChitraLearningProgressTableProps) {
  const [selectedGroup, setSelectedGroup] = useState<EmployeeLmsProgressGroup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Group individual course rows by employee
  const groupedEmployees = useMemo(() => {
    const map = new Map<number, EmployeeLmsProgressGroup>()

    for (const row of rows) {
      const empId = row.employeeId
      if (!map.has(empId)) {
        map.set(empId, {
          employeeId: empId,
          employeeName: row.employeeName,
          employeeSn: row.employeeSn,
          siteId: row.siteId,
          siteName: row.siteName,
          department: row.department,
          section: row.section,
          courses: [],
          totalCourses: 0,
          passedCourses: 0,
          inProgressCourses: 0,
          failedCourses: 0,
          averageProgress: 0,
          averageScore: null,
          latestUpdatedAt: row.updatedAt,
        })
      }
      map.get(empId)!.courses.push(row)
    }

    return Array.from(map.values()).map((group) => {
      // Sort courses within employee by updatedAt descending
      group.courses.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      })

      const total = group.courses.length
      const passed = group.courses.filter((c) => c.status === 'passed' || c.isPassed).length
      const failed = group.courses.filter((c) => c.status === 'failed').length
      const inProgress = group.courses.filter(
        (c) => c.status !== 'passed' && !c.isPassed && c.status !== 'failed'
      ).length

      const totalProgress = group.courses.reduce((sum, c) => sum + (c.progress || 0), 0)
      const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0

      const scoredCourses = group.courses.filter((c) => c.posttestScore != null || c.finalScore != null)
      const avgScore = scoredCourses.length > 0
        ? Math.round(
            scoredCourses.reduce((sum, c) => sum + (c.finalScore ?? c.posttestScore ?? 0), 0) /
              scoredCourses.length
          )
        : null

      let latest: Date | string | null = null
      for (const c of group.courses) {
        if (!latest) {
          latest = c.updatedAt
        } else if (c.updatedAt && new Date(c.updatedAt) > new Date(latest)) {
          latest = c.updatedAt
        }
      }

      return {
        ...group,
        totalCourses: total,
        passedCourses: passed,
        inProgressCourses: inProgress,
        failedCourses: failed,
        averageProgress: avgProgress,
        averageScore: avgScore,
        latestUpdatedAt: latest,
      }
    }).sort((a, b) => {
      // Sort employees by latest activity first
      const timeA = a.latestUpdatedAt ? new Date(a.latestUpdatedAt).getTime() : 0
      const timeB = b.latestUpdatedAt ? new Date(b.latestUpdatedAt).getTime() : 0
      return timeB - timeA
    })
  }, [rows])

  // Client-side quick filter
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedEmployees
    const q = searchQuery.toLowerCase().trim()
    return groupedEmployees.filter((g) => {
      const matchName = g.employeeName?.toLowerCase().includes(q)
      const matchSn = g.employeeSn?.toLowerCase().includes(q)
      const matchSite = g.siteName?.toLowerCase().includes(q)
      const matchDept = g.department?.toLowerCase().includes(q)
      const matchCourse = g.courses.some((c) => c.courseTitle.toLowerCase().includes(q))
      return matchName || matchSn || matchSite || matchDept || matchCourse
    })
  }, [groupedEmployees, searchQuery])

  return (
    <>
      <div className="space-y-4">
        {/* Quick Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari karyawan, SN, site, atau materi..."
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-center">
            <Layers className="size-3.5 text-primary" />
            <span>
              Menampilkan <strong>{filteredGroups.length}</strong> karyawan ({rows.length} total akses materi)
            </span>
          </div>
        </div>

        {/* Grouped Table (1 row per employee) */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full min-w-[900px] text-sm">
            <TableHeader className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 min-w-[220px]">Peserta</TableHead>
                <TableHead className="px-4 py-3 min-w-[130px]">Site</TableHead>
                <TableHead className="px-4 py-3 min-w-[170px]">Materi Diakses</TableHead>
                <TableHead className="px-4 py-3 min-w-[160px]">Rata-rata Progress</TableHead>
                <TableHead className="px-4 py-3 min-w-[130px]">Rata-rata Nilai</TableHead>
                <TableHead className="px-4 py-3 min-w-[140px]">Status</TableHead>
                <TableHead className="px-4 py-3 min-w-[110px]">Update Terakhir</TableHead>
                <TableHead className="px-4 py-3 text-right min-w-[90px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    Tidak ada data peserta LMS yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => {
                  const isAllPassed = group.passedCourses === group.totalCourses && group.totalCourses > 0
                  const isFailed = group.failedCourses > 0 && group.passedCourses === 0 && group.inProgressCourses === 0

                  return (
                    <TableRow
                      key={group.employeeId}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedGroup(group)}
                    >
                      {/* Peserta */}
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-slate-900 leading-snug">{group.employeeName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {group.employeeSn || '-'}
                          {group.department ? ` • ${group.department}` : ''}
                        </div>
                      </TableCell>

                      {/* Site */}
                      <TableCell className="px-4 py-3">
                        {group.siteName ? (
                          <Badge variant="outline" className="bg-slate-50/80 font-medium text-slate-700 border-slate-200 gap-1 text-[11px] px-2 py-0.5">
                            <MapPin className="size-3 text-slate-400" />
                            {group.siteName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Materi Diakses */}
                      <TableCell className="px-4 py-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <BookOpen className="size-3.5 text-primary" />
                          <span>{group.totalCourses} Materi</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                          <span className="text-emerald-700 font-semibold">{group.passedCourses} Lulus</span>
                          {group.inProgressCourses > 0 && (
                            <span> • {group.inProgressCourses} Berjalan</span>
                          )}
                          {group.failedCourses > 0 && (
                            <span className="text-rose-600"> • {group.failedCourses} Gagal</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Rata-rata Progress */}
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={group.averageProgress}
                            className="h-2 w-20 bg-slate-100"
                          />
                          <span className="text-xs font-semibold text-slate-700">{group.averageProgress}%</span>
                        </div>
                      </TableCell>

                      {/* Rata-rata Nilai */}
                      <TableCell className="px-4 py-3">
                        {group.averageScore != null ? (
                          <div>
                            <span
                              className={
                                group.averageScore >= 80
                                  ? 'font-bold text-emerald-600'
                                  : 'font-bold text-slate-800'
                              }
                            >
                              {group.averageScore}%
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {group.courses.filter((c) => c.posttestScore != null).length} modul diuji
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-3">
                        {isAllPassed ? (
                          <Badge className="border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 gap-1 font-semibold text-[11px]">
                            <CheckCircle2 className="size-3" />
                            Lulus ({group.passedCourses}/{group.totalCourses})
                          </Badge>
                        ) : isFailed ? (
                          <Badge className="border-0 bg-rose-50 text-rose-700 hover:bg-rose-50 gap-1 font-semibold text-[11px]">
                            <XCircle className="size-3" />
                            Belum Lulus
                          </Badge>
                        ) : (
                          <Badge className="border-0 bg-amber-50 text-amber-700 hover:bg-amber-50 gap-1 font-semibold text-[11px]">
                            <Clock className="size-3" />
                            Berjalan ({group.passedCourses}/{group.totalCourses} Lulus)
                          </Badge>
                        )}
                      </TableCell>

                      {/* Update Terakhir */}
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(group.latestUpdatedAt)}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGroup(group)}
                          className="h-8 rounded-lg px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary gap-1 font-semibold"
                        >
                          <Eye className="size-3.5" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Comprehensive Detail Progress Modal Popup */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <GraduationCap className="size-4" />
              <span>Detail Progres LMS Peserta</span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mt-1">
              {selectedGroup?.employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
              <span>SN: <strong className="text-slate-800">{selectedGroup?.employeeSn || '-'}</strong></span>
              <span>•</span>
              <span>{selectedGroup?.department || 'Tanpa Departemen'}{selectedGroup?.section ? ` (${selectedGroup.section})` : ''}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-primary" />
                <strong className="text-slate-800">{selectedGroup?.siteName || 'Tanpa Site'}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6 pt-2">
              {/* Top Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Total Materi</span>
                    <BookOpen className="size-3.5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{selectedGroup.totalCourses}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Modul diakses</p>
                </div>

                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Lulus</span>
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{selectedGroup.passedCourses}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Memenuhi standar</p>
                </div>

                <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between text-amber-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Sedang Berjalan</span>
                    <Clock className="size-3.5 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{selectedGroup.inProgressCourses}</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Belum tuntas</p>
                </div>

                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between text-blue-700 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Rata-rata Progress</span>
                    <GraduationCap className="size-3.5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{selectedGroup.averageProgress}%</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    Nilai Post-test: {selectedGroup.averageScore != null ? `${selectedGroup.averageScore}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Course Breakdown List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="size-4 text-primary" />
                    <span>Daftar Materi & Progress Pembelajaran ({selectedGroup.courses.length})</span>
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Klik link untuk membuka modul
                  </span>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs">
                  {selectedGroup.courses.map((course, idx) => {
                    const isPassed = course.status === 'passed' || course.isPassed
                    const isFailed = course.status === 'failed'

                    return (
                      <div
                        key={course.id || idx}
                        className="p-4 hover:bg-slate-50/60 transition-colors space-y-3"
                      >
                        {/* Course Title & Status Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span>{course.courseTitle}</span>
                                {course.courseSlug && (
                                  <Link
                                    href={`/dashboard/chitralearning-lms/courses/${course.courseSlug}`}
                                    target="_blank"
                                    className="text-primary hover:text-primary/80 inline-flex items-center gap-0.5 text-xs font-medium"
                                  >
                                    <ExternalLink className="size-3" />
                                  </Link>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                                <span>Passing Score: <strong>{course.passingScore}%</strong></span>
                                {course.updatedAt && (
                                  <>
                                    <span>•</span>
                                    <span>Update: {formatDate(course.updatedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {isPassed ? (
                              <Badge className="border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 gap-1 font-bold text-xs px-2.5 py-1">
                                <CheckCircle2 className="size-3.5" />
                                LULUS
                              </Badge>
                            ) : isFailed ? (
                              <Badge className="border-0 bg-rose-50 text-rose-700 hover:bg-rose-50 gap-1 font-bold text-xs px-2.5 py-1">
                                <XCircle className="size-3.5" />
                                BELUM LULUS
                              </Badge>
                            ) : (
                              <Badge className="border-0 bg-amber-50 text-amber-700 hover:bg-amber-50 gap-1 font-bold text-xs px-2.5 py-1">
                                <Clock className="size-3.5" />
                                BERJALAN
                              </Badge>
                            )}

                            {course.certificateNumber && (
                              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50/60 text-emerald-800 text-[11px] font-semibold px-2 py-0.5">
                                <Award className="size-3 text-emerald-600" />
                                <span>Sertifikat Ada</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Progress and Score Breakdown Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs">
                          {/* Progress */}
                          <div className="sm:col-span-4 space-y-1">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="font-medium">Progress Materi</span>
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
                                <span
                                  className={
                                    course.posttestScore >= course.passingScore
                                      ? 'font-bold text-emerald-600 text-sm'
                                      : 'font-bold text-rose-600 text-sm'
                                  }
                                >
                                  {course.posttestScore}%{' '}
                                  <span className="text-[11px] font-normal text-muted-foreground">
                                    / {course.passingScore}%
                                  </span>
                                </span>
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
                              {course.finalScore != null
                                ? course.finalScore
                                : course.posttestScore != null
                                ? `${course.posttestScore}%`
                                : '-'}
                            </div>
                            {course.completedAt && (
                              <span className="text-[10px] text-muted-foreground block">
                                Selesai: {formatDate(course.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Certificate Info (if any) */}
                        {course.certificateNumber && (
                          <div className="flex items-center justify-between text-xs bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Award className="size-3.5 text-emerald-600" />
                              <span>No. Sertifikat: <strong className="font-mono text-emerald-950">{course.certificateNumber}</strong></span>
                            </div>
                            {course.certificateIssuedAt && (
                              <span className="text-emerald-700 text-[11px]">
                                Terbit: {formatDate(course.certificateIssuedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-slate-100">
                <span>Total <strong>{selectedGroup.courses.length}</strong> modul pelatihan telah diakses oleh {selectedGroup.employeeName}.</span>
                <span>ChitraLearning LMS Platform</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
