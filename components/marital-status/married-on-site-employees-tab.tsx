'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Download,
  Heart,
  Home,
  MapPin,
  Building2,
  FileText,
  ExternalLink,
  Users,
  Eye,
  CheckCircle,
  Briefcase,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { MarriedOnSiteEmployeeRow } from '@/lib/marital-status-data';
import { resolveClientUploadUrl } from '@/lib/client-upload-url';
import {
  updateMarriedEmployeeProfile,
  resetInvalidMaritalStatusAction,
} from '@/app/dashboard/central-service/marital-status/actions';
import { toast } from 'sonner';

interface MarriedOnSiteEmployeesTabProps {
  employees: MarriedOnSiteEmployeeRow[];
  onOpenCreateForEmployee?: (employeeId: number) => void;
}

export function MarriedOnSiteEmployeesTab({
  employees,
  onOpenCreateForEmployee,
}: MarriedOnSiteEmployeesTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedResidence, setSelectedResidence] = useState<string>('all');

  // Preview file modal state
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<MarriedOnSiteEmployeeRow | null>(null);

  // Edit employee modal state
  const [editingEmployee, setEditingEmployee] = useState<MarriedOnSiteEmployeeRow | null>(null);
  const [editForm, setEditForm] = useState({
    maritalStatus: 'Menikah',
    spouseName: '',
    marriageDate: '',
    residenceStatus: 'Mess / Perumahan On Site',
    dependentsCount: 0,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete / Reset invalid modal state
  const [deletingEmployee, setDeletingEmployee] = useState<MarriedOnSiteEmployeeRow | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleOpenEdit = (emp: MarriedOnSiteEmployeeRow) => {
    setEditingEmployee(emp);
    setEditForm({
      maritalStatus: emp.maritalStatus || 'Menikah',
      spouseName: emp.spouseName && emp.spouseName !== 'Belum tercatat' ? emp.spouseName : '',
      marriageDate: emp.marriageDate ? new Date(emp.marriageDate).toISOString().slice(0, 10) : '',
      residenceStatus: emp.residenceStatus || 'Mess / Perumahan On Site',
      dependentsCount: emp.dependentsCount || 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    setIsSubmittingEdit(true);
    try {
      const res = await updateMarriedEmployeeProfile({
        employeeId: editingEmployee.id,
        maritalStatus: editForm.maritalStatus,
        spouseName: editForm.spouseName,
        marriageDate: editForm.marriageDate || null,
        residenceStatus: editForm.residenceStatus,
        dependentsCount: Number(editForm.dependentsCount) || 0,
      });

      if (res.success) {
        toast.success(`Data pernikahan ${editingEmployee.name} berhasil diperbarui.`);
        setEditingEmployee(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal memperbarui data pernikahan.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployee) return;
    setIsSubmittingDelete(true);
    try {
      const res = await resetInvalidMaritalStatusAction(deletingEmployee.id);
      if (res.success) {
        toast.success(`Status ${deletingEmployee.name} berhasil di-reset ke 'Single' dan dikeluarkan dari daftar.`);
        setDeletingEmployee(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal mereset status pernikahan.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Distinct Filter Options
  const sitesList = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.siteName && e.siteName !== '-') s.add(e.siteName);
    });
    return Array.from(s).sort();
  }, [employees]);

  const deptsList = useMemo(() => {
    const d = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName && e.departmentName !== '-') d.add(e.departmentName);
    });
    return Array.from(d).sort();
  }, [employees]);

  // Filtered rows
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeSn.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.spouseName.toLowerCase().includes(q) ||
        emp.siteName.toLowerCase().includes(q) ||
        emp.departmentName.toLowerCase().includes(q);

      const matchSite = selectedSite === 'all' || emp.siteName === selectedSite;
      const matchDept = selectedDept === 'all' || emp.departmentName === selectedDept;
      const matchRes =
        selectedResidence === 'all' ||
        (selectedResidence === 'mess' && emp.residenceStatus.toLowerCase().includes('mess')) ||
        (selectedResidence === 'perumahan' && emp.residenceStatus.toLowerCase().includes('perumahan')) ||
        (selectedResidence === 'luar' && emp.residenceStatus.toLowerCase().includes('luar'));

      return matchSearch && matchSite && matchDept && matchRes;
    });
  }, [employees, search, selectedSite, selectedDept, selectedResidence]);

  // CSV Export
  const handleExportCsv = () => {
    if (filteredEmployees.length === 0) return;
    const headers = [
      'No',
      'SN Karyawan',
      'Nama Karyawan',
      'Jabatan',
      'Departemen',
      'Section',
      'Site Lokasi Kerja',
      'Status Marital',
      'Nama Pasangan',
      'Tanggal Menikah',
      'Tempat Tinggal On Site',
      'Jumlah Tanggungan',
      'Atasan Langsung',
      'No Telepon',
      'Email',
    ];

    const rows = filteredEmployees.map((e, idx) => [
      idx + 1,
      `"${e.employeeSn}"`,
      `"${e.name}"`,
      `"${e.jobTitle}"`,
      `"${e.departmentName}"`,
      `"${e.sectionName}"`,
      `"${e.siteName}"`,
      `"${e.maritalStatus}"`,
      `"${e.spouseName}"`,
      `"${e.marriageDate || '-'}"`,
      `"${e.residenceStatus}"`,
      e.dependentsCount,
      `"${e.directManagerName || '-'}"`,
      `"${e.phoneNumber}"`,
      `"${e.email}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Daftar_Karyawan_Married_On_Site_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenDocPreview = (url: string, title: string) => {
    setPreviewDocUrl(resolveClientUploadUrl(url));
    setPreviewDocTitle(title);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Cari nama karyawan, SN, jabatan, atau nama pasangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Site */}
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-[140px] h-10 text-xs">
                  <SelectValue placeholder="Semua Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Site</SelectItem>
                  {sitesList.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Departemen */}
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[160px] h-10 text-xs">
                  <SelectValue placeholder="Semua Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  {deptsList.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Tempat Tinggal */}
              <Select value={selectedResidence} onValueChange={setSelectedResidence}>
                <SelectTrigger className="w-[150px] h-10 text-xs">
                  <SelectValue placeholder="Semua Hunian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Hunian</SelectItem>
                  <SelectItem value="mess">Mess Perusahaan</SelectItem>
                  <SelectItem value="perumahan">Perumahan</SelectItem>
                  <SelectItem value="luar">Luar Site</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="h-10 text-xs font-semibold gap-1.5"
                title="Unduh data dalam format CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV ({filteredEmployees.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Master Table */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10 text-[11px] font-bold text-gray-700 uppercase tracking-wider border-b">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Jabatan & Dept</th>
                <th className="py-3 px-4">Site Kerja</th>
                <th className="py-3 px-4">Data Pasangan</th>
                <th className="py-3 px-4">Tgl Menikah / Efektif</th>
                <th className="py-3 px-4">Tempat Tinggal On Site</th>
                <th className="py-3 px-4 text-center">Berkas Lampiran</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-muted-foreground/40" />
                      <p className="font-semibold text-gray-700">Tidak ada data karyawan ditemukan</p>
                      <p className="text-[11px]">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                      {idx + 1}
                    </td>

                    {/* Karyawan info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                        {emp.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        SN: {emp.employeeSn}
                      </div>
                    </td>

                    {/* Jabatan & Dept */}
                    <td className="py-3 px-4">
                      <div className="text-gray-800 font-medium">{emp.jobTitle}</div>
                      <div className="text-[11px] text-muted-foreground">{emp.departmentName}</div>
                    </td>

                    {/* Site */}
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-slate-50 text-slate-800 border-slate-300 font-medium text-[11px] gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {emp.siteName}
                      </Badge>
                    </td>

                    {/* Data Pasangan */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                        {emp.spouseName !== '-' ? emp.spouseName : <span className="text-muted-foreground italic font-normal">Belum tercatat</span>}
                      </div>
                      {emp.dependentsCount > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Tanggungan: {emp.dependentsCount} orang
                        </div>
                      )}
                    </td>

                    {/* Tanggal Menikah / Efektif */}
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {emp.marriageDate ? (
                        new Date(emp.marriageDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="italic text-gray-400">-</span>
                      )}
                    </td>

                    {/* Tempat Tinggal On Site */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 bg-muted/50 px-2 py-0.5 rounded border">
                        <Home className="w-3 h-3 text-blue-500 shrink-0" />
                        {emp.residenceStatus}
                      </span>
                    </td>

                    {/* Berkas Lampiran */}
                    <td className="py-3 px-4 text-center">
                      {emp.attachmentUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDocPreview(emp.attachmentUrl!, `Lampiran Berkas - ${emp.name}`)}
                          className="h-7 px-2 text-[11px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          title="Lihat Berkas Buku Nikah / KK"
                        >
                          <FileText className="w-3 h-3" />
                          Lihat Berkas
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEmployeeDetail(emp)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Tinjau Detail Karyawan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(emp)}
                          className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Edit Data Marital Karyawan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingEmployee(emp)}
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Hapus / Reset Status Karyawan ke Single"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Detail Karyawan Married On Site */}
      <Dialog
        open={!!selectedEmployeeDetail}
        onOpenChange={(open) => !open && setSelectedEmployeeDetail(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
              Detail Status Married On Site: {selectedEmployeeDetail?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedEmployeeDetail && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Profile Card */}
              <div className="p-3.5 bg-slate-50 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{selectedEmployeeDetail.name}</h4>
                    <p className="font-mono text-muted-foreground">SN: {selectedEmployeeDetail.employeeSn}</p>
                  </div>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">
                    {selectedEmployeeDetail.maritalStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Jabatan:</span>
                    <p className="font-semibold text-gray-800">{selectedEmployeeDetail.jobTitle}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Departemen:</span>
                    <p className="font-semibold text-gray-800">{selectedEmployeeDetail.departmentName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Site Kerja:</span>
                    <p className="font-semibold text-gray-800">{selectedEmployeeDetail.siteName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atasan Langsung:</span>
                    <p className="font-semibold text-gray-800">{selectedEmployeeDetail.directManagerName || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Marriage & Spouse Details */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200/60 rounded-lg space-y-2.5">
                <h5 className="font-bold text-rose-950 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  Informasi Pernikahan & Pasangan
                </h5>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Nama Pasangan:</span>
                    <p className="font-bold text-gray-900 text-xs mt-0.5">
                      {selectedEmployeeDetail.spouseName !== '-' ? selectedEmployeeDetail.spouseName : 'Belum diisi'}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Tanggal Menikah / Efektif:</span>
                    <p className="font-bold text-gray-900 text-xs mt-0.5">
                      {selectedEmployeeDetail.marriageDate
                        ? new Date(selectedEmployeeDetail.marriageDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Tempat Tinggal On Site:</span>
                    <p className="font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                      <Home className="w-3 h-3 text-blue-500" />
                      {selectedEmployeeDetail.residenceStatus}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Tanggungan / Anak:</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {selectedEmployeeDetail.dependentsCount} orang
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachment Preview Button */}
              {selectedEmployeeDetail.attachmentUrl && (
                <div className="p-3 bg-muted/30 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {selectedEmployeeDetail.attachmentName || 'Berkas Dokumen Nikah / KK'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Lampiran resmi terverifikasi</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleOpenDocPreview(
                        selectedEmployeeDetail.attachmentUrl!,
                        `Lampiran Berkas - ${selectedEmployeeDetail.name}`
                      )
                    }
                    className="h-8 text-xs font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Buka Berkas
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview File Dialog (Wide popup) */}
      <Dialog open={!!previewDocUrl} onOpenChange={(open) => !open && setPreviewDocUrl(null)}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span>{previewDocTitle || 'Pratinjau Berkas Lampiran'}</span>
              {previewDocUrl && (
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-normal"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka di Tab Baru
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 w-full h-full overflow-hidden bg-slate-100 rounded-md mt-2 flex items-center justify-center">
            {previewDocUrl && (
              previewDocUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDocUrl}
                  title="PDF Document Preview"
                  className="w-full h-full border-0 rounded-md"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewDocUrl}
                    alt="Lampiran Dokumen"
                    className="max-h-full max-w-full object-contain rounded shadow-xs"
                  />
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Employee Marital Status Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-600" />
              Edit Data Pernikahan Karyawan
            </DialogTitle>
          </DialogHeader>

          {editingEmployee && (
            <div className="space-y-4 py-2">
              <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1 border">
                <p className="font-bold text-gray-900">{editingEmployee.name}</p>
                <p className="text-muted-foreground">
                  SN: {editingEmployee.employeeSn} &bull; {editingEmployee.jobTitle} &bull; {editingEmployee.siteName}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <Label htmlFor="edit-marital-status" className="text-xs">Status Marital *</Label>
                  <Select
                    value={editForm.maritalStatus}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, maritalStatus: val }))}
                  >
                    <SelectTrigger id="edit-marital-status" className="h-9 mt-1 text-xs">
                      <SelectValue placeholder="Pilih status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Menikah">Menikah (Married)</SelectItem>
                      <SelectItem value="Married On Site">Married On Site</SelectItem>
                      <SelectItem value="Single">Single (Belum Menikah)</SelectItem>
                      <SelectItem value="Duda">Duda</SelectItem>
                      <SelectItem value="Janda">Janda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-spouse-name" className="text-xs">Nama Pasangan (Suami/Istri)</Label>
                  <Input
                    id="edit-spouse-name"
                    value={editForm.spouseName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, spouseName: e.target.value }))}
                    placeholder="Masukkan nama lengkap pasangan..."
                    className="h-9 mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-marriage-date" className="text-xs">Tanggal Menikah / Efektif</Label>
                  <Input
                    id="edit-marriage-date"
                    type="date"
                    value={editForm.marriageDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, marriageDate: e.target.value }))}
                    className="h-9 mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-residence-status" className="text-xs">Tempat Tinggal On Site</Label>
                  <Select
                    value={editForm.residenceStatus}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, residenceStatus: val }))}
                  >
                    <SelectTrigger id="edit-residence-status" className="h-9 mt-1 text-xs">
                      <SelectValue placeholder="Pilih tempat tinggal..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mess / Perumahan On Site">Mess / Perumahan On Site</SelectItem>
                      <SelectItem value="Luar Area Kerja / Mandiri">Luar Area Kerja / Mandiri</SelectItem>
                      <SelectItem value="Rumah Pribadi">Rumah Pribadi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-dependents-count" className="text-xs">Jumlah Tanggungan / Anak</Label>
                  <Input
                    id="edit-dependents-count"
                    type="number"
                    min={0}
                    max={20}
                    value={editForm.dependentsCount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, dependentsCount: Number(e.target.value) }))}
                    className="h-9 mt-1 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingEmployee(null)}
                  disabled={isSubmittingEdit}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSubmittingEdit}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSubmittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete / Reset Confirmation Dialog */}
      <Dialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              Reset & Hapus dari Daftar Married On Site
            </DialogTitle>
          </DialogHeader>

          {deletingEmployee && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-gray-700 leading-relaxed">
                Apakah Anda yakin data karyawan di bawah ini <strong className="text-rose-600">tidak valid</strong> dan ingin di-reset statusnya?
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                <p className="font-bold text-gray-900">{deletingEmployee.name}</p>
                <p className="text-gray-600">
                  SN: {deletingEmployee.employeeSn} &bull; {deletingEmployee.jobTitle}
                </p>
                <p className="text-gray-600">Site: {deletingEmployee.siteName} &bull; Dept: {deletingEmployee.departmentName}</p>
                <p className="text-gray-600">Status Terdata: {deletingEmployee.maritalStatus} &bull; Pasangan: {deletingEmployee.spouseName}</p>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                * Aksi ini akan mengubah status marital karyawan menjadi <strong>'Single' (Belum Menikah)</strong> serta mengosongkan nama pasangan dan tanggal menikah di profil karyawan, sehingga data akan langsung dikeluarkan dari tab ini.
              </p>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingEmployee(null)}
                  disabled={isSubmittingDelete}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isSubmittingDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isSubmittingDelete ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Ya, Reset & Hapus Data
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
