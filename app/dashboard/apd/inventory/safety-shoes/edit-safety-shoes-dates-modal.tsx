"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Check, Loader2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { updateSafetyShoesDate, deleteSafetyShoesRecord, addManualSafetyShoes } from "./actions";
import { toast } from "sonner";
import { SafetyShoesRecordItem } from "@/lib/apd-inventory-data";

export function EditSafetyShoesDatesModal({
  employee,
}: {
  employee: {
    id: number;
    name: string;
    employeeSn: string;
    records: SafetyShoesRecordItem[];
  };
}) {
  const [open, setOpen] = useState(false);
  const [loadingRecordId, setLoadingRecordId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Maintain local state of dates for each record
  const [datesState, setDatesState] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const r of employee.records) {
      initial[r.id] = format(new Date(r.assignedAt), "yyyy-MM-dd");
    }
    return initial;
  });

  const handleUpdateDate = async (recordId: number) => {
    const dateVal = datesState[recordId];
    if (!dateVal) return;

    setLoadingRecordId(recordId);
    try {
      await updateSafetyShoesDate(recordId, new Date(dateVal));
      toast.success("Tanggal berhasil diperbarui");
    } catch (err) {
      toast.error("Gagal memperbarui tanggal");
    } finally {
      setLoadingRecordId(null);
    }
  };

  const handleDeleteDate = async (recordId: number) => {
    if (!confirm("Hapus tanggal penerimaan ini?")) return;

    setLoadingRecordId(recordId);
    try {
      await deleteSafetyShoesRecord(recordId);
      toast.success("Riwayat tanggal berhasil dihapus");
    } catch (err) {
      toast.error("Gagal menghapus riwayat tanggal");
    } finally {
      setLoadingRecordId(null);
    }
  };

  const handleAddNewDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    setIsAdding(true);
    try {
      await addManualSafetyShoes({
        employeeId: employee.id,
        assignedAt: new Date(newDate),
      });
      toast.success("Tanggal baru berhasil ditambahkan");
      setNewDate("");
    } catch (err) {
      toast.error("Gagal menambahkan tanggal");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          title="Edit Tanggal Pengambilan"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit Tanggal Pengambilan Sepatu Safety
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {employee.name} ({employee.employeeSn})
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* List existing records */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daftar Tanggal Pengambilan Terdata ({employee.records.length})
            </Label>

            {employee.records.length === 0 ? (
              <p className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-md">
                Belum ada data tanggal pengambilan sepatu safety untuk karyawan ini.
              </p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {employee.records.map((r, idx) => {
                  const val = datesState[r.id] ?? format(new Date(r.assignedAt), "yyyy-MM-dd");
                  const isLoading = loadingRecordId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card text-card-foreground text-sm"
                    >
                      <span className="text-xs text-muted-foreground font-mono w-5">
                        #{idx + 1}
                      </span>
                      <Input
                        type="date"
                        value={val}
                        onChange={(e) =>
                          setDatesState((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        className="h-8 text-xs flex-1"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs gap-1"
                        disabled={isLoading}
                        onClick={() => handleUpdateDate(r.id)}
                        title="Simpan Perubahan Tanggal"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        )}
                        Simpan
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        disabled={isLoading}
                        onClick={() => handleDeleteDate(r.id)}
                        title="Hapus Tanggal Ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add new date form */}
          <form onSubmit={handleAddNewDate} className="border-t pt-3 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tambah Tanggal Pengambilan Baru
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-9 text-xs flex-1"
                disabled={isAdding}
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 gap-1 text-xs"
                disabled={!newDate || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Tambah
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
