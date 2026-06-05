"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { IconArrowLeft, IconCalendarEvent, IconCheck, IconX, IconVideo, IconMapPin, IconStethoscope, IconLink, IconCopy } from "@tabler/icons-react";

import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { scheduleCandidateInterview, updateInterviewStatus } from "@/app/actions/interviews";
import { scheduleCandidateMcu, updateMcuResult } from "@/app/actions/mcu";
import { generateOnboardingToken } from "@/app/actions/onboarding";

export function CandidateDetailClientPage({ candidate, interviews, mcuRecords }: { candidate: any, interviews: any[], mcuRecords: any[] }) {
  const router = useRouter();
  
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledAtDate: "",
    scheduledAtTime: "",
    durationMinutes: 60,
    interviewType: "Online",
    locationOrLink: "",
    interviewerName: "",
    notes: ""
  });

  const [isMcuScheduleOpen, setIsMcuScheduleOpen] = useState(false);
  const [isMcuSubmitting, setIsMcuSubmitting] = useState(false);
  const [mcuForm, setMcuForm] = useState({
    klinikName: "",
    klinikEmail: "",
    paketMcu: "",
    scheduledDate: "",
  });

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.scheduledAtDate || !scheduleForm.scheduledAtTime || !scheduleForm.locationOrLink || !scheduleForm.interviewerName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleForm.scheduledAtDate}T${scheduleForm.scheduledAtTime}`);
      
      await scheduleCandidateInterview(candidate.id, {
        scheduledAt,
        durationMinutes: scheduleForm.durationMinutes,
        interviewType: scheduleForm.interviewType,
        locationOrLink: scheduleForm.locationOrLink,
        interviewerName: scheduleForm.interviewerName,
        notes: scheduleForm.notes,
      });

      toast.success("Interview scheduled and email sent to candidate.");
      setIsScheduleOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (interviewId: number, status: string, result: string) => {
    try {
      await updateInterviewStatus(interviewId, status, result);
      toast.success("Interview status updated.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status.");
    }
  };

  const handleMcuSubmit = async () => {
    if (!mcuForm.klinikName || !mcuForm.klinikEmail || !mcuForm.paketMcu || !mcuForm.scheduledDate) {
      toast.error("Please fill in all required MCU fields.");
      return;
    }

    setIsMcuSubmitting(true);
    try {
      const scheduledDate = new Date(mcuForm.scheduledDate);
      
      await scheduleCandidateMcu(candidate.id, {
        klinikName: mcuForm.klinikName,
        klinikEmail: mcuForm.klinikEmail,
        paketMcu: mcuForm.paketMcu,
        scheduledDate,
      });

      toast.success("MCU scheduled and emails sent to Clinic and Candidate.");
      setIsMcuScheduleOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule MCU.");
    } finally {
      setIsMcuSubmitting(false);
    }
  };

  const handleMcuResult = async (mcuId: number, status: string, notes: string) => {
    try {
      await updateMcuResult(mcuId, status, notes);
      toast.success(`MCU marked as ${status}.`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update MCU result.");
    }
  };

  const handleGenerateOnboardingToken = async () => {
    try {
      const res = await generateOnboardingToken(candidate.id);
      if (res.success) {
        toast.success("Onboarding link generated successfully");
      } else {
        toast.error(res.error || "Failed to generate link");
      }
    } catch (e: any) {
      toast.error(e.message || "Error generating link");
    }
  };

  const onboardingUrl = candidate.onboardingToken 
    ? `${window.location.origin}/onboarding/${candidate.onboardingToken}` 
    : "";

  return (
    <>
      <AdminPageShell>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/hc/recruitment")}>
          <IconArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{candidate.fullName}</h1>
          <p className="text-muted-foreground">
            {candidate.jobTitle} • Applied on {format(new Date(candidate.createdAt), "dd MMM yyyy")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">{candidate.currentStage}</Badge>
          {candidate.cvUrl && (
            <Button asChild variant="outline">
              <a href={candidate.cvUrl} target="_blank" rel="noreferrer">View CV</a>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          <TabsTrigger value="mcu">Medical Checkup ({mcuRecords.length})</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{candidate.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{candidate.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="font-medium">{candidate.source}</div>
                </div>
                {candidate.aiScore !== null && (
                  <div>
                    <div className="text-sm text-muted-foreground">AI Match Score</div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="text-lg">{candidate.aiScore}%</span>
                    </div>
                  </div>
                )}
                {candidate.aiSummary && (
                  <div>
                    <div className="text-sm text-muted-foreground">AI Summary</div>
                    <div className="text-sm mt-1 bg-muted/50 p-3 rounded-md">{candidate.aiSummary}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Education & Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Work Experience</h4>
                  {candidate.workExperience?.length > 0 ? (
                    <ul className="space-y-3">
                      {candidate.workExperience.map((we: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                          <div className="font-medium">{we.role} at {we.company}</div>
                          <div className="text-muted-foreground text-xs">{we.yearIn} - {we.yearOut}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No experience listed</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Education</h4>
                  {candidate.education?.length > 0 ? (
                    <ul className="space-y-3">
                      {candidate.education.map((edu: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                          <div className="font-medium">{edu.institution} ({edu.level})</div>
                          <div className="text-muted-foreground text-xs">{edu.major} • {edu.yearIn} - {edu.yearOut}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No education listed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interviews">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Interview Schedule</h3>
            <Button onClick={() => setIsScheduleOpen(true)}>
              <IconCalendarEvent className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </div>

          {interviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <IconCalendarEvent className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-medium">No interviews scheduled</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  This candidate does not have any upcoming or past interviews. Click the button above to schedule one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Card key={interview.id} className={interview.status === 'Completed' ? 'opacity-80 bg-muted/30' : ''}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {interview.interviewType === 'Online' ? <IconVideo className="w-4 h-4" /> : <IconMapPin className="w-4 h-4" />}
                        {interview.interviewType} Interview
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(interview.scheduledAt), "EEEE, dd MMMM yyyy • HH:mm")} ({interview.durationMinutes} mins)
                      </CardDescription>
                    </div>
                    <Badge variant={
                      interview.status === 'Scheduled' ? 'default' : 
                      interview.status === 'Completed' ? 'secondary' : 'destructive'
                    }>
                      {interview.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Interviewer</span>
                        <span className="font-medium">{interview.interviewerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Location / Link</span>
                        {interview.locationOrLink.startsWith('http') ? (
                          <a href={interview.locationOrLink} target="_blank" className="text-blue-500 hover:underline">{interview.locationOrLink}</a>
                        ) : (
                          <span className="font-medium">{interview.locationOrLink}</span>
                        )}
                      </div>
                      {interview.notes && (
                        <div className="md:col-span-2 mt-2 bg-muted/50 p-3 rounded-md">
                          <span className="text-muted-foreground block text-xs mb-1">Notes to Candidate</span>
                          {interview.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {interview.status === 'Scheduled' && (
                    <div className="bg-muted/30 p-4 border-t flex items-center justify-end gap-2">
                      <span className="text-sm text-muted-foreground mr-auto">Mark interview outcome:</span>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" 
                        onClick={() => handleUpdateStatus(interview.id, 'Completed', 'Pass')}>
                        <IconCheck className="w-4 h-4 mr-1" /> Passed
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleUpdateStatus(interview.id, 'Completed', 'Fail')}>
                        <IconX className="w-4 h-4 mr-1" /> Failed
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleUpdateStatus(interview.id, 'No-Show', 'Fail')}>
                        No-Show
                      </Button>
                    </div>
                  )}

                  {interview.status === 'Completed' && (
                    <div className="bg-muted/30 p-3 border-t">
                      <span className="text-sm font-medium">Result: <Badge variant={interview.result === 'Pass' ? 'default' : 'destructive'} className={interview.result === 'Pass' ? 'bg-green-500' : ''}>{interview.result}</Badge></span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mcu">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Medical Check Up (MCU)</h3>
            <Button onClick={() => setIsMcuScheduleOpen(true)}>
              <IconStethoscope className="w-4 h-4 mr-2" />
              Schedule MCU
            </Button>
          </div>

          {mcuRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <IconStethoscope className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-medium">No MCU scheduled</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  This candidate has not been scheduled for a Medical Checkup yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mcuRecords.map((mcu) => (
                <Card key={mcu.id} className={mcu.status !== 'Scheduled' ? 'opacity-90 bg-muted/20' : ''}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconStethoscope className="w-4 h-4" />
                        Medical Checkup at {mcu.klinikName}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(mcu.scheduledDate), "EEEE, dd MMMM yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      mcu.status === 'Scheduled' ? 'default' : 
                      mcu.status === 'Fit' ? 'secondary' : 'destructive'
                    } className={mcu.status === 'Fit' ? 'bg-green-500' : ''}>
                      {mcu.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Clinic Email</span>
                        <span className="font-medium">{mcu.klinikEmail}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">MCU Package</span>
                        <span className="font-medium">{mcu.paketMcu}</span>
                      </div>
                      {mcu.resultNotes && (
                        <div className="md:col-span-2 mt-2 bg-muted/50 p-3 rounded-md">
                          <span className="text-muted-foreground block text-xs mb-1">Result Notes</span>
                          {mcu.resultNotes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {mcu.status === 'Scheduled' && (
                    <div className="bg-muted/30 p-4 border-t flex items-center justify-end gap-2">
                      <span className="text-sm text-muted-foreground mr-auto">Mark MCU Result:</span>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" 
                        onClick={() => {
                          const notes = prompt("Any notes for FIT result?");
                          if (notes !== null) handleMcuResult(mcu.id, 'Fit', notes);
                        }}>
                        <IconCheck className="w-4 h-4 mr-1" /> Fit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          const notes = prompt("Reason for UNFIT result?");
                          if (notes !== null) handleMcuResult(mcu.id, 'Unfit', notes);
                        }}>
                        <IconX className="w-4 h-4 mr-1" /> Unfit
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Onboarding Data</h3>
            {!candidate.onboardingToken ? (
              <Button onClick={handleGenerateOnboardingToken}>
                <IconLink className="w-4 h-4 mr-2" />
                Generate Onboarding Link
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(onboardingUrl);
                  toast.success("Link copied to clipboard");
                }}>
                  <IconCopy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button asChild variant="secondary">
                  <a href={onboardingUrl} target="_blank" rel="noreferrer">
                    <IconLink className="w-4 h-4 mr-2" />
                    Open Form
                  </a>
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Administrative Information</CardTitle>
              <CardDescription>Data submitted by candidate via the onboarding link</CardDescription>
            </CardHeader>
            <CardContent>
              {candidate.nikKtp ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">NIK KTP</div>
                      <div className="font-medium">{candidate.nikKtp || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">NPWP Number</div>
                      <div className="font-medium">{candidate.npwpNumber || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Emergency Contact Name</div>
                      <div className="font-medium">{candidate.emergencyContactName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Emergency Contact Phone</div>
                      <div className="font-medium">{candidate.emergencyContactPhone || "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Bank Name</div>
                      <div className="font-medium">{candidate.bankName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Bank Account Number</div>
                      <div className="font-medium">{candidate.bankAccountNumber || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">BPJS Kesehatan</div>
                      <div className="font-medium">{candidate.bpjsKesehatan || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">BPJS Ketenagakerjaan</div>
                      <div className="font-medium">{candidate.bpjsKetenagakerjaan || "-"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <IconLink className="w-12 h-12 mb-4 opacity-20" />
                  <p>Candidate has not submitted their onboarding data yet.</p>
                  {!candidate.onboardingToken && (
                    <p className="text-sm mt-1">Generate a link first to send to the candidate.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {candidate.stages?.map((stage: any, i: number) => (
                  <div key={stage.id} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1"></div>
                    <div className="font-medium">{stage.stage}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Entered: {format(new Date(stage.enteredAt), "dd MMM yyyy HH:mm")}
                      {stage.exitedAt && ` • Exited: ${format(new Date(stage.exitedAt), "dd MMM yyyy HH:mm")}`}
                    </div>
                    {stage.result && (
                      <div className="mt-2 text-sm flex gap-2">
                        <Badge variant="outline">{stage.result}</Badge>
                        {stage.score !== null && <Badge variant="secondary">Score: {stage.score}</Badge>}
                      </div>
                    )}
                    {stage.notes && (
                      <div className="mt-2 text-sm bg-muted/50 p-2 rounded">{stage.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={scheduleForm.scheduledAtDate} onChange={(e) => setScheduleForm({...scheduleForm, scheduledAtDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Time <span className="text-destructive">*</span></Label>
                <Input type="time" value={scheduleForm.scheduledAtTime} onChange={(e) => setScheduleForm({...scheduleForm, scheduledAtTime: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (mins)</Label>
                <Input type="number" min="15" step="15" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm({...scheduleForm, durationMinutes: parseInt(e.target.value) || 60})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={scheduleForm.interviewType} onValueChange={(val) => setScheduleForm({...scheduleForm, interviewType: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interviewer Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. John Doe (HR Manager)" value={scheduleForm.interviewerName} onChange={(e) => setScheduleForm({...scheduleForm, interviewerName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>{scheduleForm.interviewType === 'Online' ? 'Meeting Link' : 'Location / Address'} <span className="text-destructive">*</span></Label>
              <Input placeholder={scheduleForm.interviewType === 'Online' ? 'https://meet.google.com/...' : 'Office Room 2A'} value={scheduleForm.locationOrLink} onChange={(e) => setScheduleForm({...scheduleForm, locationOrLink: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes (included in email)</Label>
              <Textarea 
                placeholder="e.g. Please bring a copy of your CV and ID card..." 
                value={scheduleForm.notes} 
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Scheduling & Sending..." : "Schedule & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>

      {/* Schedule MCU Dialog */}
      <Dialog open={isMcuScheduleOpen} onOpenChange={setIsMcuScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Medical Checkup</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Clinic Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Klinik Pramita" value={mcuForm.klinikName} onChange={(e) => setMcuForm({...mcuForm, klinikName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Clinic Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="e.g. admin@pramita.co.id" value={mcuForm.klinikEmail} onChange={(e) => setMcuForm({...mcuForm, klinikEmail: e.target.value})} />
              <p className="text-xs text-muted-foreground">Surat Pengantar MCU will be sent to this email automatically.</p>
            </div>

            <div className="space-y-2">
              <Label>MCU Package <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Paket Executive" value={mcuForm.paketMcu} onChange={(e) => setMcuForm({...mcuForm, paketMcu: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={mcuForm.scheduledDate} onChange={(e) => setMcuForm({...mcuForm, scheduledDate: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMcuScheduleOpen(false)}>Cancel</Button>
            <Button onClick={handleMcuSubmit} disabled={isMcuSubmitting}>
              {isMcuSubmitting ? "Processing..." : "Schedule & Send Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
