"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApdRequestStatus } from "./actions";
import { APD_REQUEST_STATUSES, APD_REQUEST_STATUS_LABELS, normalizeApdRequestStatus } from "@/lib/apd-status";

export function ApdStatusActions({ id, status }: { id: number; status: string }) {
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const normalizedStatus = normalizeApdRequestStatus(status) ?? "pending_approval";
  const [selectedStatus, setSelectedStatus] = useState<string>(normalizedStatus);

  useEffect(() => {
    setSelectedStatus(normalizedStatus);
  }, [normalizedStatus]);

  async function handleChange(nextStatus: string) {
    const prev = selectedStatus;
    setSelectedStatus(nextStatus);
    setIsSaving(true);
    try {
      await updateApdRequestStatus(id, nextStatus);
      toast.success("Status permintaan diperbarui");
      router.refresh();
    } catch (error) {
      setSelectedStatus(prev);
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select value={selectedStatus} onValueChange={handleChange} disabled={isSaving}>
      <SelectTrigger className="h-8 w-[145px] text-xs" aria-label="Ubah status permintaan">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APD_REQUEST_STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {APD_REQUEST_STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
