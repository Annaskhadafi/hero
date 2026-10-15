'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import type { MarriedOnSiteEmployeeRow } from '@/lib/marital-status-data';
import { resolveClientUploadUrl } from '@/lib/client-upload-url';

interface MarriedOnSiteEmployeesTabProps {
  employees: MarriedOnSiteEmployeeRow[];
  onOpenCreateForEmployee?: (employeeId: number) => void;
}

export function MarriedOnSiteEmployeesTab({
  employees,
  onOpenCreateForEmployee,
}: MarriedOnSiteEmployeesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedResidence, setSelectedResidence] = useState<string>('all');

  // Preview file modal state
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<MarriedOnSiteEmployeeRow | null>(null);

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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEmployeeDetail(emp)}
                        className="h-7 px-2 text-[11px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Tinjau Detail Karyawan"
                      >
                        <Eye className="w-3 h-3" />
                        Detail
                      </Button>
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
    </div>
  );
}
