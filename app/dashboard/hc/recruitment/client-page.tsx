"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createRecruitment, deleteRecruitment, updateRecruitment } from "@/app/actions/recruitment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Recruitment = {
  id: number;
  jobTitle: string;
  totalRequested: number;
  section: string;
  status: string;
  requestDate: Date;
  dueDate: Date;
};

const getProgressForStatus = (status: string) => {
  switch (status) {
    case "Sourcing": return 20;
    case "Psikotes": return 40;
    case "Interview": return 60;
    case "Offering": return 80;
    case "Medical Checkup": return 90;
    case "Selesai": return 100;
    default: return 0;
  }
};

export function RecruitmentClientPage({ recruitments: initialData }: { recruitments: Recruitment[] }) {
  const [data, setData] = useState<Recruitment[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Recruitment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [jobTitle, setJobTitle] = useState("");
  const [totalRequested, setTotalRequested] = useState("1");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("Sourcing");
  const [dueDate, setDueDate] = useState("");

  const resetForm = () => {
    setJobTitle("");
    setTotalRequested("1");
    setSection("");
    setStatus("Sourcing");
    setDueDate("");
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Recruitment) => {
    setEditingItem(item);
    setJobTitle(item.jobTitle);
    setTotalRequested(item.totalRequested.toString());
    setSection(item.section);
    setStatus(item.status);
    setDueDate(new Date(item.dueDate).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        jobTitle,
        totalRequested,
        section,
        status,
        dueDate,
      };

      if (editingItem) {
        const updated = await updateRecruitment(editingItem.id, payload);
        setData(data.map(d => d.id === editingItem.id ? updated : d));
      } else {
        const created = await createRecruitment(payload);
        setData([created, ...data]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus data permintaan ini?")) {
      await deleteRecruitment(id);
      setData(data.filter((r) => r.id !== id));
    }
  };

  return (
    <AdminPageShell
      eyebrow="HC • Recruitment"
      title="Data Recruitment"
      description="Kelola data permintaan tenaga kerja baru (Man Power Request)."
    >
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenAdd}>
          <Plus className="size-4 mr-2" />
          Tambah Permintaan
        </Button>
      </div>

      <div className="grid gap-4">
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            Belum ada data recruitment.
          </div>
        ) : (
          data.map((req) => {
            const progress = getProgressForStatus(req.status);
            return (
              <Card key={req.id}>
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6 items-center">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{req.jobTitle}</h3>
                      <Badge variant="outline">{req.section}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>Dibutuhkan: {req.totalRequested} Orang</span>
                      <span>Batas Waktu: {new Date(req.dueDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{req.status}</span>
                      <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={"h-full " + (progress === 100 ? 'bg-green-500' : 'bg-primary')} 
                        style={{ width: progress + "%", transition: 'width 0.5s ease' }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenEdit(req)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(req.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Ubah Permintaan" : "Tambah Permintaan Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Title / Posisi</Label>
              <Input 
                required 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)} 
                placeholder="Contoh: Mekanik Senior" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah (Orang)</Label>
                <Input 
                  required 
                  type="number" 
                  min="1" 
                  value={totalRequested} 
                  onChange={(e) => setTotalRequested(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Departemen / Section</Label>
                <Input 
                  required 
                  value={section} 
                  onChange={(e) => setSection(e.target.value)} 
                  placeholder="Contoh: Operation" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batas Waktu (Due Date)</Label>
                <Input 
                  required 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Status Rekrutmen</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Sourcing">Sourcing</option>
                  <option value="Psikotes">Psikotes</option>
                  <option value="Interview">Interview</option>
                  <option value="Offering">Offering</option>
                  <option value="Medical Checkup">Medical Checkup</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
