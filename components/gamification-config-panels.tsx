"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { 
  manageLevelAction, 
  manageBadgeAction,
  type AdminMutationState
} from "@/app/dashboard/admin-actions";
import { AdminTableCard } from "@/components/admin-table-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const INITIAL_ACTION_STATE: AdminMutationState = {
  status: "idle",
  message: "",
};

export function LevelConfigPanel({ levels }: { levels: any[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDialog = (level?: any) => {
    setEditingLevel(level || null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    formData.append("intent", editingLevel ? "update" : "create");
    if (editingLevel) formData.append("id", editingLevel.id.toString());
    
    // Switch state from checkbox/switch
    const isActive = formData.get("isActive") === "on" ? "true" : "false";
    formData.set("isActive", isActive);

    const result = await manageLevelAction(INITIAL_ACTION_STATE, formData);
    setIsSubmitting(false);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus level ini secara permanen?")) return;
    
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());

    const result = await manageLevelAction(INITIAL_ACTION_STATE, formData);
    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div>
          <h3 className="font-medium">Level System Configuration</h3>
          <p className="text-sm text-muted-foreground">Atur rentang threshold poin dan representasi warna tiap level.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} variant="default" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Tambah Level
        </Button>
      </div>

      <AdminTableCard
        title="Daftar Level"
        description="Pemain akan otomatis ter-upgrade ketika total point mereka mencapai nilai poin minimum."
        columns={["Sistem Ranking", "Min Point", "Deskripsi", "Status", "Aksi"]}
        dateFilter={false}
        rows={levels.map((lvl) => [
          <div key="rank" className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: lvl.colorCode }} />
            <span className="font-semibold">{lvl.name}</span>
          </div>,
          lvl.minPoints.toLocaleString("id-ID"),
          lvl.description || "-",
          <span
            key="status"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              lvl.isActive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {lvl.isActive ? "Aktif" : "Non-Aktif"}
          </span>,
          <div key="actions" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(lvl)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(lvl.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ])}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLevel ? "Edit Level" : "Tambah Level"}</DialogTitle>
            <DialogDescription>Masukkan nama dan batas bawah poin untuk berada di level ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Level</Label>
              <Input name="name" defaultValue={editingLevel?.name} required />
            </div>
            <div className="space-y-2">
              <Label>Min Points (Threshold)</Label>
              <Input name="minPoints" type="number" min="0" defaultValue={editingLevel?.minPoints || 0} required />
            </div>
            <div className="space-y-2">
              <Label>Kode Warna (Hex)</Label>
              <Input name="colorCode" type="color" defaultValue={editingLevel?.colorCode || "#000000"} required />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea name="description" defaultValue={editingLevel?.description} />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch name="isActive" id="lvl-active" defaultChecked={editingLevel ? editingLevel.isActive : true} />
              <Label htmlFor="lvl-active">Status Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BadgeConfigPanel({ badges }: { badges: any[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAssignRule, setAutoAssignRule] = useState("none");

  const handleOpenDialog = (badge?: any) => {
    setEditingBadge(badge || null);
    setAutoAssignRule(badge?.autoAssignRule || "none");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    formData.append("intent", editingBadge ? "update" : "create");
    if (editingBadge) formData.append("id", editingBadge.id.toString());
    
    // Switch state
    const isActive = formData.get("isActive") === "on" ? "true" : "false";
    formData.set("isActive", isActive);
    formData.set("autoAssignRule", autoAssignRule);

    const result = await manageBadgeAction(INITIAL_ACTION_STATE, formData);
    setIsSubmitting(false);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus badge ini secara permanen?")) return;
    
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());

    const result = await manageBadgeAction(INITIAL_ACTION_STATE, formData);
    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div>
          <h3 className="font-medium">Badge Management</h3>
          <p className="text-sm text-muted-foreground">Medali pencapaian yang dapat di-assign manual maupun otomatis.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} variant="default" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Tambah Badge
        </Button>
      </div>

      <AdminTableCard
        title="Daftar Badge"
        description="Badge dapat digunakan sebagai penghargaan untuk milestone tertentu."
        columns={["Icon", "Badge Name", "Rule Otomatis", "Nilai Threshold", "Aksi"]}
        dateFilter={false}
        rows={badges.map((b) => [
          <div key="icon" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: b.colorCode + "20" }}>
            <span style={{ color: b.colorCode }}>{b.iconUrl || "🏆"}</span>
          </div>,
          <div key="name">
            <p className="font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{b.description}</p>
          </div>,
          b.autoAssignRule === "points_threshold" ? (
             <span key="rule" className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Poin Threshold</span>
          ) : (
             <span key="rule" className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">Manual</span>
          ),
          b.autoAssignThreshold > 0 ? b.autoAssignThreshold.toLocaleString("id-ID") : "-",
          <div key="actions" className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(b)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(b.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ])}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBadge ? "Edit Badge" : "Tambah Badge"}</DialogTitle>
            <DialogDescription>Konfigurasikan detail lencana beserta aturan otomatisnya.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Badge</Label>
                <Input name="name" defaultValue={editingBadge?.name} required />
              </div>
              <div className="space-y-2">
                <Label>Icon (Emoji / URL)</Label>
                <Input name="iconUrl" defaultValue={editingBadge?.iconUrl || "🏆"} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Kode Warna (Hex)</Label>
              <Input name="colorCode" type="color" defaultValue={editingBadge?.colorCode || "#f59e0b"} required />
            </div>

            <div className="space-y-2 bg-muted p-3 mb-2 rounded-lg">
              <Label>Automasi Pemicu (Auto-Assign)</Label>
              <Select value={autoAssignRule} onValueChange={setAutoAssignRule}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tipe Automasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada (Manual Only)</SelectItem>
                  <SelectItem value="points_threshold">Tercapai Poin Threshold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {autoAssignRule === "points_threshold" && (
              <div className="space-y-2">
                <Label>Batas Nilai (Threshold)</Label>
                <Input name="autoAssignThreshold" type="number" min="0" defaultValue={editingBadge?.autoAssignThreshold || 0} required />
              </div>
            )}

            <div className="space-y-2">
              <Label>Deskripsi Lengkap</Label>
              <Textarea name="description" defaultValue={editingBadge?.description} />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch name="isActive" id="bdg-active" defaultChecked={editingBadge ? editingBadge.isActive : true} />
              <Label htmlFor="bdg-active">Status Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
