"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadFile } from "@/app/actions/upload";
import { submitApdRequest } from "../actions";
import { AlertCircle, Camera, CheckCircle2, Image as ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import type { ApdRequestCategory } from "@/lib/apd-status";

const APD_ITEMS = [
  "Safety Glasses",
  "Masker",
  "Ear Plug",
  "Sarung Tangan Ansel",
  "Safety Shoes",
  "Safety Boot Petrova",
  "Helmet Kuning",
  "Helmet Putih",
  "Padlock Merah",
  "Padlock Kuning",
  "Sisor",
  "Tali Kacamata",
  "Chin Strap",
  "Dalaman Helm",
  "Kaos Tangan Dotting",
  "Safety Goggles",
  "Apron",
  "Face Shield Helmet",
  "Sunbrim Helmet",
];

type ApdItemInput = {
  id: string;
  itemType: string;
  requestType: "baru" | "pergantian";
  quantity: number;
  notes: string;
  photoFiles: File[];
  photoPreviews: string[];
  photoUrl?: string;
};

interface ApdRequestFormProps {
  employeeName: string;
  employeeSn: string;
  departmentName: string | null;
  sectionName: string | null;
  itemOptions: Record<Exclude<ApdRequestCategory, "APD">, string[]>;
  defaultMode?: "apd" | "tools" | "material";
  mobileWide?: boolean;
}

export function ApdRequestForm({
  employeeName,
  employeeSn,
  departmentName,
  sectionName,
  itemOptions,
  defaultMode = "apd",
  mobileWide = false,
}: ApdRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestMode, setRequestMode] = useState<"apd" | "tools" | "material">(defaultMode);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ApdItemInput[]>([
    { id: crypto.randomUUID(), itemType: APD_ITEMS[0], requestType: "baru", quantity: 1, notes: "", photoFiles: [], photoPreviews: [] },
  ]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemType: requestMode === "apd" ? APD_ITEMS[0] : "", requestType: "baru", quantity: 1, notes: "", photoFiles: [], photoPreviews: [] },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ApdItemInput, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleAddPhotos = (id: string, newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const addedFiles = Array.from(newFiles);
    const addedPreviews = addedFiles.map((file) => URL.createObjectURL(file));

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          photoFiles: [...item.photoFiles, ...addedFiles],
          photoPreviews: [...(item.photoPreviews || []), ...addedPreviews],
        };
      })
    );
  };

  const handleRemovePhoto = (id: string, photoIdx: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newFiles = item.photoFiles.filter((_, idx) => idx !== photoIdx);
        const newPreviews = (item.photoPreviews || []).filter((_, idx) => idx !== photoIdx);
        return {
          ...item,
          photoFiles: newFiles,
          photoPreviews: newPreviews,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (items.length === 0) {
        throw new Error("Pilih minimal 1 item APD");
      }

      for (const item of items) {
        if (!item.itemType || item.itemType.trim() === "") {
          throw new Error("Terdapat item yang jenis/namanya belum diisi");
        }
        if (item.requestType === "pergantian") {
          const validPhotos = (item.photoFiles || []).filter(Boolean);
          if (validPhotos.length < 3) {
            throw new Error(`Item "${item.itemType}" membutuhkan minimal 3 foto bukti barang rusak/lama. Saat ini baru ${validPhotos.length} foto terlampir.`);
          }
        }
      }

      let signatureUrl = "";
      if (signatureFile) {
        signatureUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(signatureFile);
        });
      }

      // Upload photos for replacements (supporting min 3 photos per item)
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let photoUrl = "";
          if (item.requestType === "pergantian" && item.photoFiles && item.photoFiles.length > 0) {
            const uploadedUrls = await Promise.all(
              item.photoFiles.map(async (file) => {
                const fd = new FormData();
                fd.append("file", file);
                const uploadRes = await uploadFile(fd);
                if (uploadRes.success && uploadRes.url) {
                  return uploadRes.url as string;
                }
                throw new Error(`Gagal mengupload salah satu foto untuk ${item.itemType}`);
              })
            );
            photoUrl = JSON.stringify(uploadedUrls);
          }
          return {
            itemType: item.itemType,
            requestType: item.requestType,
            quantity: item.quantity,
            notes: item.notes,
            photoUrl,
          };
        })
      );

      const submitData = new FormData();
      submitData.append("notes", notes);
      submitData.append("signatureUrl", signatureUrl);
      submitData.append("requestCategory", requestMode === "apd" ? "APD" : requestMode.toUpperCase());
      submitData.append("items", JSON.stringify(processedItems));

      const res = await submitApdRequest(submitData);
      if (res.success) {
        toast.success(`${requestMode === "apd" ? "Permintaan APD" : `Request ${requestMode === "tools" ? "Tools" : "Material"}`} berhasil diajukan!`);
        router.push("/dashboard/apd");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-border shadow-sm bg-muted/50">
        <CardContent className={mobileWide ? "p-2 sm:p-6" : "p-4 sm:p-6"}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Informasi Pemohon (Otomatis)</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tanggal Pengajuan</p>
              <p className="font-medium text-sm">{today}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Nama Karyawan</p>
              <p className="font-medium text-sm">{employeeName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">NIK / SN</p>
              <p className="font-medium text-sm">{employeeSn}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Departemen / Section</p>
              <p className="font-medium text-sm">
                {departmentName || "-"} {sectionName ? `/ ${sectionName}` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className={`${mobileWide ? "p-2" : "p-4"} space-y-6 sm:p-6`}>
          <div className="flex gap-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Jenis request barang">
            {([
              ["apd", "Request APD"],
              ["tools", "Request Tools"],
              ["material", "Request Material"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={requestMode === value}
                className={`min-h-12 flex-1 rounded-md px-4 text-sm font-medium transition ${requestMode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => {
                  setRequestMode(value);
                  setItems((prev) => prev.map((item) => ({ ...item, itemType: value === "apd" ? APD_ITEMS[0] : "" })));
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {requestMode === "apd" ? "Daftar Item APD" : `Daftar ${requestMode === "tools" ? "Tools" : "Material"}`}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="size-4" /> Tambah Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="relative rounded-lg border bg-card p-4 shadow-sm">
                <div className="absolute right-4 top-4">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{requestMode === "apd" ? "Jenis APD" : `Barang / ${requestMode === "tools" ? "Tools" : "Material"}`}</Label>
                    {requestMode === "apd" ? (
                      <Select value={item.itemType} onValueChange={(val) => updateItem(item.id, "itemType", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APD_ITEMS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <Input
                          list={`apd-item-options-${requestMode}`}
                          placeholder={`Pilih atau tulis ${requestMode === "tools" ? "tools" : "material"}`}
                          value={item.itemType}
                          onChange={(e) => updateItem(item.id, "itemType", e.target.value.toUpperCase())}
                        />
                        <datalist id={`apd-item-options-${requestMode}`}>
                          {itemOptions[requestMode === "tools" ? "TOOLS" : "MATERIAL"].map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Permintaan</Label>
                    <Select value={item.requestType} onValueChange={(val) => updateItem(item.id, "requestType", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="pergantian">Pergantian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jumlah</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} 
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-1">
                    <Label>Keterangan/Ukuran</Label>
                    <Input 
                      placeholder="Mis: Ukuran 42" 
                      value={item.notes} 
                      onChange={(e) => updateItem(item.id, "notes", e.target.value)} 
                    />
                  </div>
                </div>

                {item.requestType === "pergantian" && (
                  <div className="mt-4 space-y-3 rounded-lg border border-dashed border-rose-300 bg-rose-50/40 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Label className="text-rose-700 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                          <Camera className="size-4 text-rose-600" />
                          Foto Bukti Barang Rusak/Lama (Wajib Minimal 3 Foto)
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Lampirkan minimal 3 foto jelas (tampak depan, area rusak/aus, dan detail/label).
                        </p>
                      </div>
                      <div className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                        (item.photoFiles || []).length >= 3 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}>
                        {(item.photoFiles || []).length >= 3 ? (
                          <>
                            <CheckCircle2 className="size-3.5 text-emerald-700" />
                            <span>{(item.photoFiles || []).length}/3 Foto (Lengkap)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-3.5 text-amber-700" />
                            <span>{(item.photoFiles || []).length}/3 Foto (Kurang {3 - (item.photoFiles || []).length})</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Previews grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                      {(item.photoPreviews || []).map((previewUrl, pIdx) => (
                        <div key={pIdx} className="relative group rounded-md border border-slate-200 bg-white overflow-hidden shadow-xs aspect-square flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt={`Foto ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Foto #{pIdx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(item.id, pIdx)}
                            className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-colors cursor-pointer"
                            title="Hapus Foto"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add photo trigger button */}
                      <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white/80 hover:bg-white rounded-md aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer transition-all p-2 text-center shadow-xs">
                        <Camera className="size-5 text-slate-500" />
                        <span className="text-[10px] font-semibold text-slate-700">
                          {(item.photoFiles || []).length === 0 ? "Pilih 3+ Foto" : "+ Tambah Foto"}
                        </span>
                        <span className="text-[8.5pt] text-slate-400">
                          {(item.photoFiles || []).length < 3 ? `(Wajib ${3 - (item.photoFiles || []).length} lagi)` : "(Bisa tambah)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleAddPhotos(item.id, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Catatan Tambahan (Opsional)</Label>
            <Textarea 
              placeholder="Tuliskan catatan tambahan jika ada..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
            />
          </div>

          <div className="space-y-2">
            <Label>Tanda Tangan Digital (Opsional)</Label>
            <p className="text-sm text-muted-foreground">Tanda tangan langsung pada area di bawah ini</p>
            <SignaturePad onSignatureChange={setSignatureFile} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Kirim Permohonan
        </Button>
      </div>
    </form>
  );
}
