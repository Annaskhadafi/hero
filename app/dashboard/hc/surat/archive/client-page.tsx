"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconFileDescription,
  IconFileCheck,
  IconCalendarEvent,
  IconArchive,
} from "@tabler/icons-react";
import {
  CheckCircle2,
  Clock,
  Eye,
  FilePenLine,
  Printer,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  getLetterArchives,
  updateLetterStatus,
  updateLetterArchive,
  deleteLetter,
} from "@/app/actions/surat";

import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcTableRowClassName } from "@/components/hc/hc-workspace-banner";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  EnterpriseScorecards,
  EnterpriseRecordDialog,
  EnterpriseFormGrid,
  EnterpriseActionButtons,
} from "@/components/ui/enterprise-table-kit";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────────

type Letter = {
  id: number;
  letterType: string;
  letterNumber: string;
  employeeId: number | null;
  employeeName: string;
  subject: string;
  content: string;
  destination: string;
  purpose: string;
  departureDate: string | null;
  returnDate: string | null;
  issuedDate: string;
  issuedPlace: string;
  signatoryName: string;
  signatoryTitle: string;
  status: string;
  approvedBy: string;
  approvedAt: Date | null;
  pdfUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

type LetterStats = {
  totalSuratKeterangan: number;
  totalSuratTugas: number;
  totalSuratMcu: number;
  totalPerubahanStatus: number;
  totalThisMonth: number;
  totalArchive: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────

const LETTER_TYPE_LABELS: Record<string, string> = {
  surat_keterangan: "Surat Keterangan",
  surat_tugas: "Surat Tugas",
  surat_mcu: "Surat Pengantar MCU",
  surat_perubahan_status: "Surat Perubahan Status",
};

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
          <FilePenLine className="mr-1 size-3" />
          Draft
        </Badge>
      );
    case "approved":
      return (
        <Badge className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
          <CheckCircle2 className="mr-1 size-3" />
          Disetujui
        </Badge>
      );
    case "printed":
      return (
        <Badge className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-800">
          <Printer className="mr-1 size-3" />
          Dicetak
        </Badge>
      );
    case "archived":
      return (
        <Badge className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
          <IconArchive className="mr-1 size-3" />
          Diarsipkan
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider">
          {status}
        </Badge>
      );
  }
}

function letterTypeBadge(type: string) {
  const label = LETTER_TYPE_LABELS[type] || type;
  const isKeterangan = type === "surat_keterangan";
  return (
    <Badge
      variant="outline"
      className={`rounded-full text-[11px] ${
        isKeterangan
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-teal-200 bg-teal-50 text-teal-700"
      }`}
    >
      {label}
    </Badge>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export function SuratArchiveClient({
  letters: initialLetters,
  stats,
}: {
  letters: Letter[];
  stats: LetterStats;
}) {
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>(initialLetters);

  // View dialog
  const [viewItem, setViewItem] = useState<Letter | null>(null);

  // Status dialog
  const [statusItem, setStatusItem] = useState<Letter | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete confirmation
  const [deleteItem, setDeleteItem] = useState<Letter | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit dialog
  const [editItem, setEditItem] = useState<Letter | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSignatoryName, setEditSignatoryName] = useState("");
  const [editSignatoryTitle, setEditSignatoryTitle] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const letterTypeOptions = useMemo(
    () => [
      { value: "surat_keterangan", label: "Surat Keterangan" },
      { value: "surat_tugas", label: "Surat Tugas" },
      { value: "surat_mcu", label: "Surat Pengantar MCU" },
      { value: "surat_perubahan_status", label: "Surat Perubahan Status" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "draft", label: "Draft" },
      { value: "approved", label: "Disetujui" },
      { value: "printed", label: "Dicetak" },
      { value: "archived", label: "Diarsipkan" },
    ],
    [],
  );

  const scorecards = useMemo(
    () => [
      {
        label: "Surat Keterangan",
        value: stats.totalSuratKeterangan,
        icon: <IconFileDescription className="size-5 text-violet-600" />,
        tone: "default" as const,
      },
      {
        label: "Surat Tugas",
        value: stats.totalSuratTugas,
        icon: <IconFileCheck className="size-5 text-teal-600" />,
        tone: "info" as const,
      },
      {
        label: "Surat MCU",
        value: stats.totalSuratMcu,
        icon: <IconFileCheck className="size-5 text-blue-600" />,
        tone: "info" as const,
      },
      {
        label: "Perubahan Status",
        value: stats.totalPerubahanStatus,
        icon: <IconFileDescription className="size-5 text-amber-600" />,
        tone: "warning" as const,
      },
      {
        label: "Total Arsip",
        value: stats.totalArchive,
        icon: <IconArchive className="size-5 text-slate-600" />,
        tone: "default" as const,
      },
    ],
    [stats],
  );

  // ── Handlers ──

  const handleStatusUpdate = useCallback(async () => {
    if (!statusItem || !newStatus) return;

    setStatusLoading(true);
    try {
      const result = await updateLetterStatus(
        statusItem.id,
        newStatus,
        approvedByName || undefined,
      );
      if (result.success) {
        setLetters((prev) =>
          prev.map((l) =>
            l.id === statusItem.id
              ? {
                  ...l,
                  status: newStatus,
                  approvedBy: newStatus === "approved" ? (approvedByName || l.approvedBy) : l.approvedBy,
                  approvedAt: newStatus === "approved" ? new Date() : l.approvedAt,
                }
              : l,
          ),
        );
        setStatusItem(null);
        setNewStatus("");
        setApprovedByName("");
      } else {
        alert(result.error || "Gagal memperbarui status.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Terjadi kesalahan saat memperbarui status.");
    } finally {
      setStatusLoading(false);
    }
  }, [statusItem, newStatus, approvedByName]);

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;

    setDeleteLoading(true);
    try {
      const result = await deleteLetter(deleteItem.id);
      if (result.success) {
        setLetters((prev) => prev.filter((l) => l.id !== deleteItem.id));
        setDeleteItem(null);
      } else {
        alert(result.error || "Gagal menghapus surat.");
      }
    } catch (error) {
      console.error("Error deleting letter:", error);
      alert("Terjadi kesalahan saat menghapus surat.");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteItem]);

  const openEditDialog = useCallback((letter: Letter) => {
    setEditItem(letter);
    setEditSubject(letter.subject || '');
    setEditContent(letter.content || '');
    setEditSignatoryName(letter.signatoryName || '');
    setEditSignatoryTitle(letter.signatoryTitle || '');
  }, []);

  const handleArchiveUpdate = useCallback(async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const result = await updateLetterArchive(editItem.id, {
        subject: editSubject,
        content: editContent,
        signatoryName: editSignatoryName,
        signatoryTitle: editSignatoryTitle,
      });
      if (result.success) {
        setLetters((prev) => prev.map((letter) => letter.id === editItem.id ? { ...letter, subject: editSubject, content: editContent, signatoryName: editSignatoryName, signatoryTitle: editSignatoryTitle, updatedAt: new Date() } : letter));
        setEditItem(null);
      } else {
        alert(result.error || 'Gagal memperbarui arsip surat.');
      }
    } catch (error) {
      console.error('Error updating letter archive:', error);
      alert('Terjadi kesalahan saat memperbarui arsip surat.');
    } finally {
      setEditLoading(false);
    }
  }, [editItem, editSubject, editContent, editSignatoryName, editSignatoryTitle]);


  // ── Render ──

  return (
    <AdminPageShell
      eyebrow="HC - Arsip Surat"
      title="Arsip Surat"
      description="Kelola arsip surat keterangan dan surat tugas karyawan."
    >
      <HcWorkspaceBanner
        title="Letter Archive Desk"
        description="Arsip surat keterangan dan surat tugas dibuat lebih mudah dilacak melalui nomor, tipe, pemilik dokumen, status, dan tanggal terbit."
        items={[
          { label: "Total", value: letters.length, tone: "slate" },
          { label: "Keterangan", value: stats.totalSuratKeterangan, tone: "sky" },
          { label: "Tugas", value: stats.totalSuratTugas, tone: "emerald" },
        ]}
      />

      <MinimalTableShell
        label="Data Arsip Surat"
        fileName="Data-Arsip-Surat"
        searchPlaceholder="Cari nomor surat, nama karyawan, atau subjek..."
        scorecards={scorecards}
        filters={
          <div className="flex items-center gap-2">
            <TableMultiFilter
              label="Tipe Surat"
              filterKey="letter-type"
              options={letterTypeOptions}
              widthClassName="w-[180px]"
            />
            <TableMultiFilter
              label="Status"
              filterKey="status"
              options={statusOptions}
              widthClassName="w-[180px]"
            />
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-12 text-center text-[12px] font-semibold">No</TableHead>
              <TableHead className="text-[12px] font-semibold">Nomor Surat</TableHead>
              <TableHead className="text-[12px] font-semibold">Tipe</TableHead>
              <TableHead className="text-[12px] font-semibold">Nama Karyawan</TableHead>
              <TableHead className="text-[12px] font-semibold">Tanggal</TableHead>
              <TableHead className="text-[12px] font-semibold">Subjek</TableHead>
              <TableHead className="text-center text-[12px] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[12px] font-semibold">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {letters.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Belum ada surat di arsip.
                </TableCell>
              </TableRow>
            ) : (
              letters.map((letter, index) => (
                <TableRow
                  key={letter.id}
                  data-filter-letter-type={letter.letterType}
                  data-filter-status={letter.status}
                  data-date-value={letter.issuedDate}
                  className={hcTableRowClassName}
                >
                  <TableCell className="text-center text-[13px] tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-primary">
                    {letter.letterNumber}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {letterTypeBadge(letter.letterType)}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground">
                    {letter.employeeName}
                  </TableCell>
                  <TableCell
                    className="text-[13px] tabular-nums text-muted-foreground"
                    data-date-value={letter.issuedDate}
                  >
                    {formatDate(letter.issuedDate)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-[13px] text-muted-foreground">
                    {letter.subject || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {statusBadge(letter.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <EnterpriseActionButtons
                      onView={() => setViewItem(letter)}
                      onEdit={() => openEditDialog(letter)}
                      access={{ canView: true, canEdit: true, canDelete: true }}
                      onDelete={() => setDeleteItem(letter)}
                      labels={{
                        view: "Lihat Detail",
                        edit: "Edit Surat",
                        delete: "Hapus",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      {/* ─── View Detail Dialog ─────────────────────────────────────────── */}

      <EnterpriseRecordDialog
        open={!!viewItem}
        onOpenChange={(open) => { if (!open) setViewItem(null); }}
        title="Detail Surat"
        mode="view"
        footer={
          <>
          <Button onClick={() => setViewItem(null)}>Tutup</Button>
          <Button variant="outline" onClick={() => { setStatusItem(viewItem); setNewStatus(viewItem.status); setApprovedByName(viewItem.approvedBy); }}>Ubah Status</Button>
          </>
        }
      >
        {viewItem && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Nomor Surat</span>
              <span className="col-span-2 text-sm font-semibold text-primary">
                {viewItem.letterNumber}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Tipe Surat</span>
              <span className="col-span-2">{letterTypeBadge(viewItem.letterType)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Nama Karyawan</span>
              <span className="col-span-2 text-sm font-semibold">{viewItem.employeeName}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Subjek</span>
              <span className="col-span-2 text-sm">{viewItem.subject || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Tanggal Terbit</span>
              <span className="col-span-2 text-sm">{formatDate(viewItem.issuedDate)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Tempat Terbit</span>
              <span className="col-span-2 text-sm">{viewItem.issuedPlace || "-"}</span>
            </div>

            {viewItem.letterType === "surat_tugas" && (
              <>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Tujuan</span>
                  <span className="col-span-2 text-sm">{viewItem.destination || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Keperluan</span>
                  <span className="col-span-2 text-sm">{viewItem.purpose || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Tanggal Berangkat</span>
                  <span className="col-span-2 text-sm">{formatDate(viewItem.departureDate)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Tanggal Kembali</span>
                  <span className="col-span-2 text-sm">{formatDate(viewItem.returnDate)}</span>
                </div>
              </>
            )}

            {viewItem.letterType === "surat_mcu" && (
              <>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Klinik Tujuan</span>
                  <span className="col-span-2 text-sm">{viewItem.destination || "-"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                  <span className="text-sm font-medium text-muted-foreground">Paket MCU</span>
                  <span className="col-span-2 text-sm">{viewItem.purpose || "-"}</span>
                </div>
              </>
            )}

            {viewItem.letterType === "surat_perubahan_status" && (
              <>
                {(() => {
                  try {
                    const data = JSON.parse(viewItem.content || "{}");
                    return (
                      <div className="col-span-3 rounded-lg border border-border/50 bg-muted/20 p-4 mt-2">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">Detail Perubahan</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-semibold text-slate-700 mb-1">Status Lama</p>
                            <p>Jabatan: {data.jabatanLama}</p>
                            <p>Level: {data.levelLama}</p>
                            <p>Section: {data.sectionLama}</p>
                            <p>Status: {data.statusLama}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 mb-1">Status Baru</p>
                            <p>Jabatan: {data.jabatanBaru}</p>
                            <p>Level: {data.levelBaru}</p>
                            <p>Section: {data.sectionBaru}</p>
                            <p>Status: {data.statusKaryawanBaru}</p>
                          </div>
                        </div>
                        <div className="mt-3 text-sm">
                          <p><span className="font-medium">Tgl Berlaku:</span> {data.tanggalBerlaku}</p>
                        </div>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}
              </>
            )}

            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Penandatangan</span>
              <span className="col-span-2 text-sm">
                {viewItem.signatoryName || "-"}
                {viewItem.signatoryTitle ? ` (${viewItem.signatoryTitle})` : ""}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <span className="col-span-2">{statusBadge(viewItem.status)}</span>
            </div>

            {viewItem.approvedBy ? (
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 py-2">
                <span className="text-sm font-medium text-muted-foreground">Disetujui Oleh</span>
                <span className="col-span-2 text-sm">{viewItem.approvedBy}</span>
              </div>
            ) : null}

            {viewItem.content && viewItem.letterType !== "surat_perubahan_status" ? (
              <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">Konten Surat</p>
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: viewItem.content }}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2 py-2">
              <span className="text-sm font-medium text-muted-foreground">Dibuat</span>
              <span className="col-span-2 text-xs text-muted-foreground">
                {formatDate(viewItem.createdAt)}
              </span>
            </div>
          </div>
        )}
      </EnterpriseRecordDialog>

      {/* ─── Edit Surat Dialog ─────────────────────────────────────────── */}

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Surat</DialogTitle>
            <DialogDescription>
              Edit subjek, konten, dan penandatangan surat.
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm font-semibold">{editItem.letterNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {editItem.employeeName} - {LETTER_TYPE_LABELS[editItem.letterType] || editItem.letterType}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subjek</Label>
                <Input
                  id="edit-subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-signatory-name">Nama Penandatangan</Label>
                <Input
                  id="edit-signatory-name"
                  value={editSignatoryName}
                  onChange={(e) => setEditSignatoryName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-signatory-title">Jabatan Penandatangan</Label>
                <Input
                  id="edit-signatory-title"
                  value={editSignatoryTitle}
                  onChange={(e) => setEditSignatoryTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Konten Surat</Label>
                <div
                  className="min-h-[200px] w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: editContent }}
                  onInput={(e) => setEditContent(e.currentTarget.innerHTML)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditItem(null)}
              disabled={editLoading}
            >
              Batal
            </Button>
            <Button onClick={handleArchiveUpdate} disabled={editLoading}>
              {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Status Update Dialog ───────────────────────────────────────── */}

      <Dialog
        open={!!statusItem}
        onOpenChange={(open) => {
          if (!open) {
            setStatusItem(null);
            setNewStatus("");
            setApprovedByName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Status Surat</DialogTitle>
            <DialogDescription>
              Ubah status arsip surat. Status &quot;Disetujui&quot; memerlukan nama penyetuju.
            </DialogDescription>
          </DialogHeader>

          {statusItem && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-sm font-semibold">{statusItem.letterNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {LETTER_TYPE_LABELS[statusItem.letterType] || statusItem.letterType} - {statusItem.employeeName}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="letter-status">Status Baru</Label>
                <select
                  id="letter-status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Disetujui</option>
                  <option value="printed">Dicetak</option>
                  <option value="archived">Diarsipkan</option>
                </select>
              </div>

              {newStatus === "approved" && (
                <div className="space-y-2">
                  <Label htmlFor="approved-by">
                    Nama Penyetuju <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="approved-by"
                    placeholder="Masukkan nama penyetuju..."
                    value={approvedByName}
                    onChange={(e) => setApprovedByName(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusItem(null);
                setNewStatus("");
                setApprovedByName("");
              }}
              disabled={statusLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={statusLoading}
            >
              {statusLoading ? "Menyimpan..." : "Simpan Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─────────────────────────────────── */}

      <Dialog
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Surat dari Arsip</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus surat ini dari arsip? Tindakan ini tidak dapat
              dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {deleteItem && (
            <div className="py-3">
              <p className="text-sm font-semibold">{deleteItem.letterNumber}</p>
              <p className="text-sm text-muted-foreground">
                {LETTER_TYPE_LABELS[deleteItem.letterType] || deleteItem.letterType} - {deleteItem.employeeName}
              </p>
              {deleteItem.subject && (
                <p className="text-xs text-muted-foreground mt-1">{deleteItem.subject}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteItem(null)}
              disabled={deleteLoading}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
