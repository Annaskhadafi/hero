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
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  aiDetails?: { recommendation?: string } | null;
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
  emailStatuses,
}: {
  candidates: Candidate[];
  jobFilter: number | null;
  onCandidateUpdate: (id: number, stage: string) => void;
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
  const aiRecommendation = formatAiRecommendation(candidate.aiDetails?.recommendation);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border shadow-sm rounded-xl p-4 hover:shadow-md transition-shadow group relative select-none",
        isOverlay &&
          "shadow-xl ring-2 ring-accent/30 rotate-2 scale-105 cursor-grabbing z-50",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
          <h4 className="font-semibold text-base mb-0.5 truncate">
            {candidate.fullName}
          </h4>
          <p className="text-xs text-muted-foreground font-medium truncate">
            {candidate.jobTitle || "General Application"}
          </p>
          {candidate.currentStage && candidate.currentStage !== "Sourcing" && (
            <div className="mt-1">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded border border-cyan-300">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-3 cursor-help p-3 rounded-xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <IconBrain className="w-3.5 h-3.5" />
              Smart sudah diproses
            </span>
          </div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Score Smart</div>
              <div className="text-2xl font-bold leading-none text-accent">{candidate.aiScore}%</div>
            </div>
            {aiRecommendation ? (
              <Badge variant="secondary" className="max-w-28 truncate border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                {aiRecommendation}
              </Badge>
            ) : null}
          </div>
          <Progress
            value={candidate.aiScore}
            className="h-1.5 bg-accent/20 [&>div]:bg-accent"
          />
          {candidate.aiSummary ? (
            <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {candidate.aiSummary}
            </p>
          ) : null}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-sm bg-slate-950 p-3 text-left text-xs leading-relaxed text-white shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Ringkasan Smart</span>
                <span className="font-bold text-emerald-300">{candidate.aiScore}%</span>
              </div>
              {aiRecommendation ? (
                <div className="text-[11px] font-medium text-emerald-200">{aiRecommendation}</div>
              ) : null}
              <p className="text-slate-100">
                {candidate.aiSummary || "Ringkasan Smart belum tersedia. Buka detail kandidat untuk melihat data lengkap."}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs rounded-xl border-dashed hover:border-accent hover:text-accent hover:bg-accent/5"
            disabled={isAiLoading || !onRunAiAssessment}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRunAiAssessment?.(candidate);
            }}
          >
            {isAiLoading ? (
              <IconLoader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <IconBrain className="w-3.5 h-3.5 mr-2" />
            )}
            {isAiLoading ? "Running Smart..." : "Run Smart Assessment"}
          </Button>
          {isAiLoading && (
            <div className="mt-2 space-y-1">
              <Progress value={aiProgress} className="h-1.5 bg-accent/10 [&>div]:bg-accent" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
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
