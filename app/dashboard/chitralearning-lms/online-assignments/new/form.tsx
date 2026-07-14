"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { Loader2, Save, Rocket } from "lucide-react";
import { toast } from "sonner";
import { createOnlineAssignmentAction, updateOnlineAssignmentAction, publishOnlineAssignmentWithBroadcastAction } from "@/app/dashboard/chitralearning-lms/actions";

interface MasterData {
  departments: { id: number; name: string }[];
  sections: { id: number; name: string }[];
  sites: { id: number; name: string }[];
}

interface OnlineAssignmentFormProps {
  mode: "create" | "edit";
  masterData: MasterData;
  initial?: {
    id: number;
    title: string;
    description: string;
    targetType: string;
    targetValue: string;
    dueAt: string | null;
    passingScore: number;
    maxRetakes: number;
    durationMinutes: number;
    periodStart: string | null;
    periodEnd: string | null;
    status: string;
  };
}

const TARGET_OPTIONS = [
  { value: "all", label: "Semua Karyawan" },
  { value: "site", label: "Site" },
  { value: "department", label: "Departemen" },
  { value: "section", label: "Section" },
  { value: "employee", label: "Karyawan Tertentu" },
];

export function OnlineAssignmentForm({ mode, masterData, initial }: OnlineAssignmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetType, setTargetType] = useState(initial?.targetType ?? "all");
  const [targetValues, setTargetValues] = useState<string[]>(() => {
    const v = initial?.targetValue;
    if (!v || v === "*") return [];
    return v.split(",").map((s: string) => s.trim()).filter(Boolean);
  });
  const [dueAt, setDueAt] = useState(initial?.dueAt ? initial.dueAt.slice(0, 10) : "");
  const [passingScore, setPassingScore] = useState(String(initial?.passingScore ?? 80));
  const [maxRetakes, setMaxRetakes] = useState(String(initial?.maxRetakes ?? -1));
  const [durationMinutes, setDurationMinutes] = useState(String(initial?.durationMinutes ?? 0));
  const [periodStart, setPeriodStart] = useState(initial?.periodStart ? initial.periodStart.slice(0, 10) : "");
  const [periodEnd, setPeriodEnd] = useState(initial?.periodEnd ? initial.periodEnd.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const targetOptionsForType = () => {
    const seen = new Set<string>();
    switch (targetType) {
      case "department":
        return masterData.departments
          .filter((d) => { if (seen.has(d.name)) return false; seen.add(d.name); return true; })
          .map((d) => ({ value: d.name, label: d.name }));
      case "section":
        return masterData.sections
          .filter((s) => { if (seen.has(s.name)) return false; seen.add(s.name); return true; })
          .map((s) => ({ value: s.name, label: s.name }));
      case "site":
        return masterData.sites
          .filter((s) => { if (seen.has(s.name)) return false; seen.add(s.name); return true; })
          .map((s) => ({ value: s.name, label: s.name }));
      default:
        return [];
    }
  };

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("campaignType", "online_assignment");
      formData.append("targetType", targetType);
      const tv = targetType === "all" ? "*" : targetValues.join(",");
      formData.append("targetValue", tv);
      formData.append("passingScore", passingScore);
      formData.append("maxRetakes", maxRetakes);
      formData.append("durationMinutes", durationMinutes);
      formData.append("periodType", "custom");
      formData.append("periodValue", [periodStart, periodEnd].filter(Boolean).join(" ~ "));
      if (periodStart) formData.append("periodStart", new Date(periodStart).toISOString());
      if (periodEnd) formData.append("periodEnd", new Date(periodEnd).toISOString());
      if (dueAt) formData.append("dueAt", dueAt);

      if (mode === "create") {
        const result = await createOnlineAssignmentAction(formData);
        if (result?.id) {
          toast.success("Assignment berhasil dibuat");
          router.push(`/dashboard/chitralearning-lms/online-assignments/${result.id}/quiz-builder`);
        }
      } else if (initial) {
        await updateOnlineAssignmentAction(initial.id, formData);
        toast.success("Assignment berhasil diperbarui");
        router.refresh();
      }
    } catch (error) {
      toast.error("Gagal menyimpan assignment");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!initial || initial.status === "published") return;
    if (!confirm("Publish assignment ini? Target karyawan akan mendapat notifikasi popup.")) return;

    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append("campaignId", String(initial.id));
      await publishOnlineAssignmentWithBroadcastAction(formData);
      toast.success("Assignment dipublikasikan & broadcast dikirim");
      router.refresh();
    } catch (error) {
      toast.error("Gagal publish assignment");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white rounded-xl border border-slate-200 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Judul Assignment</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Quiz Keselamatan Q3 2026" required />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Deskripsi</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat assignment..." className="min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label>Periode Mulai</Label>
          <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Periode Selesai</Label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Tipe Target</Label>
          <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetValues([]); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetType !== "all" && targetType !== "employee" && (
          <div className="space-y-2">
            <Label>Pilih {targetType === "department" ? "Departemen" : targetType === "section" ? "Section" : "Site"}</Label>
            <MultiSelectSearch
              label={targetType === "department" ? "Departemen" : targetType === "section" ? "Section" : "Site"}
              values={targetValues}
              onValuesChange={setTargetValues}
              options={targetOptionsForType()}
              placeholder={`Pilih ${targetType}...`}
            />
          </div>
        )}

        {targetType === "employee" && (
          <div className="space-y-2">
            <Label>Employee SN</Label>
            <Input
              value={targetValues.join(",")}
              onChange={(e) => setTargetValues(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="Contoh: 10293, J1234 (pisah koma)"
              required
            />
            <p className="text-xs text-slate-500">Masukkan Employee SN, pisahkan dengan koma untuk multiple</p>
          </div>
        )}

        {targetType === "all" && <div className="space-y-2" />}

        <div className="space-y-2">
          <Label>Nilai Kelulusan (%)</Label>
          <Input type="number" value={passingScore} onChange={(e) => setPassingScore(e.target.value)} min="0" max="100" />
        </div>

        <div className="space-y-2">
          <Label>Batas Retake</Label>
          <Input type="number" value={maxRetakes} onChange={(e) => setMaxRetakes(e.target.value)} min="-1" />
          <p className="text-xs text-slate-500">-1 = Tidak terbatas, 0 = Tidak boleh ulang, N = Boleh ulang N kali</p>
        </div>

        <div className="space-y-2">
          <Label>Durasi (menit)</Label>
          <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} min="0" />
          <p className="text-xs text-slate-500">0 = Tidak ada batas waktu</p>
        </div>

        <div className="space-y-2">
          <Label>Tenggat (due date)</Label>
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        {mode === "edit" && initial && initial.status !== "published" && (
          <Button type="button" variant="outline" onClick={handlePublish} disabled={publishing} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Publish & Broadcast
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {mode === "create" ? "Simpan & Lanjut" : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
