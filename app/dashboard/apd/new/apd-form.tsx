"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadFile } from "@/app/actions/upload";
import { submitApdRequest } from "../actions";
import { AlertCircle, Camera, CheckCircle2, Edit3, Image as ImageIcon, Loader2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import { getUserSignatureAction, saveUserSignatureAction } from "@/app/actions/user-signature";
import { FiveRCameraModal } from "@/components/five-r/five-r-camera-modal";
import { SearchableEmployeeSelect } from "@/components/searchable-employee-select";
import { type ApdRequestCategory, APD_ITEMS, APD_SIZE_OPTIONS, type ApproverOption } from "@/lib/apd-status";

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
  itemOptions: Record<string, string[]>;
  approverOptions?: ApproverOption[];
  sectionOptions?: Array<{ id: number; name: string }>;
  canSelectTargetSection?: boolean;
  defaultMode?: "apd" | "tools" | "material";
  mobileWide?: boolean;
  requestId?: number;
  initialNotes?: string;
  initialItems?: Array<{
    itemType: string;
    requestType: "baru" | "pergantian";
    quantity: number;
    notes: string;
    photoUrl?: string;
  }>;
  initialApprover1Id?: string;
  initialApprover2Id?: string;
  initialTargetSectionId?: number | null;
}

function parsePhotoPreviews(photoUrl?: string | null): string[] {
  if (!photoUrl) return [];
  try {
    const parsed = JSON.parse(photoUrl);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // not JSON
  }
  return [photoUrl].filter(Boolean);
}

export function ApdRequestForm({
  employeeName,
  employeeSn,
  departmentName,
  sectionName,
  itemOptions,
  approverOptions,
  sectionOptions = [],
  canSelectTargetSection = false,
  defaultMode = "apd",
  mobileWide = false,
  requestId,
  initialNotes = "",
  initialItems,
  initialApprover1Id = "",
  initialApprover2Id = "",
  initialTargetSectionId = null,
}: ApdRequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestMode, setRequestMode] = useState<"apd" | "tools" | "material">(defaultMode);
  const [targetSectionId, setTargetSectionId] = useState<string>(initialTargetSectionId ? String(initialTargetSectionId) : "");
  const [notes, setNotes] = useState(initialNotes);
  const [approver1Id, setApprover1Id] = useState<string>(initialApprover1Id);
  const [approver2Id, setApprover2Id] = useState<string>(initialApprover2Id);
  const [items, setItems] = useState<ApdItemInput[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems.map((item) => {
        const previews = parsePhotoPreviews(item.photoUrl);
        return {
          id: crypto.randomUUID(),
          itemType: item.itemType,
          requestType: item.requestType,
          quantity: item.quantity,
          notes: item.notes || "",
          photoFiles: [],
          photoPreviews: previews,
          photoUrl: item.photoUrl,
        };
      });
    }
    return [
      { id: crypto.randomUUID(), itemType: APD_ITEMS[0], requestType: "baru", quantity: 1, notes: "", photoFiles: [], photoPreviews: [] },
    ];
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [profileSignature, setProfileSignature] = useState<string | null>(null);
  const [isDrawingCustomSig, setIsDrawingCustomSig] = useState(false);
  const [customSignatureDataUrl, setCustomSignatureDataUrl] = useState<string | null>(null);
  const [activeCameraItemId, setActiveCameraItemId] = useState<string | null>(null);

  function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const handleCapturePhoto = (id: string, dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `bukti_apd_${Date.now()}.jpg`);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          photoFiles: [...item.photoFiles, file],
          photoPreviews: [...(item.photoPreviews || []), dataUrl],
        };
      })
    );
    toast.success("Foto berhasil diambil dari kamera!");
  };

  useEffect(() => {
    let isMounted = true;
    getUserSignatureAction().then((res) => {
      if (isMounted && res.success && res.signatureDataUrl) {
        setProfileSignature(res.signatureDataUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
          const validPreviews = (item.photoPreviews || []).filter(Boolean);
          const totalPhotos = Math.max(validPhotos.length, validPreviews.length);
          if (totalPhotos < 3 && parsePhotoPreviews(item.photoUrl).length < 3) {
            throw new Error(`Item "${item.itemType}" (Pergantian) membutuhkan minimal 3 foto bukti fisik barang rusak/lama. Saat ini baru ${Math.max(totalPhotos, parsePhotoPreviews(item.photoUrl).length)} foto terlampir.`);
          }
        }
      }

      if (requestMode === "tools" || requestMode === "material") {
        if (!approver1Id) {
          throw new Error(`Silakan pilih Approver 1 (Atasan Langsung / Pemeriksa) untuk permohonan ${requestMode === "tools" ? "Tools" : "Material"}`);
        }
        if (!approver2Id) {
          throw new Error(`Silakan pilih Approver 2 (Section Head / Penyetuju) untuk permohonan ${requestMode === "tools" ? "Tools" : "Material"}`);
        }
        if (approver1Id === approver2Id) {
          throw new Error("Approver 1 dan Approver 2 tidak boleh memilih orang yang sama");
        }
      }

      let signatureUrl = "";
      if (!isDrawingCustomSig && profileSignature) {
        signatureUrl = profileSignature;
      } else if (customSignatureDataUrl) {
        signatureUrl = customSignatureDataUrl;
      } else if (signatureFile) {
        signatureUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(signatureFile);
        });
      }

      // Upload photos for replacements (supporting 1 or more photos per item)
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let photoUrl = item.photoUrl || "";
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
            const existingUrls = parsePhotoPreviews(item.photoUrl);
            const combinedUrls = Array.from(new Set([...existingUrls, ...uploadedUrls]));
            photoUrl = JSON.stringify(combinedUrls);
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
      if (requestId) {
        submitData.append("requestId", String(requestId));
      }
      submitData.append("notes", notes);
      submitData.append("signatureUrl", signatureUrl);
      submitData.append("requestCategory", requestMode === "apd" ? "APD" : requestMode.toUpperCase());
      submitData.append("items", JSON.stringify(processedItems));
      if (targetSectionId) {
        submitData.append("targetSectionId", targetSectionId);
      }
      if (approver1Id) {
        submitData.append("approver1Id", approver1Id);
      }
      if (approver2Id) {
        submitData.append("approver2Id", approver2Id);
      }

      const res = await submitApdRequest(submitData);
      if (res.success) {
        toast.success(
          requestId
            ? `Revisi ${requestMode === "apd" ? "Permintaan APD" : `Request ${requestMode === "tools" ? "Tools" : "Material"}`} berhasil dikirim ulang!`
            : `${requestMode === "apd" ? "Permintaan APD" : `Request ${requestMode === "tools" ? "Tools" : "Material"}`} berhasil diajukan!`
        );
        router.push("/dashboard/apd");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="border-slate-200/80 bg-slate-50/70 shadow-2xs rounded-2xl">
        <CardContent className={mobileWide ? "p-3.5 sm:p-5" : "p-4 sm:p-5"}>
          <div className="flex items-center justify-between mb-2.5 border-b border-slate-200/60 pb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Informasi Pemohon & Seksi Target</h3>
            <span className="text-[10px] font-semibold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">Otomatis</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4 sm:gap-4">
            <div>
              <p className="text-[11px] text-slate-500">Nama Karyawan</p>
              <p className="font-semibold text-slate-900 truncate">{employeeName}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">NIK / SN</p>
              <p className="font-semibold text-slate-900">{employeeSn}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Departemen / Section Asal</p>
              <p className="font-semibold text-slate-900 truncate">
                {departmentName || "-"} {sectionName ? `/ ${sectionName}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Tanggal Pengajuan</p>
              <p className="font-semibold text-slate-900">{today}</p>
            </div>
          </div>

          {canSelectTargetSection && sectionOptions.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-slate-200/60">
              <Label htmlFor="targetSectionId" className="text-xs font-semibold text-slate-700">
                Seksi Pemilik / Tujuan APD <span className="text-amber-600 font-normal">(Khusus HSE & Admin)</span>
              </Label>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Pilih seksi yang APD-nya dipesankan. Pengajuan akan dirutekan ke Section Head seksi target dan masuk ke Summary APD seksi tersebut.
              </p>
              <Select value={targetSectionId} onValueChange={setTargetSectionId}>
                <SelectTrigger id="targetSectionId" className="h-10 bg-white border-slate-300 text-xs">
                  <SelectValue placeholder={`Default: Seksi Pemohon (${sectionName || "Seksi Asal"})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default: Seksi Pemohon ({sectionName || "Seksi Asal"})</SelectItem>
                  {sectionOptions.map((sec) => (
                    <SelectItem key={sec.id} value={String(sec.id)}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
        <CardContent className={`${mobileWide ? "p-3 sm:p-6" : "p-4 sm:p-6"} space-y-5`}>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1.5" role="tablist" aria-label="Jenis request barang">
            {([
              ["apd", "APD"],
              ["tools", "Tools"],
              ["material", "Material"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={requestMode === value}
                className={`h-10 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  requestMode === value 
                    ? "bg-white text-blue-700 shadow-xs font-bold" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
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
            <div className="flex items-center justify-between pt-1">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {requestMode === "apd" ? "Daftar Item APD" : `Daftar ${requestMode === "tools" ? "Tools" : "Material"}`}
                </h3>
                <p className="text-xs text-slate-500">Pilih & atur jumlah barang yang diajukan</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9 gap-1.5 rounded-xl border-slate-200 text-xs font-semibold hover:bg-slate-50">
                <Plus className="size-3.5 text-blue-600" /> Tambah Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="relative rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg">
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">{requestMode === "apd" ? "Jenis APD" : `Barang / ${requestMode === "tools" ? "Tools" : "Material"}`}</Label>
                    {requestMode === "apd" ? (
                      <Select value={item.itemType} onValueChange={(val) => updateItem(item.id, "itemType", val)}>
                        <SelectTrigger className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"><SelectValue placeholder="Pilih Jenis APD..." /></SelectTrigger>
                        <SelectContent>
                          {(itemOptions.APD && itemOptions.APD.length > 0 ? itemOptions.APD : APD_ITEMS).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <Input
                          list={`apd-item-options-${requestMode}`}
                          placeholder={`Pilih atau tulis ${requestMode === "tools" ? "tools" : "material"}`}
                          value={item.itemType}
                          className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Jenis Permintaan</Label>
                      <Select value={item.requestType} onValueChange={(val) => updateItem(item.id, "requestType", val)}>
                        <SelectTrigger className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baru">Baru</SelectItem>
                          <SelectItem value="pergantian">Pergantian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Jumlah</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
                        onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">{requestMode === "apd" ? "Ukuran APD" : "Keterangan/Ukuran"}</Label>
                    {requestMode === "apd" ? (
                      <div className="space-y-2">
                        <Select
                          value={
                            APD_SIZE_OPTIONS.includes(item.notes as any)
                              ? item.notes
                              : item.notes ? "custom" : ""
                          }
                          onValueChange={(val) => {
                            if (val === "custom") {
                              updateItem(
                                item.id,
                                "notes",
                                item.notes && !APD_SIZE_OPTIONS.includes(item.notes as any) ? item.notes : "Custom"
                              );
                            } else {
                              updateItem(item.id, "notes", val);
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder="Pilih Ukuran APD..." />
                          </SelectTrigger>
                          <SelectContent>
                            {APD_SIZE_OPTIONS.map((sizeOpt) => (
                              <SelectItem key={sizeOpt} value={sizeOpt}>
                                {sizeOpt}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Lainnya (Tulis Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                        {(!APD_SIZE_OPTIONS.includes(item.notes as any) && item.notes !== "") && (
                          <Input
                            placeholder="Tulis ukuran / keterangan manual..."
                            value={item.notes === "Custom" ? "" : item.notes}
                            className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                          />
                        )}
                      </div>
                    ) : (
                      <Input 
                        placeholder="Mis: Ukuran 42 / Keterangan" 
                        value={item.notes} 
                        className="h-10 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
                        onChange={(e) => updateItem(item.id, "notes", e.target.value)} 
                      />
                    )}
                  </div>
                </div>

                {item.requestType === "pergantian" && (
                  <div className="mt-3 space-y-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/30 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Label className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                          <AlertCircle className="size-3.5 text-rose-600" />
                          Foto Bukti Barang Rusak/Lama (Wajib Minimal 3 Foto) <span className="text-rose-600">*</span>
                        </Label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Lampirkan minimal 3 foto jelas (tampak depan, area rusak/aus, dan detail/label barang lama).
                        </p>
                      </div>
                      <div className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        (item.photoPreviews || []).length >= 3 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}>
                        {(item.photoPreviews || []).length >= 3 ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-700" />
                            <span>{(item.photoPreviews || []).length}/3 Foto (Lengkap)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-3 text-amber-700" />
                            <span>{(item.photoPreviews || []).length}/3 Foto (Kurang {3 - (item.photoPreviews || []).length})</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons bar */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveCameraItemId(item.id)}
                        className="bg-white border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1.5 rounded-xl h-9 shadow-2xs"
                      >
                        <Camera className="size-3.5 text-rose-600" />
                        Foto Langsung (Kamera)
                      </Button>

                      <label className="inline-flex items-center justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9 px-3 cursor-pointer gap-1.5 shadow-2xs">
                        <ImageIcon className="size-3.5 text-slate-600" />
                        Pilih Galeri / File
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

                    {/* Previews grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                      {(item.photoPreviews || []).map((previewUrl, pIdx) => (
                        <div key={pIdx} className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs aspect-square flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt={`Foto ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            #{pIdx + 1}
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

                      {/* Add photo trigger card: Kamera */}
                      <button
                        type="button"
                        onClick={() => setActiveCameraItemId(item.id)}
                        className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/50 hover:bg-rose-50 rounded-xl aspect-square flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all p-1.5 text-center shadow-2xs text-rose-800"
                      >
                        <Camera className="size-4 text-rose-600" />
                        <span className="text-[10px] font-bold">
                          Kamera
                        </span>
                      </button>

                      {/* Add photo trigger card: Galeri/File */}
                      <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 rounded-xl aspect-square flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all p-1.5 text-center shadow-2xs">
                        <ImageIcon className="size-4 text-slate-500" />
                        <span className="text-[10px] font-semibold text-slate-700">
                          Upload
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

          {/* Section: Penyetuju / Approver Selection (Material & Tools) */}
          {(requestMode === "tools" || requestMode === "material") && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Persetujuan / Approver Permohonan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih 2 atasan yang berwenang menyetujui pengajuan {requestMode === "tools" ? "Tools" : "Material"} ini secara berjenjang.
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Wajib 2 Tingkat
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Approver 1 (Atasan Langsung / Pemeriksa) <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">Tahap 1</span>
                  </div>
                  <SearchableEmployeeSelect
                    employees={approverOptions || []}
                    value={approver1Id}
                    onValueChange={(val) => setApprover1Id(val)}
                    placeholder="Pilih Atasan Langsung (Nama / NIK)..."
                    showLabel={false}
                  />
                  <p className="text-[11px] text-slate-500">
                    Menerima review pertama di Inbox Approval, Email, dan Bell.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-800">
                      Approver 2 (Section Head / Penyetuju Final) <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">Tahap 2</span>
                  </div>
                  <SearchableEmployeeSelect
                    employees={approverOptions || []}
                    value={approver2Id}
                    onValueChange={(val) => setApprover2Id(val)}
                    placeholder="Pilih Section Head / Penyetuju (Nama / NIK)..."
                    showLabel={false}
                  />
                  <p className="text-[11px] text-slate-500">
                    Menerima review setelah Approver 1 memberikan persetujuan.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Remarks (Opsional)</Label>
            <Textarea 
              placeholder="Tuliskan remarks / catatan jika ada..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
              className="rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-slate-800 shadow-2xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label className="text-xs sm:text-sm font-bold text-slate-900">Tanda Tangan Digital (Opsional)</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tanda tangan verifikasi pemohon pengajuan barang.
                </p>
              </div>

              {profileSignature && !isDrawingCustomSig && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDrawingCustomSig(true)}
                  className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold gap-1.5 rounded-lg shadow-2xs cursor-pointer"
                >
                  <Edit3 className="size-3" /> Ubah / Gambar Manual
                </Button>
              )}

              {profileSignature && isDrawingCustomSig && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDrawingCustomSig(false);
                    setCustomSignatureDataUrl(null);
                  }}
                  className="h-7 text-xs border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold gap-1 rounded-lg shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="size-3 text-emerald-600" /> Gunakan TTD Profil
                </Button>
              )}
            </div>

            {profileSignature && !isDrawingCustomSig ? (
              <div className="space-y-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 flex items-center justify-center min-h-[110px] relative shadow-2xs">
                  <img
                    src={profileSignature}
                    alt="Tanda Tangan Profil HERO"
                    className="max-h-20 w-auto object-contain"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="size-3 text-emerald-700" /> TTD Profil HERO Aktif
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                  Otomatis menggunakan tanda tangan akun profil Anda ({employeeName}).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <SignaturePad
                  onSignatureChange={setSignatureFile}
                  onDataUrlChange={setCustomSignatureDataUrl}
                  height={150}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">
                    Goreskan tanda tangan dengan mouse atau sentuhan jari.
                  </span>
                  {customSignatureDataUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!customSignatureDataUrl) return;
                        try {
                          const sRes = await saveUserSignatureAction(customSignatureDataUrl);
                          if (sRes.success) {
                            setProfileSignature(customSignatureDataUrl);
                            setIsDrawingCustomSig(false);
                            toast.success("Tanda tangan berhasil disimpan ke profil HERO Anda!");
                          } else {
                            toast.error(sRes.error || "Gagal menyimpan ke profil.");
                          }
                        } catch (e: any) {
                          toast.error(e.message || "Gagal menyimpan ke profil.");
                        }
                      }}
                      className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold gap-1 rounded-lg shadow-2xs cursor-pointer"
                    >
                      <ShieldCheck className="size-3.5 text-indigo-600" /> Simpan ke Profil HERO
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-1">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting} className="h-11 rounded-xl px-5 text-slate-700 font-semibold border-slate-200 w-full sm:w-auto">
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-11 rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm w-full sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Kirim Permohonan
        </Button>
      </div>

      <FiveRCameraModal
        isOpen={Boolean(activeCameraItemId)}
        onClose={() => setActiveCameraItemId(null)}
        onCapture={(dataUrl) => {
          if (activeCameraItemId) {
            handleCapturePhoto(activeCameraItemId, dataUrl);
          }
        }}
        title="Ambil Foto Bukti Barang Rusak/Lama"
      />
    </form>
  );
}
