"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  type UniqueIdentifier,
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
  IconChevronDown,
  IconFolder,
  IconMenu,
  IconPalette,
  IconLink,
  IconStack,
  IconSettings,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const ICON_OPTIONS = [
  "dashboard", "checklist", "database", "settings", "mail",
  "users", "shield", "report", "folder", "chart-bar",
  "clock", "list-details", "file-word", "activity", "alert-triangle",
  "book-open", "target", "trending-up", "wrench", "address-card",
  "file-text", "git-branch", "shield-alert", "file-signature", "search",
] as const;

const MENU_AREAS = ["main", "secondary", "document"] as const;

type MenuItemData = {
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
};

type FlatMenuItem = MenuItemData & {
  depth: number;
  children: FlatMenuItem[];
};

function buildTree(items: MenuItemData[]): FlatMenuItem[] {
  const byId = new Map<number, FlatMenuItem>();
  const roots: FlatMenuItem[] = [];

  for (const item of items) {
    byId.set(item.id, { ...item, depth: 0, children: [] });
  }

  for (const item of items) {
    const node = byId.get(item.id)!;
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(node);
      node.depth = 1;
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenForDisplay(items: FlatMenuItem[]): (FlatMenuItem & { depth: number })[] {
  const result: (FlatMenuItem & { depth: number })[] = [];

  function walk(nodes: FlatMenuItem[], depth: number) {
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(items, 0);
  return result;
}

function groupBySection(items: MenuItemData[]) {
  const sections = new Map<string, MenuItemData[]>();
  for (const item of items) {
    const existing = sections.get(item.section) ?? [];
    existing.push(item);
    sections.set(item.section, existing);
  }
  return sections;
}

function groupByGroupLabel(items: MenuItemData[]) {
  const groups = new Map<string | null, MenuItemData[]>();
  for (const item of items) {
    const key = item.groupLabel ?? null;
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }
  return groups;
}

function SortableItem({
  item,
  onToggleVisibility,
  onEdit,
  onDelete,
}: {
  item: MenuItemData;
  onToggleVisibility: (item: MenuItemData) => void;
  onEdit: (item: MenuItemData) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent/50",
        isDragging && "z-50 shadow-lg",
        !item.isVisible && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <IconGripVertical className="size-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.title}</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {item.section}
          </Badge>
          {item.groupLabel && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {item.groupLabel}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => onToggleVisibility(item)}
              >
                {item.isVisible ? (
                  <IconEye className="size-3.5 text-muted-foreground" />
                ) : (
                  <IconEyeOff className="size-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{item.isVisible ? "Sembunyikan" : "Tampilkan"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(item)}>
                <IconEdit className="size-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        </TooltipProvider>

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
            <TooltipContent>Hapus</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function SectionGroup({
  sectionName,
  items,
  expandedSections,
  toggleSection,
  onToggleVisibility,
  onEdit,
  onDelete,
}: {
  sectionName: string;
  items: MenuItemData[];
  expandedSections: Record<string, boolean>;
  toggleSection: (name: string) => void;
  onToggleVisibility: (item: MenuItemData) => void;
  onEdit: (item: MenuItemData) => void;
  onDelete: (item: MenuItemData) => void;
}) {
  const isOpen = expandedSections[sectionName] ?? false;
  const grouped = groupByGroupLabel(items);
  const hasGroups = grouped.size > 1 || !grouped.has(null);

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionName)}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm font-semibold hover:bg-accent/50 transition-colors">
        <IconChevronRight
          className={cn("size-4 transition-transform", isOpen && "rotate-90")}
        />
        <IconFolder className="size-4 text-muted-foreground" />
        <span>{sectionName}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {items.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-4">
        {hasGroups ? (
          <div className="space-y-2">
            {Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
              <div key={groupLabel ?? "__ungrouped__"}>
                {groupLabel && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">
                    {groupLabel}
                  </p>
                )}
                <div className="space-y-1">
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
                          onToggleVisibility={onToggleVisibility}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      ))}
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
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
                    onToggleVisibility={onToggleVisibility}
                    onEdit={onEdit}
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
  allSections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<MenuItemData>) => void;
  initialData?: MenuItemData | null;
  allSections: string[];
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [section, setSection] = useState(initialData?.section ?? "");
  const [groupLabel, setGroupLabel] = useState(initialData?.groupLabel ?? "");
  const [iconName, setIconName] = useState(initialData?.iconName ?? "dashboard");
  const [resource, setResource] = useState(initialData?.resource ?? "");
  const [menuArea, setMenuArea] = useState(initialData?.menuArea ?? "main");
  const [isVisible, setIsVisible] = useState(initialData?.isVisible ?? true);
  const [openInNewTab, setOpenInNewTab] = useState(initialData?.openInNewTab ?? false);
  const [customSection, setCustomSection] = useState("");
  const [useCustomSection, setUseCustomSection] = useState(false);

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
      setUseCustomSection(!allSections.includes(initialData.section));
      setCustomSection(!allSections.includes(initialData.section) ? initialData.section : "");
    } else {
      setTitle("");
      setUrl("");
      setSection("");
      setGroupLabel("");
      setIconName("dashboard");
      setResource("");
      setMenuArea("main");
      setIsVisible(true);
      setOpenInNewTab(false);
      setUseCustomSection(false);
      setCustomSection("");
    }
  }, [initialData, allSections, open]);

  const finalSection = useCustomSection ? customSection : section;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Menu" : "Tambah Menu Baru"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Ubah detail menu item ini."
              : "Isi detail untuk menambahkan menu baru."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Judul Menu</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama menu" />
          </div>

          <div className="space-y-2">
            <Label>URL / Path</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/dashboard/..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Section</Label>
              {useCustomSection ? (
                <Input
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value)}
                  placeholder="Nama section baru"
                />
              ) : (
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih section" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setUseCustomSection(!useCustomSection)}
              >
                {useCustomSection ? "Pilih section existing" : "Buat section baru"}
              </button>
            </div>

            <div className="space-y-2">
              <Label>Group Label (opsional)</Label>
              <Input
                value={groupLabel}
                onChange={(e) => setGroupLabel(e.target.value)}
                placeholder="Sub-group dalam section"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={iconName} onValueChange={setIconName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resource Key</Label>
              <Input
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                placeholder="unique_resource_key"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Menu Area</Label>
            <Select value={menuArea} onValueChange={setMenuArea}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MENU_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
              <Label>Tampil di sidebar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={openInNewTab} onCheckedChange={setOpenInNewTab} />
              <Label>Buka di tab baru</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
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
              })
            }
            disabled={!title || !url || !finalSection || !resource}
          >
            {initialData ? "Simpan Perubahan" : "Tambah Menu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NavbarMenuManager({ menuItems }: { menuItems: MenuItemData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<MenuItemData[]>(menuItems);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MenuItemData | null>(null);

  const sections = useMemo(() => {
    const grouped = groupBySection(items);
    return Array.from(grouped.keys()).sort();
  }, [items]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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
    },
    []
  );

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
  }, []);

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
        toast.success("Menu diperbarui");
      } else {
        const maxSort = Math.max(...items.filter((i) => i.section === data.section).map((i) => i.sortOrder), 0);
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, sortOrder: maxSort + 1 }),
        });
        const newItem = await res.json();
        setItems((prev) => [...prev, newItem]);
        toast.success("Menu ditambahkan");
      }
      setFormOpen(false);
      setEditingItem(null);
    },
    [editingItem, items]
  );

  const handleDelete = useCallback(async (item: MenuItemData) => {
    await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setDeleteConfirm(null);
    toast.success("Menu dihapus");
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} menu items dalam {sections.length} section
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
        >
          <IconPlus className="size-4 mr-1" />
          Tambah Menu
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="space-y-2">
          {sections.map((sectionName) => {
            const sectionItems = items.filter((i) => i.section === sectionName);
            return (
              <SectionGroup
                key={sectionName}
                sectionName={sectionName}
                items={sectionItems}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                onToggleVisibility={toggleVisibility}
                onEdit={(item) => {
                  setEditingItem(item);
                  setFormOpen(true);
                }}
                onDelete={setDeleteConfirm}
              />
            );
          })}
        </div>
      </DndContext>

      <MenuFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSave={handleSave}
        initialData={editingItem}
        allSections={sections}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Menu</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus "{deleteConfirm?.title}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
