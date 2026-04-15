"use client";

import type { ChangeEvent } from "react";
import { useId, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

export function ProfilePhotoField({
  name = "profileImage",
  label = "Foto Profile",
  initialValue = "",
  fallbackName,
}: {
  name?: string;
  label?: string;
  initialValue?: string;
  fallbackName: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("File harus gambar.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Maksimal 2MB.");
      event.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/profile-photo", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || "Upload foto profile gagal.");
      }

      setValue(result.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload foto profile gagal.",
      );
      event.target.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setValue("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={value} />
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed p-4 sm:flex-row sm:items-center">
        <Avatar className="size-20 border border-slate-200">
          <AvatarImage src={value || undefined} alt={fallbackName} className="object-cover" />
          <AvatarFallback className="bg-slate-100 font-semibold text-slate-700">
            {getInitials(fallbackName)}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <Input
            id={inputId}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImagePlus className="size-4" />
              {isUploading ? "Mengupload..." : "Upload Foto"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImage}
                disabled={isUploading}
              >
                <Trash2 className="size-4" />
                Hapus Foto
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG/PNG/WebP. Maks 2MB. File akan diupload ke bucket S3.
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
