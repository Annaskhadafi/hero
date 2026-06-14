'use client'

import { useState, Fragment } from "react"
import { ChevronDown, ChevronRight, Users, GraduationCap, CheckCircle2, Eye, Loader2, FileText, HelpCircle, CheckCircle, Circle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getLmsCourseDetailsAction } from "@/app/dashboard/lms/actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface StudentRecord {
  course_id: number
  course_name: string
  user_email: string
  display_name: string
  user_login: string
  progress: number
  status: string
  grade: number | null
  employeeName: string
  employeeSn: string
  department: string
  startTime: number | null
  endTime: number | null
}

function formatTimestamp(timestamp: number | null) {
  if (!timestamp || timestamp === 0) return "-";
  return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface GroupedCourse {
  course_id: number
  course_name: string
  students: StudentRecord[]
  averageProgress: number
  completedCount: number
}

function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "passed":
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 rounded-full px-3 py-1 font-medium">Selesai</Badge>;
    case "failed":
      return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-0 rounded-full px-3 py-1 font-medium">Gagal</Badge>;
    case "in_progress":
    case "enrolled":
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 rounded-full px-3 py-1 font-medium">Sedang Belajar</Badge>;
    default:
      return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/10 border-0 rounded-full px-3 py-1 font-medium">{status}</Badge>;
  }
}

export function LmsGroupedTable({
  lmsRecords,
  connectionError,
}: {
  lmsRecords: StudentRecord[]
  connectionError: boolean
}) {
  const [expandedCourses, setExpandedCourses] = useState<Record<number, boolean>>({})
  const [selectedStudent, setSelectedStudent] = useState<{
    courseId: number
    courseName: string
    employeeName: string
    email: string
    sn: string
  } | null>(null)
  const [curriculum, setCurriculum] = useState<any[] | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleOpenDetails = async (rec: StudentRecord) => {
    setSelectedStudent({
      courseId: rec.course_id,
      courseName: rec.course_name,
      employeeName: rec.employeeName,
      email: rec.user_email,
      sn: rec.employeeSn,
    })
    setLoadingDetails(true)
    setCurriculum(null)
    setDialogOpen(true)

    try {
      const res = await getLmsCourseDetailsAction(rec.course_id, rec.user_email, rec.employeeSn)
      if (res.success && res.curriculum) {
        setCurriculum(res.curriculum)
      } else {
        setCurriculum([])
      }
    } catch (e) {
      console.error(e)
      setCurriculum([])
    } finally {
      setLoadingDetails(false)
    }
  }

  // Group lmsRecords by course_id
  const groups: Record<number, GroupedCourse> = {}
  for (const rec of lmsRecords) {
    if (!groups[rec.course_id]) {
      groups[rec.course_id] = {
        course_id: rec.course_id,
        course_name: rec.course_name,
        students: [],
        averageProgress: 0,
        completedCount: 0,
      }
    }
    groups[rec.course_id].students.push(rec)
    if (rec.progress === 100 || rec.status.toLowerCase() === "completed" || rec.status.toLowerCase() === "passed") {
      groups[rec.course_id].completedCount++
    }
  }

  const groupedCourses = Object.values(groups).map((group) => {
    const totalProg = group.students.reduce((sum, s) => sum + s.progress, 0)
    group.averageProgress = Math.round(totalProg / group.students.length)
    return group
  }).sort((a, b) => a.course_name.localeCompare(b.course_name))

  const toggleCourse = (courseId: number) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }))
  }

  return (
    <>
      <Table>
        <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="min-w-[320px] font-semibold">Nama Kursus / Karyawan</TableHead>
          <TableHead className="min-w-[200px] font-semibold">Detail Karyawan</TableHead>
          <TableHead className="min-w-[220px] font-semibold">Progress Belajar</TableHead>
          <TableHead className="min-w-[140px] font-semibold">Status</TableHead>
          <TableHead className="min-w-[120px] font-semibold text-right pr-6">Nilai Akhir</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedCourses.length > 0 ? (
          groupedCourses.map((group) => {
            const isExpanded = expandedCourses[group.course_id]

            return (
              <Fragment key={`group-${group.course_id}`}>
                {/* Course Parent Row */}
                <TableRow
                  key={`course-${group.course_id}`}
                  className="bg-surface-container-low/40 hover:bg-surface-container-low/80 cursor-pointer transition-colors"
                  onClick={() => toggleCourse(group.course_id)}
                >
                  <TableCell className="align-middle py-4 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md p-0 hover:bg-surface-container-high/60 shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground text-sm line-clamp-2">{group.course_name}</p>
                        <p className="text-[10px] text-muted-foreground font-normal">ID Kursus: #{group.course_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle py-4">
                    <Badge className="bg-primary/10 text-primary border-0 rounded-full hover:bg-primary/10 px-3 py-1 font-medium gap-1 flex items-center w-fit">
                      <Users className="size-3" />
                      {group.students.length} Karyawan
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle py-4">
                    <div className="flex items-center gap-3">
                      <Progress value={group.averageProgress} className="h-2 w-full max-w-[150px] bg-slate-100" />
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 w-12">Rata: {group.averageProgress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle py-4">
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-0 rounded-full hover:bg-emerald-500/10 px-3 py-1 font-medium gap-1 flex items-center w-fit">
                      <CheckCircle2 className="size-3" />
                      {group.completedCount}/{group.students.length} Selesai
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle py-4 text-right font-semibold text-sm text-muted-foreground pr-6">
                    -
                  </TableCell>
                </TableRow>

                {/* Enrolled Students Child Rows */}
                {isExpanded &&
                  group.students.map((student, idx) => (
                    <TableRow
                      key={`student-${group.course_id}-${student.user_email}-${idx}`}
                      className="bg-transparent hover:bg-surface-container-lowest/50 border-l-2 border-primary/20"
                    >
                      <TableCell className="align-middle py-3 pl-10 text-muted-foreground text-xs">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="size-4 text-primary/60 shrink-0" />
                          <span>Pendaftaran Aktif</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground text-sm">{student.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            SN: {student.employeeSn} • {student.department}
                          </p>
                          <p className="text-[10px] text-[#486275]/80 font-medium">
                            Mulai: {formatTimestamp(student.startTime)} • Selesai: {formatTimestamp(student.endTime)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-3">
                        <div className="flex items-center gap-3">
                          <Progress value={student.progress} className="h-1.5 w-full max-w-[150px] bg-slate-100" />
                          <span className="text-xs font-semibold text-foreground shrink-0 w-8">{student.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-3">
                        {renderStatusBadge(student.status)}
                      </TableCell>
                      <TableCell className="align-middle py-3 text-right font-semibold text-sm text-foreground pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span>{student.grade !== null ? student.grade : "-"}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-md hover:bg-surface-container-high text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetails(student);
                            }}
                            title="Lihat Detail Progress"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
              {connectionError
                ? "Gagal memuat daftar progress kursus dari server LMS. Pastikan koneksi server WordPress aktif."
                : "Belum ada data progress kursus di LMS Chitra Learning."}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>

      {/* Curriculum Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader className="pb-4 border-b border-dashed border-slate-100">
            <DialogTitle className="text-xl font-bold text-[#003461] flex items-center gap-2">
              <GraduationCap className="size-6 text-primary" />
              Detail Kurikulum & Progress Belajar
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              Progress belajar untuk <strong>{selectedStudent?.employeeName}</strong> di kursus: <br />
              <span className="text-foreground font-semibold">{selectedStudent?.courseName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Memuat kurikulum dari WordPress LMS...</p>
              </div>
            ) : curriculum && curriculum.length > 0 ? (
              <div className="space-y-6">
                {curriculum.map((section, sIdx) => (
                  <div key={section.section_id || sIdx} className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground bg-surface-container-low/60 px-3 py-2 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span>{section.title || `Section ${sIdx + 1}`}</span>
                      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-0 text-[10px] rounded-full">
                        {section.materials.length} Materi
                      </Badge>
                    </h4>
                    <div className="pl-3 pr-1 space-y-1.5 border-l border-dashed border-slate-200 ml-4">
                      {section.materials.map((mat: any, mIdx: number) => {
                        const isQuiz = mat.post_type === "stm-quizzes";
                        const isCompleted = mat.status === "completed" || mat.status === "passed";
                        const isStarted = mat.status === "started" || mat.status === "failed";
                        
                        let Icon = FileText;
                        let iconColor = "text-blue-500";
                        if (isQuiz) {
                          Icon = HelpCircle;
                          iconColor = "text-amber-500";
                        }

                        let StatusIcon = Circle;
                        let statusColor = "text-slate-300";
                        if (isCompleted) {
                          StatusIcon = CheckCircle;
                          statusColor = "text-emerald-500";
                        } else if (isStarted) {
                          StatusIcon = Circle;
                          statusColor = "text-amber-500 fill-amber-500/20";
                        }

                        return (
                          <div key={mat.post_id || mIdx} className="flex items-start justify-between gap-4 py-2 hover:bg-slate-50/50 rounded px-2 transition-colors">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <Icon className={`size-4 mt-0.5 shrink-0 ${iconColor}`} />
                              <p className="text-xs font-medium text-slate-700 leading-tight">{mat.title}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {mat.detail && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {mat.detail}
                                </span>
                              )}
                              <StatusIcon className={`size-4 ${statusColor}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Tidak ada kurikulum yang ditemukan atau gagal memuat data kurikulum.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
