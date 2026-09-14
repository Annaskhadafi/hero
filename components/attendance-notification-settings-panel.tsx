"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Save, Search, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeMultiSelect, type EmployeeOption } from "@/components/employee-multi-select";
import {
  saveAttendanceNotificationConfigAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { toast } from "sonner";

export type AttendanceNotificationConfig = {
  id?: number;
  ccEmails: string;
  headSectionMvcEmail: string;
  headSectionRepairEmail: string;
  headSectionTeEmail: string;
  headSectionOthersEmail: string;
  headSectionAccessoriesEmail: string;
  isActive: boolean;
};

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
  { no: 1, siteName: "Balikpapan", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 2, siteName: "CK NCN", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 3, siteName: "TU Batu Hijau", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 4, siteName: "TU Gresik", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 5, siteName: "BSI - Banyuwangi", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 6, siteName: "Madhani Talatah - ME", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 7, siteName: "MTN - Berau", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 8, siteName: "MTN - ME", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 9, siteName: "Petrosea SDA", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 10, siteName: "PKA Musi Rawas", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 11, siteName: "PPA TJ-Enim", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 12, siteName: "PT SMJ - Berau", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },
  { no: 13, siteName: "Tj. Redeb - Berau", category: "Admin CP", approverName: "Head Section CS", approverTitle: "Head Section Central Services", approverEmail: "Sesuai seksi: MVC / Repair / TE / Others / Accessories" },

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

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export function AttendanceNotificationSettingsPanel({
  config = {
    ccEmails: "adila.arizona@chitraparatama.co.id, kesuma.bagaskara@chitraparatama.co.id",
    headSectionMvcEmail: "apriyanto.lastam@chitraparatama.co.id",
    headSectionRepairEmail: "ary.maulana@chitraparatama.co.id",
    headSectionTeEmail: "abian.husain@chitraparatama.co.id",
    headSectionOthersEmail: "junaidi.syamsudin@chitraparatama.co.id",
    headSectionAccessoriesEmail: "luthfi.yudistira@chitraparatama.co.id",
    isActive: true,
  },
  employees = [],
}: {
  config?: AttendanceNotificationConfig;
  employees?: EmployeeOption[];
}) {
  const [formData, setFormData] = useState<AttendanceNotificationConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const ccEmailList = useMemo(() => {
    return formData.ccEmails
      ? formData.ccEmails.split(",").map((e) => e.trim()).filter(Boolean)
      : [];
  }, [formData.ccEmails]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const fd = new FormData();
    fd.set("ccEmails", formData.ccEmails);
    fd.set("headSectionMvcEmail", formData.headSectionMvcEmail);
    fd.set("headSectionRepairEmail", formData.headSectionRepairEmail);
    fd.set("headSectionTeEmail", formData.headSectionTeEmail);
    fd.set("headSectionOthersEmail", formData.headSectionOthersEmail);
    fd.set("headSectionAccessoriesEmail", formData.headSectionAccessoriesEmail);
    fd.set("isActive", String(formData.isActive));

    const result = await saveAttendanceNotificationConfigAction(INITIAL_STATE, fd);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setIsSaving(false);
  }

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
      {/* Header Overview Card */}
      <Card className="rounded-lg p-5 shadow-sm border border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Penerima Notifikasi Izin Absensi (Sakit &amp; Terlambat)
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Routing notifikasi email pengajuan izin sakit dan terlambat: <strong>PJO Site</strong> (untuk site dengan PJO) &rarr; <strong>HSE Site</strong> (untuk site tanpa PJO) &rarr; <strong>Head Section Central Services</strong> (untuk 13 site Admin CP).
              </p>
            </div>
          </div>
          <Badge variant="outline" className="h-7 self-start border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="mr-1 size-3.5" /> 31 Site Terpetakan
          </Badge>
        </div>
      </Card>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Human Capital CC Section */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="size-4 text-primary" />
            <h3 className="font-display text-base font-semibold">
              Tembusan Email (CC) &mdash; Tim Human Capital
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Semua email pengajuan izin/sakit/terlambat dari seluruh site otomatis ditembuskan (CC) ke personil Human Capital berikut:
          </p>

          <div className="space-y-2">
            <Label htmlFor="attendance-hc-cc">Pilih Penerima CC Human Capital</Label>
            <EmployeeMultiSelect
              label="tim Human Capital (CC)"
              selectedEmails={ccEmailList}
              onChange={(emails: string[]) =>
                setFormData((current) => ({ ...current, ccEmails: emails.join(", ") }))
              }
              employees={employees}
              placeholder="Pilih karyawan Human Capital yang menerima CC..."
            />
            <p className="text-xs text-muted-foreground">
              Karyawan yang dipilih akan menerima salinan (CC) email izin absensi yang diajukan di seluruh site.
            </p>
          </div>
        </Card>

        {/* Central Service Section Heads Reference & Config for Admin CP */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <UserCheck className="size-4 text-primary" />
            <h3 className="font-display text-base font-semibold">
              Approver Head Section Central Services (Untuk 13 Site Admin CP)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Untuk karyawan yang bertugas di 13 site Admin CP, email approver ditujukan langsung ke Head Section Central Services sesuai seksi pemohon:
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 rounded-lg border bg-surface-container-low p-3.5">
              <Badge variant="secondary" className="text-[0.7rem] mb-1">Service Operation MVC</Badge>
              <Label className="text-xs font-semibold">Email Head Section MVC</Label>
              <EmployeeMultiSelect
                label="Head Section MVC"
                selectedEmails={
                  formData.headSectionMvcEmail
                    ? formData.headSectionMvcEmail.split(",").map((e) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, headSectionMvcEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih Head Section MVC..."
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-surface-container-low p-3.5">
              <Badge variant="secondary" className="text-[0.7rem] mb-1">Repair / Retread Operation</Badge>
              <Label className="text-xs font-semibold">Email SPV Repair &amp; Retread</Label>
              <EmployeeMultiSelect
                label="SPV Repair & Retread"
                selectedEmails={
                  formData.headSectionRepairEmail
                    ? formData.headSectionRepairEmail.split(",").map((e) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, headSectionRepairEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih SPV Repair & Retread..."
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-surface-container-low p-3.5">
              <Badge variant="secondary" className="text-[0.7rem] mb-1">Technical Operation (TE)</Badge>
              <Label className="text-xs font-semibold">Email Technical Coordinator</Label>
              <EmployeeMultiSelect
                label="Technical Coordinator"
                selectedEmails={
                  formData.headSectionTeEmail
                    ? formData.headSectionTeEmail.split(",").map((e) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, headSectionTeEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih Technical Coordinator..."
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-surface-container-low p-3.5">
              <Badge variant="secondary" className="text-[0.7rem] mb-1">Service Operation Others</Badge>
              <Label className="text-xs font-semibold">Email Service Others Coordinator</Label>
              <EmployeeMultiSelect
                label="Service Others Coordinator"
                selectedEmails={
                  formData.headSectionOthersEmail
                    ? formData.headSectionOthersEmail.split(",").map((e) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, headSectionOthersEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih Service Others Coordinator..."
              />
            </div>

            <div className="space-y-2 rounded-lg border bg-surface-container-low p-3.5">
              <Badge variant="secondary" className="text-[0.7rem] mb-1">Product Accessories</Badge>
              <Label className="text-xs font-semibold">Email Accessories Coordinator</Label>
              <EmployeeMultiSelect
                label="Accessories Coordinator"
                selectedEmails={
                  formData.headSectionAccessoriesEmail
                    ? formData.headSectionAccessoriesEmail.split(",").map((e) => e.trim()).filter(Boolean)
                    : []
                }
                onChange={(emails: string[]) =>
                  setFormData((current) => ({ ...current, headSectionAccessoriesEmail: emails.join(", ") }))
                }
                employees={employees}
                placeholder="Pilih Accessories Coordinator..."
              />
            </div>
          </div>
        </Card>

        {/* Status Toggle & Submit Button */}
        <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
          <div className="rounded-lg border bg-surface-container-low p-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Aktifkan notifikasi email Izin Absensi</p>
                <p className="text-xs text-muted-foreground">
                  Jika dinonaktifkan, pengajuan izin sakit/terlambat tetap tersimpan tetapi notifikasi email otomatis tidak dikirim.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((current) => ({ ...current, isActive: checked }))
                }
              />
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="size-4" />
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan Izin Absensi"}
            </Button>
          </div>
        </Card>
      </form>

      {/* 31 Sites Reference Table */}
      <Card className="rounded-lg p-5 shadow-sm border border-border space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold">
              Daftar Pemetaan Routing Approver per Site (31 Site)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menampilkan default routing approver utama (`to`) untuk setiap site.
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
