"use client";

import React, { useState, useEffect } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  createBroadcast,
  toggleBroadcastActive,
  deleteBroadcast,
  updateBroadcast,
  getBroadcastAnalytics,
  createBroadcastCategory,
  BroadcastDataInput,
} from "@/app/actions/broadcast";
import { uploadFile } from "@/app/actions/upload";
import { cn } from "@/lib/utils";

interface BroadcastRow {
  id: number;
  title: string;
  content: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  mediaType: string;
  targetType: string;
  targetId: number | null;
  targetValue: string | null;
  maxPopups: number;
  isActive: boolean;
  createdAt: Date;
  totalViews: number;
  likes: number;
  dislikes: number;
  categoryId: number | null;
  categoryName: string | null;
}

interface TargetMetadata {
  departments: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string; departmentId: number | null }>;
  userRoleInfo: {
    isSuperOrHrAdmin: boolean;
    isSectionHead: boolean;
    managedSectionIds: number[];
  };
}

interface CategoryRow {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

interface CommandCenterClientProps {
  initialBroadcasts: BroadcastRow[];
  metadata: TargetMetadata;
  initialCategories: CategoryRow[];
}

export function CommandCenterClient({
  initialBroadcasts,
  metadata,
  initialCategories,
}: CommandCenterClientProps) {
  const [broadcastsList, setBroadcastsList] = useState<BroadcastRow[]>(initialBroadcasts);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // User details
  const { isSuperOrHrAdmin, isSectionHead, managedSectionIds } = metadata.userRoleInfo;

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [targetType, setTargetType] = useState<"all" | "department" | "section">("all");
  const [targetId, setTargetId] = useState<number>(0);
  const [maxPopups, setMaxPopups] = useState<number>(5);

  // Edit Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMediaType, setEditMediaType] = useState<"image" | "video" | "text">("image");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [editTargetType, setEditTargetType] = useState<"all" | "department" | "section">("all");
  const [editTargetId, setEditTargetId] = useState<number>(0);
  const [editMaxPopups, setEditMaxPopups] = useState<number>(5);
  const [resendFlag, setResendFlag] = useState(false);

  // Categories State
  const [categoriesList, setCategoriesList] = useState<CategoryRow[]>(initialCategories);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [editCategoryId, setEditCategoryId] = useState<number>(0);
  
  // Category Search / Addition State
  const [categorySearch, setCategorySearch] = useState("");
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("siaran");

  // Analytics Dashboard State
  const [analyticsBroadcastId, setAnalyticsBroadcastId] = useState<number | null>(null);
  const [analyticsTitle, setAnalyticsTitle] = useState("");
  const [analyticsData, setAnalyticsData] = useState<{
    likedUsers: any[];
    dislikedUsers: any[];
    departmentLikes: any[];
    sectionLikes: any[];
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const handleStartEdit = (b: BroadcastRow) => {
    setEditId(b.id);
    setEditTitle(b.title);
    setEditContent(b.content || "");
    setEditMediaType(b.mediaType as any);
    setEditImageUrl(b.imageUrl || "");
    setEditLinkUrl(b.linkUrl || "");
    setEditTargetType(b.targetType as any);
    setEditTargetId(b.targetId || 0);
    setEditMaxPopups(b.maxPopups);
    setEditCategoryId(b.categoryId || 0);
    setResendFlag(false);
    setIsEditOpen(true);
  };

  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await uploadFile(formData);
      if (res.success && res.url) {
        const finalUrl = res.readableUrl || `/api/uploads/${res.url.split("/").pop()}`;
        setEditImageUrl(finalUrl);
        toast.success("File berhasil diunggah!");
      } else {
        toast.error(res.error || "Gagal mengunggah file.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunggah.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    if (!editTitle) {
      toast.error("Judul wajib diisi!");
      return;
    }

    if (editMediaType !== "text" && !editImageUrl) {
      toast.error(editMediaType === "image" ? "Gambar wajib diunggah!" : "Link Video wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      let targetValue = "";
      if (editTargetType === "department") {
        targetValue =
          metadata.departments.find((d) => d.id === editTargetId)?.name || "";
      } else if (editTargetType === "section") {
        targetValue =
          metadata.sections.find((s) => s.id === editTargetId)?.name || "";
      }

      const input: BroadcastDataInput = {
        title: editTitle,
        content: editContent || undefined,
        imageUrl: editMediaType !== "text" ? editImageUrl : undefined,
        linkUrl: editLinkUrl || undefined,
        mediaType: editMediaType,
        targetType: editTargetType,
        targetId: editTargetType !== "all" ? editTargetId : undefined,
        targetValue: editTargetType !== "all" ? targetValue : undefined,
        maxPopups: editMaxPopups,
        categoryId: editCategoryId || undefined,
      };

      const res = await updateBroadcast(editId, input, resendFlag);
      if (res.success && res.broadcast) {
        toast.success(
          resendFlag
            ? "Broadcast informasi berhasil di-update dan dikirim ulang!"
            : "Broadcast informasi berhasil di-update!"
        );

        const catName = categoriesList.find((c) => c.id === editCategoryId)?.name || null;
        setBroadcastsList((prev) =>
          prev.map((b) =>
            b.id === editId
              ? {
                  ...b,
                  ...res.broadcast,
                  totalViews: resendFlag ? 0 : b.totalViews,
                  likes: resendFlag ? 0 : b.likes,
                  dislikes: resendFlag ? 0 : b.dislikes,
                  categoryId: editCategoryId || null,
                  categoryName: catName,
                }
              : b
          )
        );
        setIsEditOpen(false);
      } else {
        toast.error("Gagal mengupdate broadcast.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Open Analytics Tab
  const handleOpenAnalytics = async (b: BroadcastRow) => {
    setAnalyticsBroadcastId(b.id);
    setAnalyticsTitle(b.title);
    setLoadingAnalytics(true);
    setActiveTab("analitik");
    setAnalyticsData(null);

    try {
      const data = await getBroadcastAnalytics(b.id);
      setAnalyticsData(data);
    } catch (err) {
      toast.error("Gagal memuat analitik respon.");
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Handle Select Broadcast inside Analytics Tab
  const handleSelectBroadcastForAnalytics = async (id: number) => {
    if (id === 0) {
      setAnalyticsBroadcastId(null);
      setAnalyticsTitle("");
      setAnalyticsData(null);
      return;
    }
    const b = broadcastsList.find((x) => x.id === id);
    if (!b) return;

    setAnalyticsBroadcastId(b.id);
    setAnalyticsTitle(b.title);
    setLoadingAnalytics(true);
    setAnalyticsData(null);

    try {
      const data = await getBroadcastAnalytics(b.id);
      setAnalyticsData(data);
    } catch (err) {
      toast.error("Gagal memuat analitik respon.");
      console.error(err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Handle Dynamic Category Creation Inline
  const handleCreateCategoryInline = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Nama kategori tidak boleh kosong!");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await createBroadcastCategory(trimmed);
      if (res && res.id) {
        toast.success(`Kategori "${res.name}" berhasil ditambahkan!`);
        
        const newCat: CategoryRow = {
          id: res.id,
          name: res.name,
          isActive: res.isActive,
          createdAt: new Date(res.createdAt),
        };
        setCategoriesList((prev) => [...prev, newCat]);
        
        if (isEditOpen) {
          setEditCategoryId(res.id);
        } else {
          setCategoryId(res.id);
        }
        
        setNewCategoryName("");
        setShowAddCategoryInput(false);
        setCategorySearch("");
      }
    } catch (err) {
      toast.error("Gagal menambahkan kategori.");
      console.error(err);
    } finally {
      setCreatingCategory(false);
    }
  };

  // Set default targets based on roles
  useEffect(() => {
    if (!isSuperOrHrAdmin && isSectionHead) {
      setTargetType("section");
      if (metadata.sections.length > 0) {
        setTargetId(metadata.sections[0].id);
      }
    }
  }, [isSuperOrHrAdmin, isSectionHead, metadata.sections]);

  // Stats
  const totalBroadcasts = broadcastsList.length;
  const activeBroadcasts = broadcastsList.filter((b) => b.isActive).length;
  const totalViews = broadcastsList.reduce((acc, curr) => acc + curr.totalViews, 0);
  const totalLikes = broadcastsList.reduce((acc, curr) => acc + curr.likes, 0);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await uploadFile(formData);
      if (res.success && res.url) {
        const finalUrl = res.readableUrl || `/api/uploads/${res.url.split("/").pop()}`;
        setImageUrl(finalUrl);
        toast.success("File berhasil diunggah!");
      } else {
        toast.error(res.error || "Gagal mengunggah file.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat mengunggah.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Submit new Broadcast
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Judul wajib diisi!");
      return;
    }

    if (mediaType !== "text" && !imageUrl) {
      toast.error(mediaType === "image" ? "Gambar wajib diunggah!" : "Link Video wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      let targetValue = "";
      if (targetType === "department") {
        targetValue =
          metadata.departments.find((d) => d.id === targetId)?.name || "";
      } else if (targetType === "section") {
        targetValue =
          metadata.sections.find((s) => s.id === targetId)?.name || "";
      }

      const input: BroadcastDataInput = {
        title,
        content: content || undefined,
        imageUrl: mediaType !== "text" ? imageUrl : undefined,
        linkUrl: linkUrl || undefined,
        mediaType,
        targetType,
        targetId: targetType !== "all" ? targetId : undefined,
        targetValue: targetType !== "all" ? targetValue : undefined,
        maxPopups,
        categoryId: categoryId || undefined,
      };

      const res = await createBroadcast(input);
      if (res.success && res.broadcast) {
        toast.success("Broadcast informasi berhasil dikirim!");
        const catName = categoriesList.find((c) => c.id === categoryId)?.name || null;
        const newRow: BroadcastRow = {
          ...res.broadcast,
          totalViews: 0,
          likes: 0,
          dislikes: 0,
          categoryId: categoryId || null,
          categoryName: catName,
        };
        setBroadcastsList([newRow, ...broadcastsList]);
        setIsCreateOpen(false);
        // Reset form
        setTitle("");
        setContent("");
        setImageUrl("");
        setLinkUrl("");
        setMediaType("image");
        setCategoryId(0);
        if (isSuperOrHrAdmin) {
          setTargetType("all");
          setTargetId(0);
        } else {
          setTargetType("section");
          if (metadata.sections.length > 0) {
            setTargetId(metadata.sections[0].id);
          }
        }
        setMaxPopups(5);
      } else {
        toast.error("Gagal mengirim broadcast.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setBroadcastsList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: nextStatus } : b))
    );

    try {
      const res = await toggleBroadcastActive(id, nextStatus);
      if (res.success) {
        toast.success(`Broadcast berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      } else {
        setBroadcastsList((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: currentStatus } : b))
        );
        toast.error("Gagal mengubah status.");
      }
    } catch (err) {
      setBroadcastsList((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: currentStatus } : b))
      );
      toast.error("Terjadi kesalahan.");
    }
  };

  // Delete Broadcast
  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus informasi broadcast ini secara permanen?")) {
      return;
    }

    try {
      const res = await deleteBroadcast(id);
      if (res.success) {
        setBroadcastsList((prev) => prev.filter((b) => b.id !== id));
        toast.success("Broadcast informasi berhasil dihapus.");
      } else {
        toast.error("Gagal menghapus broadcast.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan.");
    }
  };

  const getTargetLabel = (row: BroadcastRow) => {
    if (row.targetType === "all") return "Semua Karyawan";
    return `${row.targetType === "department" ? "Departemen" : "Section"}: ${
      row.targetValue || "Unknown"
    }`;
  };

  const scorecards = [
    { label: "Total Informasi", value: totalBroadcasts, tone: "blue" as const },
    { label: "Aktif Melayang", value: activeBroadcasts, tone: "emerald" as const },
    { label: "Total Dilihat", value: totalViews, tone: "amber" as const },
    { label: "Total Disukai (Likes)", value: totalLikes, tone: "rose" as const },
  ];

  return (
    <AdminPageShell
      eyebrow={isSuperOrHrAdmin ? "HO • Command Center" : "Section Head • Broadcast"}
      title={isSuperOrHrAdmin ? "HO Command Center Broadcasts" : "Broadcast Informasi Section"}
      description={
        isSuperOrHrAdmin
          ? "Kirimkan pengumuman, visual alert, video, dan banner penting dengan popup dinamis di aplikasi mobile karyawan."
          : "Kirimkan pengumuman penting, video tutorial, atau teks instruksi khusus langsung ke handphone tim section Anda."
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl inline-flex">
          <TabsTrigger value="siaran" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Siaran Informasi
          </TabsTrigger>
          <TabsTrigger value="analitik" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Analitik Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="siaran" className="space-y-6 focus-visible:outline-none">
          {/* Stats Summary Panel */}
          <div className="grid gap-4 md:grid-cols-4">
        {scorecards.map((card, i) => (
          <div
            key={i}
            className="rounded-[1rem] border border-border/60 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Table Shell */}
      <MinimalTableShell
        label="informasi"
        title="Daftar Informasi & Alert"
        description="Kelola informasi popup mobile, lihat data respon karyawan (Like/Dislike), serta pantau total tayang secara langsung."
        fileName="data-broadcast-command-center"
        searchPlaceholder="Cari judul informasi..."
        showImport={false}
        primaryAction={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#003f78] hover:bg-[#002f5a]"
          >
            <Plus className="mr-2 size-4" /> Kirim Informasi Baru
          </Button>
        }
      >
        <div className="overflow-x-auto rounded-[1rem] border bg-white">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead className="bg-muted/40 font-semibold text-muted-foreground border-b">
              <tr>
                <th className="p-4 w-[60px] text-center">No</th>
                <th className="p-4 w-[80px] text-center">Tipe</th>
                <th className="p-4 w-[100px]">Media</th>
                <th className="p-4">Informasi</th>
                <th className="p-4">Target Karyawan</th>
                <th className="p-4 text-center w-[120px]">Respon Responden</th>
                <th className="p-4 text-center w-[100px]">Total Dilihat</th>
                <th className="p-4 text-center w-[120px]">Max Popup</th>
                <th className="p-4 text-center w-[100px]">Aktif</th>
                <th className="p-4 text-center w-[80px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {broadcastsList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Belum ada informasi yang disiarkan.
                  </td>
                </tr>
              ) : (
                broadcastsList.map((row, idx) => {
                  const totalFeedback = row.likes + row.dislikes;
                  const likePercent = totalFeedback > 0 ? (row.likes / totalFeedback) * 100 : 0;
                  const dislikePercent = totalFeedback > 0 ? (row.dislikes / totalFeedback) * 100 : 0;

                  return (
                    <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 text-center text-muted-foreground font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
                          {row.mediaType === "image" && <ImageIcon className="size-3.5" />}
                          {row.mediaType === "video" && <VideoIcon className="size-3.5" />}
                          {row.mediaType === "text" && <FileText className="size-3.5" />}
                          <span className="capitalize">{row.mediaType}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        {row.mediaType === "text" ? (
                          <span className="text-xs text-muted-foreground font-semibold">
                            Teks Saja
                          </span>
                        ) : row.mediaType === "video" ? (
                          <div className="size-12 rounded-lg border bg-slate-900 flex items-center justify-center text-white">
                            <VideoIcon className="size-5" />
                          </div>
                        ) : (
                          <div className="relative size-12 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                            {row.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.imageUrl}
                                alt={row.title}
                                className="object-cover size-full"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-[300px]">
                        {row.categoryName && (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10 mb-1.5 uppercase tracking-wider">
                            {row.categoryName}
                          </span>
                        )}
                        <p className="font-semibold text-foreground">{row.title}</p>
                        {row.content && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {row.content}
                          </p>
                        )}
                        {row.linkUrl && (
                          <a
                             href={row.linkUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-flex items-center text-xs text-blue-600 hover:underline mt-1 font-medium"
                          >
                            Tautan Link <ExternalLink className="ml-1 size-3" />
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                           {getTargetLabel(row)}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-lg" onClick={() => handleOpenAnalytics(row)}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center text-emerald-600 font-bold">
                              <ThumbsUp className="mr-1 size-3" /> {row.likes}
                            </span>
                            <span className="flex items-center text-rose-600 font-bold">
                              <ThumbsDown className="mr-1 size-3" /> {row.dislikes}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                            {totalFeedback > 0 ? (
                              <>
                                <div className="h-full bg-emerald-500" style={{ width: `${likePercent}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${dislikePercent}%` }} />
                              </>
                            ) : (
                              <div className="h-full bg-gray-200 w-full" />
                            )}
                          </div>
                          <p className="text-[10px] text-center text-muted-foreground/80 mt-1">
                            Klik untuk rincian respon
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-center font-semibold tabular-nums text-foreground">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <Eye className="size-4 text-muted-foreground" />
                          {row.totalViews}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium tabular-nums text-muted-foreground">
                        {row.maxPopups}x tampil
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={row.isActive}
                            onCheckedChange={() => handleToggleActive(row.id, row.isActive)}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(row)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row.id)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </MinimalTableShell>
        </TabsContent>

        <TabsContent value="analitik" className="space-y-6 focus-visible:outline-none">
          {/* Selector Card */}
          <div className="rounded-[1rem] border border-border/60 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">Analitik Respon Feedback</h3>
                <p className="text-xs text-muted-foreground">Pilih siaran informasi untuk melihat rincian ketertarikan karyawan secara real-time.</p>
              </div>
              <div className="w-full sm:w-[320px]">
                <select
                  value={analyticsBroadcastId || 0}
                  onChange={(e) => handleSelectBroadcastForAnalytics(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="0">-- Pilih Informasi Broadcast --</option>
                  {broadcastsList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} {b.categoryName ? `[${b.categoryName}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!analyticsBroadcastId ? (
            <div className="rounded-[1rem] border border-border/60 bg-white p-12 text-center shadow-sm space-y-3">
              <div className="mx-auto size-12 rounded-full bg-blue-50 flex items-center justify-center text-[#003f78]">
                <ThumbsUp className="size-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-foreground">Pilih Informasi Broadcast</h4>
                <p className="text-xs text-muted-foreground">
                  Silakan pilih salah satu judul informasi broadcast pada dropdown di atas untuk melihat rincian analitik respon karyawan.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Left Panel: Detailed Feedback Lists */}
              <div className="md:col-span-3 rounded-[1rem] border border-border/60 bg-white shadow-sm overflow-hidden flex flex-col">
                <Tabs defaultValue="likes" className="w-full">
                  <div className="border-b bg-muted/20 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Rincian Responden</h4>
                    </div>
                    <TabsList className="grid w-full sm:w-[280px] grid-cols-2 bg-slate-100/80 p-0.5 rounded-lg">
                      <TabsTrigger value="likes" className="text-xs rounded-md">
                        Disukai ({analyticsData?.likedUsers?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="dislikes" className="text-xs rounded-md">
                        Kurang Disukai ({analyticsData?.dislikedUsers?.length || 0})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="likes" className="p-6 focus-visible:outline-none">
                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Loader2 className="animate-spin size-8 text-[#003f78]" />
                        <p className="text-xs font-semibold">Memuat rincian respon...</p>
                      </div>
                    ) : !analyticsData || analyticsData.likedUsers.length === 0 ? (
                      <p className="text-center py-12 text-xs text-muted-foreground font-medium">
                        Belum ada karyawan yang menyukai informasi ini.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-[0.5rem] border bg-white">
                        <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                          <thead className="bg-muted/40 font-bold text-muted-foreground border-b">
                            <tr>
                              <th className="p-3">Nama Karyawan</th>
                              <th className="p-3">Email</th>
                              <th className="p-3">Departemen</th>
                              <th className="p-3">Section</th>
                              <th className="p-3">Waktu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-medium text-foreground">
                            {analyticsData.likedUsers.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                                <td className="p-3 text-muted-foreground font-mono">{item.email}</td>
                                <td className="p-3 text-slate-600">{item.department || "-"}</td>
                                <td className="p-3 text-slate-600">{item.section || "-"}</td>
                                <td className="p-3 text-muted-foreground">
                                  {new Date(item.updatedAt).toLocaleString("id-ID", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="dislikes" className="p-6 focus-visible:outline-none">
                    {loadingAnalytics ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Loader2 className="animate-spin size-8 text-[#003f78]" />
                        <p className="text-xs font-semibold">Memuat rincian respon...</p>
                      </div>
                    ) : !analyticsData || analyticsData.dislikedUsers.length === 0 ? (
                      <p className="text-center py-12 text-xs text-muted-foreground font-medium">
                        Tidak ada karyawan yang kurang menyukai informasi ini.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-[0.5rem] border bg-white">
                        <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                          <thead className="bg-muted/40 font-bold text-muted-foreground border-b">
                            <tr>
                              <th className="p-3">Nama Karyawan</th>
                              <th className="p-3">Email</th>
                              <th className="p-3">Departemen</th>
                              <th className="p-3">Section</th>
                              <th className="p-3">Waktu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-medium text-foreground">
                            {analyticsData.dislikedUsers.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                                <td className="p-3 text-muted-foreground font-mono">{item.email}</td>
                                <td className="p-3 text-slate-600">{item.department || "-"}</td>
                                <td className="p-3 text-slate-600">{item.section || "-"}</td>
                                <td className="p-3 text-muted-foreground">
                                  {new Date(item.updatedAt).toLocaleString("id-ID", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Panel: Department/Section Like stats */}
              <div className="md:col-span-2 space-y-6">
                {/* Department Stats */}
                <div className="rounded-[1rem] border border-border/60 bg-white p-6 shadow-sm space-y-4">
                  <div className="border-b pb-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Suka Per Departemen</h4>
                  </div>
                  {loadingAnalytics ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin size-5 text-[#003f78]" />
                    </div>
                  ) : !analyticsData || analyticsData.departmentLikes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 font-medium">Belum ada data departemen.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {analyticsData.departmentLikes.map((item: any, idx: number) => {
                        const maxCount = Math.max(...analyticsData.departmentLikes.map((d: any) => d.count), 1);
                        const percent = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-700">{item.departmentName}</span>
                              <span className="text-[#003f78]">{item.count} Suka</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section Stats */}
                <div className="rounded-[1rem] border border-border/60 bg-white p-6 shadow-sm space-y-4">
                  <div className="border-b pb-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Suka Per Section</h4>
                  </div>
                  {loadingAnalytics ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin size-5 text-[#003f78]" />
                    </div>
                  ) : !analyticsData || analyticsData.sectionLikes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 font-medium">Belum ada data section.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {analyticsData.sectionLikes.map((item: any, idx: number) => {
                        const maxCount = Math.max(...analyticsData.sectionLikes.map((s: any) => s.count), 1);
                        const percent = (item.count / maxCount) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-700">{item.sectionName}</span>
                              <span className="text-[#003f78]">{item.count} Suka</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog for Creating Broadcast */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[1.2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Kirim Informasi Baru</DialogTitle>
            <DialogDescription>
              {isSuperOrHrAdmin
                ? "Buat siaran informasi ke seluruh karyawan atau departemen tertentu."
                : "Buat pengumuman informasi khusus untuk seluruh karyawan di tim section Anda."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-semibold">
                Judul Informasi <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Contoh: Pengumuman Jam Kerja Ramadhan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Category Selector with search & addition */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="category" className="text-sm font-semibold">
                  Kategori Informasi
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryInput(!showAddCategoryInput);
                    setNewCategoryName("");
                  }}
                  className="text-xs text-[#003f78] hover:underline font-bold"
                >
                  {showAddCategoryInput ? "Batal" : "+ Tambah Kategori Baru"}
                </button>
              </div>

              {showAddCategoryInput ? (
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Ketik kategori baru (contoh: Edukasi)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    disabled={creatingCategory}
                    onClick={handleCreateCategoryInline}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-3.5 rounded-md text-xs font-bold shrink-0"
                  >
                    {creatingCategory ? "Menambah..." : "Simpan"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="🔍 Cari/Filter kategori..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="0">-- Pilih Kategori --</option>
                    {categoriesList
                      .filter((c) =>
                        c.name.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-sm font-semibold">
                Deskripsi Singkat / Konten Teks
              </Label>
              <Textarea
                id="content"
                placeholder="Tulis detail pengumuman disini..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            {/* Media Type Selection */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType("image");
                  setImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  mediaType === "image"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <ImageIcon className="size-5" />
                <span>Gambar Banner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaType("video");
                  setImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  mediaType === "video"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <VideoIcon className="size-5" />
                <span>Video Player</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaType("text");
                  setImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  mediaType === "text"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <FileText className="size-5" />
                <span>Hanya Teks</span>
              </button>
            </div>

            {/* Target Audience selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Target Audience</Label>
                {isSuperOrHrAdmin ? (
                  <select
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value as any);
                      setTargetId(0);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="all">Semua Karyawan</option>
                    <option value="department">Per Departemen</option>
                    <option value="section">Per Section</option>
                  </select>
                ) : (
                  <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center justify-between">
                    <span>Per Section</span>
                    <Lock className="size-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  {targetType === "department" ? "Pilih Departemen" : "Pilih Section"}
                </Label>
                {isSuperOrHrAdmin ? (
                  targetType === "all" ? (
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                      Semua Karyawan (Tanpa Filter)
                    </div>
                  ) : (
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">-- Pilih --</option>
                      {targetType === "department"
                        ? metadata.departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))
                        : metadata.sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                    </select>
                  )
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    {metadata.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Link destination and Limit count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="linkUrl" className="text-sm font-semibold">
                  Tautan Link (URL Redirect)
                </Label>
                <Input
                  id="linkUrl"
                  type="url"
                  placeholder="https://example.com/pengumuman"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxPopups" className="text-sm font-semibold">
                  Maksimal Popup Tampil
                </Label>
                <Input
                  id="maxPopups"
                  type="number"
                  min={1}
                  max={50}
                  value={maxPopups}
                  onChange={(e) => setMaxPopups(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Visual Attachment / Upload (Image / Video input) */}
            {mediaType === "image" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Gambar Banner Informasi <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="flex-1 cursor-pointer"
                  />
                  {uploading && <Loader2 className="animate-spin text-muted-foreground" />}
                </div>

                {imageUrl && (
                  <div className="mt-3 rounded-lg border overflow-hidden max-h-[160px] bg-muted/40 relative flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Upload Preview"
                      className="max-h-[144px] object-contain rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {mediaType === "video" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Tautan / Link Video (MP4 / YouTube / S3 URL) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://example.com/video.mp4 atau link YouTube"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  required
                />
                {imageUrl && (
                  <div className="mt-2 text-xs text-muted-foreground break-all">
                    Video: <span className="font-mono">{imageUrl}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || uploading}
                className="bg-[#003f78] hover:bg-[#002f5a]"
              >
                {saving ? "Mengirim..." : "Kirim Siaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Editing Broadcast */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[1.2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit & Kirim Ulang Informasi</DialogTitle>
            <DialogDescription>
              Ubah detail siaran informasi ini. Anda dapat memilih untuk mengirim ulang siaran agar muncul kembali di mobile karyawan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editTitle" className="text-sm font-semibold">
                Judul Informasi <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="editTitle"
                placeholder="Contoh: Pengumuman Jam Kerja Ramadhan"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            {/* Category Selector with search & addition */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="editCategory" className="text-sm font-semibold">
                  Kategori Informasi
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryInput(!showAddCategoryInput);
                    setNewCategoryName("");
                  }}
                  className="text-xs text-[#003f78] hover:underline font-bold"
                >
                  {showAddCategoryInput ? "Batal" : "+ Tambah Kategori Baru"}
                </button>
              </div>

              {showAddCategoryInput ? (
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Ketik kategori baru (contoh: Edukasi)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    disabled={creatingCategory}
                    onClick={handleCreateCategoryInline}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-3.5 rounded-md text-xs font-bold shrink-0"
                  >
                    {creatingCategory ? "Menambah..." : "Simpan"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="🔍 Cari/Filter kategori..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="0">-- Pilih Kategori --</option>
                    {categoriesList
                      .filter((c) =>
                        c.name.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editContent" className="text-sm font-semibold">
                Deskripsi Singkat / Konten Teks
              </Label>
              <Textarea
                id="editContent"
                placeholder="Tulis detail pengumuman disini..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
              />
            </div>

            {/* Media Type Selection */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditMediaType("image");
                  setEditImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  editMediaType === "image"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <ImageIcon className="size-5" />
                <span>Gambar Banner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditMediaType("video");
                  setEditImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  editMediaType === "video"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <VideoIcon className="size-5" />
                <span>Video Player</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditMediaType("text");
                  setEditImageUrl("");
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 border rounded-xl gap-1 text-xs font-semibold transition-all",
                  editMediaType === "text"
                    ? "border-[#003f78] bg-blue-50 text-[#003f78]"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <FileText className="size-5" />
                <span>Hanya Teks</span>
              </button>
            </div>

            {/* Target Audience selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Target Audience</Label>
                {isSuperOrHrAdmin ? (
                  <select
                    value={editTargetType}
                    onChange={(e) => {
                      setEditTargetType(e.target.value as any);
                      setEditTargetId(0);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="all">Semua Karyawan</option>
                    <option value="department">Per Departemen</option>
                    <option value="section">Per Section</option>
                  </select>
                ) : (
                  <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center justify-between">
                    <span>Per Section</span>
                    <Lock className="size-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  {editTargetType === "department" ? "Pilih Departemen" : "Pilih Section"}
                </Label>
                {isSuperOrHrAdmin ? (
                  editTargetType === "all" ? (
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                      Semua Karyawan (Tanpa Filter)
                    </div>
                  ) : (
                    <select
                      value={editTargetId}
                      onChange={(e) => setEditTargetId(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">-- Pilih --</option>
                      {editTargetType === "department"
                        ? metadata.departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))
                        : metadata.sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                    </select>
                  )
                ) : (
                  <select
                    value={editTargetId}
                    onChange={(e) => setEditTargetId(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    {metadata.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Link destination and Limit count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editLinkUrl" className="text-sm font-semibold">
                  Tautan Link (URL Redirect)
                </Label>
                <Input
                  id="editLinkUrl"
                  type="url"
                  placeholder="https://example.com/pengumuman"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editMaxPopups" className="text-sm font-semibold">
                  Maksimal Popup Tampil
                </Label>
                <Input
                  id="editMaxPopups"
                  type="number"
                  min={1}
                  max={50}
                  value={editMaxPopups}
                  onChange={(e) => setEditMaxPopups(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Visual Attachment / Upload (Image / Video input) */}
            {editMediaType === "image" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Gambar Banner Informasi <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPhotoUpload}
                    disabled={uploading}
                    className="flex-1 cursor-pointer"
                  />
                  {uploading && <Loader2 className="animate-spin text-muted-foreground" />}
                </div>

                {editImageUrl && (
                  <div className="mt-3 rounded-lg border overflow-hidden max-h-[160px] bg-muted/40 relative flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editImageUrl}
                      alt="Upload Preview"
                      className="max-h-[144px] object-contain rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {editMediaType === "video" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Tautan / Link Video (MP4 / YouTube / S3 URL) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://example.com/video.mp4 atau link YouTube"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  required
                />
                {editImageUrl && (
                  <div className="mt-2 text-xs text-muted-foreground break-all">
                    Video: <span className="font-mono">{editImageUrl}</span>
                  </div>
                )}
              </div>
            )}

            {/* Kirim Ulang Switch (Reset status tonton karyawan) */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 mt-4">
              <div className="space-y-0.5">
                <Label htmlFor="resendFlag" className="text-sm font-bold text-[#003f78]">
                  Kirim Ulang Informasi
                </Label>
                <p className="text-[11px] text-muted-foreground max-w-[360px]">
                  Aktifkan ini untuk me-reset view/reaction karyawan agar popup muncul kembali dan mengirim push notification baru.
                </p>
              </div>
              <Switch
                id="resendFlag"
                checked={resendFlag}
                onCheckedChange={setResendFlag}
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving || uploading}
                className="bg-[#003f78] hover:bg-[#002f5a]"
              >
                {saving ? "Menyimpan..." : resendFlag ? "Simpan & Kirim Ulang" : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AdminPageShell>
  );
}
