"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startTestAssignment, submitTestAnswer, finishTestAssignment } from "@/app/actions/candidate-tests";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CandidateTestClientPage({ assignment, test, questions }: { assignment: any, test: any, questions: any[] }) {
  const [hasStarted, setHasStarted] = useState(assignment.status !== "Pending");
  const [isFinished, setIsFinished] = useState(assignment.status === "Completed");
  const [timeLeft, setTimeLeft] = useState(test.timeLimitMinutes * 60);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      for (const [qId, answer] of Object.entries(answers)) {
        await submitTestAnswer(assignment.id, parseInt(qId), answer);
      }
      await finishTestAssignment(assignment.id);
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
      </Card>
    );
  }

  if (!hasStarted) {
    return (
      <Card className="max-w-2xl mx-auto mt-20">
        <CardHeader>
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          <CardDescription>{test.description}</CardDescription>
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
        <div>
          <h1 className="font-bold text-lg">{test.title}</h1>
          <p className="text-sm text-muted-foreground">Candidate ID: {assignment.candidateId}</p>
        </div>
        <div className={`text-2xl font-mono font-bold ${timeLeft < 300 ? 'text-destructive' : ''}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader className="bg-muted/20 border-b pb-4">
              <div className="flex gap-3">
                <Badge className="h-6 w-6 flex items-center justify-center p-0 rounded-full">{index + 1}</Badge>
                <CardTitle className="text-base leading-relaxed font-medium">{q.questionText}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {q.questionType === "multiple_choice" && q.options && (
                <RadioGroup 
                  value={answers[q.id] || ""} 
                  onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}
                  className="space-y-3"
                >
                  {q.options.map((opt: any) => (
                    <div key={opt.id} className="flex items-center space-x-3 border p-4 rounded-lg hover:bg-muted/10 cursor-pointer transition-colors" onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}>
                      <RadioGroupItem value={opt.id} id={`q-${q.id}-${opt.id}`} />
                      <Label htmlFor={`q-${q.id}-${opt.id}`} className="flex-1 cursor-pointer font-normal text-base">{opt.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              {q.questionType === "essay" && (
                <Textarea 
                  rows={4} 
                  placeholder="Type your answer here..." 
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl w-full mx-auto flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Answered: {Object.keys(answers).length} of {questions.length}
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
