"use client";

import { useState, useEffect } from "react";
import { ApplicationForm } from "@/components/candidate/ApplicationForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startTestAssignment, submitTestAnswer, finishTestAssignment } from "@/app/actions/candidate-tests";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const normalizeQuestionType = (type: string) => type === "multi_select" || type === "checkbox_multi_select" ? "checkbox" : type;
const radioQuestionTypes = ["multiple_choice", "true_false", "rating", "matching", "ordering", "psychometric_scale", "personality", "interest_aptitude", "situational_judgement"];
const questionTypeLabel = (type: string) => ({ multiple_choice: "Pilihan Ganda", true_false: "Benar / Salah", checkbox: "Checkbox", multi_select: "Checkbox", checkbox_multi_select: "Checkbox", dropdown: "Dropdown", number: "Number", date: "Date", file_upload: "Upload File", rating: "Rating", matching: "Matching", ordering: "Ordering", passage: "Passage", psychometric_scale: "Skala Psikotes", personality: "Psikotes Kepribadian", interest_aptitude: "Minat & Bakat", situational_judgement: "Situational Judgement", essay: "Essay" }[type] || type);
const getDefaultOptionsForType = (type: string) => {
  if (type === "true_false") return [{ id: "A", text: "Benar" }, { id: "B", text: "Salah" }];
  if (normalizeQuestionType(type) === "checkbox") return [{ id: "A", text: "Pilihan A" }, { id: "B", text: "Pilihan B" }, { id: "C", text: "Pilihan C" }];
  if (type === "dropdown") return [{ id: "A", text: "Opsi 1" }, { id: "B", text: "Opsi 2" }];
  if (type === "rating") return [{ id: "1", text: "1" }, { id: "2", text: "2" }, { id: "3", text: "3" }, { id: "4", text: "4" }, { id: "5", text: "5" }];
  if (type === "matching") return [{ id: "A", text: "Istilah A = Jawaban A" }, { id: "B", text: "Istilah B = Jawaban B" }];
  if (type === "ordering") return [{ id: "1", text: "Langkah pertama" }, { id: "2", text: "Langkah kedua" }, { id: "3", text: "Langkah ketiga" }];
  if (type === "psychometric_scale") return [{ id: "1", text: "Sangat Tidak Setuju" }, { id: "2", text: "Tidak Setuju" }, { id: "3", text: "Netral" }, { id: "4", text: "Setuju" }, { id: "5", text: "Sangat Setuju" }];
  if (type === "personality") return [{ id: "A", text: "Sangat sesuai dengan saya" }, { id: "B", text: "Cukup sesuai" }, { id: "C", text: "Kurang sesuai" }, { id: "D", text: "Tidak sesuai" }];
  if (type === "interest_aptitude") return [{ id: "A", text: "Administrasi" }, { id: "B", text: "Pelayanan lapangan" }, { id: "C", text: "Analitis" }, { id: "D", text: "Komunikasi" }];
  if (type === "situational_judgement") return [{ id: "A", text: "Mengikuti SOP dan eskalasi ke atasan" }, { id: "B", text: "Mengambil keputusan sendiri" }, { id: "C", text: "Menunda sampai instruksi berikutnya" }];
  return [];
};
const getDisplayOptions = (question: any) => {
  const savedOptions = Array.isArray(question.options) ? question.options.filter((option: any) => option?.text?.trim() || option?.imageUrl) : [];
  return savedOptions.length ? savedOptions : getDefaultOptionsForType(question.questionType);
};

export function CandidateTestClientPage({ assignment, test, questions, previousAnswers }: { assignment: any, test: any, questions: any[], previousAnswers?: any }) {
  const [hasStarted, setHasStarted] = useState(assignment.status !== "Pending");
  const [isFinished, setIsFinished] = useState(assignment.status === "Completed");
  const [timeLeft, setTimeLeft] = useState(test.timeLimitMinutes * 60);
  const [answers, setAnswers] = useState<Record<number, string>>(previousAnswers || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabLeaveCount, setTabLeaveCount] = useState(0);
  const [refreshCount] = useState(() => { if (typeof window === "undefined") return 0; const key = `test-refresh-${assignment.id}`; const next = Number(sessionStorage.getItem(key) || "0") + 1; sessionStorage.setItem(key, String(next)); return Math.max(0, next - 1); });
  
  // Test Group Flow
  const [groupId, setGroupId] = useState<number | null>(null);
  const [nextTestInfo, setNextTestInfo] = useState<{ hasNext: boolean; nextAccessKey?: string }>({ hasNext: false });
  
  useEffect(() => {
    // Check if there is a groupId in URL query params
    const searchParams = new URLSearchParams(window.location.search);
    const gId = searchParams.get('groupId');
    if (gId) {
      setGroupId(Number(gId));
      // fetch next test
      import("@/app/actions/test-group").then(module => {
        module.getNextTestInGroup(Number(gId), test.id, assignment.candidateId).then(res => {
          setNextTestInfo(res);
        });
      });
    }
  }, [assignment.candidateId, test.id]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden && hasStarted && !isFinished) setTabLeaveCount((count) => count + 1); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hasStarted, isFinished]);

  useEffect(() => {
    let timer: any;
    if (hasStarted && !isFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      handleFinishTest();
    }
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, timeLeft]);

  const handleStart = async () => {
    try {
      await startTestAssignment(assignment.id);
      setHasStarted(true);
      toast.success("Test started. Good luck!");
    } catch (e) {
      toast.error("Failed to start test.");
    }
  };

  const handleFinishTest = async () => {
    if (isFinished) return;
    setIsSubmitting(true);
    try {
      await finishTestAssignment(assignment.id, answers, { tabLeaveCount, refreshCount });
      setIsFinished(true);
      toast.success("Test submitted successfully!");
    } catch (e) {
      toast.error("Failed to submit test.");
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto mt-20 text-center p-6">
        <CardHeader>
          <div className="mx-auto bg-green-100 text-green-700 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl">✓</div>
          <CardTitle className="text-2xl">Assessment Completed</CardTitle>
          <CardDescription>Thank you for completing the test. You may now close this window.</CardDescription>
        </CardHeader>
        {nextTestInfo.hasNext && nextTestInfo.nextAccessKey && (
          <CardFooter className="flex justify-center mt-4">
            <Button size="lg" onClick={() => window.location.href = `/test/${nextTestInfo.nextAccessKey}?groupId=${groupId}`}>
              Lanjut ke Tes Berikutnya
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  if (!hasStarted) {
    return (
      <Card className="max-w-xl mx-auto shadow-sm">
        <CardHeader className="flex flex-col items-center text-center space-y-4">
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-16 object-contain" />
          <div>
            <CardTitle className="text-2xl">{test.title}</CardTitle>
            <CardDescription>Online Assessment - Candidate ID: {assignment.candidateId}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Time Limit</p>
              <p className="font-semibold">{test.timeLimitMinutes} Minutes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Questions</p>
              <p className="font-semibold">{questions.length}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Make sure you are in a quiet environment with a stable internet connection. 
            Once you start the test, the timer will not stop.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStart} className="w-full h-12 text-lg">Start Assessment</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b shadow-sm mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-10 object-contain hidden sm:block" />
          <div>
            <h1 className="font-bold text-lg">{test.title}</h1>
            <p className="text-sm text-muted-foreground">Candidate ID: {assignment.candidateId}</p>
          </div>
        </div>
        <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-destructive' : ''}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-6">
        {test.isApplicationForm ? (
          <ApplicationForm answers={answers} setAnswers={setAnswers} questionId={questions[0]?.id || 0} />
        ) : (
          questions.map((q, index) => (
            <Card key={q.id}>
            <CardHeader className="bg-muted/20 border-b pb-4">
              <div className="flex gap-3">
                <Badge className="h-6 w-6 flex items-center justify-center p-0 rounded-full">{index + 1}</Badge><Badge variant="outline">{questionTypeLabel(q.questionType)}</Badge>
                <CardTitle className="text-base leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: q.questionText }} />
              </div>
              {q.imageUrl && <img src={q.imageUrl} alt="Gambar soal" className="mt-4 max-h-80 w-full rounded-lg border object-contain" />}
            </CardHeader>
            <CardContent className="pt-6">
              {radioQuestionTypes.includes(normalizeQuestionType(q.questionType)) && (() => {
                const options = getDisplayOptions(q);
                const hasImageOptions = options.some((opt: any) => opt.imageUrl);
                return (
                  <RadioGroup 
                    value={answers[q.id] || ""} 
                    onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                    className={hasImageOptions ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}
                  >
                    {options.map((opt: any) => {
                      const isSelected = answers[q.id] === opt.id;
                      return hasImageOptions ? (
                        <div key={opt.id} className={`flex flex-col border p-3 rounded-lg cursor-pointer hover:bg-muted/10 transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`} onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}>
                          <div className="w-full aspect-[4/3] bg-muted/20 rounded-md overflow-hidden mb-3 relative flex items-center justify-center">
                            {opt.imageUrl ? (
                              <img src={opt.imageUrl} alt={opt.text} className="w-full h-full object-contain p-2" />
                            ) : (
                              <span className="text-muted-foreground text-sm">No Image</span>
                            )}
                            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 border shadow-sm flex items-center justify-center">
                              <RadioGroupItem value={opt.id} id={`q-${q.id}-${opt.id}`} className="block m-0" />
                            </div>
                          </div>
                          <Label htmlFor={`q-${q.id}-${opt.id}`} className="cursor-pointer font-medium text-center w-full"><span className="font-bold mr-1">{opt.id}.</span> {opt.id === opt.text ? "" : opt.text}</Label>
                        </div>
                      ) : (
                        <div key={opt.id} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-muted/10 cursor-pointer transition-colors" onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}>
                          <RadioGroupItem value={opt.id} id={`q-${q.id}-${opt.id}`} />
                          <Label htmlFor={`q-${q.id}-${opt.id}`} className="flex-1 cursor-pointer font-normal text-base"><span className="font-bold mr-2">{opt.id}.</span> {opt.id === opt.text ? "" : opt.text}</Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                );
              })()}
              {normalizeQuestionType(q.questionType) === "checkbox" && (() => {
                const options = getDisplayOptions(q);
                const hasImageOptions = options.some((opt: any) => opt.imageUrl);
                return (
                  <div className={hasImageOptions ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
                    {options.map((opt: any) => {
                      const selected = (answers[q.id] || "").split(",").filter(Boolean);
                      const isChecked = selected.includes(opt.id);
                      return hasImageOptions ? (
                        <label key={opt.id} className={`flex flex-col border p-3 rounded-lg cursor-pointer hover:bg-muted/10 transition-colors ${isChecked ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="w-full aspect-[4/3] bg-muted/20 rounded-md overflow-hidden mb-3 relative flex items-center justify-center">
                            {opt.imageUrl ? (
                              <img src={opt.imageUrl} alt={opt.text} className="w-full h-full object-contain p-2" />
                            ) : (
                              <span className="text-muted-foreground text-sm">No Image</span>
                            )}
                            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 border shadow-sm flex items-center justify-center">
                              <input type="checkbox" checked={isChecked} onChange={(event) => { const next = event.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id); setAnswers({ ...answers, [q.id]: next.join(",") }); }} className="h-4 w-4 rounded border-primary accent-primary" />
                            </div>
                          </div>
                          <span className="font-medium text-center w-full"><span className="font-bold mr-1">{opt.id}.</span> {opt.id === opt.text ? "" : opt.text}</span>
                        </label>
                      ) : (
                        <label key={opt.id} className="flex items-center gap-3 border p-4 rounded-lg hover:bg-muted/10 cursor-pointer">
                          <input type="checkbox" checked={isChecked} onChange={(event) => { const next = event.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id); setAnswers({ ...answers, [q.id]: next.join(",") }); }} /> 
                          <span className="flex-1"><span className="font-bold mr-2">{opt.id}.</span> {opt.id === opt.text ? "" : opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
              {normalizeQuestionType(q.questionType) === "dropdown" && (
                <select className="w-full rounded-lg border bg-background p-3" value={answers[q.id] || ""} onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}>
                  <option value="">Pilih jawaban...</option>{getDisplayOptions(q).map((opt: any) => <option key={opt.id} value={opt.id}>{opt.text}</option>)}
                </select>
              )}
              {normalizeQuestionType(q.questionType) === "number" && <input type="number" className="w-full rounded-lg border bg-background p-3" value={answers[q.id] || ""} onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })} />}
              {normalizeQuestionType(q.questionType) === "date" && <input type="date" className="w-full rounded-lg border bg-background p-3" value={answers[q.id] || ""} onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })} />}
              {normalizeQuestionType(q.questionType) === "file_upload" && <input type="file" className="w-full rounded-lg border bg-background p-3" onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.files?.[0]?.name || "" })} />}
              {normalizeQuestionType(q.questionType) === "passage" && <Textarea rows={6} placeholder="Tulis jawaban berdasarkan bacaan..." value={answers[q.id] || ""} onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })} />}
              {q.questionType === "essay" && (
                <Textarea 
                  rows={4} 
                  placeholder="Type your answer here..." 
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
              {q.questionType === "disc" && (() => {
                const options = getDisplayOptions(q);
                const currentAnswer = answers[q.id] || ",";
                const [mirip, tidakMirip] = currentAnswer.split(",");
                
                const handleDiscChange = (type: "mirip" | "tidakMirip", optId: string) => {
                  if (type === "mirip") {
                    setAnswers({ ...answers, [q.id]: `${optId},${tidakMirip === optId ? "" : tidakMirip}` });
                  } else {
                    setAnswers({ ...answers, [q.id]: `${mirip === optId ? "" : mirip},${optId}` });
                  }
                };

                return (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse min-w-[400px]">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-3 border-b border-r text-center font-medium w-24">Mirip</th>
                          <th className="p-3 border-b border-r text-center font-medium w-24">Tidak Mirip</th>
                          <th className="p-3 border-b text-left font-medium">Pernyataan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {options.map((opt: any, index: number) => (
                          <tr key={opt.id} className={`hover:bg-muted/10 transition-colors ${index !== options.length - 1 ? 'border-b' : ''}`}>
                            <td className="p-3 border-r text-center">
                              <input 
                                type="radio" 
                                name={`q-${q.id}-mirip`} 
                                checked={mirip === opt.id} 
                                onChange={() => handleDiscChange("mirip", opt.id)} 
                                className="w-4 h-4 cursor-pointer accent-primary" 
                              />
                            </td>
                            <td className="p-3 border-r text-center">
                              <input 
                                type="radio" 
                                name={`q-${q.id}-tidakMirip`} 
                                checked={tidakMirip === opt.id} 
                                onChange={() => handleDiscChange("tidakMirip", opt.id)} 
                                className="w-4 h-4 cursor-pointer accent-primary" 
                              />
                            </td>
                            <td className="p-3 text-left">
                              <span className="font-semibold mr-2">{opt.id}.</span>{opt.text}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {test.isApplicationForm 
              ? "Application Form" 
              : `Answered: ${Object.keys(answers).length} of ${questions.length} · Tab leave: ${tabLeaveCount}`}
          </p>
          <Button onClick={() => {
            if (confirm("Are you sure you want to finish the test? You cannot change your answers after submission.")) {
              handleFinishTest();
            }
          }} disabled={isSubmitting} size="lg">
            {isSubmitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
