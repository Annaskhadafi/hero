'use client'

import { useState } from "react"
import { Eye, Loader2, FileText, HelpCircle, CheckCircle, Circle, GraduationCap } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getLmsCourseDetailsAction } from "@/app/dashboard/chitralearning-lms/actions"

interface LmsCourse {
  course_id: number;
  course_name: string;
  progress: number;
  status: string;
  grade: number | null;
  startTime: number | null;
  endTime: number | null;
}

function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "passed":
    case "completed":
      return <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] text-[10px] font-bold">Selesai</Badge>;
    case "failed":
      return <Badge className="border-0 bg-red-100 text-red-700 text-[10px] font-bold">Gagal</Badge>;
    case "in_progress":
    case "enrolled":
      return <Badge className="border-0 bg-[#fff1cf] text-[#8a5a00] text-[10px] font-bold">Belajar</Badge>;
    default:
      return <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px] font-bold">{status}</Badge>;
  }
}

function formatTimestamp(timestamp: number | null) {
  if (!timestamp || timestamp === 0) return "-";
  return new Date(timestamp * 1000).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MobileLmsCoursesList({
  courses,
  employeeEmail,
  employeeSn,
  employeeName,
  connectionError,
}: {
  courses: LmsCourse[]
  employeeEmail: string
  employeeSn: string
  employeeName: string
  connectionError: boolean
}) {
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null)
  const [curriculum, setCurriculum] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleOpenDetails = async (course: LmsCourse) => {
    setSelectedCourse(course)
    setLoading(true)
    setCurriculum(null)
    setOpen(true)

    try {
      const res = await getLmsCourseDetailsAction(course.course_id, employeeEmail, employeeSn)
      if (res.success && res.curriculum) {
        setCurriculum(res.curriculum)
      } else {
        setCurriculum([])
      }
    } catch (error) {
      console.error(error)
      setCurriculum([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <article key={course.course_id} className="rounded-[1.35rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-[#486275]">ID Kursus: #{course.course_id}</p>
              <h3 className="mt-1 text-sm font-black text-[#082033] line-clamp-2 leading-tight">{course.course_name}</h3>
              <p className="mt-1 text-[10px] text-[#486275]/80 font-semibold">
                Mulai: {formatTimestamp(course.startTime)} · Selesai: {formatTimestamp(course.endTime)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {renderStatusBadge(course.status)}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 rounded-lg p-0 bg-[#f3faff] text-[#003f78] hover:bg-[#eaf4fb]"
                onClick={() => handleOpenDetails(course)}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#486275]">Progress</p>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={course.progress} className="h-1.5 w-full bg-slate-100" />
                <span className="text-[11px] font-bold text-[#082033] shrink-0 w-8">{course.progress}%</span>
              </div>
            </div>
            <div className="text-right shrink-0 border-l border-dashed border-[#d8e8f3] pl-4">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#486275]">Nilai</p>
              <p className="mt-1 text-sm font-black text-[#003f78]">{course.grade !== null ? course.grade : "-"}</p>
            </div>
          </div>
        </article>
      ))}

      {courses.length === 0 && (
        <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          {connectionError 
            ? "Gagal memuat daftar kursus dari server LMS. Pastikan koneksi database aktif."
            : "Belum ada kursus yang diikuti."}
        </div>
      )}

      {/* Curriculum Details Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(calc(100vw-32px),512px)] max-h-[85vh] overflow-y-auto rounded-2xl p-5">
          <DialogHeader className="pb-3 border-b border-dashed border-slate-100">
            <DialogTitle className="text-base font-black text-[#003461] flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" />
              Detail Progress Kursus
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
              Progress belajar untuk <strong>{employeeName}</strong> di kursus: <br />
              <span className="text-foreground font-semibold leading-tight block mt-0.5">{selectedCourse?.course_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">Memuat data dari WordPress...</p>
              </div>
            ) : curriculum && curriculum.length > 0 ? (
              <div className="space-y-4">
                {curriculum.map((section, sIdx) => (
                  <div key={section.section_id || sIdx} className="space-y-1.5">
                    <h4 className="text-xs font-black text-foreground bg-[#f3faff] px-2.5 py-1.5 rounded-lg border border-[#d8e8f3] flex items-center justify-between">
                      <span className="truncate">{section.title || `Section ${sIdx + 1}`}</span>
                      <Badge className="border-0 bg-white text-[#003f78] text-[9px] font-black shrink-0 px-2 py-0.5 ml-2">
                        {section.materials.length} materi
                      </Badge>
                    </h4>
                    <div className="pl-3 space-y-1 border-l border-dashed border-[#d8e8f3] ml-3.5">
                      {section.materials.map((mat: any, mIdx: number) => {
                        const isQuiz = mat.post_type === "stm-quizzes";
                        const isCompleted = mat.status === "completed" || mat.status === "passed";
                        const isStarted = mat.status === "started" || mat.status === "failed";
                        
                        let Icon = FileText;
                        let iconColor = "text-[#004b87]";
                        if (isQuiz) {
                          Icon = HelpCircle;
                          iconColor = "text-[#5a2200]";
                        }

                        let StatusIcon = Circle;
                        let statusColor = "text-slate-300";
                        if (isCompleted) {
                          StatusIcon = CheckCircle;
                          statusColor = "text-emerald-500";
                        } else if (isStarted) {
                          StatusIcon = Circle;
                          statusColor = "text-[#8a5a00] fill-amber-100";
                        }

                        return (
                          <div key={mat.post_id || mIdx} className="flex items-start justify-between gap-3 py-1.5 rounded px-1">
                            <div className="flex items-start gap-2 min-w-0">
                              <Icon className={`size-3.5 mt-0.5 shrink-0 ${iconColor}`} />
                              <p className="text-xs font-semibold text-slate-700 leading-normal">{mat.title}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {mat.detail && (
                                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                  {mat.detail}
                                </span>
                              )}
                              <StatusIcon className={`size-3.5 ${statusColor} shrink-0`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs font-semibold text-muted-foreground">
                Gagal memuat kurikulum atau tidak ada materi.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
