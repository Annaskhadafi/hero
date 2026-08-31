"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronRight,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconEdit,
  IconFolder,
  IconArrowUp,
  IconArrowDown,
  IconArrowRight,
  IconSearch,
  IconSparkles,
  IconDashboard,
  IconChecklist,
  IconClockHour4,
  IconDatabase,
  IconUsers,
  IconUser,
  IconShieldHalfFilled,
  IconReport,
  IconChartBar,
  IconActivity,
  IconAlertTriangle,
  IconBook,
  IconTarget,
  IconTrendingUp,
  IconTool,
  IconTools,
  IconAddressBook,
  IconId,
  IconFileWord,
  IconFileText,
  IconSignature,
  IconFileCheck,
  IconGitBranch,
  IconShieldExclamation,
  IconSettings,
  IconBell,
  IconMail,
  IconTruck,
  IconBuilding,
  IconBriefcase,
  IconCalendar,
  IconLock,
  IconLink,
  IconGlobe,
  IconCpu,
  IconAward,
  IconArchive,
  IconCamera,
  IconCash,
  IconCreditCard,
  IconFlame,
  IconHeart,
  IconKey,
  IconNews,
  IconPhone,
  IconPrinter,
  IconStar,
  IconTag,
  IconShoppingCart,
  IconMap2,
  IconListDetails,
  IconHelp,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconShieldLock,
  IconLayoutSidebar,
  IconCheck,
  IconFilter,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// 50+ Visual Icon Registry categorized for easy selection
export const ICON_REGISTRY: Record<
  string,
  { component: React.ComponentType<{ className?: string }>; label: string; category: string }
> = {
  dashboard: { component: IconDashboard, label: "Dashboard", category: "Analytics & Bisnis" },
  "chart-bar": { component: IconChartBar, label: "Chart Bar", category: "Analytics & Bisnis" },
  "trending-up": { component: IconTrendingUp, label: "Trending Up", category: "Analytics & Bisnis" },
  activity: { component: IconActivity, label: "Activity", category: "Analytics & Bisnis" },
  report: { component: IconReport, label: "Laporan", category: "Analytics & Bisnis" },
  target: { component: IconTarget, label: "Target / KPI", category: "Analytics & Bisnis" },
  cash: { component: IconCash, label: "Keuangan / Kas", category: "Analytics & Bisnis" },
  "credit-card": { component: IconCreditCard, label: "Kartu / Pembayaran", category: "Analytics & Bisnis" },

  checklist: { component: IconChecklist, label: "Checklist", category: "Operasional & Kerja" },
  clock: { component: IconClockHour4, label: "Jam / Timesheet", category: "Operasional & Kerja" },
  "list-details": { component: IconListDetails, label: "Daftar Tugas", category: "Operasional & Kerja" },
  wrench: { component: IconTool, label: "Maintenance / Bengkel", category: "Operasional & Kerja" },
  tool: { component: IconTool, label: "Perkakas", category: "Operasional & Kerja" },
  tools: { component: IconTools, label: "Peralatan", category: "Operasional & Kerja" },
  truck: { component: IconTruck, label: "Armada / Truck", category: "Operasional & Kerja" },
  "map-2": { component: IconMap2, label: "Peta / Lokasi", category: "Operasional & Kerja" },
  calendar: { component: IconCalendar, label: "Kalender", category: "Operasional & Kerja" },
  "shopping-cart": { component: IconShoppingCart, label: "Inventory / Toko", category: "Operasional & Kerja" },

  users: { component: IconUsers, label: "Karyawan / Tim", category: "SDM & User" },
  user: { component: IconUser, label: "Profil User", category: "SDM & User" },
  "address-card": { component: IconAddressBook, label: "Buku Alamat / ID", category: "SDM & User" },
  id: { component: IconId, label: "Kartu ID", category: "SDM & User" },
  briefcase: { component: IconBriefcase, label: "Jabatan / Karir", category: "SDM & User" },
  building: { component: IconBuilding, label: "Perusahaan / Site", category: "SDM & User" },
  award: { component: IconAward, label: "Prestasi / Reward", category: "SDM & User" },

  "book-open": { component: IconBook, label: "Buku / LMS", category: "Dokumen & Data" },
  "file-text": { component: IconFileText, label: "Dokumen Teks", category: "Dokumen & Data" },
  "file-word": { component: IconFileWord, label: "Word Doc", category: "Dokumen & Data" },
  "file-signature": { component: IconSignature, label: "Approval / TTD", category: "Dokumen & Data" },
  folder: { component: IconFolder, label: "Folder", category: "Dokumen & Data" },
  database: { component: IconDatabase, label: "Database Induk", category: "Dokumen & Data" },
  archive: { component: IconArchive, label: "Arsip", category: "Dokumen & Data" },
  paperclip: { component: IconNews, label: "Lampiran / Berita", category: "Dokumen & Data" },

  settings: { component: IconSettings, label: "Pengaturan", category: "Sistem & Security" },
  shield: { component: IconShieldHalfFilled, label: "HSE / Keamanan", category: "Sistem & Security" },
  "shield-alert": { component: IconShieldExclamation, label: "Safety Alert", category: "Sistem & Security" },
  "alert-triangle": { component: IconAlertTriangle, label: "Peringatan", category: "Sistem & Security" },
  sparkles: { component: IconSparkles, label: "Hero Genius AI", category: "Sistem & Security" },
  bell: { component: IconBell, label: "Notifikasi", category: "Sistem & Security" },
  mail: { component: IconMail, label: "Email / Surat", category: "Sistem & Security" },
  lock: { component: IconLock, label: "Kunci / Akses", category: "Sistem & Security" },
  key: { component: IconKey, label: "API Key", category: "Sistem & Security" },
  cpu: { component: IconCpu, label: "Sistem / Server", category: "Sistem & Security" },
  globe: { component: IconGlobe, label: "Web Portal", category: "Sistem & Security" },
  link: { component: IconLink, label: "Tautan Eksternal", category: "Sistem & Security" },
  "git-branch": { component: IconGitBranch, label: "Workflow / Cabang", category: "Sistem & Security" },
  search: { component: IconSearch, label: "Pencarian", category: "Sistem & Security" },
  printer: { component: IconPrinter, label: "Cetak / Print", category: "Sistem & Security" },
  phone: { component: IconPhone, label: "Kontak / Telepon", category: "Sistem & Security" },
  camera: { component: IconCamera, label: "Kamera / Media", category: "Sistem & Security" },
  flame: { component: IconFlame, label: "HSE Fire", category: "Sistem & Security" },
  star: { component: IconStar, label: "Favorit", category: "Sistem & Security" },
  tag: { component: IconTag, label: "Tag / Label", category: "Sistem & Security" },
  help: { component: IconHelp, label: "Bantuan / FAQ", category: "Sistem & Security" },
};

const ICON_CATEGORIES = [
  "Semua",
  "Analytics & Bisnis",
  "Operasional & Kerja",
  "SDM & User",
  "Dokumen & Data",
  "Sistem & Security",
] as const;

const MENU_AREAS = ["main", "secondary", "document"] as const;

export type MenuItemData = {
  id: number;
  menuArea: string;
  section: string;
  title: string;
  url: string;
  iconName: string;
  resource: string;
  sortOrder: number;
  isVisible: boolean;
  openInNewTab: boolean;
  itemType: string;
  parentId: number | null;
  groupLabel: string | null;
  isIframe: boolean;
};
export const DESKTOP_MENU_ORDER = [
  "Portal Chitra",
  "Aktivitas Harian",
  "Roster & Timesheet",
  "Approval",
  "Data Induk",
  "Human Capital",
  "ChitraLearning LMS",
  "Attendance",
  "HSE",
  "Central Service",
  "Laporan",
  "Pengaturan",
] as const;

// Helper to group items by section
function groupBySection(items: MenuItemData[]): Map<string, MenuItemData[]> {
  const map = new Map<string, MenuItemData[]>();
  for (const item of items) {
    const list = map.get(item.section) || [];
    list.push(item);
    map.set(item.section, list);
  }
  return map;
}

// Helper to group items by groupLabel within a section
function groupByGroupLabel(items: MenuItemData[]): Map<string | null, MenuItemData[]> {
  const map = new Map<string | null, MenuItemData[]>();
  for (const item of items) {
    const label = item.groupLabel || null;
    const list = map.get(label) || [];
    list.push(item);
    map.set(label, list);
  }
  return map;
}

/**
 * Visual Icon Selector Dialog
 */
function VisualIconPickerDialog({
  open,
  onOpenChange,
  currentIcon,
  onSelectIcon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const filteredIcons = useMemo(() => {
    return Object.entries(ICON_REGISTRY).filter(([name, info]) => {
      const matchCategory =
        selectedCategory === "Semua" || info.category === selectedCategory;
      const matchSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        info.label.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [search, selectedCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <IconSparkles className="size-4 text-blue-600" />
            Pilih Ikon Menu
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih salah satu dari 50+ ikon Tabler & Lucide untuk mempercantik navigasi sidebar Anda.
          </DialogDescription>

          <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-2 border-t">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Cari nama ikon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors",
                    selectedCategory === cat
                      ? "bg-[#003461] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950">
          {filteredIcons.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada ikon yang sesuai dengan kata kunci "{search}".
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {filteredIcons.map(([name, info]) => {
                const IconComponent = info.component;
                const isSelected = currentIcon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      onSelectIcon(name);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all group",
                      isSelected
                        ? "border-[#003461] bg-blue-50/80 text-[#003461] ring-2 ring-blue-500/20 dark:bg-blue-950 dark:border-blue-500 dark:text-blue-200"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    )}
                  >
                    <div
                      className={cn(
                        "size-9 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110",
                        isSelected
                          ? "bg-[#003461] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-700"
                      )}
                    >
                      <IconComponent className="size-5" />
                    </div>
                    <span className="text-[11px] font-semibold truncate w-full leading-tight">
                      {info.label}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 truncate w-full mt-0.5">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Direct RBAC Role Permissions Dialog
 */
function RolePermissionsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemData | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<
    Array<{
      roleId: number;
      roleName: string;
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }>
  >([]);

  useEffect(() => {
    if (open && item) {
      setLoading(true);
      fetch(`/api/menu/${item.id}/permissions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.roles) {
            setRoles(data.roles);
          }
        })
        .catch(() => toast.error("Gagal memuat hak akses role"))
        .finally(() => setLoading(false));
    }
  }, [open, item]);

  const handleToggle = (roleId: number, field: "canView" | "canEdit" | "canDelete") => {
    setRoles((prev) =>
      prev.map((r) => (r.roleId === roleId ? { ...r, [field]: !r[field] } : r))
    );
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/menu/${item.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: roles }),
      });
      if (res.ok) {
        toast.success(`Hak akses untuk "${item.title}" berhasil disimpan`);
        onOpenChange(false);
      } else {
        toast.error("Gagal menyimpan hak akses");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <IconShieldLock className="size-4 text-emerald-600" />
            Hak Akses Role (RBAC) - {item.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Tentukan Role mana saja yang diizinkan untuk melihat dan mengoperasikan menu ini di sidebar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Memuat data role...</div>
          ) : roles.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Tidak ada role ditemukan.</div>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div
                  key={r.roleId}
                  className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {r.roleName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {r.canView ? "Diizinkan melihat di sidebar" : "Disembunyikan untuk role ini"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <Switch
                        checked={r.canView}
                        onCheckedChange={() => handleToggle(r.roleId, "canView")}
                        disabled={r.roleName === "Super Admin"}
                      />
                      <span>Lihat</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <Checkbox
                        checked={r.canEdit}
                        onCheckedChange={() => handleToggle(r.roleId, "canEdit")}
                        disabled={r.roleName === "Super Admin"}
                      />
                      <span>Edit</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <Checkbox
                        checked={r.canDelete}
                        onCheckedChange={() => handleToggle(r.roleId, "canDelete")}
                        disabled={r.roleName === "Super Admin"}
                      />
                      <span>Hapus</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 dark:bg-slate-900">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#003461] hover:bg-[#002647] text-white"
          >
            {saving ? "Menyimpan..." : "Simpan Hak Akses"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Live Sidebar Interactive Preview Drawer Widget
 */
function LiveSidebarPreview({
  items,
  sections,
}: {
  items: MenuItemData[];
  sections: string[];
}) {
  return (
    <div className="rounded-2xl border bg-slate-900 text-slate-100 p-4 shadow-lg sticky top-6 space-y-4 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Live Preview Sidebar
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-400/30">
          {items.filter((i) => i.isVisible).length} Tampil
        </Badge>
      </div>

      <div className="space-y-4 text-xs">
        {sections.map((section) => {
          const sectionItems = items.filter((i) => i.section === section && i.isVisible);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                {section}
              </p>
              <div className="space-y-1">
                {sectionItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => {
                    const IconComp = ICON_REGISTRY[item.iconName]?.component || IconChecklist;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-slate-800 text-sky-300">
                          <IconComp className="size-3.5" />
                        </div>
                        <span className="truncate flex-1 font-medium text-slate-200">
                          {item.title}
                        </span>
                        {item.groupLabel && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                            {item.groupLabel}
                          </span>
                        )}
                        {item.openInNewTab && (
                          <span className="text-[9px] text-amber-400 font-mono">↗</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortableItem({
  item,
  isSelected,
  onSelectToggle,
  onToggleVisibility,
  onToggleOpenInNewTab,
  onEdit,
  onMoveGroup,
  onOpenPermissions,
  onDelete,
}: {
  item: MenuItemData;
  isSelected: boolean;
  onSelectToggle: (id: number) => void;
  onToggleVisibility: (item: MenuItemData) => void;
  onToggleOpenInNewTab: (item: MenuItemData, value: boolean) => void;
  onEdit: (item: MenuItemData) => void;
  onMoveGroup: (item: MenuItemData) => void;
  onOpenPermissions: (item: MenuItemData) => void;
  onDelete: (item: MenuItemData) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComp = ICON_REGISTRY[item.iconName]?.component || IconChecklist;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 text-sm transition-all hover:bg-accent/50 shadow-2xs",
        isSelected && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/30",
        isDragging && "z-50 shadow-lg border-blue-500 ring-2 ring-blue-500/20",
        !item.isVisible && "opacity-50"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelectToggle(item.id)}
        className="size-4 shrink-0 rounded"
      />

      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Geser untuk mengubah urutan menu"
      >
        <IconGripVertical className="size-4" />
      </button>

      {/* Menu Icon Preview */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#003461] dark:bg-slate-800 dark:text-blue-300">
        <IconComp className="size-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {item.title}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
            {item.iconName}
          </Badge>
          {item.groupLabel && (
            <Badge variant="secondary" className="text-[10px] shrink-0 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              § {item.groupLabel}
            </Badge>
          )}
          {item.isIframe && (
            <Badge variant="outline" className="text-[9px] text-purple-600 dark:text-purple-400 shrink-0">
              Iframe
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
      </div>

      {/* Inline Quick Switches (Tampil & Tab Baru) */}
      <div className="flex items-center gap-3 px-2 sm:px-3 border-l border-r border-slate-200 dark:border-slate-800 text-xs shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
          <Switch
            checked={item.isVisible}
            onCheckedChange={() => onToggleVisibility(item)}
            className="scale-75 origin-right"
          />
          <span className="text-[11px] font-medium hidden sm:inline">Tampil</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
          <Switch
            checked={item.openInNewTab}
            onCheckedChange={(checked) => onToggleOpenInNewTab(item, checked)}
            className="scale-75 origin-right"
          />
          <span className="text-[11px] font-medium hidden sm:inline">Tab baru</span>
        </label>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Direct RBAC Permissions */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                onClick={() => onOpenPermissions(item)}
              >
                <IconShieldLock className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hak Akses Role (RBAC)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Move to another group */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                onClick={() => onMoveGroup(item)}
              >
                <IconArrowRight className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pindahkan ke Group Lain</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Edit Menu */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(item)}>
                <IconEdit className="size-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit Menu & Ikon</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Delete Menu */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:text-destructive"
                onClick={() => onDelete(item)}
              >
                <IconTrash className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hapus Menu</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function SectionGroup({
  sectionName,
  items,
  index,
  totalSections,
  selectedIds,
  onSelectToggle,
  expandedSections,
  toggleSection,
  onToggleVisibility,
  onToggleOpenInNewTab,
  onEdit,
  onMoveGroup,
  onOpenPermissions,
  onDelete,
  onRenameSection,
  onMoveSectionOrder,
  onAddMenuToSection,
  onDeleteSection,
  onRenameSubGroup,
  onAddMenuToSubGroup,
  onRemoveSubGroupLabel,
}: {
  sectionName: string;
  items: MenuItemData[];
  index: number;
  totalSections: number;
  selectedIds: number[];
  onSelectToggle: (id: number) => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (name: string) => void;
  onToggleVisibility: (item: MenuItemData) => void;
  onToggleOpenInNewTab: (item: MenuItemData, value: boolean) => void;
  onEdit: (item: MenuItemData) => void;
  onMoveGroup: (item: MenuItemData) => void;
  onOpenPermissions: (item: MenuItemData) => void;
  onDelete: (item: MenuItemData) => void;
  onRenameSection: (section: string) => void;
  onMoveSectionOrder: (section: string, direction: "up" | "down") => void;
  onAddMenuToSection: (section: string) => void;
  onDeleteSection: (section: string) => void;
  onRenameSubGroup: (section: string, groupLabel: string) => void;
  onAddMenuToSubGroup: (section: string, groupLabel: string) => void;
  onRemoveSubGroupLabel: (section: string, groupLabel: string) => void;
}) {
  const isOpen = expandedSections[sectionName] ?? false;
  const grouped = groupByGroupLabel(items);
  const hasGroups = grouped.size > 1 || !grouped.has(null);

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionName)} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/60 px-3.5 py-2 hover:bg-accent/60 transition-colors shadow-2xs">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2.5 text-sm font-bold text-left min-w-0">
          <IconChevronRight
            className={cn("size-4 transition-transform text-slate-500 shrink-0", isOpen && "rotate-90")}
          />
          <div className="flex size-6 items-center justify-center rounded-md bg-[#003461] text-white shrink-0">
            <IconFolder className="size-3.5" />
          </div>
          <span className="truncate">{sectionName}</span>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0 ml-1">
            {items.length} Menu
          </Badge>
        </CollapsibleTrigger>

        {/* Group Section Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Move Up */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={() => onMoveSectionOrder(sectionName, "up")}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Pindahkan Group ke Atas"
          >
            <IconArrowUp className="size-3.5" />
          </Button>

          {/* Move Down */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === totalSections - 1}
            onClick={() => onMoveSectionOrder(sectionName, "down")}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Pindahkan Group ke Bawah"
          >
            <IconArrowDown className="size-3.5" />
          </Button>

          {/* Rename Group */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRenameSection(sectionName)}
            className="h-7 text-xs gap-1 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
            title="Ganti Nama Group Menu Ini"
          >
            <IconEdit className="size-3.5" />
            <span className="hidden sm:inline">Rename Group</span>
          </Button>

          {/* Add Menu to this section */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onAddMenuToSection(sectionName)}
            className="size-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
            title="Tambah Menu Baru di Group Ini"
          >
            <IconPlus className="size-4" />
          </Button>

          {/* Delete Group */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDeleteSection(sectionName)}
            className="size-7 text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/60"
            title="Hapus Group Ini"
          >
            <IconTrash className="size-3.5" />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="mt-2 ml-4 space-y-2">
        {hasGroups ? (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
              <div key={groupLabel ?? "__ungrouped__"} className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                {groupLabel && (
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <span>§ {groupLabel}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        {groupItems.length} menu
                      </Badge>
                    </p>
                    <div className="flex items-center gap-0.5">
                      {/* Rename Sub-Group */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRenameSubGroup(sectionName, groupLabel)}
                        className="size-6 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded"
                        title={`Rename Sub-Group "${groupLabel}"`}
                      >
                        <IconEdit className="size-3" />
                      </Button>
                      {/* Add Menu to this Sub-Group */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onAddMenuToSubGroup(sectionName, groupLabel)}
                        className="size-6 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded"
                        title={`Tambah Menu di Sub-Group "${groupLabel}"`}
                      >
                        <IconPlus className="size-3" />
                      </Button>
                      {/* Remove Sub-Group Label */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveSubGroupLabel(sectionName, groupLabel)}
                        className="size-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded"
                        title={`Lepaskan Label "${groupLabel}" dari menu`}
                      >
                        <IconTrash className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <SortableContext
                    items={groupItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupItems
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <SortableItem
                          key={item.id}
                          item={item}
                          isSelected={selectedIds.includes(item.id)}
                          onSelectToggle={onSelectToggle}
                          onToggleVisibility={onToggleVisibility}
                          onToggleOpenInNewTab={onToggleOpenInNewTab}
                          onEdit={onEdit}
                          onMoveGroup={onMoveGroup}
                          onOpenPermissions={onOpenPermissions}
                          onDelete={onDelete}
                        />
                      ))}
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onSelectToggle={onSelectToggle}
                    onToggleVisibility={onToggleVisibility}
                    onToggleOpenInNewTab={onToggleOpenInNewTab}
                    onEdit={onEdit}
                    onMoveGroup={onMoveGroup}
                    onOpenPermissions={onOpenPermissions}
                    onDelete={onDelete}
                  />
                ))}
            </SortableContext>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MenuFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  defaultSection,
  defaultGroupLabel,
  allSections,
  menuItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<MenuItemData>) => void;
  initialData?: MenuItemData | null;
  defaultSection?: string;
  defaultGroupLabel?: string;
  allSections: string[];
  menuItems: MenuItemData[];
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [section, setSection] = useState(initialData?.section ?? defaultSection ?? "");
  const [groupLabel, setGroupLabel] = useState(initialData?.groupLabel ?? defaultGroupLabel ?? "");
  const [iconName, setIconName] = useState(initialData?.iconName ?? "dashboard");
  const [resource, setResource] = useState(initialData?.resource ?? "");
  const [menuArea, setMenuArea] = useState(initialData?.menuArea ?? "main");
  const [isVisible, setIsVisible] = useState(initialData?.isVisible ?? true);
  const [openInNewTab, setOpenInNewTab] = useState(initialData?.openInNewTab ?? false);
  const [isIframe, setIsIframe] = useState(initialData?.isIframe ?? false);
  const [parentId, setParentId] = useState<string>(initialData?.parentId?.toString() ?? "none");
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [customSection, setCustomSection] = useState("");
  const [useCustomSection, setUseCustomSection] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUrl(initialData.url);
      setSection(initialData.section);
      setGroupLabel(initialData.groupLabel ?? "");
      setIconName(initialData.iconName);
      setResource(initialData.resource);
      setMenuArea(initialData.menuArea);
      setIsVisible(initialData.isVisible);
      setOpenInNewTab(initialData.openInNewTab);
      setIsIframe(initialData.isIframe ?? false);
      setParentId(initialData.parentId?.toString() ?? "none");
      setSortOrder(initialData.sortOrder ?? 0);
      setUseCustomSection(!allSections.includes(initialData.section));
      setCustomSection(!allSections.includes(initialData.section) ? initialData.section : "");
    } else {
      setTitle("");
      setUrl("");
      setSection(defaultSection || (allSections[0] ?? "Menu"));
      setGroupLabel(defaultGroupLabel ?? "");
      setIconName("dashboard");
      setResource("");
      setMenuArea("main");
      setIsVisible(true);
      setOpenInNewTab(false);
      setIsIframe(false);
      setParentId("none");
      setSortOrder(0);
      setUseCustomSection(false);
      setCustomSection("");
    }
  }, [initialData, defaultSection, defaultGroupLabel, allSections, open]);

  const SelectedIconComp = ICON_REGISTRY[iconName]?.component || IconChecklist;
  const finalSection = useCustomSection ? customSection : section;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <IconSparkles className="size-4 text-[#003461]" />
              {initialData ? "Edit Menu & Group" : "Tambah Menu Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur judul, URL, group menu, ikon, dan visibilitas menu sidebar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title & URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Judul Menu</Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!resource && !initialData) {
                    setResource(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                    );
                  }
                }}
                placeholder="Contoh: Jadwal Shift"
                className="text-xs h-9 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">URL Path / Link Halaman</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/dashboard/jadwal-shift atau https://..."
                className="text-xs h-9 rounded-xl font-mono"
              />
            </div>

            {/* Group / Section Selection */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Group Menu / Section
                </Label>
                <button
                  type="button"
                  onClick={() => setUseCustomSection(!useCustomSection)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {useCustomSection ? "Pilih dari Group Ada" : "+ Buat Group Baru"}
                </button>
              </div>

              {useCustomSection ? (
                <Input
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value)}
                  placeholder="Ketik nama group baru..."
                  className="text-xs h-8 bg-white dark:bg-slate-950"
                />
              ) : (
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="text-xs h-8 bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Pilih Group Menu..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tanpa Group" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      ✨ Tanpa Group (Stand-alone / Menu Mandiri)
                    </SelectItem>
                    {allSections
                      .filter((sec) => sec !== "Tanpa Group")
                      .map((sec) => (
                        <SelectItem key={sec} value={sec} className="text-xs">
                          {sec}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-slate-500">Sub-Group / Label (Opsional)</Label>
                  {groupLabel && (
                    <button
                      type="button"
                      onClick={() => setGroupLabel("")}
                      className="text-[10px] text-rose-500 hover:underline"
                    >
                      Hapus Sub-Group
                    </button>
                  )}
                </div>
                <Input
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  placeholder="Kosongkan jika tanpa sub-group (Misal: MASTER KARYAWAN)"
                  className="text-xs h-8 mt-1 bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Visual Icon Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Ikon Menu</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#003461] text-white shadow-sm shrink-0">
                  <SelectedIconComp className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {ICON_REGISTRY[iconName]?.label || iconName}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{iconName}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIconPickerOpen(true)}
                  className="text-xs h-8 gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300"
                >
                  <IconSparkles className="size-3.5" />
                  Ganti Ikon
                </Button>
              </div>
            </div>

            {/* Resource & Area */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Resource Key (RBAC)</Label>
                <Input
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  placeholder="resource_key"
                  className="text-xs h-8 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Menu Area</Label>
                <Select value={menuArea} onValueChange={setMenuArea}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_AREAS.map((area) => (
                      <SelectItem key={area} value={area} className="text-xs">
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-2.5 py-2 bg-muted/40 p-3 rounded-xl border text-xs">
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-xs" htmlFor="isVisible-switch">
                  Tampil di sidebar
                </Label>
                <Switch id="isVisible-switch" checked={isVisible} onCheckedChange={setIsVisible} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-xs" htmlFor="openInNewTab-switch">
                  Buka di tab baru (External Link)
                </Label>
                <Switch id="openInNewTab-switch" checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="cursor-pointer text-xs" htmlFor="isIframe-switch">
                  Buka sebagai Iframe di HERO
                </Label>
                <Switch id="isIframe-switch" checked={isIframe} onCheckedChange={setIsIframe} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onSave({
                  title,
                  url,
                  section: finalSection,
                  groupLabel: groupLabel || null,
                  iconName,
                  resource,
                  menuArea,
                  isVisible,
                  openInNewTab,
                  isIframe,
                  parentId: parentId && parentId !== "none" ? parseInt(parentId) : null,
                  sortOrder,
                })
              }
              disabled={!title || !url || !finalSection || !resource}
              className="bg-[#003461] hover:bg-[#002647] text-white"
            >
              {initialData ? "Simpan Perubahan" : "Tambah Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visual Icon Picker Dialog */}
      <VisualIconPickerDialog
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        currentIcon={iconName}
        onSelectIcon={setIconName}
      />
    </>
  );
}

/**
 * Move Item to Another Group Modal
 */
function MoveItemDialog({
  open,
  onOpenChange,
  item,
  allSections,
  onConfirmMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItemData | null;
  allSections: string[];
  onConfirmMove: (itemId: number, targetSection: string, targetGroupLabel?: string) => void;
}) {
  const [targetSection, setTargetSection] = useState(item?.section ?? "");
  const [targetGroupLabel, setTargetGroupLabel] = useState(item?.groupLabel ?? "");
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [customSection, setCustomSection] = useState("");

  useEffect(() => {
    if (item) {
      setTargetSection(item.section);
      setTargetGroupLabel(item.groupLabel ?? "");
      setIsCustomSection(false);
      setCustomSection("");
    }
  }, [item, open]);

  if (!item) return null;

  const finalSection = isCustomSection ? customSection.trim() : targetSection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <IconArrowRight className="size-4 text-blue-600" />
            Pindahkan Menu ke Group Lain
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pindahkan menu <span className="font-semibold text-slate-800 dark:text-slate-200">"{item.title}"</span> ke Section atau Group Menu yang diinginkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Pilih Group Tujuan</Label>
              <button
                type="button"
                onClick={() => setIsCustomSection(!isCustomSection)}
                className="text-[11px] text-blue-600 hover:underline"
              >
                {isCustomSection ? "Pilih dari Group Ada" : "+ Buat Group Baru"}
              </button>
            </div>

            {isCustomSection ? (
              <Input
                value={customSection}
                onChange={(e) => setCustomSection(e.target.value)}
                placeholder="Ketik nama group tujuan..."
                className="text-xs h-9 rounded-xl"
              />
            ) : (
                <Select value={targetSection} onValueChange={setTargetSection}>
                  <SelectTrigger className="text-xs h-9 rounded-xl">
                    <SelectValue placeholder="Pilih Section..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tanpa Group" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      ✨ Tanpa Group (Stand-alone / Menu Mandiri)
                    </SelectItem>
                    {allSections
                      .filter((sec) => sec !== "Tanpa Group")
                      .map((sec) => (
                        <SelectItem key={sec} value={sec} className="text-xs">
                          {sec}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Sub-Group / Label (Opsional)</Label>
                {targetGroupLabel && (
                  <button
                    type="button"
                    onClick={() => setTargetGroupLabel("")}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Kosongkan Sub-Group
                  </button>
                )}
              </div>
              <Input
                value={targetGroupLabel}
                onChange={(e) => setTargetGroupLabel(e.target.value)}
                placeholder="Kosongkan jika tanpa sub-group (Misal: MASTER KARYAWAN)"
                className="text-xs h-9 rounded-xl"
              />
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (finalSection) {
                onConfirmMove(item.id, finalSection, targetGroupLabel || undefined);
                onOpenChange(false);
              }
            }}
            disabled={!finalSection}
            className="bg-[#003461] hover:bg-[#002647] text-white"
          >
            Pindahkan Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rename Section / Group / Sub-Group Dialog
 */
function RenameGroupDialog({
  open,
  onOpenChange,
  target,
  onConfirmRename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { name: string; type: "section" | "groupLabel"; section?: string } | null;
  onConfirmRename: (oldName: string, newName: string, type: "section" | "groupLabel", section?: string) => void;
}) {
  const currentName = target?.name ?? "";
  const type = target?.type ?? "section";
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <IconEdit className="size-4 text-blue-600" />
            {type === "groupLabel" ? "Rename Sub-Group (Label)" : "Rename Group Menu"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ubah nama {type === "groupLabel" ? "sub-group label" : "group"}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">"{currentName}"</span>
            {target?.section && ` di dalam section "${target.section}"`}. Seluruh menu di bawah label ini akan otomatis diperbarui.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-xs font-semibold">
            {type === "groupLabel" ? "Nama Sub-Group Baru" : "Nama Group Baru"}
          </Label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={type === "groupLabel" ? "Misal: SAFETY MANAGEMENT" : "Misal: HSE"}
            className="text-xs h-9 rounded-xl font-medium"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (newName.trim() && newName.trim() !== currentName) {
                onConfirmRename(currentName, newName.trim(), type, target?.section);
                onOpenChange(false);
              }
            }}
            disabled={!newName.trim() || newName.trim() === currentName}
            className="bg-[#003461] hover:bg-[#002647] text-white"
          >
            Simpan Nama Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main NavbarMenuManager Component
 */
export function NavbarMenuManager({ menuItems }: { menuItems: MenuItemData[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<MenuItemData[]>(menuItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "visible" | "hidden" | "tab" | "iframe">("all");
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Bulk selections
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMoveTarget, setBulkMoveTarget] = useState("");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [defaultSectionForAdd, setDefaultSectionForAdd] = useState<string | undefined>(undefined);
  const [defaultGroupLabelForAdd, setDefaultGroupLabelForAdd] = useState<string | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [movingItem, setMovingItem] = useState<MenuItemData | null>(null);
  const [permissionsItem, setPermissionsItem] = useState<MenuItemData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MenuItemData | null>(null);
  const [renamingTarget, setRenamingTarget] = useState<{
    name: string;
    type: "section" | "groupLabel";
    section?: string;
  } | null>(null);
  const [deletingSection, setDeletingSection] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Group sections preserving order - matched with desktop sidebar standard
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hero_sidebar_section_order");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    const map = groupBySection(menuItems);
    const existingKeys = Array.from(map.keys());
    const initial: string[] = [];
    for (const sec of DESKTOP_MENU_ORDER) {
      if (existingKeys.includes(sec)) {
        initial.push(sec);
      }
    }
    for (const sec of existingKeys) {
      if (!initial.includes(sec)) {
        initial.push(sec);
      }
    }
    return initial;
  });

  const sections = useMemo(() => {
    const currentMap = groupBySection(items);
    const existingKeys = Array.from(currentMap.keys());
    const ordered = sectionOrder.filter((s) => existingKeys.includes(s));
    for (const key of existingKeys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [items, sectionOrder]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.iconName.toLowerCase().includes(q) ||
          (item.groupLabel && item.groupLabel.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Filter by type
      if (filterType === "visible") return item.isVisible;
      if (filterType === "hidden") return !item.isVisible;
      if (filterType === "tab") return item.openInNewTab;
      if (filterType === "iframe") return item.isIframe;

      return true;
    });
  }, [items, searchQuery, filterType]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      const updated = reordered.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

      fetch("/api/menu/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updated.map((i) => ({ id: i.id, sortOrder: i.sortOrder })) }),
      }).then(() => {
        toast.success("Urutan menu diperbarui");
      });

      return updated;
    });
  }, []);

  const toggleSection = useCallback((name: string) => {
    setExpandedSections((prev) => ({ ...prev, [name]: !(prev[name] ?? false) }));
  }, []);

  const toggleVisibility = useCallback(async (item: MenuItemData) => {
    const newState = !item.isVisible;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isVisible: newState } : i)));

    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: newState }),
    });
    toast.success(newState ? "Menu ditampilkan" : "Menu disembunyikan");
    router.refresh();
  }, [router]);

  const toggleOpenInNewTab = useCallback(async (item: MenuItemData, value: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, openInNewTab: value } : i)));

    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openInNewTab: value }),
    });
    toast.success(value ? "Menu diatur buka di tab baru" : "Menu diatur buka di tab yang sama");
    router.refresh();
  }, [router]);

  const handleSave = useCallback(
    async (data: Partial<MenuItemData>) => {
      if (editingItem) {
        await fetch(`/api/menu/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...data } : i))
        );
        toast.success("Menu berhasil diperbarui");
      } else {
        const maxSort = Math.max(
          ...items.filter((i) => i.section === data.section).map((i) => i.sortOrder),
          0
        );
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            sortOrder: maxSort + 1,
          }),
        });
        const created = await res.json();
        if (res.ok && created.item) {
          setItems((prev) => [...prev, created.item]);
          toast.success("Menu baru berhasil ditambahkan");
        }
      }
      setFormOpen(false);
      setEditingItem(null);
      setDefaultSectionForAdd(undefined);
      setDefaultGroupLabelForAdd(undefined);
      router.refresh();
    },
    [editingItem, items, router]
  );

  const handleDelete = useCallback(
    async (item: MenuItemData) => {
      await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      setDeleteConfirm(null);
      toast.success(`Menu "${item.title}" telah dihapus`);
      router.refresh();
    },
    [router]
  );

  const handleMoveGroup = useCallback(
    async (itemId: number, targetSection: string, targetGroupLabel?: string) => {
      try {
        const res = await fetch("/api/menu/group/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            targetSection,
            targetGroupLabel: targetGroupLabel || null,
          }),
        });
        if (res.ok) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? { ...i, section: targetSection, groupLabel: targetGroupLabel || null }
                : i
            )
          );
          toast.success(`Menu dipindahkan ke group "${targetSection}"`);
          router.refresh();
        } else {
          toast.error("Gagal memindahkan menu");
        }
      } catch {
        toast.error("Terjadi kesalahan saat memindahkan menu");
      }
    },
    [router]
  );

  const handleRename = useCallback(
    async (oldName: string, newName: string, type: "section" | "groupLabel", section?: string) => {
      try {
        const res = await fetch("/api/menu/group/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName, type, section }),
        });
        if (res.ok) {
          if (type === "groupLabel") {
            setItems((prev) =>
              prev.map((i) =>
                i.groupLabel === oldName && (!section || i.section === section)
                  ? { ...i, groupLabel: newName }
                  : i
              )
            );
            toast.success(`Sub-Group "${oldName}" berhasil diubah menjadi "${newName}"`);
          } else {
            setItems((prev) =>
              prev.map((i) => (i.section === oldName ? { ...i, section: newName } : i))
            );
            setSectionOrder((prev) => prev.map((s) => (s === oldName ? newName : s)));
            toast.success(`Group "${oldName}" berhasil diubah menjadi "${newName}"`);
          }
          router.refresh();
        } else {
          toast.error("Gagal mengubah nama");
        }
      } catch {
        toast.error("Terjadi kesalahan saat rename");
      }
    },
    [router]
  );

  const handleRemoveSubGroupLabel = useCallback(
    async (sectionName: string, groupLabel: string) => {
      try {
        const itemsToUpdate = items.filter(
          (i) => i.section === sectionName && i.groupLabel === groupLabel
        );
        if (itemsToUpdate.length === 0) return;

        setItems((prev) =>
          prev.map((i) =>
            i.section === sectionName && i.groupLabel === groupLabel
              ? { ...i, groupLabel: null }
              : i
          )
        );

        await Promise.all(
          itemsToUpdate.map((i) =>
            fetch(`/api/menu/${i.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ groupLabel: null }),
            })
          )
        );

        toast.success(`Label "${groupLabel}" dilepaskan dari menu`);
        router.refresh();
      } catch {
        toast.error("Gagal melepaskan label sub-group");
      }
    },
    [items, router]
  );

  const handleMoveSectionOrder = useCallback((sectionName: string, direction: "up" | "down") => {
    setSectionOrder((prev) => {
      const idx = prev.indexOf(sectionName);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const newOrder = arrayMove(prev, idx, targetIdx);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hero_sidebar_section_order", JSON.stringify(newOrder));
          window.dispatchEvent(new Event("hero_sidebar_order_changed"));
        } catch {}
      }
      toast.success(`Urutan group "${sectionName}" dipindahkan ke ${direction === "up" ? "atas" : "bawah"}`);
      return newOrder;
    });
  }, []);

  const handleDeleteSection = useCallback(
    async (sectionName: string) => {
      try {
        const res = await fetch("/api/menu/group/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: sectionName, action: "move_to_default", fallbackSection: "Menu" }),
        });
        if (res.ok) {
          setItems((prev) =>
            prev.map((i) => (i.section === sectionName ? { ...i, section: "Menu" } : i))
          );
          setDeletingSection(null);
          toast.success(`Group "${sectionName}" dihapus, menu dipindahkan ke "Menu"`);
          router.refresh();
        }
      } catch {
        toast.error("Gagal menghapus group");
      }
    },
    [router]
  );

  // Bulk actions
  const handleSelectToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleBulkMove = async () => {
    if (!bulkMoveTarget || selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/menu/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          itemIds: selectedIds,
          targetSection: bulkMoveTarget,
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (selectedIds.includes(i.id) ? { ...i, section: bulkMoveTarget } : i))
        );
        setSelectedIds([]);
        setBulkMoveTarget("");
        toast.success(`Berhasil memindahkan ${selectedIds.length} menu`);
        router.refresh();
      }
    } catch {
      toast.error("Gagal melakukan aksi massal");
    }
  };

  const handleBulkVisibility = async (visible: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/menu/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_visibility",
          itemIds: selectedIds,
          isVisible: visible,
        }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (selectedIds.includes(i.id) ? { ...i, isVisible: visible } : i))
        );
        setSelectedIds([]);
        toast.success(`Berhasil mengubah status ${selectedIds.length} menu`);
        router.refresh();
      }
    } catch {
      toast.error("Gagal melakukan aksi massal");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/menu/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", itemIds: selectedIds }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
        setSelectedIds([]);
        toast.success(`Berhasil menghapus ${selectedIds.length} menu`);
        router.refresh();
      }
    } catch {
      toast.error("Gagal melakukan aksi massal");
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    window.location.href = "/api/menu/backup";
    toast.success("Mengunduh backup konfigurasi sidebar...");
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch("/api/menu/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import", backupData: json }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || "Konfigurasi sidebar berhasil diimpor!");
          router.refresh();
        } else {
          toast.error(data.error || "Gagal mengimpor file");
        }
      } catch {
        toast.error("Format file JSON tidak valid");
      }
    };
    reader.readAsText(file);
  };

  // Reset to default
  const handleResetToDefault = async () => {
    try {
      const res = await fetch("/api/menu/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        toast.success("Sidebar berhasil di-reset ke standar default HERO");
        setResetConfirmOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Gagal me-reset sidebar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{items.length} Menu Items</span>
            <span className="text-slate-400">•</span>
            <span>{sections.length} Group Section</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Kelola posisi group, rename section, pindahkan menu antar group, dan atur ikon & RBAC.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Preview Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={cn(
              "text-xs gap-1.5 rounded-xl transition-all",
              showLivePreview
                ? "bg-blue-50 text-[#003461] border-blue-300 dark:bg-slate-800 dark:text-blue-300"
                : "text-slate-700 dark:text-slate-300"
            )}
          >
            <IconLayoutSidebar className="size-4" />
            <span>{showLivePreview ? "Tutup Preview" : "Live Preview"}</span>
          </Button>

          {/* Export JSON */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            className="text-xs gap-1.5 rounded-xl text-slate-700 dark:text-slate-300"
            title="Download JSON Backup"
          >
            <IconDownload className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Import JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs gap-1.5 rounded-xl text-slate-700 dark:text-slate-300"
            title="Import JSON Backup"
          >
            <IconUpload className="size-3.5" />
            <span className="hidden sm:inline">Import</span>
          </Button>

          {/* Reset to Default */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setResetConfirmOpen(true)}
            className="text-xs gap-1.5 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            title="Reset ke Default HERO"
          >
            <IconRefresh className="size-3.5" />
            <span className="hidden md:inline">Reset Default</span>
          </Button>

          {/* Add Menu Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setDefaultSectionForAdd(undefined);
              setFormOpen(true);
            }}
            className="bg-[#003461] hover:bg-[#002647] text-white gap-1.5 rounded-xl"
          >
            <IconPlus className="size-4" />
            Tambah Menu
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Cari judul menu, URL, group, atau ikon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Semua ({items.length})
          </Button>
          <Button
            variant={filterType === "visible" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("visible")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Tampil ({items.filter((i) => i.isVisible).length})
          </Button>
          <Button
            variant={filterType === "hidden" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("hidden")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Sembunyi ({items.filter((i) => !i.isVisible).length})
          </Button>
          <Button
            variant={filterType === "tab" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("tab")}
            className="h-7 text-xs rounded-lg px-2.5"
          >
            Tab Baru ({items.filter((i) => i.openInNewTab).length})
          </Button>
        </div>
      </div>

      {/* Sticky Bulk Selection Bar (When items are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-800 p-3 rounded-xl shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold text-[#003461] dark:text-blue-300">
            <IconCheck className="size-4" />
            <span>{selectedIds.length} Menu Terpilih</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-foreground"
            >
              Batal Pilih
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={bulkMoveTarget} onValueChange={setBulkMoveTarget}>
              <SelectTrigger className="h-8 text-xs w-[160px] bg-white dark:bg-slate-950">
                <SelectValue placeholder="Pindah ke Group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tanpa Group" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  ✨ Tanpa Group (Stand-alone / Menu Mandiri)
                </SelectItem>
                {sections
                  .filter((sec) => sec !== "Tanpa Group")
                  .map((sec) => (
                    <SelectItem key={sec} value={sec} className="text-xs">
                      {sec}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              disabled={!bulkMoveTarget}
              onClick={handleBulkMove}
              className="h-8 text-xs bg-[#003461] text-white hover:bg-[#002647]"
            >
              Pindahkan
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkVisibility(true)}
              className="h-8 text-xs"
            >
              Tampilkan Semua
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkVisibility(false)}
              className="h-8 text-xs"
            >
              Sembunyikan Semua
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8 text-xs"
            >
              Hapus ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Live Preview Split Mode or Standard */}
      <div className={cn("grid gap-6 items-start", showLivePreview ? "lg:grid-cols-3" : "grid-cols-1")}>
        {/* Sections & Menu Drag List */}
        <div className={cn(showLivePreview ? "lg:col-span-2" : "w-full")}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <div className="space-y-3">
              {sections.map((sectionName, index) => {
                const sectionItems = filteredItems.filter((i) => i.section === sectionName);
                if (searchQuery.trim() && sectionItems.length === 0) return null;

                return (
                  <SectionGroup
                    key={sectionName}
                    sectionName={sectionName}
                    items={sectionItems}
                    index={index}
                    totalSections={sections.length}
                    selectedIds={selectedIds}
                    onSelectToggle={handleSelectToggle}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    onToggleVisibility={toggleVisibility}
                    onToggleOpenInNewTab={toggleOpenInNewTab}
                    onEdit={(item) => {
                      setEditingItem(item);
                      setFormOpen(true);
                    }}
                    onMoveGroup={(item) => setMovingItem(item)}
                    onOpenPermissions={(item) => setPermissionsItem(item)}
                    onDelete={setDeleteConfirm}
                    onRenameSection={(sec) => setRenamingTarget({ name: sec, type: "section" })}
                    onMoveSectionOrder={handleMoveSectionOrder}
                    onAddMenuToSection={(sec) => {
                      setEditingItem(null);
                      setDefaultSectionForAdd(sec);
                      setDefaultGroupLabelForAdd(undefined);
                      setFormOpen(true);
                    }}
                    onDeleteSection={(sec) => setDeletingSection(sec)}
                    onRenameSubGroup={(sec, label) =>
                      setRenamingTarget({ name: label, type: "groupLabel", section: sec })
                    }
                    onAddMenuToSubGroup={(sec, label) => {
                      setEditingItem(null);
                      setDefaultSectionForAdd(sec);
                      setDefaultGroupLabelForAdd(label);
                      setFormOpen(true);
                    }}
                    onRemoveSubGroupLabel={handleRemoveSubGroupLabel}
                  />
                );
              })}
            </div>
          </DndContext>
        </div>

        {/* Live Sidebar Interactive Preview Panel */}
        {showLivePreview && (
          <div className="lg:col-span-1">
            <LiveSidebarPreview items={items} sections={sections} />
          </div>
        )}
      </div>

      {/* Add / Edit Menu Form Modal */}
      <MenuFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingItem(null);
            setDefaultSectionForAdd(undefined);
            setDefaultGroupLabelForAdd(undefined);
          }
        }}
        onSave={handleSave}
        initialData={editingItem}
        defaultSection={defaultSectionForAdd}
        defaultGroupLabel={defaultGroupLabelForAdd}
        allSections={sections}
        menuItems={items}
      />

      {/* Move Menu Item Modal */}
      <MoveItemDialog
        open={!!movingItem}
        onOpenChange={(open) => !open && setMovingItem(null)}
        item={movingItem}
        allSections={sections}
        onConfirmMove={handleMoveGroup}
      />

      {/* Direct RBAC Permissions Modal */}
      <RolePermissionsDialog
        open={!!permissionsItem}
        onOpenChange={(open) => !open && setPermissionsItem(null)}
        item={permissionsItem}
      />

      {/* Rename Section / Sub-Group Dialog */}
      <RenameGroupDialog
        open={!!renamingTarget}
        onOpenChange={(open) => !open && setRenamingTarget(null)}
        target={renamingTarget}
        onConfirmRename={handleRename}
      />

      {/* Delete Menu Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus Menu</DialogTitle>
            <DialogDescription className="text-xs">
              Yakin ingin menghapus menu <span className="font-bold text-slate-900 dark:text-slate-100">"{deleteConfirm?.title}"</span>? Tindakan ini akan menghapus akses menu dari seluruh role.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Hapus Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog open={!!deletingSection} onOpenChange={() => setDeletingSection(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus Group Menu</DialogTitle>
            <DialogDescription className="text-xs">
              Yakin ingin menghapus group <span className="font-bold text-slate-900 dark:text-slate-100">"{deletingSection}"</span>? Seluruh menu di dalamnya akan otomatis dipindahkan ke group default "Menu".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingSection(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingSection && handleDeleteSection(deletingSection)}
            >
              Hapus Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Default Confirmation */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
              <IconAlertTriangle className="size-5" />
              Reset Struktur Sidebar ke Default HERO?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini akan mengembalikan seluruh susunan menu, group, dan ikon ke standar awal pabrik HERO. Menu custom yang belum dibackup mungkin akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetToDefault}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Ya, Reset ke Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
