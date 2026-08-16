"use client";

import { useState, useMemo } from "react";
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  createSopWinDepartmentAction,
  updateSopWinDepartmentAction,
  deleteSopWinDepartmentAction,
} from "@/app/dashboard/sop-win/actions";

interface DepartmentItem {
  id: number | null;
  code: string;
  name: string;
  description?: string;
  headEmployeeId?: number | null;
  headName?: string | null;
  headEmployeeSn?: string | null;
  isActive?: boolean;
  docCount?: number;
}

interface HeadSectionOption {
  id: number;
  name: string;
  employeeSn?: string | null;
  position?: string | null;
  unitName?: string | null;
}

interface SopWinDepartmentManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentItem[];
  employees: Array<{ id: number; name: string; employeeSn: string | null; position: string | null }>;
  headSections?: HeadSectionOption[];
  onSuccess: () => void;
}

export function SopWinDepartmentManageDialog({
  isOpen,
  onClose,
  departments,
  employees,
  headSections = [],
  onSuccess,
}: SopWinDepartmentManageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headEmployeeId, setHeadEmployeeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined Head Section list
  const headSectionList = useMemo(() => {
    if (headSections.length > 0) return headSections;
    return employees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeSn: e.employeeSn,
      position: e.position,
      unitName: null,
    }));
  }, [headSections, employees]);

  const filteredDepartments = departments.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (d.headName && d.headName.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setEditingDept(null);
    setCode("");
    setName("");
    setDescription("");
    setHeadEmployeeId("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setCode(dept.code || "");
    setName(dept.name || "");
    setDescription(dept.description || "");
    setHeadEmployeeId(dept.headEmployeeId ? dept.headEmployeeId.toString() : "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Kode dan Nama Departemen wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDept && editingDept.id) {
        const res = await updateSopWinDepartmentAction(editingDept.id, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
          headEmployeeId: headEmployeeId ? Number(headEmployeeId) : null,
        });

        if (res.success) {
          toast.success(res.message || "Departemen berhasil diperbarui!");
          setIsFormOpen(false);
          onSuccess();
        } else {
          toast.error(res.error || "Gagal memperbarui departemen.");
        }
      } else {
        const res = await createSopWinDepartmentAction({
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
          headEmployeeId: headEmployeeId ? Number(headEmployeeId) : null,
        });

        if (res.success) {
          toast.success(res.message || "Departemen baru berhasil ditambahkan!");
          setIsFormOpen(false);
          onSuccess();
        } else {
          toast.error(res.error || "Gagal menambahkan departemen.");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (!dept.id) {
      toast.error("Departemen default ini tidak dapat dihapus.");
      return;
    }

    if (dept.docCount && dept.docCount > 0) {
      toast.error(
        `Departemen ${dept.name} (${dept.code}) masih memiliki ${dept.docCount} file dokumen. Pindahkan atau hapus dokumen terlebih dahulu.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus folder departemen "${dept.name} (${dept.code})" dari SOP & WIN?\n\n(Tindakan ini hanya menghapus folder di sistem SOP & WIN tanpa mengubah data master perusahaan).`
    );

    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const res = await deleteSopWinDepartmentAction(dept.id);
      if (res.success) {
        toast.success(res.message || "Departemen berhasil dihapus dari SOP & WIN.");
        if (editingDept?.id === dept.id) {
          setIsFormOpen(false);
          setEditingDept(null);
        }
        onSuccess();
      } else {
        toast.error(res.error || "Gagal menghapus departemen.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghapus departemen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#003461] text-white shadow-sm">
                <Building className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Kelola Folder & Departemen SOP / WIN
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Tambah, ubah nama/folder, dan hapus departemen khusus SOP & WIN (tidak mengubah master data).
                </DialogDescription>
              </div>
            </div>

            {!isFormOpen && (
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="gap-1.5 rounded-xl bg-[#003461] text-xs font-bold text-white hover:bg-blue-900"
              >
                <Plus className="size-3.5" />
                Tambah Departemen
              </Button>
            )}
          </div>
        </DialogHeader>

        {isFormOpen ? (
          /* Form Tambah / Edit Departemen */
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/50 mt-2"
          >
            <div className="flex items-center justify-between border-b border-blue-100 pb-2 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {editingDept ? <Edit2 className="size-3.5 text-blue-600" /> : <Plus className="size-3.5 text-blue-600" />}
                {editingDept ? `Edit Departemen: ${editingDept.name}` : "Tambah Departemen Baru"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
              >
                <X className="size-3.5 mr-1" /> Batal
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Kode Departemen */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kode Departemen <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: HR, SVC, TC, HSE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="h-8.5 rounded-xl font-mono text-xs uppercase"
                />
              </div>

              {/* Nama Departemen */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Departemen <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Human Capital & GA"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-8.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* PIC Head Section */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <UserCheck className="size-3.5 text-slate-400" />
                Head Section (PIC Penanggung Jawab)
              </Label>
              <select
                value={headEmployeeId}
                onChange={(e) => setHeadEmployeeId(e.target.value)}
                className="w-full h-8.5 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">-- Pilih Head Section (Opsional) --</option>
                {headSectionList.map((sec) => (
                  <option key={sec.id} value={sec.id.toString()}>
                    {sec.name} {sec.employeeSn ? `(${sec.employeeSn})` : ""} {sec.position ? `- ${sec.position}` : ""} {sec.unitName ? `[Section: ${sec.unitName}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deskripsi / Ruang Lingkup
              </Label>
              <Textarea
                placeholder="Penjelasan fungsi departemen dan jenis dokumen SOP/WIN yang dikelola..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="h-8 rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 rounded-xl bg-[#003461] text-xs font-bold text-white hover:bg-blue-900"
              >
                {isSubmitting ? "Menyimpan..." : editingDept ? "Simpan Perubahan" : "Tambah Departemen"}
              </Button>
            </div>
          </form>
        ) : null}

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
          <Input
            placeholder="Cari departemen (kode, nama, atau Head Section)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8.5 rounded-xl pl-9 text-xs"
          />
        </div>

        {/* Department List Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden dark:border-slate-800 mt-2">
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5">Kode</th>
                  <th className="px-3.5 py-2.5">Nama Departemen</th>
                  <th className="px-3.5 py-2.5">Head Section</th>
                  <th className="px-3.5 py-2.5 text-center">Dokumen</th>
                  <th className="px-3.5 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada departemen yang cocok dengan pencarian "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr
                      key={dept.code}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {dept.code}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {dept.name}
                        </div>
                        {dept.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {dept.description}
                          </p>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {dept.headName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {dept.headName}
                            </span>
                            {dept.headEmployeeSn && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ({dept.headEmployeeSn})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- Belum ada PIC -</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-mono font-bold ${
                            (dept.docCount || 0) > 0
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {dept.docCount || 0} File
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(dept)}
                            disabled={isSubmitting}
                            className="h-7 px-2.5 rounded-lg text-xs gap-1 text-slate-700 hover:text-blue-700 hover:border-blue-300"
                          >
                            <Edit2 className="size-3" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dept)}
                            disabled={isSubmitting}
                            className="h-7 px-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50"
                            title="Hapus folder departemen"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
