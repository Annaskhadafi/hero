"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronsUpDown, Plus, RefreshCw, UserPlus } from "lucide-react";
import {
  manageSecurityUserAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const overwriteInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(
    manageSecurityUserAction,
    INITIAL_STATE,
  );

  // State for cascading dropdowns
  const [selectedManagerId, setSelectedManagerId] = useState<string>("none");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState<string>("active");
  const [selectedStatusType, setSelectedStatusType] = useState<string>("Permanen | Staff");
  const [selectedRole, setSelectedRole] = useState<string>(roleOptions[0]?.name ?? "User");
  const selectedPosition =
    positions.find((position) => position.name === selectedJobTitle) ?? null;
  const selectedSite = sites.find((site) => site.id.toString() === selectedSiteId) ?? null;
  const resolvedWorkLocation = selectedSite?.name || selectedPosition?.siteLocation || "";

  const filteredSections = selectedDepartmentId
    ? sections.filter((section) => section.departmentId?.toString() === selectedDepartmentId)
    : sections;

  // Filter positions based on selected department and ensure unique position names/keys
  const uniquePositions = useMemo(() => {
    const filtered = selectedDepartmentId
      ? positions.filter((p) => !p.departmentId || p.departmentId.toString() === selectedDepartmentId)
      : positions;

    const seen = new Set<string>();
    return filtered.filter((pos) => {
      const name = pos.name?.trim();
      if (!name || seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
  }, [positions, selectedDepartmentId]);

  // Resolve selected names for hidden inputs consumed by the server action
  const selectedDepartmentName = departments.find((d) => d.id.toString() === selectedDepartmentId)?.name || "";
  const selectedSectionName = sections.find((s) => s.id.toString() === selectedSectionId)?.name || "";

  const isDuplicateFound = (state.status as string) === "duplicate_found";

  useEffect(() => {
    if (isDuplicateFound) {
      setShowDuplicateDialog(true);
    } else if (state.status === "success") {
      setOpen(false);
      setShowDuplicateDialog(false);
      setConfirmOverwrite(false);
      setFormKey((current) => current + 1);
      setSelectedManagerId("none");
      setSelectedDepartmentId("");
      setSelectedSectionId("");
      setSelectedJobTitle("");
      setSelectedSiteId("");
      setSelectedEmploymentStatus("active");
      setSelectedStatusType("Permanen | Staff");
      setSelectedRole(roleOptions[0]?.name ?? "User");
      startRefreshTransition(() => router.refresh());
    }
  }, [isDuplicateFound, roleOptions, router, state.status, startRefreshTransition]);

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

        <form ref={formRef} key={formKey} action={formAction} className="space-y-5">
          <input type="hidden" name="intent" value="create-user" />
          <input ref={overwriteInputRef} type="hidden" name="overwriteExisting" value={confirmOverwrite ? "true" : "false"} />

          {state.status !== "idle" && !isDuplicateFound ? (
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
              <Label>SN / NIK (SAP)</Label>
              <Input name="employeeSn" placeholder="Masukkan SN/NIK resmi dari SAP" required />
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
              <input type="hidden" name="directManagerId" value={selectedManagerId} />
              <SearchableManagerSelect
                managerOptions={managerOptions}
                selectedManagerId={selectedManagerId}
                onSelectManager={setSelectedManagerId}
              />
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
                      {department.code ? `[${department.code}] ` : ''}{department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="departmentId" value={selectedDepartmentId} />
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
                      {section.code ? `[${section.code}] ` : ''}{section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="sectionId" value={selectedSectionId} />
              <input type="hidden" name="section" value={selectedSectionName} />
            </div>

            <div className="grid gap-2">
              <Label>Position</Label>
              <input type="hidden" name="jobTitle" value={selectedJobTitle} />
              <SearchablePositionSelect
                positions={uniquePositions}
                selectedJobTitle={selectedJobTitle}
                onSelectJobTitle={setSelectedJobTitle}
              />
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
              <Select value={selectedEmploymentStatus} onValueChange={setSelectedEmploymentStatus}>
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
              <input type="hidden" name="employmentStatus" value={selectedEmploymentStatus} />
            </div>
            <div className="grid gap-2">
              <Label>Tipe Status Karyawan</Label>
              <Select value={selectedStatusType} onValueChange={setSelectedStatusType}>
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
              <input type="hidden" name="employeeStatusType" value={selectedStatusType} />
            </div>
            <div className="grid gap-2">
              <Label>Peran Akses</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
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
              <input type="hidden" name="accessRole" value={selectedRole} />
            </div>
          </div>

          <div className="rounded-[1.2rem] bg-surface-container-low p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <Label>Password Awal</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Kosongkan untuk Chitra#SN"
                />
              </label>
              <div className="grid content-end text-sm text-muted-foreground">
                Default login mengikuti format Chitra#SN jika password tidak diisi.
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

      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold">
              Data Pengguna / Credential Sudah Ada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground mt-2">
              {state.message || "Pengguna dengan NIK atau Email ini sudah terdaftar di sistem."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setShowDuplicateDialog(false);
                setConfirmOverwrite(false);
              }}
              className="rounded-xl"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (overwriteInputRef.current) {
                  overwriteInputRef.current.value = "true";
                }
                setConfirmOverwrite(true);
                setShowDuplicateDialog(false);
                setTimeout(() => {
                  formRef.current?.requestSubmit();
                }, 50);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 font-semibold"
            >
              <RefreshCw className="size-4" />
              Gantikan Data Lama (Replace)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function SearchableManagerSelect({
  managerOptions,
  selectedManagerId,
  onSelectManager,
}: {
  managerOptions: Array<{ id: number; name: string }>;
  selectedManagerId: string;
  onSelectManager: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedManager = managerOptions.find(
    (m) => m.id.toString() === selectedManagerId
  );
  const displayText =
    selectedManagerId === "none" || !selectedManagerId
      ? "Belum dipilih"
      : selectedManager?.name || "Pilih atasan langsung";

  const filteredManagers = useMemo(() => {
    if (!search.trim()) return managerOptions;
    const q = search.toLowerCase();
    return managerOptions.filter((m) => m.name.toLowerCase().includes(q));
  }, [managerOptions, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-normal"
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 sm:w-[400px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari nama atasan..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[220px]">
            <CommandEmpty>Tidak ada atasan yang cocok.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onSelectManager("none");
                  setOpen(false);
                  setSearch("");
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>Belum dipilih</span>
                {selectedManagerId === "none" || !selectedManagerId ? (
                  <Check className="size-4 text-primary" />
                ) : null}
              </CommandItem>
              {filteredManagers.map((manager) => {
                const isSelected = manager.id.toString() === selectedManagerId;
                return (
                  <CommandItem
                    key={manager.id}
                    value={manager.id.toString()}
                    onSelect={() => {
                      onSelectManager(manager.id.toString());
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{manager.name}</span>
                    {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SearchablePositionSelect({
  positions,
  selectedJobTitle,
  onSelectJobTitle,
}: {
  positions: Array<{ id: number; code: string; name: string; siteLocation: string; level: number; departmentId: number | null }>;
  selectedJobTitle: string;
  onSelectJobTitle: (jobTitle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPositions = useMemo(() => {
    if (!search.trim()) return positions;
    const q = search.toLowerCase();
    return positions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [positions, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-normal"
        >
          <span className="truncate">{selectedJobTitle || "Pilih atau cari jabatan..."}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 sm:w-[420px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari atau ketik jabatan..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>
              <div className="p-3 text-center text-xs">
                <p className="text-muted-foreground">Jabatan tidak ditemukan dalam daftar master.</p>
                {search.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs text-primary font-medium hover:bg-primary/10"
                    onClick={() => {
                      onSelectJobTitle(search.trim());
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    Gunakan "{search.trim()}"
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {search.trim() &&
              !positions.some((p) => p.name.toLowerCase() === search.trim().toLowerCase()) ? (
                <CommandItem
                  value={search.trim()}
                  onSelect={() => {
                    onSelectJobTitle(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex items-center justify-between cursor-pointer text-primary font-medium"
                >
                  <span className="truncate">Gunakan "{search.trim()}"</span>
                  <Plus className="size-4 shrink-0" />
                </CommandItem>
              ) : null}
              {filteredPositions.map((pos) => {
                const isSelected = pos.name === selectedJobTitle;
                return (
                  <CommandItem
                    key={`${pos.id}-${pos.name}`}
                    value={pos.name}
                    onSelect={() => {
                      onSelectJobTitle(pos.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate font-medium">{pos.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {pos.code ? `Kode: ${pos.code}` : ""}
                        {pos.siteLocation ? ` • ${pos.siteLocation}` : ""}
                        {pos.level ? ` • Lvl ${pos.level}` : ""}
                      </span>
                    </div>
                    {isSelected ? <Check className="size-4 shrink-0 text-primary ml-2" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
