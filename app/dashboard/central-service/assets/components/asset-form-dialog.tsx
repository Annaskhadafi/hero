"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetSchema } from "../schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAsset, updateAsset } from "../actions";
import { uploadFile } from "@/app/actions/upload";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Image as ImageIcon, Loader2, Paperclip, Upload, X } from "lucide-react";

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any | null;
  categories: string[];
  locations: string[];
  workSections: string[];
  onSuccess: (asset: any) => void;
}

type AssetAttachmentFormValue = NonNullable<AssetFormValues["attachments"]>[number];

const CONDITIONS = ["ACTIVE", "GOOD", "BAD", "SCRAP"];

function toDateInput(val: Date | string | null | undefined) {
  if (!val) return "";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  categories,
  locations,
  workSections,
  onSuccess,
}: AssetFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      section: "",
      location: "",
      workSection: "",
      description: "",
      assetNumber: "",
      serialNumber: "",
      purchaseDate: "",
      deliveryToSiteDate: "",
      lastCalibrationDate: "",
      calibrationCycleMonths: undefined,
      calibrationDueDate: "",
      certificateDate: "",
      certificateCycleMonths: undefined,
      certificateDueDate: "",
      condition: "ACTIVE",
      qty: 1,
      remarks: "",
      attachments: [],
    },
  });

  const attachments = (form.watch("attachments") ?? []) as AssetAttachmentFormValue[];

  useEffect(() => {
    if (asset) {
      form.reset({
        section: asset.section || "",
        workSection: asset.workSection || "",
        location: asset.location || "",
        description: asset.description || "",
        assetNumber: asset.assetNumber || "",
        serialNumber: asset.serialNumber || "",
        purchaseDate: toDateInput(asset.purchaseDate),
        deliveryToSiteDate: toDateInput(asset.deliveryToSiteDate),
        lastCalibrationDate: toDateInput(asset.lastCalibrationDate),
        calibrationCycleMonths: asset.calibrationCycleMonths ?? undefined,
        calibrationDueDate: toDateInput(asset.calibrationDueDate),
        certificateDate: toDateInput(asset.certificateDate),
        certificateCycleMonths: asset.certificateCycleMonths ?? undefined,
        certificateDueDate: toDateInput(asset.certificateDueDate),
        condition: asset.condition || "ACTIVE",
        qty: asset.qty || 1,
        remarks: asset.remarks || "",
        attachments: asset.attachments || [],
      });
    } else {
      form.reset({
        section: "",
        workSection: "",
        location: "",
        description: "",
        assetNumber: "",
        serialNumber: "",
        purchaseDate: "",
        deliveryToSiteDate: "",
        lastCalibrationDate: "",
        calibrationCycleMonths: undefined,
        calibrationDueDate: "",
        certificateDate: "",
        certificateCycleMonths: undefined,
        certificateDueDate: "",
        condition: "ACTIVE",
        qty: 1,
        remarks: "",
        attachments: [],
      });
    }
  }, [asset, open]);

  const handleUploadAttachments = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading("Mengunggah attachment...");
    try {
      const uploaded: AssetAttachmentFormValue[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadFile(formData);
        if (!result.success || !result.url) {
          toast.error(result.error || `Gagal upload ${file.name}`);
          continue;
        }
        uploaded.push({
          fileName: file.name,
          fileUrl: result.url,
          previewUrl: result.readableUrl || result.url,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
      }

      if (uploaded.length > 0) {
        form.setValue("attachments", [...attachments, ...uploaded], { shouldDirty: true });
        toast.success(`${uploaded.length} attachment berhasil diunggah.`, { id: toastId });
      } else {
        toast.error("Tidak ada attachment yang berhasil diunggah.", { id: toastId });
      }
    } catch {
      toast.error("Gagal mengunggah attachment.", { id: toastId });
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: AssetFormValues) => {
    setIsSubmitting(true);
    try {
      if (asset) {
        const res = await updateAsset(asset.id, values);
        if (res.success && res.data) {
          toast.success("Asset berhasil diupdate");
          onSuccess(res.data);
        } else {
          toast.error(res.error || "Gagal mengupdate asset");
        }
      } else {
        const res = await createAsset(values);
        if (res.success && res.data) {
          toast.success("Asset berhasil ditambahkan");
          onSuccess(res.data);
        } else {
          toast.error(res.error || "Gagal menambahkan asset");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Tambah Asset Baru"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: Section, Kategori, Lokasi, Kondisi */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="workSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input
                        list="asset-work-section-options"
                        placeholder="Pilih / isi section"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <datalist id="asset-work-section-options">
                      {workSections.map((section) => (
                        <option key={section} value={section} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori Alat *</FormLabel>
                    <FormControl>
                      <Input
                        list="asset-category-options"
                        placeholder="Pilih / isi kategori"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <datalist id="asset-category-options">
                      {categories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi Site *</FormLabel>
                    <FormControl>
                      <Input
                        list="asset-location-options"
                        placeholder="Contoh: BMB, CK BIB, TU GRESIK"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <datalist id="asset-location-options">
                      {locations.map((location) => (
                        <option key={location} value={location} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kondisi *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kondisi..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Description, Nomor Aset, SN, Qty */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama / deskripsi alat..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Aset</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opsional"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qty *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: SN, Purchase Date, Delivery */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number (SN)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Opsional"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Pembelian</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryToSiteDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery To Site</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Calibration */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Kalibrasi</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="lastCalibrationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Calibration</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calibrationCycleMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle (bulan)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 6"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calibrationDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calibration Due</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Row 5: Certificate */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Sertifikat</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="certificateDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificateCycleMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle (bulan)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 12"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="certificateDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Due</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">Attachment</p>
                <Button type="button" variant="outline" size="sm" asChild disabled={isUploading}>
                  <label className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload File
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      className="hidden"
                      onChange={handleUploadAttachments}
                      disabled={isUploading}
                    />
                  </label>
                </Button>
              </div>

              {attachments.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                  Belum ada attachment.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {attachments.map((attachment, index) => {
                    const isImage = attachment.mimeType?.startsWith("image/");
                    const isPdf = attachment.mimeType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
                    const Icon = isPdf ? FileText : isImage ? ImageIcon : Paperclip;
                    return (
                      <div key={`${attachment.fileUrl}-${index}`} className="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">{attachment.mimeType || "file"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            form.setValue(
                              "attachments",
                              attachments.filter((_, itemIndex) => itemIndex !== index),
                              { shouldDirty: true }
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Remarks */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan tambahan (opsional)..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Menyimpan..."
                  : asset
                  ? "Simpan Perubahan"
                  : "Tambah Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
