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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Users, Save } from "lucide-react";
import { getInterviewSettings, saveInterviewSettings, getAvailableInterviewers } from "@/app/actions/interviews";

interface InterviewSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewSettingsModal({ open, onOpenChange }: InterviewSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interviewersList, setInterviewersList] = useState<any[]>([]);

  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState<number>(60);
  const [defaultLocationOrLink, setDefaultLocationOrLink] = useState<string>("Google Meet / Microsoft Teams");
  const [defaultInterviewType, setDefaultInterviewType] = useState<string>("Online");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, settings] = await Promise.all([
        getAvailableInterviewers(),
        getInterviewSettings(),
      ]);
      setInterviewersList(emps);

      if (settings) {
        setDefaultDurationMinutes(settings.defaultDurationMinutes || 60);
        setDefaultLocationOrLink(settings.defaultLocationOrLink || "");
        setDefaultInterviewType(settings.defaultInterviewType || "Online");

        // Match existing default email list to IDs
        if (Array.isArray(settings.defaultInterviewerEmails)) {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedEmps = interviewersList.filter((e) =>
        selectedInterviewerIds.includes(e.id.toString())
      );
      const emails = selectedEmps.map((e) => e.email).filter(Boolean);
      const names = selectedEmps.map((e) => e.name);

      await saveInterviewSettings({
        defaultInterviewerEmails: emails,
        defaultInterviewerNames: names,
        defaultDurationMinutes,
        defaultLocationOrLink,
        defaultInterviewType,
      });

      toast.success("Pengaturan Default Interview berhasil disimpan.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Settings className="w-5 h-5 text-cyan-600" />
            Pengaturan Default Interview Rekrutmen
          </DialogTitle>
          <DialogDescription className="text-xs">
            Atur pewawancara bawaan (Default Interviewers) dari User Management dan preferensi jadwal interview.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Memuat data karyawan...</div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Default Pewawancara (User Management / hero_employees)</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {selectedInterviewerIds.length} Terpilih
                </span>
              </Label>
              <div className="mt-1 border rounded-md p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50 dark:bg-slate-900">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold">Tipe Interview Default</Label>
                <Select value={defaultInterviewType} onValueChange={setDefaultInterviewType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online (Virtual Meeting)</SelectItem>
                    <SelectItem value="Offline">Offline (Tatap Muka / Kantor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Durasi Default (Menit)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={defaultDurationMinutes}
                  onChange={(e) => setDefaultDurationMinutes(parseInt(e.target.value, 10) || 60)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lokasi / Meeting Link Default</Label>
              <Input
                className="mt-1"
                placeholder="Misal: Room HR A / Link Google Meet..."
                value={defaultLocationOrLink}
                onChange={(e) => setDefaultLocationOrLink(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-cyan-600 text-white hover:bg-cyan-700">
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Simpan..." : "Simpan Pengaturan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
