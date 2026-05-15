"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Check,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users2,
  X,
} from "lucide-react";

import {
  importSecurityUsersAction,
  type ImportUsersActionState,
} from "@/app/dashboard/admin-actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { SecurityUserCreateDialog } from "@/components/security-user-create-dialog";
import { SecurityUserRowActions } from "@/components/security-user-row-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MinimalTableShell,
  exportRowsToFile,
} from "@/components/ui/minimal-table-shell";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { SecurityUserRecord } from "@/lib/hero-admin";
import {
  USER_IMPORT_FIELDS,
  autoMapHeaders,
  parseCsvToRecords,
  type UserImportMapping,
} from "@/lib/security-user-import";
import { cn } from "@/lib/utils";

import { SecurityUserBulkActions } from "@/components/security-user-bulk-actions";

// Extract site name from workLocation
// Example: "Repair & Retread - Sangatta" -> "Sangatta"
// Example: "Balikpapan" -> "Balikpapan"
function extractSiteName(workLocation: string | null | undefined): string {
  if (!workLocation) return '-'
  const parts = workLocation.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : workLocation.trim()
}

const INITIAL_IMPORT_STATE: ImportUsersActionState = {
  status: "idle",
  message: "",
};

function getUniqueOptions(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function toHeaderPreview(mapping: UserImportMapping) {
  return USER_IMPORT_FIELDS.map(
    (field) => `${field.label}: ${mapping[field.key] || "belum dipilih"}`
  ).join("\n");
}

function getUserInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="surface-chip flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium text-foreground"
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-4 place-items-center rounded-full text-muted-foreground transition hover:bg-surface-container-low"
        aria-label="Hapus filter"
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  label,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} dipilih`;

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }

    onChange([...selected, option]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[160px] justify-between rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] font-medium text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)] hover:bg-surface-container-lowest"
        >
          <span className="truncate">{displayText}</span>
          <Filter className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Cari ${label.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList className="max-h-[220px]">
            <CommandEmpty>Tidak ada {label.toLowerCase()}.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => toggleOption(option)}
                  className="flex items-center gap-2 px-2 py-2"
                >
                  <Checkbox checked={selected.includes(option)} />
                  <span className="flex-1 truncate text-sm">{option}</span>
                  {selected.includes(option) ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 ? (
            <div className="border-t border-border/70 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="h-8 w-full justify-center text-xs text-muted-foreground"
              >
                Bersihkan pilihan
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SecurityUserManagement({
  users,
  roleOptions,
  sections,
  departments,
  positions,
  sites,
}: {
  users: SecurityUserRecord[];
  roleOptions: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; code: string; name: string; departmentId: number | null }>;
  departments: Array<{ id: number; code: string; name: string }>;
  positions: Array<{
    id: number;
    code: string;
    name: string;
    siteLocation: string;
    level: number;
    departmentId: number | null;
  }>;
  sites: Array<{ id: number; name: string; location: string }>;
}) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatusTypes, setSelectedStatusTypes] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [mapping, setMapping] = useState<UserImportMapping>({});
  const [actionState, formAction, isPending] = useActionState(
    importSecurityUsersAction,
    INITIAL_IMPORT_STATE,
  );

  const parsedImport = useMemo(() => parseCsvToRecords(rawCsv), [rawCsv]);
  const managerOptions = useMemo(
    () => users.map((user) => ({ id: user.id, name: user.name })),
    [users],
  );
  const departmentFilterOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.department)),
    [users],
  );
  const roleNames = useMemo(
    () => getUniqueOptions(roleOptions.map((item) => item.name)),
    [roleOptions],
  );
  const statusTypeOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.employeeStatusType)),
    [users],
  );
  const siteOptions = useMemo(
    () => getUniqueOptions(users.map((user) => extractSiteName(user.workLocation)).filter((s) => s !== "-")),
    [users],
  );

  useEffect(() => {
    const autoMapped = autoMapHeaders(parsedImport.headers);

    setMapping((currentMapping) => {
      const nextMapping: UserImportMapping = {};

      for (const field of USER_IMPORT_FIELDS) {
        const currentHeader = currentMapping[field.key];
        nextMapping[field.key] =
          currentHeader && parsedImport.headers.includes(currentHeader)
            ? currentHeader
            : autoMapped[field.key] ?? "";
      }

      return nextMapping;
    });
  }, [parsedImport.headers]);

  useEffect(() => {
    if (actionState.status === "success") {
      setIsImportOpen(false);
      setRawCsv("");
      setMapping({});
      startRefreshTransition(() => router.refresh());
    }
  }, [actionState.status, router, startRefreshTransition]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const haystack = [
        user.employeeSn,
        user.name,
        user.birthPlaceDate,
        user.domicile,
        user.directManagerName ?? "",
        user.section,
        user.department,
        user.jobTitle,
        user.accessRole,
        user.workLocation,
        user.phoneNumber,
        user.email,
        user.status,
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !query || haystack.includes(query);
      const matchesDepartment =
        selectedDepartments.length === 0 ||
        selectedDepartments.includes(user.department);
      const matchesRole =
        selectedRoles.length === 0 || selectedRoles.includes(user.accessRole);
      const matchesStatusType =
        selectedStatusTypes.length === 0 ||
        selectedStatusTypes.includes(user.employeeStatusType);
      const matchesSite =
        selectedSites.length === 0 ||
        selectedSites.includes(extractSiteName(user.workLocation));

      return (
        matchesKeyword &&
        matchesDepartment &&
        matchesRole &&
        matchesStatusType &&
        matchesSite
      );
    });
  }, [
    searchQuery,
    selectedDepartments,
    selectedRoles,
    selectedStatusTypes,
    selectedSites,
    users,
  ]);

  const currentYear = new Date().getFullYear();
  const activeUsersCount = users.filter((user) => user.status === "active").length;
  const newHiresCount = users.filter(
    (user) => user.joinYear === currentYear,
  ).length;
  const visiblePercentage =
    users.length > 0
      ? Math.round((filteredUsers.length / users.length) * 100 * 10) / 10
      : 0;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartments.length > 0 ||
    selectedRoles.length > 0 ||
    selectedStatusTypes.length > 0 ||
    selectedSites.length > 0;
  const missingRequiredMappings = USER_IMPORT_FIELDS.filter(
    (field) => field.required && !mapping[field.key],
  );

  function resetFilters() {
    setSearchQuery("");
    setSelectedDepartments([]);
    setSelectedRoles([]);
    setSelectedStatusTypes([]);
    setSelectedSites([]);
  }

  function exportVisibleUsers() {
    exportRowsToFile({
      columns: [
        "Nama",
        "SN",
        "Departemen",
        "Peran",
        "Lokasi Site",
        "Tipe Status",
        "Join Year",
      ],
      rows: filteredUsers.map((user) => [
        user.name,
        user.employeeSn,
        user.department,
        user.accessRole,
        user.workLocation || user.siteName,
        user.employeeStatusType,
        user.joinYear,
      ]),
      fileName: "security-users",
    });
  }

  return (
    <AdminPageShell
      eyebrow="Security"
      title="Manajemen Pengguna"
      description="Kelola akses akun, struktur HC, dan status karyawan dalam satu workspace table-first yang lebih cepat dipindai."
      badge={`${filteredUsers.length}/${users.length} visible`}
      actions={
        <>
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-0 bg-surface-container-lowest px-4 text-sm font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
              >
                <Upload className="size-4" />
                Import Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Daftar Pengguna</DialogTitle>
                <DialogDescription>
                  Tempel atau unggah CSV, cocokkan kolom, lalu simpan ke master user.
                </DialogDescription>
              </DialogHeader>

              <form action={formAction} className="space-y-5">
                <input type="hidden" name="rawCsv" value={rawCsv} />
                <input
                  type="hidden"
                  name="mappingJson"
                  value={JSON.stringify(mapping)}
                />

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <div className="surface-muted-card rounded-[1rem] p-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            File daftar pengguna
                          </p>
                          <Input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setRawCsv(await file.text());
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-foreground">
                            Tempel daftar manual
                          </p>
                          <Textarea
                            value={rawCsv}
                            onChange={(event) => setRawCsv(event.target.value)}
                            className="min-h-56 text-xs"
                            placeholder="Tempel data pengguna di sini bila tidak mengunggah file..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="surface-module-card rounded-[1rem] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Pratinjau data
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parsedImport.records.length} baris,{" "}
                            {parsedImport.headers.length} kolom terdeteksi.
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full border-0 bg-surface-container-low px-3 py-1">
                          {missingRequiredMappings.length === 0
                            ? "Siap import"
                            : `${missingRequiredMappings.length} kolom wajib`}
                        </Badge>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-[0.95rem] bg-surface-container-low p-2">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              {parsedImport.headers.length > 0 ? (
                                parsedImport.headers.map((header) => (
                                  <TableHead key={header}>{header}</TableHead>
                                ))
                              ) : (
                                <TableHead>Belum ada kolom</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedImport.records.slice(0, 4).length > 0 ? (
                              parsedImport.records.slice(0, 4).map((record, index) => (
                                <TableRow
                                  key={`${index}-${record[parsedImport.headers[0]] ?? "row"}`}
                                >
                                  {parsedImport.headers.map((header) => (
                                    <TableCell
                                      key={`${index}-${header}`}
                                      className="text-xs"
                                    >
                                      {record[header] || "â€”"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell className="text-sm text-muted-foreground">
                                  Unggah atau tempel daftar pengguna untuk melihat pratinjau.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="surface-module-card rounded-[1rem] p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Cocokkan Kolom
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Semua kolom wajib harus diisi sebelum import dijalankan.
                      </p>
                      <div className="mt-4 grid gap-3">
                        {USER_IMPORT_FIELDS.map((field) => (
                          <div key={field.key} className="grid gap-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {field.label}
                              </p>
                              {field.required ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full bg-surface-container-low"
                                >
                                  Wajib
                                </Badge>
                              ) : null}
                            </div>
                            <Command className="rounded-xl border-0 bg-surface-container-lowest shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                              <CommandInput
                                placeholder="Pilih kolom sumber"
                                value={mapping[field.key] || ""}
                                onValueChange={(value) =>
                                  setMapping((current) => ({
                                    ...current,
                                    [field.key]: value,
                                  }))
                                }
                              />
                              <CommandList className="max-h-[120px]">
                                <CommandEmpty>
                                  Tidak ada kolom yang cocok
                                </CommandEmpty>
                                <CommandGroup>
                                  {parsedImport.headers.map((header) => (
                                    <CommandItem
                                      key={`${field.key}-${header}`}
                                      onSelect={() =>
                                        setMapping((current) => ({
                                          ...current,
                                          [field.key]: header,
                                        }))
                                      }
                                    >
                                      {header}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="surface-muted-card rounded-[1rem] p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Ringkasan Kolom
                      </p>
                      <p className="mt-2 whitespace-pre-line font-mono text-xs leading-6 text-muted-foreground">
                        {toHeaderPreview(mapping)}
                      </p>
                    </div>
                  </div>
                </div>

                {actionState.status !== "idle" ? (
                  <Alert
                    className={cn(
                      "border-0 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]",
                      actionState.status === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    <AlertDescription>
                      {actionState.message}
                      {actionState.status === "success" ? (
                        <span>
                          {" "}
                          Baru: {actionState.importedCount ?? 0}, diperbarui:{" "}
                          {actionState.updatedCount ?? 0}, dilewati:{" "}
                          {actionState.skippedCount ?? 0}.
                        </span>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsImportOpen(false)}
                  >
                    Tutup
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isPending ||
                      !rawCsv.trim() ||
                      parsedImport.records.length === 0 ||
                      missingRequiredMappings.length > 0
                    }
                  >
                    {isPending
                      ? "Mengimpor..."
                      : "Import ke Manajemen Pengguna"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="h-10 rounded-xl border-0 bg-surface-container-lowest px-3 text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            onClick={() => startRefreshTransition(() => router.refresh())}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("size-4", isRefreshing && "animate-spin")}
            />
          </Button>

          <SecurityUserCreateDialog
            roleOptions={roleOptions}
            managerOptions={managerOptions}
            sections={sections}
            departments={departments}
            positions={positions}
            sites={sites}
          />
        </>
      }
    >
      <AdminMetricGrid
        items={[
          {
            label: "Total User",
            value: users.length.toLocaleString(),
            meta: "Semua akun yang terdaftar di HERO.",
          },
          {
            label: "Active Access",
            value: activeUsersCount.toLocaleString(),
            meta: "Akun dengan akses aktif dan siap dipakai.",
          },
          {
            label: `Bergabung ${currentYear}`,
            value: newHiresCount.toLocaleString(),
            meta: "Karyawan baru pada tahun berjalan.",
          },
          {
            label: "Cakupan Visible",
            value: `${visiblePercentage}%`,
            meta: "Proporsi data yang masih tampil setelah filter diterapkan.",
          },
        ]}
      />

      {hasActiveFilters ? (
        <div className="surface-muted-card rounded-[1rem] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchQuery.trim() ? (
              <FilterChip onRemove={() => setSearchQuery("")}>
                Cari: {searchQuery.trim()}
              </FilterChip>
            ) : null}
            {selectedDepartments.map((department) => (
              <FilterChip
                key={department}
                onRemove={() =>
                  setSelectedDepartments((current) =>
                    current.filter((item) => item !== department),
                  )
                }
              >
                Departemen: {department}
              </FilterChip>
            ))}
            {selectedRoles.map((role) => (
              <FilterChip
                key={role}
                onRemove={() =>
                  setSelectedRoles((current) =>
                    current.filter((item) => item !== role),
                  )
                }
              >
                Peran: {role}
              </FilterChip>
            ))}
            {selectedStatusTypes.map((statusType) => (
              <FilterChip
                key={statusType}
                onRemove={() =>
                  setSelectedStatusTypes((current) =>
                    current.filter((item) => item !== statusType),
                  )
                }
              >
                Status: {statusType}
              </FilterChip>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 rounded-full px-3 text-xs text-muted-foreground"
            >
              Reset semua
            </Button>
          </div>
        </div>
      ) : null}

      <div className="surface-module-card rounded-[1.2rem] p-4 sm:p-5">
              <SecurityUserBulkActions
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        roleOptions={roleOptions}
      />

      <MinimalTableShell
          title="Direktori Pengguna"
          description="Fokus utama halaman ini: cari orang, sempitkan departemen/peran/status, lalu buka aksi per baris."
          label="users"
          fileName="security-users"
          searchEnabled={false}
          filters={
            <>
              <div className="relative w-full sm:w-[220px] sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-9 rounded-xl border-0 bg-surface-container-lowest pl-9 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
                />
              </div>
              <MultiSelectDropdown
                options={departmentFilterOptions}
                selected={selectedDepartments}
                onChange={setSelectedDepartments}
                placeholder="Semua departemen"
                label="Departemen"
              />
              <MultiSelectDropdown
                options={roleNames}
                selected={selectedRoles}
                onChange={setSelectedRoles}
                placeholder="Semua peran"
                label="Peran"
              />
              <MultiSelectDropdown
                options={statusTypeOptions}
                selected={selectedStatusTypes}
                onChange={setSelectedStatusTypes}
                placeholder="All status types"
                label="Tipe status"
              />
              <MultiSelectDropdown
                options={siteOptions}
                selected={selectedSites}
                onChange={setSelectedSites}
                placeholder="Semua site"
                label="Site"
              />
            </>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={exportVisibleUsers}
              className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]"
            >
              Export Terfilter
            </Button>
          }
          dateFilter={false}
        >
          <div className="overflow-x-auto rounded-[1rem] bg-surface-container-low p-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={(checked) => {
                        setSelectedIds(checked ? filteredUsers.map((u: any) => u.id) : []);
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[320px]">Name</TableHead>
                  <TableHead>SN</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Sub Section</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Lokasi Site</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Tipe Status</TableHead>
                  <TableHead className="w-[120px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-white/55">
                      <TableCell className="py-3.5">
                        <Checkbox
                          checked={selectedIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds(checked 
                              ? [...selectedIds, user.id]
                              : selectedIds.filter((id: number) => id !== user.id)
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-11 rounded-xl shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
                            <AvatarImage
                              src={user.profileImage || undefined}
                              alt={user.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {user.name}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="font-mono text-sm text-foreground/80">
                          {user.employeeSn}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="secondary"
                          className="rounded-full border-0 bg-surface-container-lowest px-3 py-1 text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
                        >
                          {user.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-foreground/85">
                        {user.section || "â€”"}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-foreground/85">
                        {user.employeeStatusType || "â€”"}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-foreground/85">
                        {user.accessRole}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-foreground/85">
                        {user.workLocation || "â€”"}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-foreground/85">
                        {extractSiteName(user.workLocation)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className="rounded-full border-0 bg-surface-container-lowest px-3 py-1 text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
                        >
                          {user.employeeStatusType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <SecurityUserRowActions
                          user={user}
                          managerOptions={managerOptions}
                          roleOptions={roleOptions}
                          sections={sections}
                          departments={departments}
                          positions={positions}
                          sites={sites}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada pengguna yang cocok dengan filter saat ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </MinimalTableShell>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users2 className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Total scope
              </p>
              <p className="text-sm font-medium text-foreground">
                {users.length.toLocaleString()} akun terdaftar
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-tertiary-container text-on-tertiary-container">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Access health
              </p>
              <p className="text-sm font-medium text-foreground">
                {activeUsersCount.toLocaleString()} akses aktif
              </p>
            </div>
          </div>
        </div>
        <div className="surface-muted-card rounded-[1rem] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              {visiblePercentage >= 100 ? (
                <BriefcaseBusiness className="size-4" />
              ) : (
                <MapPin className="size-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Current view
              </p>
              <p className="text-sm font-medium text-foreground">
                {filteredUsers.length.toLocaleString()} user siap ditindak
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}



