"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, Mail, Users, Send, Check } from "lucide-react";
import {
  scheduleCandidateInterviewStage,
  getInterviewSettings,
  getAvailableInterviewers,
} from "@/app/actions/interviews";

interface ScheduleInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId?: number;
  candidateName?: string;
  jobTitle?: string;
  defaultStageName?: string;
  candidateList?: Array<{ id: number; fullName: string; jobTitle?: string | null; email?: string | null }>;
  onSuccess?: () => void;
}

export function ScheduleInterviewModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  jobTitle = "Kandidat",
  defaultStageName = "Interview 1",
  candidateList,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [interviewersList, setInterviewersList] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | undefined>(candidateId);

  const [stageName, setStageName] = useState<string>(defaultStageName);
  const [scheduledDate, setScheduledDate] = useState<string>("" );
  const [scheduledTime, setScheduledTime] = useState<string>("10:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [interviewType, setInterviewType] = useState<string>("Online");
  const [locationOrLink, setLocationOrLink] = useState<string>("Google Meet");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  const [sendCandidateEmail, setSendCandidateEmail] = useState<boolean>(true);
  const [sendInterviewerEmail, setSendInterviewerEmail] = useState<boolean>(true);

  useEffect(() => {
    if (open) {
      setStageName(defaultStageName);
      if (candidateId) {
        setSelectedCandidateId(candidateId);
      } else if (candidateList && candidateList.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(candidateList[0].id);
      }
      loadDefaults();
    }
  }, [open, defaultStageName, candidateId, candidateList]);

  const loadDefaults = async () => {
    setLoading(true);
    try {
      const [emps, settings] = await Promise.all([
        getAvailableInterviewers(),
        getInterviewSettings(),
      ]);
      setInterviewersList(emps);

      // Default date tomorrow 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);

      if (settings) {
        setDurationMinutes(settings.defaultDurationMinutes || 60);
        setInterviewType(settings.defaultInterviewType || "Online");
        setLocationOrLink(settings.defaultLocationOrLink || "Google Meet");

        if (Array.isArray(settings.defaultInterviewerEmails) && settings.defaultInterviewerEmails.length > 0) {
          const matchedIds = emps
            .filter((e) => settings.defaultInterviewerEmails.includes(e.email))
            .map((e) => e.id.toString());
          setSelectedInterviewerIds(matchedIds);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInterviewer = (empIdStr: string) => {
    setSelectedInterviewerIds((prev) =>
      prev.includes(empIdStr) ? prev.filter((id) => id !== empIdStr) : [...prev, empIdStr]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) {
      toast.error("Tanggal & jam interview wajib diisi.");
      return;
    }
    if (selectedInterviewerIds.length === 0) {
      toast.error("Pilih minimal 1 pewawancara dari User Management.");
      return;
    }

    const targetCandidateId = candidateId || selectedCandidateId;
    if (!targetCandidateId) {
      toast.error("Pilih kandidat terlebih dahulu.");
      return;
    }

    setScheduling(true);
    try {
      const combinedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      const selectedEmps = interviewersList.filter((e) =>
        selectedInterviewerIds.includes(e.id.toString())
      );
      const interviewerNames = selectedEmps.map((e) => e.name);
      const interviewerEmails = selectedEmps.map((e) => e.email).filter(Boolean);

      await scheduleCandidateInterviewStage(targetCandidateId, {
        scheduledAt: combinedDateTime,
        durationMinutes,
        interviewType,
        locationOrLink,
        interviewerNames,
        interviewerEmails,
        stageName,
        notes,
        sendCandidateEmail,
        sendInterviewerEmail,
      });

      toast.success(`Jadwal ${stageName} berhasil dibuat & notifikasi email terkirim!`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat jadwal interview.");
    } finally {
      setScheduling(false);
    }
  };

  const currentCandidateObj = candidateList?.find((c) => c.id === (candidateId || selectedCandidateId));
  const activeCandidateName = candidateName || currentCandidateObj?.fullName || "Kandidat";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Calendar className="w-5 h-5 text-cyan-600" />
            Jadwalkan Interview ({activeCandidateName})
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih tahap interview, waktu, dan pewawancara dari User Management. Email undangan & link form penilaian akan dikirim otomatis.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Memuat data default...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {!candidateId && candidateList && candidateList.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Label className="text-xs font-semibold text-primary">Pilih Kandidat *</Label>
                <Select
                  value={selectedCandidateId?.toString()}
                  onValueChange={(val) => setSelectedCandidateId(Number(val))}
                >
                  <SelectTrigger className="mt-1 bg-background text-xs">
                    <SelectValue placeholder="Pilih kandidat..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {candidateList.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="font-medium">{c.fullName}</span>
                        {c.jobTitle && <span className="text-muted-foreground ml-1.5">({c.jobTitle})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Tahap Interview (Stage)</Label>
                <Select value={stageName} onValueChange={setStageName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interview 1">Interview 1 (HR Initial)</SelectItem>
                    <SelectItem value="Interview 2">Interview 2 (User / Technical)</SelectItem>
                    <SelectItem value="Interview 3">Interview 3 (Manager / Director)</SelectItem>
                    <SelectItem value="User Interview">User Interview</SelectItem>
                    <SelectItem value="HR Interview">HR Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Tipe Sesi</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online (Virtual Meeting)</SelectItem>
                    <SelectItem value="Offline">Offline (Tatap Muka)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold">Tanggal Interview *</Label>
                <Input
                  type="date"
                  className="mt-1 text-xs"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Jam (WITA) *</Label>
                <Input
                  type="time"
                  className="mt-1 text-xs"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Durasi (Menit)</Label>
                <Input
                  type="number"
                  className="mt-1 text-xs"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lokasi atau Meeting Link *</Label>
              <Input
                className="mt-1 text-xs"
                placeholder="Misal: Room 201 / https://meet.google.com/xyz"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Pilih Pewawancara (User Management / hero_employees) *</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {selectedInterviewerIds.length} Terpilih
                </span>
              </Label>
              <div className="mt-1 border rounded-md p-2.5 max-h-40 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-900">
                {interviewersList.map((emp) => {
                  const isChecked = selectedInterviewerIds.includes(emp.id.toString());
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleToggleInterviewer(emp.id.toString())}
                      className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border transition-colors ${
                        isChecked
                          ? "bg-cyan-50 dark:bg-cyan-950 border-cyan-400 font-semibold text-cyan-900 dark:text-cyan-200"
                          : "bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>{emp.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{emp.email || "-"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-semibold">Opsi Pengiriman Email</Label>
              <div className="flex items-center justify-between p-2 rounded border bg-slate-50 text-xs">
                <span>Kirim email undangan interview ke Kandidat ({candidateName})</span>
                <input
                  type="checkbox"
                  checked={sendCandidateEmail}
                  onChange={(e) => setSendCandidateEmail(e.target.checked)}
                  className="rounded text-cyan-600"
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded border bg-slate-50 text-xs">
                <span>Kirim email notifikasi & link form penilaian ke Pewawancara</span>
                <input
                  type="checkbox"
                  checked={sendInterviewerEmail}
                  onChange={(e) => setSendInterviewerEmail(e.target.checked)}
                  className="rounded text-cyan-600"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button size="sm" type="submit" disabled={scheduling} className="bg-cyan-600 text-white hover:bg-cyan-700">
                <Send className="w-4 h-4 mr-1.5" />
                {scheduling ? "Mengirim..." : "Jadwalkan & Kirim Undangan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
