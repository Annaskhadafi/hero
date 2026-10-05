"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { assessCandidateCv, updateCandidateStage } from "@/app/actions/recruitment";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconEye,
  IconBrain,
  IconFileText,
  IconMail,
  IconLoader2,
  IconRefresh,
  IconCheck,
  IconX,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

import { cn } from "@/lib/utils";

const STAGES = [
  "Sourcing",
  "Screening",
  "Psikotes",
  "Interview",
  "Offering",
  "Medical Checkup",
  "Hired",
];

const formatAiRecommendation = (recommendation?: string | null) => {
  const translations: Record<string, string> = {
    Shortlist: "Masuk Shortlist",
    Consider: "Dipertimbangkan",
    "Review Further": "Perlu Review Lanjutan",
    Review: "Perlu Review",
    "Manual Review": "Perlu Review Manual",
    Reject: "Ditolak",
    Hire: "Direkomendasikan Diterima",
    "Strong Match": "Sangat Sesuai",
  };

  return recommendation ? translations[recommendation] || recommendation : null;
};

const getRecommendationBadgeProps = (recommendation?: string | null) => {
  const text = formatAiRecommendation(recommendation);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("shortlist") || lower.includes("diterima") || lower.includes("sesuai") || lower.includes("direkomendasikan")) {
    return {
      text,
      className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
    };
  }
  if (lower.includes("tolak") || lower.includes("reject")) {
    return {
      text,
      className: "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
    };
  }
  return {
    text,
    className: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
  };
};

type Candidate = {
  id: number;
  recruitmentId: number | null;
  jobTitle: string | null;
  fullName: string;
  email: string;
  phone: string;
  currentStage: string;
  rating: number | null;
  aiScore: number | null;
  aiSummary?: string;
  aiDetails?: {
    recommendation?: string;
    breakdown?: Array<{ criterion: string; score: number; weight: number; reason: string }>;
    knockout?: Array<{ criterion: string; passed: boolean; reason: string }>;
  } | null;
  cvUrl: string;
  createdAt: Date;
};

type EmailStatus = {
  status: string;
  lastSentAt: Date | null;
  templateName: string | null;
};

export function KanbanBoard({
  candidates,
  jobFilter,
  onCandidateUpdate,
  onCandidateAiUpdate,
  emailStatuses,
}: {
  candidates: Candidate[];
  jobFilter: number | null;
  onCandidateUpdate: (id: number, stage: string) => void;
  onCandidateAiUpdate?: (id: number, score: number, summary?: string, details?: any) => void;
  emailStatuses: Record<number, EmailStatus>;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [reverting, setReverting] = useState<Record<number, boolean>>({});
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<number>>(new Set());
  const [aiProgress, setAiProgress] = useState<Record<number, number>>({});
  const aiProgressTimers = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    return () => {
      Object.values(aiProgressTimers.current || {}).forEach((timer) => clearInterval(timer));
    };
  }, []);

  const filtered = jobFilter
    ? candidates.filter((c) => c.recruitmentId === jobFilter)
    : candidates;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const candidateId = active.id as number;
    const newStage = over.id as string;
    const candidate = filtered.find((c) => c.id === candidateId);
    if (!candidate || candidate.currentStage === newStage) return;

    const oldStage = candidate.currentStage;
    onCandidateUpdate(candidateId, newStage);

    try {
      await updateCandidateStage(candidateId, newStage as any);
      toast.success(`${candidate.fullName} moved to ${newStage}`);
    } catch (e: any) {
      onCandidateUpdate(candidateId, oldStage);
      toast.error(e.message || "Failed to update stage");
    }
  };

  const handleRunAiAssessment = async (candidate: Candidate) => {
    setAiLoadingIds((prev) => new Set(prev).add(candidate.id));
    setAiProgress((prev) => ({ ...prev, [candidate.id]: 8 }));
    if (aiProgressTimers.current[candidate.id]) clearInterval(aiProgressTimers.current[candidate.id]);
    aiProgressTimers.current[candidate.id] = setInterval(() => {
      setAiProgress((prev) => ({
        ...prev,
        [candidate.id]: Math.min(90, (prev[candidate.id] ?? 8) + Math.max(2, Math.round((90 - (prev[candidate.id] ?? 8)) / 8))),
      }));
    }, 900);
    const toastId = toast.loading(`Running Smart assessment for ${candidate.fullName}...`);
    try {
      const result = await assessCandidateCv(candidate.id);
      if (result.success) {
        setAiProgress((prev) => ({ ...prev, [candidate.id]: 100 }));
        toast.success(`Smart assessment completed: ${result.score}%`, { id: toastId });
        candidate.aiScore = result.score;
        if (result.summary) candidate.aiSummary = result.summary;
        if (result.details) candidate.aiDetails = result.details;
        onCandidateAiUpdate?.(candidate.id, result.score, result.summary, result.details);
        router.refresh();
      } else {
        toast.error(result.error || "Smart assessment failed.", { id: toastId });
      }
    } catch (error: any) {
      console.error(`[AI] Error:`, error);
      toast.error(error.message || "Smart assessment failed.", { id: toastId });
    } finally {
      if (aiProgressTimers.current[candidate.id]) {
        clearInterval(aiProgressTimers.current[candidate.id]);
        delete aiProgressTimers.current[candidate.id];
      }
      setAiLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(candidate.id);
        return next;
      });
      setTimeout(() => {
        setAiProgress((prev) => {
          const next = { ...prev };
          delete next[candidate.id];
          return next;
        });
      }, 800);
    }
  };

  const activeCandidate = activeId
    ? filtered.find((c) => c.id === activeId)
    : null;

  return (
    <TooltipProvider delayDuration={150}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto pb-4">
          <div className="flex gap-5 min-w-max px-1">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                candidates={filtered.filter((c) => c.currentStage === stage)}
                emailStatuses={emailStatuses}
                aiLoadingIds={aiLoadingIds}
                aiProgress={aiProgress}
                onRunAiAssessment={handleRunAiAssessment}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCandidate ? (
            <KanbanCard
              candidate={activeCandidate}
              emailStatus={emailStatuses[activeCandidate.id]}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}

function KanbanColumn({
  stage,
  candidates,
  emailStatuses,
  aiLoadingIds,
  aiProgress,
  onRunAiAssessment,
}: {
  stage: string;
  candidates: Candidate[];
  emailStatuses: Record<number, EmailStatus>;
  aiLoadingIds: Set<number>;
  aiProgress: Record<number, number>;
  onRunAiAssessment: (candidate: Candidate) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[300px] flex flex-col gap-3 rounded-xl border border-transparent p-2 transition-colors",
        isOver && "bg-accent/5 border-accent/20"
      )}
    >
      <div className="flex items-center justify-between py-1">
        <h3 className="font-bold text-xs tracking-widest uppercase text-muted-foreground flex items-center gap-2">
          {stage}
          <Badge
            variant="secondary"
            className="rounded-full px-2 py-0 h-5 text-xs bg-muted/50"
          >
            {candidates.length}
          </Badge>
        </h3>
      </div>
      <div className="flex flex-col gap-3 min-h-[120px]">
        {candidates.map((c) => (
          <KanbanCard
            key={c.id}
            candidate={c}
            emailStatus={emailStatuses[c.id]}
            isAiLoading={aiLoadingIds.has(c.id)}
            aiProgress={aiProgress[c.id] ?? 0}
            onRunAiAssessment={onRunAiAssessment}
          />
        ))}
        {candidates.length === 0 && (
          <div className="border-2 border-dashed rounded-xl p-4 text-center text-muted-foreground/50 flex flex-col items-center justify-center bg-muted/5">
            <span className="text-xs font-medium uppercase tracking-wider">
              Empty
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  candidate,
  emailStatus,
  isOverlay,
  isAiLoading = false,
  aiProgress = 0,
  onRunAiAssessment,
}: {
  candidate: Candidate;
  emailStatus?: EmailStatus;
  isOverlay?: boolean;
  isAiLoading?: boolean;
  aiProgress?: number;
  onRunAiAssessment?: (candidate: Candidate) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: candidate.id, data: { candidate } });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const emailColor =
    emailStatus?.status === "sent"
      ? "text-green-600"
      : emailStatus?.status === "failed"
      ? "text-destructive"
      : "text-muted-foreground";
  const recBadgeProps = getRecommendationBadgeProps(candidate.aiDetails?.recommendation);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border shadow-sm rounded-xl p-4 hover:shadow-md transition-shadow group relative select-none",
        isOverlay &&
          "shadow-xl ring-2 ring-emerald-500/30 rotate-2 scale-105 cursor-grabbing z-50",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
          <h4 className="font-semibold text-base mb-0.5 truncate text-slate-900 dark:text-slate-100">
            {candidate.fullName}
          </h4>
          <p className="text-xs text-muted-foreground font-medium truncate">
            {candidate.jobTitle || "General Application"}
          </p>
          {candidate.currentStage && candidate.currentStage !== "Sourcing" && (
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-200 bg-cyan-100/80 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800">
                {candidate.currentStage}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {emailStatus && emailStatus.status !== "none" && (
            <span title={`Email ${emailStatus.status}`}>
              <IconMail className={cn("w-4 h-4", emailColor)} />
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            asChild
          >
            <Link
              href={`/dashboard/hc/recruitment/candidates/${candidate.id}`}
            >
              <IconEye className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {candidate.aiScore !== null ? (
        <HoverCard openDelay={150} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div className="mt-3 cursor-pointer p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <IconBrain className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Smart Sudah Diproses
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50"
                  title="Re-run Smart Assessment"
                  disabled={isAiLoading}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRunAiAssessment?.(candidate);
                  }}
                >
                  <IconRefresh className={cn("w-3.5 h-3.5", isAiLoading && "animate-spin")} />
                </Button>
              </div>

              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score Smart</div>
                  <div className="text-2xl font-black leading-none text-emerald-700 dark:text-emerald-400">
                    {candidate.aiScore}%
                  </div>
                </div>
                {recBadgeProps ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap shadow-xs",
                      recBadgeProps.className
                    )}
                  >
                    {recBadgeProps.text}
                  </Badge>
                ) : null}
              </div>

              <div className="h-1.5 w-full bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, candidate.aiScore))}%` }}
                />
              </div>

              {candidate.aiSummary ? (
                <p className="mt-2 line-clamp-2 text-[11px] font-normal leading-relaxed text-slate-700 dark:text-slate-300">
                  {candidate.aiSummary}
                </p>
              ) : null}

              {isAiLoading && (
                <div className="mt-2 space-y-1">
                  <Progress value={aiProgress} className="h-1.5 bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-600" />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>Re-evaluating candidate...</span>
                    <span>{aiProgress}%</span>
                  </div>
                </div>
              )}

              <div className="mt-2 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-between text-[10px] font-medium text-emerald-800/80 dark:text-emerald-300/80">
                <span className="flex items-center gap-1">
                  <IconSparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Hover untuk detail hasil
                </span>
                <IconChevronRight className="w-3 h-3" />
              </div>
            </div>
          </HoverCardTrigger>

          <HoverCardContent
            side="top"
            align="center"
            sideOffset={8}
            className="w-[340px] sm:w-[380px] p-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-left"
          >
            {/* Header Popup */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-100">
                  <IconBrain className="w-4 h-4 text-white" />
                  Hasil Penilaian Smart
                </span>
                <span className="text-xl font-black px-2.5 py-0.5 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                  {candidate.aiScore}%
                </span>
              </div>
              <h5 className="font-bold text-sm text-white truncate">{candidate.fullName}</h5>
              <div className="text-xs text-emerald-100/90 truncate">{candidate.jobTitle || "Posisi Belum Ditetapkan"}</div>
              {recBadgeProps ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold bg-white text-slate-900 shadow-xs">
                  <span>Rekomendasi:</span>
                  <span className="font-black text-emerald-700">{recBadgeProps.text}</span>
                </div>
              ) : null}
            </div>

            {/* Body Popup */}
            <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto text-xs">
              {/* Ringkasan AI */}
              <div>
                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Ringkasan Eksekutif
                </div>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {candidate.aiSummary || "Ringkasan penilaian belum tersedia."}
                </p>
              </div>

              {/* Rincian Kriteria / Scoring Breakdown */}
              {candidate.aiDetails?.breakdown && candidate.aiDetails.breakdown.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Rincian Kriteria Penilaian
                  </div>
                  <div className="space-y-1.5">
                    {candidate.aiDetails.breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200/80 dark:border-slate-800 p-2 bg-white dark:bg-slate-900 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.criterion}</span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-[10px] text-slate-400">Bobot {item.weight}%</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[11px]",
                              item.score >= 75 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                              item.score >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                              "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            )}>
                              {item.score}
                            </span>
                          </div>
                        </div>
                        {item.reason && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knockout Criteria Checklist */}
              {candidate.aiDetails?.knockout && candidate.aiDetails.knockout.length > 0 && (
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Pemeriksaan Persyaratan Wajib (Knockout)
                  </div>
                  <div className="space-y-1">
                    {candidate.aiDetails.knockout.map((k, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-lg border text-[11px]",
                          k.passed
                            ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200"
                            : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900 text-rose-950 dark:text-rose-200"
                        )}
                      >
                        {k.passed ? (
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <IconX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold">{k.criterion}</div>
                          {k.reason && <div className="text-[10px] opacity-80 mt-0.5">{k.reason}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Popup */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button size="sm" variant="default" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <Link href={`/dashboard/hc/recruitment/candidates/${candidate.id}`}>
                  Buka Halaman Detail Kandidat
                </Link>
              </Button>
            </div>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs rounded-xl border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-900 dark:hover:bg-emerald-950 font-semibold transition-colors"
            disabled={isAiLoading || !onRunAiAssessment}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRunAiAssessment?.(candidate);
            }}
          >
            {isAiLoading ? (
              <IconLoader2 className="w-3.5 h-3.5 mr-2 animate-spin text-emerald-700" />
            ) : (
              <IconBrain className="w-3.5 h-3.5 mr-2 text-emerald-700 dark:text-emerald-400" />
            )}
            {isAiLoading ? "Running Smart..." : "Run Smart Assessment"}
          </Button>
          {isAiLoading && (
            <div className="mt-2 space-y-1">
              <Progress value={aiProgress} className="h-1.5 bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-600" />
              <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                <span>Analyzing CV & requirements</span>
                <span>{aiProgress}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <IconFileText className="w-3.5 h-3.5" />
          <span>{candidate.cvUrl ? "CV Uploaded" : "No CV"}</span>
        </div>
        <span>{format(new Date(candidate.createdAt), "dd MMM yyyy")}</span>
      </div>
    </div>
  );
}
