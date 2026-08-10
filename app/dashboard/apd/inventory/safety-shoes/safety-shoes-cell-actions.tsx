"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAssetSize, updateAssetAttachment } from "./actions";
import { toast } from "sonner";
import { Loader2, Upload, Paperclip } from "lucide-react";

export function SizeInputCell({ assetId, initialSize }: { assetId: number; initialSize: string }) {
  const [size, setSize] = useState(initialSize || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleBlur() {
    if (size === initialSize) return;
    setIsSaving(true);
    try {
      await updateAssetSize(assetId, size);
      toast.success("Ukuran sepatu berhasil disimpan");
    } catch (err) {
      toast.error("Gagal menyimpan ukuran sepatu");
      setSize(initialSize || "");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative w-20">
      <Input
        value={size}
        onChange={(e) => setSize(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
        placeholder="Size"
        className="h-8 px-2 text-center"
      />
      {isSaving && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function AttachmentCell({ assetId, initialUrl }: { assetId: number; initialUrl: string | null }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // We use existing activity presign upload logic, which uploads any file to S3
      const res = await fetch("/api/uploads/activity-presign", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Gagal mengupload file");
      }

      const data = await res.json();
      if (data.url) {
        await updateAssetAttachment(assetId, data.url);
        toast.success("Bukti penerimaan berhasil diupload");
      } else {
        throw new Error(data.error || "Gagal mengupload file");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf"
      />
      {initialUrl ? (
        <a href={initialUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="h-8">
            <Paperclip className="h-4 w-4 mr-2" />
            Lihat
          </Button>
        </a>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="h-8"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      )}
      {initialUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          title="Ganti file"
        >
          <Upload className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
