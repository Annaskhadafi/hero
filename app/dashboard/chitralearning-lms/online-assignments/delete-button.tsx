"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteOnlineAssignmentAction } from "@/app/dashboard/chitralearning-lms/actions";

export function DeleteOnlineAssignmentButton({ campaignId }: { campaignId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Hapus assignment ini? Semua data terkait akan dihapus permanen.")) return;
    setLoading(true);
    try {
      await deleteOnlineAssignmentAction(campaignId);
      toast.success("Assignment dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus assignment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-rose-500" />}
    </Button>
  );
}
