"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, Pencil, ShieldBan, Trash2, Save, UserCog, Key, Ban } from "lucide-react";
import {
  manageSecurityUserAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import {
  getBirthDateInputValue,
  normalizeBirthDateValue,
} from "@/lib/birth-date";
import type { SecurityUserRecord } from "@/lib/hero-admin";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

function getUserInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function SubmitButton({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Menyimpan..." : children}
    </Button>
  );
}

export function SecurityUserRowActions({
  user,
  managerOptions,
  roleOptions,
  sections,
  departments,
  positions,
  sites,
}: {
  user: SecurityUserRecord;
  managerOptions: Array<{ id: number; name: string }>;
  roleOptions: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; code: string; name: string; departmentId: number | null }>;
  departments: Array<{ id: number; code: string; name: string }>;
  positions: Array<{ id: number; code: string; name: string; siteLocation: string; level: number; departmentId: number | null }>;
  sites: Array<{ id: number; name: string; location: string }>;
}) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(manageSecurityUserAction, INITIAL_STATE);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    departments.find((department) => department.name === user.department)?.id.toString() ?? "",
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    sections.find((section) => section.name === user.section)?.id.toString() ?? "",
  );
  const [selectedJobTitle, setSelectedJobTitle] = useState(user.jobTitle);
  const [selectedSiteId, setSelectedSiteId] = useState(user.siteId ? `${user.siteId}` : "");

  const selectedPosition =
    positions.find((position) => position.name === selectedJobTitle) ?? null;
  const selectedSite = sites.find((site) => site.id.toString() === selectedSiteId) ?? null;
  const filteredSections = selectedDepartmentId
    ? sections.filter((section) => section.departmentId?.toString() === selectedDepartmentId)
    : sections;
  const filteredPositions = selectedDepartmentId
    ? positions.filter((position) => position.departmentId?.toString() === selectedDepartmentId)
    : positions;
  const selectedDepartmentName =
    departments.find((department) => department.id.toString() === selectedDepartmentId)?.name || user.department;
  const selectedSectionName =
    sections.find((section) => section.id.toString() === selectedSectionId)?.name || user.section;
  const resolvedWorkLocation = selectedSite?.name || selectedPosition?.siteLocation || user.workLocation || "";

  useEffect(() => {
    if (state.status === "success") {
      if (state.message.toLowerCase().includes("dihapus")) {
        setOpen(false);
      }
      if (state.message.toLowerCase().includes("role") && state.message.toLowerCase().includes("diubah")) {
        setOpen(false);
        alert(state.message + " Halaman akan di-refresh.");
      }
      startRefreshTransition(() => router.refresh());
    }
  }, [router, state, startRefreshTransition]);

  useEffect(() => {
    if (open) {
      setSelectedDepartmentId(departments.find((department) => department.name === user.department)?.id.toString() ?? "");
      setSelectedSectionId(sections.find((section) => section.name === user.section)?.id.toString() ?? "");
      setSelectedJobTitle(user.jobTitle);
      setSelectedSiteId(user.siteId ? `${user.siteId}` : "");
    }
  }, [departments, open, sections, user.department, user.jobTitle, user.section, user.siteId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-primary hover:bg-surface-container-low"
          aria-label={`Kelola ${user.name}`}
          title={`Kelola ${user.name}`}
        >
          <Eye className="size-4" />
          <span className="sr-only">Kelola pengguna</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Kelola Pengguna</DialogTitle>
          <DialogDescription>
            Lihat detail pengguna, ubah profil, ganti peran, reset password, nonaktifkan, atau hapus akses.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-[1.2rem] bg-surface-container-low p-4 xl:sticky xl:top-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-14 border border-border">
                  <AvatarImage
                    src={user.profileImage || undefined}
                    alt={user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted font-semibold text-muted-foreground">
                    {getUserInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{user.name}</p>
                  <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <AdminStatusBadge value={user.status} />
            </div>

            <div className="grid gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">SN</p>
                <p className="font-medium">{user.employeeSn}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peran</p>
                <Badge variant="outline" className="rounded-full">
                  {user.accessRole}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <p>{user.jobTitle}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lokasi Site Jabatan</p>
                <p>{selectedPosition?.siteLocation || user.workLocation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Departement</p>
                <p>{user.department}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Section</p>
                <p>{user.section}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">TTL</p>
                <p>{normalizeBirthDateValue(user.birthPlaceDate) || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Domisili</p>
                <p>{user.domicile || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atasan Langsung</p>
                <p>{user.directManagerName || "Belum dipilih"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lokasi Kerja</p>
                <p>{user.workLocation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nomor Telp</p>
                <p>{user.phoneNumber || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipe Status Karyawan</p>
                {user.employeeStatusType ? (
                  <Badge
                    variant="secondary"
                    className="mt-1 rounded-full bg-muted font-medium text-muted-foreground"
                  >
                    {user.employeeStatusType}
                  </Badge>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
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

            <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-surface-container-low p-4">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-muted-foreground" />
                <p className="font-medium">Edit Profil Pengguna</p>
              </div>
              <input type="hidden" name="intent" value="update-profile" />
              <input type="hidden" name="employeeId" value={user.id} />

              <ProfilePhotoField
                fallbackName={user.name}
                initialValue={user.profileImage ?? ""}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <Label>Nama Lengkap</Label>
                  <Input name="fullName" defaultValue={user.name} />
                </label>
                <label className="grid gap-2">
                  <Label>SN</Label>
                  <Input name="employeeSn" defaultValue={user.employeeSn} />
                </label>
                <label className="grid gap-2">
                  <Label>Tahun Masuk</Label>
                  <Input name="joinYear" defaultValue={`${user.joinYear}`} />
                </label>
                <label className="grid gap-2">
                  <Label>TTL</Label>
                  <Input
                    name="birthPlaceDate"
                    type="date"
                    defaultValue={getBirthDateInputValue(user.birthPlaceDate)}
                  />
                </label>
                <label className="grid gap-2">
                  <Label>Domisili</Label>
                  <Input name="domicile" defaultValue={user.domicile} />
                </label>
                <div className="grid gap-2">
                  <Label>Atasan Langsung</Label>
                  <Select
                    name="directManagerId"
                    defaultValue={user.directManagerId ? `${user.directManagerId}` : "none"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih atasan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum dipilih</SelectItem>
                      {managerOptions
                        .filter((manager) => manager.id !== user.id)
                        .map((manager) => (
                          <SelectItem key={manager.id} value={`${manager.id}`}>
                            {manager.name}
                          </SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tipe Status Karyawan</Label>
              <Select name="employeeStatusType" defaultValue={user.employeeStatusType || "Permanen | Staff"}>
                <SelectTrigger className="w-full">
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
                  <Label>Departement</Label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={(value) => {
                      setSelectedDepartmentId(value);
                      setSelectedSectionId("");
                      setSelectedJobTitle("");
                    }}
                  >
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedDepartmentId ? "Pilih section" : "Pilih department dulu"} />
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
                    name="jobTitle"
                    value={selectedJobTitle}
                    onValueChange={setSelectedJobTitle}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPositions.map((position) => (
                        <SelectItem key={position.id} value={position.name}>
                          {position.name} ({position.code}) - {position.siteLocation || "Semua Site"} - Level {position.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Lokasi Site</Label>
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={sites.length === 0}>
                    <SelectTrigger className="w-full">
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
                </div>
                <label className="grid gap-2">
                  <Label>Lokasi Kerja</Label>
                  <Input
                    name="workLocationDisplay"
                    value={resolvedWorkLocation}
                    readOnly
                    disabled
                  />
                  <input type="hidden" name="workLocation" value={resolvedWorkLocation} />
                </label>
                <label className="grid gap-2">
                  <Label>Nomor Telp</Label>
                  <Input name="phoneNumber" defaultValue={user.phoneNumber} />
                </label>
                <label className="grid gap-2">
                  <Label>Email</Label>
                  <Input name="email" defaultValue={user.email} type="email" />
                </label>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select name="employmentStatus" defaultValue={user.status}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="probation">probation</SelectItem>
                      <SelectItem value="contract">contract</SelectItem>
                      <SelectItem value="on_leave">on_leave</SelectItem>
                      <SelectItem value="inactive">inactive</SelectItem>
                      <SelectItem value="resigned">resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

                <div className="flex justify-end">
                <SubmitButton><Save className="size-4 mr-2" />Simpan Profil</SubmitButton>
              </div>
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-surface-container-low p-4">
                <input type="hidden" name="intent" value="change-role" />
                <input type="hidden" name="employeeId" value={user.id} />
                <div className="flex items-center gap-2">
                  <Pencil className="size-4 text-muted-foreground" />
                  <p className="font-medium">Ganti Peran</p>
                </div>
                <div className="grid gap-2">
                  <Label>Peran Akses</Label>
                  <Select name="accessRole" defaultValue={user.accessRole}>
                    <SelectTrigger className="w-full">
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
                <div className="flex justify-end">
                  <SubmitButton><UserCog className="size-4 mr-2" />Ganti Peran</SubmitButton>
                </div>
              </form>

              <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-surface-container-low p-4">
                <input type="hidden" name="intent" value="change-password" />
                <input type="hidden" name="employeeId" value={user.id} />
                <div className="flex items-center gap-2">
                  <ShieldBan className="size-4 text-muted-foreground" />
                  <p className="font-medium">Ganti Password</p>
                </div>
                <label className="grid gap-2">
                  <Label>Password Baru</Label>
                  <Input
                    name="newPassword"
                    type="password"
                    placeholder="Minimal 8 karakter"
                  />
                </label>
                <div className="flex justify-end">
                  <SubmitButton><Key className="size-4 mr-2" />Reset Password</SubmitButton>
                </div>
              </form>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-[#fffbeb] p-4">
                <input type="hidden" name="intent" value="ban-user" />
                <input type="hidden" name="employeeId" value={user.id} />
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <ShieldBan className="size-4" />
                  <p className="font-medium">Nonaktifkan Pengguna</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Menonaktifkan akses login dan mengakhiri sesi aktif pengguna.
                </p>
                <div className="flex justify-end">
                  <SubmitButton variant="outline"><Ban className="size-4 mr-2" />Nonaktifkan Pengguna</SubmitButton>
                </div>
              </form>

              <form action={formAction} className="space-y-4 rounded-[1.2rem] bg-[#fef2f2] p-4">
                <input type="hidden" name="intent" value="delete-user" />
                <input type="hidden" name="employeeId" value={user.id} />
                <div className="flex items-center gap-2 text-destructive">
                  <Trash2 className="size-4" />
                  <p className="font-medium">Hapus Pengguna</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hapus pengguna dari daftar karyawan dan akun login terkait.
                </p>
                <div className="flex justify-end">
                  <SubmitButton variant="destructive"><Trash2 className="size-4 mr-2" />Hapus Pengguna</SubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
