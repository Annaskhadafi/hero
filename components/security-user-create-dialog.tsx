"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import {
  manageSecurityUserAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INITIAL_STATE: AdminMutationState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="size-4" />
      {pending ? "Membuat pengguna..." : "Buat Pengguna"}
    </Button>
  );
}

export function SecurityUserCreateDialog({
  roleOptions,
  managerOptions,
  sections,
  departments,
  positions,
  sites,
}: {
  roleOptions: Array<{ id: number; name: string }>;
  managerOptions: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; code: string; name: string; departmentId: number | null }>;
  departments: Array<{ id: number; code: string; name: string }>;
  positions: Array<{ id: number; code: string; name: string; siteLocation: string; level: number; departmentId: number | null }>;
  sites: Array<{ id: number; name: string; location: string }>;
}) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    manageSecurityUserAction,
    INITIAL_STATE,
  );

  // State for cascading dropdowns
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const selectedPosition =
    positions.find((position) => position.name === selectedJobTitle) ?? null;
  const selectedSite = sites.find((site) => site.id.toString() === selectedSiteId) ?? null;
  const resolvedWorkLocation = selectedSite?.name || selectedPosition?.siteLocation || "";

  const filteredSections = selectedDepartmentId
    ? sections.filter((section) => section.departmentId?.toString() === selectedDepartmentId)
    : sections;

  // Filter positions based on selected department
  const filteredPositions = selectedDepartmentId
    ? positions.filter((p) => p.departmentId?.toString() === selectedDepartmentId)
    : positions;

  // Resolve selected names for hidden inputs consumed by the server action
  const selectedDepartmentName = departments.find((d) => d.id.toString() === selectedDepartmentId)?.name || "";
  const selectedSectionName = sections.find((s) => s.id.toString() === selectedSectionId)?.name || "";

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      setFormKey((current) => current + 1);
      setSelectedDepartmentId("");
      setSelectedSectionId("");
      setSelectedJobTitle("");
      setSelectedSiteId("");
      startRefreshTransition(() => router.refresh());
    }
  }, [router, state.status, startRefreshTransition]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="h-10 gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm">
          <Plus className="size-4" />
          Tambah Pengguna
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Pengguna Manual</DialogTitle>
          <DialogDescription>
            Tambahkan pengguna baru lengkap dengan akun login, profil HC, dan peran akses.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={formAction} className="space-y-5">
          <input type="hidden" name="intent" value="create-user" />

          {state.status !== "idle" ? (
            <Alert
              className={
                state.status === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }
            >
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <ProfilePhotoField fallbackName="User Baru" />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <Label>Nama Lengkap</Label>
              <Input name="fullName" placeholder="Contoh: Budi Santoso" required />
            </label>
            <label className="grid gap-2">
              <Label>SN</Label>
              <Input name="employeeSn" placeholder="Contoh: HC-005" required />
            </label>
            <label className="grid gap-2">
              <Label>Tahun Masuk</Label>
              <Input
                name="joinYear"
                type="number"
                min="1980"
                max="2100"
                placeholder="2026"
              />
            </label>
            <label className="grid gap-2">
              <Label>TTL</Label>
              <Input name="birthPlaceDate" type="date" />
            </label>
            <label className="grid gap-2">
              <Label>Domisili</Label>
              <Input name="domicile" placeholder="Contoh: Sangatta" />
            </label>
            <div className="grid gap-2">
              <Label>Atasan Langsung</Label>
              <Select name="directManagerId" defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih atasan langsung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum dipilih</SelectItem>
                  {managerOptions.map((manager) => (
                    <SelectItem key={manager.id} value={`${manager.id}`}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Departement</Label>
              <Select
                value={selectedDepartmentId}
                onValueChange={(value) => {
                  setSelectedDepartmentId(value);
                  setSelectedSectionId("");
                  setSelectedJobTitle("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={`${department.id}`}>
                      {department.name} ({department.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="department" value={selectedDepartmentName} />
            </div>

            <div className="grid gap-2">
              <Label>Section</Label>
              <Select
                value={selectedSectionId}
                onValueChange={setSelectedSectionId}
                disabled={!selectedDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedDepartmentId
                        ? "Pilih section"
                        : "Pilih department terlebih dahulu"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredSections.map((section) => (
                    <SelectItem key={section.id} value={`${section.id}`}>
                      {section.name} ({section.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="section" value={selectedSectionName} />
            </div>

            <div className="grid gap-2">
              <Label>Position</Label>
              <Select
                value={selectedJobTitle}
                onValueChange={setSelectedJobTitle}
                disabled={!selectedDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedDepartmentId ? "Pilih jabatan" : "Pilih department terlebih dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.name}>
                      {pos.name} ({pos.code}) - {pos.siteLocation || "Semua Site"} - Level {pos.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="jobTitle" value={selectedJobTitle} />
            </div>

            <label className="grid gap-2">
              <Label>Lokasi Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={sites.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={sites.length > 0 ? "Pilih lokasi site" : "Belum ada site aktif"} />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={`${site.id}`}>
                      {site.name} {site.location ? `- ${site.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="siteId" value={selectedSiteId} />
            </label>

            <label className="grid gap-2">
              <Label>Lokasi Kerja</Label>
              <Input
                name="workLocationDisplay"
                value={resolvedWorkLocation}
                placeholder="Auto from position"
                readOnly
                disabled
              />
              <input type="hidden" name="workLocation" value={resolvedWorkLocation} />
            </label>
            <label className="grid gap-2">
              <Label>Nomor Telp</Label>
              <Input name="phoneNumber" placeholder="08xxxxxxxxxx" />
            </label>
            <label className="grid gap-2">
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="name@company.com" required />
            </label>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select name="employmentStatus" defaultValue="active">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="probation">probation</SelectItem>
                  <SelectItem value="contract">contract</SelectItem>
                  <SelectItem value="on_leave">on_leave</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tipe Status Karyawan</Label>
              <Select name="employeeStatusType" defaultValue="Permanen | Staff">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanen | Non Staff">Permanen | Non Staff</SelectItem>
                  <SelectItem value="Permanen | Staff">Permanen | Staff</SelectItem>
                  <SelectItem value="Kontrak | Non Staff">Kontrak | Non Staff</SelectItem>
                  <SelectItem value="Kontrak | Staff">Kontrak | Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Peran Akses</Label>
              <Select
                name="accessRole"
                defaultValue={roleOptions[0]?.name ?? undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-[1.2rem] bg-surface-container-low p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label>Password Awal</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  required
                />
              </label>
              <div className="grid content-end text-sm text-muted-foreground">
                Password ini langsung digunakan untuk akun login pengguna baru.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Tutup
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
