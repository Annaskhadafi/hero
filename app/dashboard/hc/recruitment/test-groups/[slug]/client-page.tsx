"use client";

import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconArrowLeft, IconTrash, IconEye } from "@tabler/icons-react";
import { deleteTestGroupCandidate, getTestAssignmentDetail } from "@/app/actions/test-group";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function AnswerDisplay({ text }: { text?: string }) {
  if (!text) return <p className="mt-1 text-muted-foreground">Belum dijawab</p>;
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) parsed = null;
  } catch {
    parsed = null;
  }
  if (!parsed) return <p className="mt-1 whitespace-pre-wrap">{text}</p>;
  if (Array.isArray(parsed)) {
    return (
      <div className="space-y-1">
        {parsed.map((item, idx) => (
          <span key={idx} className="block text-sm">{String(item)}</span>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-1 space-y-1 text-sm">
      {Object.entries(parsed).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 border-b border-border/40 py-1 last:border-0">
          <span className="min-w-[140px] shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">{key.replace(/([A-Z])/g, " $1").trim()}</span>
          <div className="font-medium flex-1">{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  group: any;
  testHeaders: any[];
  entries: any[];
}

export function TestGroupResultsClientPage({ group, testHeaders, entries }: Props) {
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleDelete = async (candidateId: number) => {
    if (!confirm("Are you sure you want to delete this candidate's test results for this group? This action cannot be undone.")) return;
    
    setIsDeleting(candidateId);
    try {
      const res = await deleteTestGroupCandidate(group.id, candidateId);
      if (res.success) {
        toast.success("Candidate results deleted successfully.");
      } else {
        toast.error(res.error || "Failed to delete results.");
      }
    } catch (err: any) {
      toast.error("Failed to delete candidate results.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleViewDetail = async (assignmentId: number) => {
    setIsLoadingDetail(true);
    try {
      const data = await getTestAssignmentDetail(assignmentId);
      if (data) {
        setSelectedDetail(data);
      } else {
        toast.error("Assignment not found.");
      }
    } catch (err: any) {
      toast.error("Failed to load assignment details.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <AdminPageShell
      eyebrow="Recruitment"
      title={`Results: ${group.name}`}
      description={group.description}
    >
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/dashboard/hc/recruitment/tests">
            <IconArrowLeft className="w-4 h-4" /> Back to Online Tests
          </Link>
        </Button>
      </div>

      <MinimalTableShell label="group entries" title={`Candidate Results for ${group.name}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CANDIDATE</TableHead>
              <TableHead>PROGRESS</TableHead>
              <TableHead>TOTAL SCORE</TableHead>
              {testHeaders.map(th => (
                <TableHead key={th.testId} className="whitespace-nowrap">{th.title}</TableHead>
              ))}
              <TableHead className="text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.candidateId}>
                <TableCell>
                  <div className="font-medium">{entry.fullName}</div>
                  <div className="text-xs text-muted-foreground">{entry.email}</div>
                  <div className="text-xs text-muted-foreground">{entry.phone}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.testsCompleted === testHeaders.length ? "default" : "secondary"}>
                    {entry.progressText}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold">
                  {entry.totalScore}
                </TableCell>
                
                {testHeaders.map(th => {
                  const testData = entry.tests[th.testId];
                  if (!testData) return <TableCell key={th.testId} className="text-muted-foreground text-xs">Not Started</TableCell>;
                  
                  return (
                    <TableCell key={th.testId}>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium">{testData.status}</span>
                        {th.isApplicationForm ? null : (
                          (testData.status === "Completed" || testData.status === "Graded") && testData.answerCount > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{Math.round((testData.correctCount / testData.answerCount) * 100)}%</span>
                              <span className="text-xs text-muted-foreground">{testData.correctCount}/{testData.answerCount} benar</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )
                        )}
                        {testData.id && (
                          <button
                            onClick={() => handleViewDetail(testData.id)}
                            disabled={isLoadingDetail}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors mt-1"
                            title="Lihat detail jawaban"
                          >
                            <IconEye className="w-3 h-3" /> Detail
                          </button>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
                
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(entry.candidateId)}
                      disabled={isDeleting === entry.candidateId}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Delete Candidate Results"
                    >
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4 + testHeaders.length} className="text-center h-24 text-muted-foreground">
                  No candidates have started this test group yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detail Hasil: {selectedDetail?.test?.title || "Test"}</DialogTitle>
            <DialogDescription>
              {selectedDetail?.assignment?.status}
              {selectedDetail?.answers?.length > 0 ? (() => {
                const correct = selectedDetail.answers.filter((a: any) => a.isCorrect === true).length;
                const total = selectedDetail.answers.length;
                return ` · Score: ${correct}/${total} (${Math.round((correct / total) * 100)}%)`;
              })() : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {selectedDetail?.questions?.map((question: any, index: number) => {
              const answer = selectedDetail?.answers?.find((item: any) => item.questionId === question.id);
              return (
                <div key={question.id} className="rounded-xl border bg-background p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Soal {index + 1}</Badge>
                    <Badge variant="outline">{question.questionType}</Badge>
                    {answer && answer.isCorrect !== null && answer.isCorrect !== undefined ? (
                      <Badge variant={answer.isCorrect ? "default" : "destructive"} className={answer.isCorrect ? "bg-emerald-600" : ""}>
                        {answer.isCorrect ? "Benar" : "Salah"} · {answer.pointsAwarded}/{question.points || 1} pts
                      </Badge>
                    ) : answer ? (
                      <Badge variant="outline">Belum dinilai</Badge>
                    ) : null}
                  </div>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.questionText }} />
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-lg bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Peserta</p>
                      <AnswerDisplay text={answer?.answerText} />
                    </div>
                    {question.correctAnswer && (
                      <div className="rounded-lg bg-muted/20 p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Jawaban Benar</p>
                        <p className="mt-1 whitespace-pre-wrap font-medium">{question.correctAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {(!selectedDetail?.questions || selectedDetail.questions.length === 0) && (
              <div className="text-center text-muted-foreground py-8">Tidak ada soal untuk test ini.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
