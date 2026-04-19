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
  ChevronLeft,
  ChevronRight,
  Cloud,
  Filter,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  Users2,
  X,
} from "lucide-react";
import {
  importSecurityUsersAction,
  type ImportUsersActionState,
} from "@/app/dashboard/admin-actions";
import type { SecurityUserRecord } from "@/lib/hero-admin";
import {
  autoMapHeaders,
  parseCsv,
  USER_IMPORT_FIELDS,
  type UserImportMapping,
} from "@/lib/security-user-import";
import { SecurityUserCreateDialog } from "@/components/security-user-create-dialog";
import { SecurityUserRowActions } from "@/components/security-user-row-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  exportRowsToFile,
} from "@/components/ui/minimal-table-shell";
import { cn } from "@/lib/utils";

const ALL_FILTER = "all";
const UNMAPPED_VALUE = "__unmapped__";
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
    (field) => `${field.label}: ${mapping[field.key] || "belum dipilih"}`,
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

// Multi-select dropdown component
interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  label: string;
  icon?: React.ReactNode;
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  label,
  icon,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearSelection = () => {
    onChange([]);
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[160px] justify-between rounded-lg border-border bg-muted/50 px-3 text-sm font-normal text-muted-foreground hover:bg-background"
        >
          <span className="flex items-center gap-2 truncate">
            {icon}
            <span className="truncate">{displayText}</span>
          </span>
          <Filter className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  onSelect={() => toggleOption(option)}
                  className="flex items-center gap-2 px-2 py-1.5"
                >
                  <Checkbox
                    checked={selected.includes(option)}
                    className="border-[#cbd5e1] data-[state=checked]:border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                  />
                  <span className="flex-1 truncate text-sm">{option}</span>
                  {selected.includes(option) && (
                    <Check className="size-4 text-[#3b82f6]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-t border-[#e2e8f0] p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 w-full justify-center text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 size-3" />
                Clear selection
              </Button>
            </div>
          )}
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
}: {
  users: SecurityUserRecord[];
  roleOptions: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; code: string; name: string; departmentId: number | null }>;
  departments: Array<{ id: number; code: string; name: string }>;
  positions: Array<{ id: number; code: string; name: string; siteLocation: string; level: number; departmentId: number | null }>;
}) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatusTypes, setSelectedStatusTypes] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [mapping, setMapping] = useState<UserImportMapping>({});
  const [actionState, formAction, isPending] = useActionState(
    importSecurityUsersAction,
    INITIAL_IMPORT_STATE,
  );

  const parsedImport = useMemo(() => parseCsv(rawCsv), [rawCsv]);
  const departmentFilterOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.department)),
    [users],
  );
  const roleNames = useMemo(
    () => getUniqueOptions(roleOptions.map((item) => item.name)),
    [roleOptions],
  );
  const managerOptions = useMemo(
    () => users.map((user) => ({ id: user.id, name: user.name })),
    [users],
  );

  const statusTypeOptions = useMemo(
    () => getUniqueOptions(users.map((user) => user.employeeStatusType)),
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

  const handleSearch = () => {
    setSearchQuery(searchInput.trim().toLowerCase());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery;

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
      return matchesKeyword && matchesDepartment && matchesRole && matchesStatusType;
    });
  }, [searchQuery, selectedDepartments, selectedRoles, selectedStatusTypes, users]);

  const currentYear = new Date().getFullYear();
  const activeUsersCount = users.filter(
    (user) => user.status === "active",
  ).length;
  const newHiresCount = users.filter(
    (user) => user.joinYear === currentYear,
  ).length;
  const visiblePercentage =
    users.length > 0
      ? Math.round((filteredUsers.length / users.length) * 100 * 10) / 10
      : 0;

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedDepartments([]);
    setSelectedRoles([]);
    setSelectedStatusTypes([]);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedDepartments.length > 0 ||
    selectedRoles.length > 0 ||
    selectedStatusTypes.length > 0;

  const missingRequiredMappings = USER_IMPORT_FIELDS.filter(
    (field) => field.required && !mapping[field.key],
  );

  const exportVisibleUsers = () => {
    exportRowsToFile({
      columns: [
        "Nama",
        "SN",
        "Departement",
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
  };

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Manajemen Pengguna
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kelola akses karyawan, peran, dan status pengguna HERO.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-[#e2e8f0] bg-white px-4 text-sm font-medium text-[#475569] hover:bg-[#F5F7F9] hover:text-[#1e293b]"
                >
                  <Upload className="mr-2 size-4" />
                  Import Pengguna
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Import Daftar Pengguna</DialogTitle>
                  <DialogDescription>
                    Unggah atau tempel daftar karyawan, lalu cocokkan kolom sebelum data disimpan.
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
                      <div className="space-y-2">
                        <p className="text-sm font-medium">File daftar pengguna</p>
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
                        <p className="text-sm font-medium">Tempel daftar manual</p>
                        <Textarea
                          value={rawCsv}
                          onChange={(event) =>
                            setRawCsv(event.target.value)
                          }
                          className="min-h-56 text-xs"
                          placeholder="Tempel data pengguna di sini bila tidak mengunggah file..."
                        />
                      </div>

                      <div className="rounded-xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">Pratinjau data</p>
                            <p className="text-xs text-muted-foreground">
                              {parsedImport.records.length} baris terbaca,{" "}
                              {parsedImport.headers.length} kolom terdeteksi.
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {missingRequiredMappings.length === 0
                              ? "Siap import"
                              : `${missingRequiredMappings.length} kolom wajib`}
                          </Badge>
                        </div>

                        <div className="mt-4 overflow-x-auto rounded-xl border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {parsedImport.headers.length > 0 ? (
                                  parsedImport.headers.map((header) => (
                                    <TableHead key={header}>
                                      {header}
                                    </TableHead>
                                  ))
                                ) : (
                                  <TableHead>Belum ada kolom</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedImport.records.slice(0, 4).length > 0 ? (
                                parsedImport.records
                                  .slice(0, 4)
                                  .map((record, index) => (
                                    <TableRow
                                      key={`${index}-${record[parsedImport.headers[0]] ?? "row"}`}
                                    >
                                      {parsedImport.headers.map((header) => (
                                        <TableCell
                                          key={`${index}-${header}`}
                                          className="text-xs"
                                        >
                                          {record[header] || "—"}
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
                      <div className="rounded-xl border p-4">
                        <p className="text-sm font-medium">Cocokkan Kolom</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Kolom wajib harus dipilih sebelum import dijalankan.
                        </p>
                        <div className="mt-4 grid gap-3">
                          {USER_IMPORT_FIELDS.map((field) => (
                            <div key={field.key} className="grid gap-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {field.label}
                                </p>
                                {field.required ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full"
                                  >
                                    Wajib
                                  </Badge>
                                ) : null}
                              </div>
                              <Command>
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
                                <CommandList className="max-h-[100px]">
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

                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-sm font-medium text-foreground">
                          Ringkasan Kolom
                        </p>
                        <p className="mt-2 whitespace-pre-line font-mono text-xs text-muted-foreground">
                          {toHeaderPreview(mapping)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {actionState.status !== "idle" ? (
                    <Alert
                      className={
                        actionState.status === "error"
                          ? "border-red-200 text-red-700"
                          : "border-emerald-200 text-emerald-700"
                      }
                    >
                      <AlertDescription>
                        {actionState.message}
                        {actionState.status === "success" ? (
                          <span>
                            {" "}
                            Baru: {actionState.importedCount ?? 0},
                            diperbarui:{" "}
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
              className="h-10 rounded-lg bg-surface-container-low text-sm font-medium text-muted-foreground hover:bg-surface-container-highest hover:text-foreground"
              onClick={() => startRefreshTransition(() => router.refresh())}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>

            <SecurityUserCreateDialog
              roleOptions={roleOptions}
              managerOptions={managerOptions}
              sections={sections}
              departments={departments}
              positions={positions}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 flex flex-wrap gap-2">
          {/* Total User Card */}
          <Card className="relative min-w-[170px] overflow-hidden bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total User
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {users.length.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Users2 className="size-5 text-blue-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="font-medium text-emerald-500">+12%</span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Access Card */}
          <Card className="relative min-w-[170px] overflow-hidden bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Access
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {activeUsersCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                  <ShieldCheck className="size-5 text-amber-500" />
                </div>
              </div>
              <div className="mt-3">
                <Badge className="rounded-md border-0 bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Critical
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Join 2026 Card */}
          <Card className="relative min-w-[170px] overflow-hidden bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bergabung {currentYear}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {newHiresCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10">
                  <BriefcaseBusiness className="size-5 text-violet-500" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs text-muted-foreground">Karyawan Baru</span>
              </div>
            </CardContent>
          </Card>

          {/* Visible Result Card */}
          <Card className="relative min-w-[170px] overflow-hidden bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
            <div className="absolute left-0 top-0 h-full w-1 bg-foreground" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cakupan Terlihat
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {visiblePercentage}%
                    </span>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <MapPin className="size-5 text-foreground" />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-500"
                    style={{ width: `${visiblePercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar with Search */}
        <Card className="mb-6 bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left side: Search and Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input with Button */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                    <Input
                      placeholder="Cari pengguna..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-9 w-[200px] rounded-lg border-border bg-muted/50 pl-9 text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="h-9 rounded-lg bg-[#3b82f6] px-4 text-sm font-medium text-white hover:bg-[#2563eb]"
                  >
                    Cari
                  </Button>
                </div>

                {/* Multi-select Department Filter */}
                <MultiSelectDropdown
                  options={departmentFilterOptions}
                  selected={selectedDepartments}
                  onChange={setSelectedDepartments}
                  placeholder="Semua departemen"
                  label="Departemen"
                />

                {/* Multi-select Role Filter */}
                <MultiSelectDropdown
                  options={roleNames}
                  selected={selectedRoles}
                  onChange={setSelectedRoles}
                  placeholder="Semua peran"
                  label="Peran"
                />

                {/* Multi-select Status Type Filter */}
                <MultiSelectDropdown
                  options={statusTypeOptions}
                  selected={selectedStatusTypes}
                  onChange={setSelectedStatusTypes}
                  placeholder="Semua tipe status"
                  label="Tipe Status"
                />

                {/* Reset button */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="mr-1 size-3" />
                    Reset
                  </Button>
                )}
              </div>

              {/* Right side: Pagination info */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportVisibleUsers()}
                  className="h-9 rounded-lg px-3 text-[13px] font-medium normal-case tracking-normal"
                >
                  Excel
                </Button>
                <span className="text-sm text-muted-foreground">
                  Menampilkan 1-
                  {Math.min(filteredUsers.length, 10)} dari {filteredUsers.length}{" "}
                  data
                </span>
              </div>
            </div>

            {/* Active filter badges */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[1rem] bg-surface-container-low p-3">
                {searchQuery && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-500"
                  >
                    Cari: {searchQuery}
                    <button
                      onClick={() => {
                        setSearchInput("");
                        setSearchQuery("");
                      }}
                      className="ml-1 rounded-full hover:bg-[#dbeafe]"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {selectedDepartments.map((dept) => (
                  <Badge
                    key={dept}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500"
                  >
                    Departemen: {dept}
                    <button
                      onClick={() =>
                        setSelectedDepartments((prev) =>
                          prev.filter((d) => d !== dept),
                        )
                      }
                      className="ml-1 rounded-full hover:bg-[#dcfce7]"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {selectedRoles.map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-500"
                  >
                    Peran: {role}
                    <button
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.filter((r) => r !== role),
                        )
                      }
                      className="ml-1 rounded-full hover:bg-[#f3e8ff]"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {selectedStatusTypes.map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                  >
                    Status: {type}
                    <button
                      onClick={() =>
                        setSelectedStatusTypes((prev) =>
                          prev.filter((t) => t !== type),
                        )
                      }
                      className="ml-1 rounded-full hover:bg-[#ffedd5]"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Bar */}
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg bg-surface-container-low"
            disabled
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 w-8 rounded-lg bg-[#1e3a5f] px-0 text-xs"
          >
            1
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-lg bg-surface-container-low px-0 text-xs"
          >
            2
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg bg-surface-container-low"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* User Table */}
        <Card className="overflow-hidden bg-surface-container-lowest shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[280px] py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nama
                  </TableHead>
                  <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SN
                  </TableHead>
                  <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Departement
                  </TableHead>
                  <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Peran
                  </TableHead>
                  <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lokasi Site
                  </TableHead>
                  <TableHead className="py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipe Status
                  </TableHead>
                  <TableHead className="py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tindakan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.slice(0, 10).map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b-border transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="size-11 rounded-xl border border-border">
                            <AvatarImage
                              src={user.profileImage || undefined}
                              alt={user.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-xl bg-blue-500/10 text-sm font-semibold text-blue-500">
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">
                              {user.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-mono text-sm font-medium text-foreground/80">
                          {user.employeeSn}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="secondary"
                          className="rounded-md border-0 bg-muted text-muted-foreground"
                        >
                          {user.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-foreground/80">
                          {user.accessRole}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-sm text-foreground/80">
                          {user.workLocation || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className="rounded-md border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {user.employeeStatusType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <SecurityUserRowActions
                          user={user}
                          managerOptions={managerOptions}
                          roleOptions={roleOptions}
                          positions={positions}
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
                      No users found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-4 rounded-[1.2rem] bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="font-medium text-emerald-500">
                CLOUD SYNC ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="size-3 text-muted-foreground" />
              <span>ENCRYPTION LEVEL: AES-256</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">
            © 2024 HERO Platform - Industrial Intelligence Console v2.4.0
          </p>
        </div>
    </div>
  );
}
