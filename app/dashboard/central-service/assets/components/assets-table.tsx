"use client";

import { Fragment, useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  MoreHorizontal,
  Package,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  History,
  ChevronDown,
} from "lucide-react";
import { AssetFormDialog } from "./asset-form-dialog";
import { deleteAsset, updateAssetCondition } from "../actions";
import { toast } from "sonner";
import { format, differenceInMonths, isAfter, isBefore, addMonths, startOfDay } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AssetAttachment {
  id?: number;
  fileName: string;
  fileUrl: string;
  previewUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface Asset {
  id: number;
  workSection: string;
  section: string;
  location: string;
  description: string;
  assetNumber: string | null;
  serialNumber: string | null;
  purchaseDate: Date | string | null;
  deliveryToSiteDate: Date | string | null;
  lastCalibrationDate: Date | string | null;
  calibrationCycleMonths: number | null;
  calibrationDueDate: Date | string | null;
  certificateDate: Date | string | null;
  certificateCycleMonths: number | null;
  certificateDueDate: Date | string | null;
  condition: string;
  qty: number;
  remarks: string | null;
  attachments: AssetAttachment[];
  histories?: AssetHistory[];
}

interface AssetHistory {
  id: number;
  action: string;
  fieldName: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changeRemark: string | null;
  createdAt: Date | string;
}

interface AssetsTableProps {
  data: Asset[];
  masterSections: Array<{ name: string }>;
}

function conditionBadge(condition: string) {
  const c = condition?.toUpperCase();
  if (c === "ACTIVE")
    return (
      <Badge className="border-0 bg-blue-700 text-white shadow-sm ring-1 ring-blue-950/20 font-semibold">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        ACTIVE
      </Badge>
    );
  if (c === "REPAIR")
    return (
      <Badge className="border-0 bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-950/20 font-semibold">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        REPAIR
      </Badge>
    );
  if (c === "BAD")
    return (
      <Badge className="border-0 bg-yellow-300 text-slate-950 shadow-sm ring-1 ring-yellow-700/50 font-semibold">
        <AlertTriangle className="mr-1 h-3 w-3" />
        BAD
      </Badge>
    );
  if (c === "SCRAP")
    return (
      <Badge className="border-0 bg-red-700 text-white shadow-sm ring-1 ring-red-950/20 font-semibold">
        <XCircle className="mr-1 h-3 w-3" />
        SCRAP
      </Badge>
    );
  return (
    <Badge className="border-0 bg-slate-700 text-white shadow-sm ring-1 ring-slate-950/20">
      <HelpCircle className="mr-1 h-3 w-3" />
      {condition || "-"}
    </Badge>
  );
}

/**
 * Returns a colored cell for a due date:
 * - Red if already past due
 * - Yellow/amber if within 1 month
 * - Normal otherwise
 */
function dueDateCell(dueDate: Date | string | null | undefined) {
  if (!dueDate) return <span className="text-xs text-muted-foreground">-</span>;
  const d = startOfDay(new Date(dueDate));
  if (isNaN(d.getTime())) return <span className="text-xs text-muted-foreground">-</span>;
  const today = startOfDay(new Date());
  const oneMonthFromNow = addMonths(today, 1);

  if (isBefore(d, today)) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold bg-red-700 text-white ring-1 ring-red-950/20">
        <XCircle className="h-3 w-3 shrink-0" />
        {format(d, "dd/MM/yyyy")}
      </span>
    );
  }
  if (!isAfter(d, oneMonthFromNow)) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold bg-yellow-300 text-slate-950 ring-1 ring-yellow-700/50">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {format(d, "dd/MM/yyyy")}
      </span>
    );
  }
  // Normal
  return <span className="text-xs">{format(d, "dd/MM/yyyy")}</span>;
}

function dueState(dueDate: Date | string | null | undefined) {
  if (!dueDate) return "none";
  const d = startOfDay(new Date(dueDate));
  if (isNaN(d.getTime())) return "none";
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (!isAfter(d, addMonths(today, 1))) return "near";
  return "ok";
}

function hasDueAttention(asset: Asset, type: "calibration" | "certificate" | "any" = "any") {
  const calibration = dueState(asset.calibrationDueDate);
  const certificate = dueState(asset.certificateDueDate);
  const attention = (state: string) => state === "overdue" || state === "near";

  if (type === "calibration") return attention(calibration);
  if (type === "certificate") return attention(certificate);
  return attention(calibration) || attention(certificate);
}

function dueFilterValue(asset: Asset) {
  const calibration = dueState(asset.calibrationDueDate);
  const certificate = dueState(asset.certificateDueDate);

  return [
    hasDueAttention(asset) ? "attention" : "",
    calibration === "overdue" || certificate === "overdue" ? "overdue" : "",
    calibration === "near" || certificate === "near" ? "near" : "",
    hasDueAttention(asset, "calibration") ? "calibration" : "",
    hasDueAttention(asset, "certificate") ? "certificate" : "",
  ].filter(Boolean);
}

function dueSortValue(asset: Asset) {
  const dates = [asset.calibrationDueDate, asset.certificateDueDate]
    .map((value) => {
      const date = value ? startOfDay(new Date(value)) : null;
      if (!date || isNaN(date.getTime())) return null;
      const state = dueState(date);
      const priority = state === "overdue" ? 0 : state === "near" ? 1 : 2;
      return priority * 10_000_000 + Math.floor(date.getTime() / 86_400_000);
    })
    .filter((value): value is number => value !== null);

  return dates.length > 0 ? Math.min(...dates) : 30_000_000;
}

function calcAge(purchaseDate: Date | string | null) {
  if (!purchaseDate) return "-";
  const months = differenceInMonths(new Date(), new Date(purchaseDate));
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} bulan`;
  if (rem === 0) return `${years} tahun`;
  return `${years} tahun ${rem} bln`;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd/MM/yyyy");
  } catch {
    return "-";
  }
}

function fmtHistoryValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function historyActionLabel(action: string) {
  if (action === "create") return "Dibuat";
  if (action === "delete") return "Dihapus";
  return "Diubah";
}

function attachmentUrl(attachment: AssetAttachment) {
  const proxied = uploadProxyUrl(attachment.fileUrl);
  return proxied || attachment.previewUrl || attachment.fileUrl;
}

function uploadProxyUrl(url: string | null | undefined) {
  if (!url) return "";
  const cleanPath = url.trim().split("?")[0];
  if (cleanPath.startsWith("/api/uploads/")) return cleanPath;
  const parts = cleanPath.split("/").filter(Boolean);
  const prefixIndex = parts.findIndex((part) =>
    ["upload", "attendance-photos", "curhat", "profile-photos"].includes(decodeURIComponent(part))
  );
  if (prefixIndex >= 0) {
    return `/api/uploads/${parts.slice(prefixIndex).map((part) => encodeURIComponent(decodeURIComponent(part))).join("/")}`;
  }
  return "";
}

function isPdfAttachment(attachment: AssetAttachment) {
  return attachment.mimeType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
}

function isImageAttachment(attachment: AssetAttachment) {
  const name = attachment.fileName.toLowerCase();
  return Boolean(
    attachment.mimeType?.startsWith("image/") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif")
  );
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function AssetAttachmentsDialog({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const attachments = asset?.attachments ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = attachments[selectedIndex] ?? attachments[0] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [asset?.id, attachments.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Attachment Aset</DialogTitle>
          <DialogDescription>
            {asset ? `${asset.description} • ${attachments.length} file` : "Daftar file lampiran aset"}
          </DialogDescription>
        </DialogHeader>

        {attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Belum ada attachment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="max-h-[68vh] space-y-2 overflow-y-auto rounded-lg border bg-background p-2">
              {attachments.map((attachment, index) => {
                const active = selected === attachment;
                const Icon = isPdfAttachment(attachment) ? FileText : isImageAttachment(attachment) ? ImageIcon : Paperclip;
                return (
                  <button
                    key={`${attachment.fileUrl}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                      active ? "bg-slate-900 text-white" : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{attachment.fileName}</span>
                      <span className={`block text-xs ${active ? "text-slate-200" : "text-muted-foreground"}`}>
                        {attachment.mimeType || "file"} • {formatFileSize(attachment.fileSize)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-[420px] overflow-hidden rounded-lg border bg-muted/20">
              {selected && isImageAttachment(selected) ? (
                <img
                  src={attachmentUrl(selected)}
                  alt={selected.fileName}
                  className="h-full max-h-[68vh] w-full object-contain"
                />
              ) : selected && isPdfAttachment(selected) ? (
                <iframe title={selected.fileName} src={attachmentUrl(selected)} className="h-[68vh] w-full bg-white" />
              ) : selected ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">{selected.fileName}</p>
                  <Button asChild variant="outline" size="sm">
                    <a href={attachmentUrl(selected)} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Buka File
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function exportToCSV(data: Asset[]) {
  const headers = [
    "No",
    "Section",
    "Kategori Alat",
    "Lokasi Site",
    "Description",
    "Nomor Aset",
    "SN",
    "Tanggal Pembelian",
    "Delivery To Site",
    "Condition",
    "Umur Aset",
    "Qty",
    "Remarks",
  ];
  const rows = data.map((a, i) => [
    i + 1,
    a.workSection,
    a.section,
    a.location,
    a.description,
    a.assetNumber ?? "",
    a.serialNumber ?? "",
    fmtDate(a.purchaseDate),
    fmtDate(a.deliveryToSiteDate),
    a.condition,
    calcAge(a.purchaseDate),
    a.qty,
    a.remarks ?? "",
  ]);
  const csv =
    headers.join(",") +
    "\n" +
    rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `assets_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SECTIONS = [
  "RAD",
  "MANUAL TORQUE",
  "MASTER GAUGE",
  "JACK 80 TON",
  "JACK HYDRAULIC",
  "IMPACT WRENCH",
  "BEAD BREAKER + HYD PUMP",
  "RADIO",
];

const CONDITIONS = ["ACTIVE", "REPAIR", "BAD", "SCRAP"];
const DEFAULT_CONDITION_FILTERS = CONDITIONS.filter((condition) => condition !== "SCRAP");

const DUE_FILTERS = [
  { value: "__all__", label: "Semua Due" },
  { value: "attention", label: "Butuh Perhatian" },
  { value: "overdue", label: "Sudah Due" },
  { value: "near", label: "Mendekati Due" },
  { value: "calibration", label: "Calibration Due" },
  { value: "certificate", label: "Certificate Due" },
];

function assetSearchText(asset: Asset) {
  return [
    asset.workSection,
    asset.section,
    asset.location,
    asset.description,
    asset.assetNumber,
    asset.serialNumber,
    asset.condition,
    asset.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function AssetsTable({ data: initialData, masterSections }: AssetsTableProps) {
  const [data, setData] = useState(initialData);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "duePriority", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "condition", value: DEFAULT_CONDITION_FILTERS },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [attachmentAsset, setAttachmentAsset] = useState<Asset | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [updatingConditionId, setUpdatingConditionId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locationOptions = useMemo(
    () =>
      Array.from(new Set(data.map((asset) => asset.location?.trim()).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [data]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([...SECTIONS, ...(data.map((asset) => asset.section?.trim()).filter(Boolean) as string[])])
      ).sort((a, b) => a.localeCompare(b)),
    [data]
  );

  const workSectionOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...masterSections.map((section) => section.name?.trim()).filter(Boolean),
          ...(data.map((asset) => asset.workSection?.trim()).filter(Boolean) as string[]),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [data, masterSections]
  );

  const handleDelete = async () => {
    if (deleteId === null) return;
    const res = await deleteAsset(deleteId);
    if (res.success) {
      toast.success("Asset berhasil dihapus");
      setData((prev) => prev.filter((a) => a.id !== deleteId));
    } else {
      toast.error(res.error || "Gagal menghapus asset");
    }
    setDeleteId(null);
  };

  const handleImportCSV = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      toast.info("Fitur import CSV akan segera tersedia");
      e.target.value = "";
    },
    []
  );

  const handleConditionChange = useCallback(async (asset: Asset, condition: string) => {
    if (asset.condition === condition) return;
    setUpdatingConditionId(asset.id);
    const res = await updateAssetCondition(asset.id, condition);
    if (res.success && res.data) {
      toast.success("Kondisi asset diupdate");
      setData((prev) =>
        prev.map((item) =>
          item.id === asset.id
            ? {
                ...item,
                condition: res.data.condition,
                histories: [...(res.data.histories ?? []), ...(item.histories ?? [])],
              }
            : item
        )
      );
    } else {
      toast.error(res.error || "Gagal mengupdate kondisi asset");
    }
    setUpdatingConditionId(null);
  }, []);

  const selectedConditionFilters = (columnFilters.find((filter) => filter.id === "condition")?.value ??
    DEFAULT_CONDITION_FILTERS) as string[];

  const setConditionFilters = useCallback((next: string[]) => {
    setColumnFilters((filters) => {
      const others = filters.filter((filter) => filter.id !== "condition");
      return next.length === CONDITIONS.length ? others : [...others, { id: "condition", value: next }];
    });
  }, []);

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        id: "duePriority",
        accessorFn: dueSortValue,
      },
      {
        id: "dueStatus",
        accessorFn: dueFilterValue,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || (row.getValue(columnId) as string[]).includes(String(filterValue)),
      },
      {
        id: "no",
        header: "No",
        size: 50,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.index + 1}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "workSection",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Section <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 170,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || String(row.getValue(columnId) ?? "") === String(filterValue),
        cell: ({ getValue }) => (
          <span className="text-xs font-semibold">{String(getValue() || "-")}</span>
        ),
      },
      {
        accessorKey: "section",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Kategori Alat <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 140,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || String(row.getValue(columnId) ?? "") === String(filterValue),
        cell: ({ getValue }) => (
          <span className="font-medium text-xs">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "location",
        header: "Lokasi",
        size: 110,
        filterFn: (row, columnId, filterValue) =>
          !filterValue || String(row.getValue(columnId) ?? "") === String(filterValue),
        cell: ({ getValue }) => (
          <span className="text-xs">{String(getValue() ?? "-")}</span>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Description <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 200,
        cell: ({ getValue }) => (
          <span className="text-xs font-medium">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "assetNumber",
        header: "No. Aset",
        size: 110,
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? (
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{String(v)}</code>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          );
        },
      },
      {
        accessorKey: "serialNumber",
        header: "SN",
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{String(getValue() ?? "-")}</span>
        ),
      },
      {
        accessorKey: "purchaseDate",
        header: "Tgl Pembelian",
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-xs">{fmtDate(getValue() as Date)}</span>
        ),
      },
      {
        id: "umurAset",
        header: "Umur Aset",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {calcAge(row.original.purchaseDate)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "deliveryToSiteDate",
        header: "Delivery Site",
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-xs">{fmtDate(getValue() as Date)}</span>
        ),
      },
      {
        accessorKey: "condition",
        header: "Kondisi",
        size: 130,
        filterFn: (row, columnId, filterValue) => {
          const values = Array.isArray(filterValue) ? filterValue : [];
          return values.length === 0 || values.includes(String(row.getValue(columnId) ?? "").toUpperCase());
        },
        cell: ({ row }) => (
          <Select
            value={row.original.condition}
            onValueChange={(value) => handleConditionChange(row.original, value)}
            disabled={updatingConditionId === row.original.id}
          >
            <SelectTrigger className="h-8 w-[118px] border-0 bg-transparent px-0 shadow-none focus:ring-0">
              <span>{conditionBadge(row.original.condition)}</span>
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "qty",
        header: "Qty",
        size: 60,
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-center block">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "remarks",
        header: "Remarks",
        size: 160,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {String(getValue() ?? "-")}
          </span>
        ),
      },
      {
        id: "history",
        header: "History",
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const count = row.original.histories?.length ?? 0;
          const expanded = expandedHistoryId === row.original.id;
          return (
            <Button
              type="button"
              variant={count > 0 ? "outline" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setExpandedHistoryId(expanded ? null : row.original.id)}
            >
              <History className="h-3.5 w-3.5" />
              {count}
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </Button>
          );
        },
      },
      {
        id: "attachments",
        header: "Attachment",
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const count = row.original.attachments?.length ?? 0;
          return (
            <Button
              type="button"
              variant={count > 0 ? "outline" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setAttachmentAsset(row.original)}
            >
              <Paperclip className="h-3.5 w-3.5" />
              {count} file
            </Button>
          );
        },
      },
      {
        id: "actions",
        header: "Aksi",
        size: 60,
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedAsset(row.original);
                  setIsDialogOpen(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteId(row.original.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [expandedHistoryId, handleConditionChange, updatingConditionId]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) =>
      assetSearchText(row.original).includes(String(filterValue ?? "").toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 }, columnVisibility: { duePriority: false, dueStatus: false } },
  });

  const filteredAssets = table.getFilteredRowModel().rows.map((row) => row.original);
  const scoreCards = {
    total: filteredAssets.length,
    active: filteredAssets.filter((asset) => ["ACTIVE", "REPAIR"].includes(asset.condition?.toUpperCase())).length,
    bad: filteredAssets.filter((asset) => asset.condition?.toUpperCase() === "BAD").length,
    scrap: filteredAssets.filter((asset) => asset.condition?.toUpperCase() === "SCRAP").length,
  };

  const { rows } = table.getRowModel();

  return (
    <div className="space-y-4">
      {/* Score Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{scoreCards.total}</p>
            <p className="text-xs text-muted-foreground">Total Aset</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{scoreCards.active}</p>
            <p className="text-xs text-muted-foreground">Active / Good</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{scoreCards.bad}</p>
            <p className="text-xs text-muted-foreground">Bad / Repair</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{scoreCards.scrap}</p>
            <p className="text-xs text-muted-foreground">Scrap</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari aset..."
              className="pl-8 h-9 bg-background"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          <Select
            value={(table.getColumn("workSection")?.getFilterValue() as string) ?? ""}
            onValueChange={(val) =>
              table.getColumn("workSection")?.setFilterValue(val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Semua Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Section</SelectItem>
              {workSectionOptions.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn("section")?.getFilterValue() as string) ?? ""}
            onValueChange={(val) =>
              table.getColumn("section")?.setFilterValue(val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Kategori</SelectItem>
              {categoryOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn("location")?.getFilterValue() as string) ?? ""}
            onValueChange={(val) =>
              table.getColumn("location")?.setFilterValue(val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Semua Lokasi Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Lokasi Site</SelectItem>
              {locationOptions.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 min-w-40 justify-between">
                Kondisi: {selectedConditionFilters.length === CONDITIONS.length ? "Semua" : selectedConditionFilters.join(", ")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {CONDITIONS.map((condition) => (
                <DropdownMenuCheckboxItem
                  key={condition}
                  checked={selectedConditionFilters.includes(condition)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? Array.from(new Set([...selectedConditionFilters, condition]))
                      : selectedConditionFilters.filter((item) => item !== condition);
                    setConditionFilters(next);
                  }}
                  onSelect={(event) => event.preventDefault()}
                >
                  {condition}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={(table.getColumn("dueStatus")?.getFilterValue() as string) ?? ""}
            onValueChange={(val) =>
              table.getColumn("dueStatus")?.setFilterValue(val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Semua Due" />
            </SelectTrigger>
            <SelectContent>
              {DUE_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(data)}
            className="h-9"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={handleImportCSV}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-9"
            disabled={isImporting}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              setSelectedAsset(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="h-10 px-3 text-left align-middle font-medium text-muted-foreground whitespace-nowrap"
                      style={{ width: h.getSize(), minWidth: h.getSize() }}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-muted-foreground"
                  >
                    Tidak ada data aset yang ditemukan
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 align-middle"
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {expandedHistoryId === row.original.id ? (
                      <tr key={`${row.id}-history`} className="border-b bg-muted/20">
                        <td colSpan={row.getVisibleCells().length} className="px-4 py-3">
                          <div className="rounded-md border bg-background">
                            <div className="flex items-center justify-between border-b px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                History Perubahan
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.original.histories?.length ?? 0} log
                              </span>
                            </div>
                            {row.original.histories?.length ? (
                              <div className="max-h-72 divide-y overflow-y-auto">
                                {row.original.histories.map((history) => (
                                  <div key={history.id} className="grid gap-2 px-3 py-2 text-xs sm:grid-cols-[150px_160px_minmax(0,1fr)]">
                                    <div className="text-muted-foreground">{fmtDate(history.createdAt)}</div>
                                    <div className="font-semibold text-slate-700">
                                      {historyActionLabel(history.action)} {history.fieldLabel}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-muted-foreground">{fmtHistoryValue(history.previousValue)}</span>
                                      <span className="px-2 text-muted-foreground">-&gt;</span>
                                      <span className="font-semibold">{fmtHistoryValue(history.newValue)}</span>
                                      {history.changeRemark ? (
                                        <p className="mt-1 text-muted-foreground">Remark: {history.changeRemark}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                Belum ada history perubahan.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Menampilkan{" "}
          <strong>
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}
            –
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </strong>{" "}
          dari <strong>{table.getFilteredRowModel().rows.length}</strong> aset
        </span>
        <div className="flex items-center gap-1">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / hal
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs">
            Hal {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      <AssetFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        asset={selectedAsset}
        categories={categoryOptions}
        locations={locationOptions}
        workSections={workSectionOptions}
        onSuccess={(updatedAsset) => {
          if (selectedAsset) {
            setData((prev) =>
              prev.map((a) =>
                a.id === updatedAsset.id
                  ? { ...updatedAsset, histories: [...(updatedAsset.histories ?? []), ...(a.histories ?? [])] }
                  : a
              )
            );
          } else {
            setData((prev) => [updatedAsset, ...prev]);
          }
          setIsDialogOpen(false);
        }}
      />

      <AssetAttachmentsDialog
        open={attachmentAsset !== null}
        onOpenChange={(open) => !open && setAttachmentAsset(null)}
        asset={attachmentAsset}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Aset?</AlertDialogTitle>
            <AlertDialogDescription>
              Data aset ini akan dihapus permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
