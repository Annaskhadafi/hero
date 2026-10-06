'use client'

import { useState } from 'react'
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
  const [selectedRow, setSelectedRow] = useState<ChitraLearningProgressRow | null>(null)

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <Table className="w-full min-w-[850px] text-sm">
          <TableHeader className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3 min-w-[200px]">Peserta</TableHead>
              <TableHead className="px-4 py-3 min-w-[130px]">Site</TableHead>
              <TableHead className="px-4 py-3 min-w-[220px]">Course</TableHead>
              <TableHead className="px-4 py-3 min-w-[150px]">Progress</TableHead>
              <TableHead className="px-4 py-3 min-w-[110px]">Post-test</TableHead>
              <TableHead className="px-4 py-3 min-w-[110px]">Status</TableHead>
              <TableHead className="px-4 py-3 min-w-[100px]">Update</TableHead>
              <TableHead className="px-4 py-3 text-right min-w-[90px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada data enrollment LMS yang sesuai filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, 50).map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="font-semibold text-slate-900 leading-snug">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.employeeSn || '-'}
                      {row.department ? ` • ${row.department}` : ''}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {row.siteName ? (
                      <Badge variant="outline" className="bg-slate-50/80 font-medium text-slate-700 border-slate-200 gap-1 text-[11px] px-2 py-0.5">
                        <MapPin className="size-3 text-slate-400" />
                        {row.siteName}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium text-slate-700 max-w-[240px] truncate" title={row.courseTitle}>
                    {row.courseTitle}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={row.progress}
                        className="h-2 w-20 bg-slate-100"
                      />
                      <span className="text-xs font-semibold text-slate-700">{row.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {row.posttestScore == null ? (
                      <span className="text-xs text-muted-foreground">-</span>
                    ) : (
                      <div>
                        <span
                          className={
                            row.posttestScore >= row.passingScore
                              ? 'font-bold text-emerald-600'
                              : 'font-bold text-rose-600'
                          }
                        >
                          {row.posttestScore}%{' '}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            / {row.passingScore}%
                          </span>
                        </span>
                        {row.posttestAttempts != null && row.posttestAttempts > 0 && (
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {row.posttestAttempts}x percobaan
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      className={
                        row.status === 'passed'
                          ? 'border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                          : row.status === 'failed'
                          ? 'border-0 bg-rose-50 text-rose-700 hover:bg-rose-50'
                          : 'border-0 bg-amber-50 text-amber-700 hover:bg-amber-50'
                      }
                    >
                      {row.status === 'passed'
                        ? 'Lulus'
                        : row.status === 'failed'
                        ? 'Belum lulus'
                        : 'Berjalan'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(row.updatedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRow(row)}
                      className="h-8 rounded-lg px-2.5 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary gap-1"
                    >
                      <Eye className="size-3.5" />
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > 50 && (
        <p className="pt-3 text-xs text-muted-foreground">
          Menampilkan 50 enrollment terbaru dari total {rows.length} data yang sesuai filter.
        </p>
      )}

      {/* Detail Progress Modal Popup */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <GraduationCap className="size-4" />
              <span>Detail Progres LMS Peserta</span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground mt-1">
              {selectedRow?.employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Rincian perkembangan materi, skor evaluasi, dan sertifikasi Chitra Learning.
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="space-y-5 pt-3">
              {/* Peserta Info Cards */}
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <User className="size-3.5 text-slate-400" />
                    <span>NIK: <strong className="font-semibold text-slate-900">{selectedRow.employeeSn || '-'}</strong></span>
                  </div>
                  {selectedRow.department && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 className="size-3.5 text-slate-400" />
                      <span>{selectedRow.department}{selectedRow.section ? ` • ${selectedRow.section}` : ''}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Badge variant="secondary" className="gap-1 bg-white border border-slate-200 text-slate-700">
                    <MapPin className="size-3 text-primary" />
                    {selectedRow.siteName || 'Tanpa Site'}
                  </Badge>
                </div>
              </div>

              {/* Course & Progress Block */}
              <div className="rounded-xl border border-slate-100 p-4 space-y-3 bg-white shadow-xs">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Kursus Pelatihan
                  </div>
                  <h4 className="font-bold text-slate-900 text-base flex items-center justify-between gap-2">
                    <span>{selectedRow.courseTitle}</span>
                    {selectedRow.courseSlug && (
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary gap-1">
                        <Link href={`/dashboard/chitralearning-lms/courses/${selectedRow.courseSlug}`} target="_blank">
                          <span>Buka Kursus</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </Button>
                    )}
                  </h4>
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Kemajuan Pembelajaran</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedRow.progress}%</span>
                  </div>
                  <Progress
                    value={selectedRow.progress}
                    className="h-2.5 bg-slate-100"
                  />
                </div>
              </div>

              {/* Scores Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Nilai Pre-test</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {selectedRow.pretestScore != null ? `${selectedRow.pretestScore}%` : '-'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 mt-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <strong className="font-semibold text-slate-700 capitalize">
                        {selectedRow.pretestStatus ? selectedRow.pretestStatus.replace('_', ' ') : '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Nilai Post-test</p>
                      {selectedRow.posttestAttempts != null && selectedRow.posttestAttempts > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {selectedRow.posttestAttempts}x Tes
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-1 text-slate-900">
                      {selectedRow.posttestScore != null ? (
                        <span className={selectedRow.posttestScore >= selectedRow.passingScore ? 'text-emerald-600' : 'text-rose-600'}>
                          {selectedRow.posttestScore}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Syarat Kelulusan:</span>
                      <strong className="font-semibold text-slate-700">{selectedRow.passingScore}%</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Jumlah Percobaan:</span>
                      <strong className="font-semibold text-slate-800">
                        {selectedRow.posttestAttempts != null && selectedRow.posttestAttempts > 0
                          ? `${selectedRow.posttestAttempts} kali`
                          : selectedRow.posttestScore != null
                          ? '1 kali'
                          : 'Belum tes'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider">Nilai Akhir Evaluasi</p>
                    <p className="text-3xl font-black text-blue-900 mt-0.5">
                      {selectedRow.finalScore != null ? selectedRow.finalScore : selectedRow.posttestScore != null ? selectedRow.posttestScore : '-'}
                    </p>
                  </div>
                  <div>
                    {selectedRow.status === 'passed' ? (
                      <div className="flex items-center text-emerald-700 font-bold bg-emerald-100/80 px-3 py-1.5 rounded-full text-xs gap-1.5">
                        <CheckCircle2 className="size-4" />
                        <span>LULUS</span>
                      </div>
                    ) : selectedRow.status === 'failed' ? (
                      <div className="flex items-center text-rose-700 font-bold bg-rose-100/80 px-3 py-1.5 rounded-full text-xs gap-1.5">
                        <XCircle className="size-4" />
                        <span>BELUM LULUS</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-800 font-bold bg-amber-100/80 px-3 py-1.5 rounded-full text-xs gap-1.5">
                        <Clock className="size-4" />
                        <span>SEDANG BERJALAN</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Certificate Block */}
              {selectedRow.certificateNumber ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <Award className="size-4 text-emerald-600" />
                    <span>Sertifikat Terbit</span>
                  </div>
                  <div className="grid grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-500">No. Sertifikat:</span>
                      <p className="font-semibold text-slate-800">{selectedRow.certificateNumber}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal Terbit:</span>
                      <p className="font-semibold text-slate-800">{formatDate(selectedRow.certificateIssuedAt)}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-slate-100">
                <div>
                  <span>Mulai:</span>
                  <p className="font-medium text-foreground">{formatDate(selectedRow.startedAt)}</p>
                </div>
                <div>
                  <span>Selesai:</span>
                  <p className="font-medium text-foreground">{formatDate(selectedRow.completedAt)}</p>
                </div>
                <div>
                  <span>Terakhir Update:</span>
                  <p className="font-medium text-foreground">{formatDate(selectedRow.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
