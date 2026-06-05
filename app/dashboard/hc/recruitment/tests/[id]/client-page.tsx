"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addTestQuestion, deleteTestQuestion } from "@/app/actions/recruitment-tests";
import { uploadFile } from "@/app/actions/upload";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconPhotoUp, IconX, IconLink } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export function RecruitmentTestDetailsClientPage({ initialTest, initialQuestions }: { initialTest: any, initialQuestions: any[] }) {
  const [test, setTest] = useState(initialTest);
  const [questions, setQuestions] = useState(initialQuestions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    questionType: "multiple_choice",
    questionText: "",
    imageUrl: "",
    correctAnswer: "A",
    points: 10,
    sortOrder: questions.length + 1,
    options: [
      { id: "A", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "B", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "C", text: "", imageUrl: "", readableImageUrl: "" },
      { id: "D", text: "", imageUrl: "", readableImageUrl: "" },
    ],
    readableImageUrl: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'question' | number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await uploadFile(data);
      if (res.success) {
        if (target === 'question') {
          setFormData(prev => ({ ...prev, imageUrl: res.url, readableImageUrl: res.readableUrl || res.url }));
        } else {
          const newOpts = [...formData.options];
          newOpts[target as number].imageUrl = res.url;
          newOpts[target as number].readableImageUrl = res.readableUrl || res.url;
          setFormData(prev => ({ ...prev, options: newOpts }));
        }
        toast.success("Image uploaded!");
      } else {
        toast.error("Upload failed");
      }
    } catch (err: any) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddOption = () => {
    const nextChar = String.fromCharCode(65 + formData.options.length); // A, B, C, D...
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: nextChar, text: "", imageUrl: "", readableImageUrl: "" }]
    }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) return toast.error("Minimum 2 options required");
    const newOpts = formData.options.filter((_, i) => i !== index);
    // Re-assign IDs (A, B, C...)
    const normalizedOpts = newOpts.map((opt, i) => ({ ...opt, id: String.fromCharCode(65 + i) }));
    
    setFormData(prev => ({
      ...prev,
      options: normalizedOpts,
      // Reset correct answer if it was the removed option, default to A
      correctAnswer: normalizedOpts.some(o => o.id === prev.correctAnswer) ? prev.correctAnswer : "A"
    }));
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        questionType: formData.questionType,
        questionText: formData.questionText,
        imageUrl: formData.imageUrl,
        options: formData.questionType === "multiple_choice" ? formData.options : null,
        correctAnswer: formData.correctAnswer,
        points: formData.points,
        sortOrder: formData.sortOrder,
      };
      const newQuestion = await addTestQuestion(test.id, payload);
      
      // Re-attach the readable image URLs from formData so the optimistic UI preview works immediately
      const optimisticQuestion = {
        ...newQuestion,
        imageUrl: formData.readableImageUrl || newQuestion.imageUrl,
        options: newQuestion.options ? (newQuestion.options as any[]).map((opt, i) => ({
          ...opt,
          imageUrl: formData.options[i]?.readableImageUrl || opt.imageUrl
        })) : null
      };

      setQuestions([...questions, optimisticQuestion as any]);
      toast.success("Question added!");
      setIsCreateOpen(false);
      setFormData(prev => ({ 
        ...prev, 
        questionText: "", 
        imageUrl: "",
        sortOrder: prev.sortOrder + 1,
        options: [
          { id: "A", text: "", imageUrl: "", readableImageUrl: "" },
          { id: "B", text: "", imageUrl: "", readableImageUrl: "" },
          { id: "C", text: "", imageUrl: "", readableImageUrl: "" },
          { id: "D", text: "", imageUrl: "", readableImageUrl: "" },
        ],
        readableImageUrl: "",
      }));
    } catch (e: any) {
      toast.error(e.message || "Failed to add question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteTestQuestion(id);
      setQuestions(questions.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete question");
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/test/public/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied to clipboard!");
  };

  return (
    <AdminPageShell
      title={`Test Editor: ${test.title}`}
      description="Manage the questions and answers for this online test."
      breadcrumbs={[
        { label: "Human Capital", href: "/dashboard/hc" },
        { label: "Recruitment", href: "/dashboard/hc/recruitment" },
        { label: "Online Tests", href: "/dashboard/hc/recruitment/tests" },
        { label: test.title, href: `/dashboard/hc/recruitment/tests/${test.id}` },
      ]}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
          <p className="text-sm text-muted-foreground">Passing Score: {test.passingScore} &bull; Time Limit: {test.timeLimitMinutes} Mins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyPublicLink} className="gap-2">
            <IconLink className="w-4 h-4" /> Copy Public Link
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <IconPlus className="w-4 h-4" /> Add Question
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-card border rounded-lg p-5">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3 items-start">
                <Badge variant="secondary">{i + 1}</Badge>
                <div className="max-w-3xl overflow-hidden">
                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Question Attachment" className="max-h-40 rounded-md border mb-3 object-contain" />
                  )}
                  {/* Safely render HTML from Rich Text Editor */}
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">{q.questionType === 'multiple_choice' ? 'Multiple Choice' : 'Essay'}</Badge>
                    <Badge variant="outline" className="text-xs">{q.points} Points</Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                <IconTrash className="w-4 h-4 text-destructive/70 hover:text-destructive" />
              </Button>
            </div>
            
            {q.questionType === "multiple_choice" && q.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pl-10">
                {q.options.map((opt: any) => (
                  <div key={opt.id} className={`p-3 rounded-lg border text-sm flex flex-col gap-2 ${opt.id === q.correctAnswer ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold opacity-50 w-5">{opt.id}.</span> 
                      <span className={opt.id === q.correctAnswer ? 'font-medium' : ''}>{opt.text}</span>
                    </div>
                    {opt.imageUrl && (
                      <div className="pl-7">
                        <img src={opt.imageUrl} alt={`Option ${opt.id}`} className="h-16 rounded border object-contain bg-background" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {q.questionType === "essay" && (
              <div className="mt-4 pl-10 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md inline-block">
                <span className="font-semibold text-foreground">Expected Keyword / Reference:</span> {q.correctAnswer}
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && (
          <div className="text-center p-12 border border-dashed rounded-lg text-muted-foreground">
            No questions yet. Click "Add Question" to start building your test.
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Create a new question with formatted text and images.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={formData.questionType} onValueChange={(val) => setFormData({ ...formData, questionType: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="essay">Essay / Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input type="number" value={formData.points} onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label>Question Content</Label>
                <div>
                  <Label htmlFor="q-image-upload" className="cursor-pointer flex items-center gap-1 text-xs text-accent hover:underline font-medium">
                    <IconPhotoUp className="w-3 h-3" /> Add Image
                  </Label>
                  <input id="q-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'question')} disabled={isUploading} />
                </div>
              </div>
              
              {formData.readableImageUrl && (
                <div className="relative inline-block border rounded-md bg-muted/30 p-2 mb-2">
                  <img src={formData.readableImageUrl} className="max-h-32 object-contain" alt="Question Preview" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6 rounded-full" onClick={() => setFormData({...formData, imageUrl: "", readableImageUrl: ""})}>
                    <IconX className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <RichTextEditor 
                value={formData.questionText} 
                onChange={(val) => setFormData({ ...formData, questionText: val })} 
                placeholder="Type your question here..." 
              />
            </div>

            {formData.questionType === "multiple_choice" ? (
              <div className="space-y-3 bg-muted/10 p-4 rounded-lg border mt-6">
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-semibold text-base">Options</Label>
                  <Button variant="outline" size="sm" onClick={handleAddOption} className="h-8 gap-1">
                    <IconPlus className="w-3 h-3" /> Add Option
                  </Button>
                </div>

                <div className="grid gap-3">
                  {formData.options.map((opt, idx) => (
                    <div key={opt.id} className="flex gap-2 items-start bg-background p-2 rounded border">
                      <div className="pt-2 font-bold w-6 text-center">{opt.id}</div>
                      <div className="flex-1 space-y-2">
                        <Input value={opt.text} onChange={(e) => {
                          const newOpts = [...formData.options];
                          newOpts[idx].text = e.target.value;
                          setFormData({ ...formData, options: newOpts });
                        }} placeholder={`Option text...`} />
                        
                        {opt.readableImageUrl || opt.imageUrl ? (
                          <div className="relative inline-block border rounded bg-muted/30 p-1">
                            <img src={opt.readableImageUrl || opt.imageUrl} className="h-12 object-contain" alt={`Opt ${opt.id}`} />
                            <button type="button" className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5" onClick={() => {
                              const newOpts = [...formData.options];
                              newOpts[idx].imageUrl = "";
                              newOpts[idx].readableImageUrl = "";
                              setFormData({ ...formData, options: newOpts });
                            }}>
                              <IconX className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor={`opt-img-${opt.id}`} className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-accent font-medium w-fit">
                              <IconPhotoUp className="w-3 h-3" /> Add Image to Option
                            </Label>
                            <input id={`opt-img-${opt.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, idx)} disabled={isUploading} />
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveOption(idx)} disabled={formData.options.length <= 2}>
                        <IconX className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <Label>Correct Answer</Label>
                  <Select value={formData.correctAnswer} onValueChange={(val) => setFormData({ ...formData, correctAnswer: val })}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {formData.options.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>Option {opt.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-muted/10 p-4 rounded-lg border mt-6">
                <Label>Expected Answer / Keyword</Label>
                <Input value={formData.correctAnswer} onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })} placeholder="e.g. JavaScript" />
                <p className="text-xs text-muted-foreground">The system will look for this keyword to auto-score, or HR can grade it manually.</p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.questionText || isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : isUploading ? "Uploading..." : "Save Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
