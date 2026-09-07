"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Search, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SiteRecipientRow = {
  no: number;
  siteName: string;
  category: "PJO" | "HSE" | "Admin CP";
  approverName: string;
  approverTitle: string;
  approverEmail: string;
};

const SITE_DATA: SiteRecipientRow[] = [
  // 13 Site Admin CP
  { no: 1, siteName: "Balikpapan", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 2, siteName: "CK NCN", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 3, siteName: "TU Batu Hijau", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 4, siteName: "TU Gresik", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 5, siteName: "BSI - Banyuwangi", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 6, siteName: "Madhani Talatah - ME", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 7, siteName: "MTN - Berau", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 8, siteName: "MTN - ME", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 9, siteName: "Petrosea SDA", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 10, siteName: "PKA Musi Rawas", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 11, siteName: "PPA TJ-Enim", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 12, siteName: "PT SMJ - Berau", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },
  { no: 13, siteName: "Tj. Redeb - Berau", category: "Admin CP", approverName: "Head Section CS (Apriyanto / Ary Maulana / M. Abian / Junaidi)", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: apriyanto.lastam / ary.maulana / abian.husain / junaidi.syamsudin@chitraparatama.co.id" },

  // 5 Site HSE
  { no: 14, siteName: "CK BIB", category: "HSE", approverName: "Fathurrahman Sufi", approverTitle: "HSE Officer", approverEmail: "77169@chitraparatama.co.id" },
  { no: 15, siteName: "CK BMB", category: "HSE", approverName: "Danny Hangga Irawan", approverTitle: "HSE Officer", approverEmail: "danny.hangga@chitraparatama.co.id" },
  { no: 16, siteName: "CK KIM", category: "HSE", approverName: "Rizky Rahmadani", approverTitle: "HSE Officer", approverEmail: "77477@chitraparatama.co.id" },
  { no: 17, siteName: "CK MHU", category: "HSE", approverName: "Irfan Rivai Remba", approverTitle: "HSE", approverEmail: "irfan.rifai@chitraparatama.co.id" },
  { no: 18, siteName: "Vale - Sorowako", category: "HSE", approverName: "Muhammad Wahyu Ichsan", approverTitle: "HSE Officer", approverEmail: "muhammad.w.ichsan@chitraparatama.co.id" },

  // 13 Site PJO
  { no: 19, siteName: "AMM Mifa Holing", category: "PJO", approverName: "Adit Prasetyo", approverTitle: "Technical Engineer", approverEmail: "adit.prasetyo@chitraparatama.co.id" },
  { no: 20, siteName: "AMM Tabang", category: "PJO", approverName: "Singgih Wiyono", approverTitle: "Technical Engineer", approverEmail: "singgih.wiyono@chitraparatama.co.id" },
  { no: 21, siteName: "BUMA Tanjung", category: "PJO", approverName: "Dowy Pratama Sita", approverTitle: "Technical Engineer", approverEmail: "dowy.pratama@chitraparatama.co.id" },
  { no: 22, siteName: "CDE - Bengkulu", category: "PJO", approverName: "Rakha Dwi Saputra", approverTitle: "Repairman", approverEmail: "rakhasyaputra86@gmail.com" },
  { no: 23, siteName: "CK MIFA", category: "PJO", approverName: "Fachri Husein", approverTitle: "Serviceman", approverEmail: "ryfhry28@gmail.com" },
  { no: 24, siteName: "Jakarta", category: "PJO", approverName: "Ade Saharu", approverTitle: "HSE Officer", approverEmail: "77170@chitraparatama.co.id" },
  { no: 25, siteName: "Makassar", category: "PJO", approverName: "Apriyanto", approverTitle: "Head of Service MVC", approverEmail: "apriyanto.lastam@chitraparatama.co.id" },
  { no: 26, siteName: "Palembang", category: "PJO", approverName: "Febrial Hariri", approverTitle: "Leader Technical Sumatera", approverEmail: "febrial.hariri@chitraparatama.co.id" },
  { no: 27, siteName: "Pekanbaru", category: "PJO", approverName: "Febrial Hariri", approverTitle: "Leader Technical Sumatera", approverEmail: "febrial.hariri@chitraparatama.co.id" },
  { no: 28, siteName: "PPA BIB", category: "PJO", approverName: "Muchamat Nurkolis Majid", approverTitle: "Technical Engineer", approverEmail: "m.nurkolis@chitraparatama.co.id" },
  { no: 29, siteName: "Sangatta", category: "PJO", approverName: "Saipudin", approverTitle: "HSE Leader", approverEmail: "saipudin@chitraparatama.co.id" },
  { no: 30, siteName: "Sebamban", category: "PJO", approverName: "Apriyanto", approverTitle: "Head of Service MVC", approverEmail: "apriyanto.lastam@chitraparatama.co.id" },
  { no: 31, siteName: "Tj. Adaro", category: "PJO", approverName: "Tommy Indra Aldiny Rambe", approverTitle: "Technical Leader", approverEmail: "tommy.indra@chitraparatama.co.id" },
];

const HC_CC_TEAM = [
  { name: "Adila Tri Arizona", email: "adila.arizona@chitraparatama.co.id", role: "HR Recruitment & GA" },
  { name: "Kesuma Bagaskara", email: "kesuma.bagaskara@chitraparatama.co.id", role: "Staff HR-GA" },
  { name: "Muhammad Iqbal", email: "muhammad.iqbal@chitraparatama.co.id", role: "HR-GA Supervisor" },
  { name: "Putri Rezky Fitriana", email: "putri.fitriana@chitraparatama.co.id", role: "HR Development & Comben" },
];

const CS_SECTION_HEADS = [
  { section: "Service Operation MVC", name: "Apriyanto", title: "Head of Service MVC", email: "apriyanto.lastam@chitraparatama.co.id" },
  { section: "Repair / Retread Operation", name: "Ary Maulana", title: "SPV Repair & Retread Operation", email: "ary.maulana@chitraparatama.co.id" },
  { section: "Technical Operation (TE)", name: "Muhammad Abian Husain", title: "Technical Coordinator", email: "abian.husain@chitraparatama.co.id" },
  { section: "Service Operation Others", name: "Junaidi", title: "Service Operation Others Coordinator", email: "junaidi.syamsudin@chitraparatama.co.id" },
  { section: "Product Accessories", name: "Luthfi Mahendra Yudistira", title: "Product Accessories Coordinator", email: "luthfi.yudistira@chitraparatama.co.id" },
];

export function AttendanceNotificationSettingsPanel() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredSites = SITE_DATA.filter((item) => {
    const matchesSearch =
      item.siteName.toLowerCase().includes(search.toLowerCase()) ||
      item.approverName.toLowerCase().includes(search.toLowerCase()) ||
      item.approverEmail.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="rounded-lg p-5 shadow-sm border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Penerima Notifikasi Izin Absensi (Sakit & Terlambat)
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Routing penerima email pengajuan izin sakit dan terlambat: <strong>PJO Site</strong> (untuk site dengan PJO) &rarr; <strong>HSE Site</strong> (untuk site tanpa PJO) &rarr; <strong>Head Section Central Services</strong> (untuk 13 site Admin CP).
              </p>
            </div>
          </div>
          <Badge variant="outline" className="h-7 self-start border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mr-1 size-3.5" /> 31 Site Terpetakan
          </Badge>
        </div>
      </Card>

      {/* Human Capital CC Section */}
      <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Users className="size-4 text-primary" />
          <h3 className="font-display text-base font-semibold">
            Tembusan Email (CC) &mdash; Tim Human Capital
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Semua email pengajuan izin/sakit/terlambat dari seluruh 31 site otomatis ditembuskan (CC) ke 4 personil Human Capital berikut:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HC_CC_TEAM.map((member) => (
            <div
              key={member.email}
              className="flex flex-col justify-between rounded-lg border border-border/80 bg-muted/40 p-3"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
              </div>
              <p className="font-mono text-[0.75rem] text-primary mt-2 break-all">{member.email}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Central Service Section Heads Reference for Admin CP */}
      <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <UserCheck className="size-4 text-primary" />
          <h3 className="font-display text-base font-semibold">
            Approver Head Section Central Services (Untuk 13 Site Admin CP)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Untuk karyawan yang bertugas di 13 site Admin CP, email approver ditujukan langsung ke Head Section Department Central Services sesuai seksi pemohon:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CS_SECTION_HEADS.map((head) => (
            <div
              key={head.email}
              className="rounded-lg border border-border/80 bg-muted/30 p-3"
            >
              <Badge variant="secondary" className="text-[0.7rem] mb-1.5">{head.section}</Badge>
              <p className="font-semibold text-sm text-foreground">{head.name}</p>
              <p className="text-xs text-muted-foreground">{head.title}</p>
              <p className="font-mono text-[0.75rem] text-primary mt-1.5 break-all">{head.email}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 31 Sites Table */}
      <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">
              Daftar Penerima Utama per Site (31 Site)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menampilkan mapping approver utama (`to`) untuk setiap site.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari site, approver, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Semua Kategori ({SITE_DATA.length})</option>
              <option value="PJO">PJO Site (13)</option>
              <option value="HSE">HSE Site (5)</option>
              <option value="Admin CP">Admin CP (13)</option>
            </select>
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Site</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Approver Utama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Email Approver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.map((row) => (
                <TableRow key={row.siteName} className="hover:bg-muted/30">
                  <TableCell className="text-center font-medium text-xs">{row.no}</TableCell>
                  <TableCell className="font-semibold text-sm">{row.siteName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.category === "PJO"
                          ? "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          : row.category === "HSE"
                          ? "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          : "border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                      }
                    >
                      {row.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{row.approverName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.approverTitle}</TableCell>
                  <TableCell className="font-mono text-xs text-primary max-w-[280px] break-all">
                    {row.approverEmail}
                  </TableCell>
                </TableRow>
              ))}
              {filteredSites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada site yang cocok dengan pencarian &quot;{search}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
