"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ActivityDisputeResolveFormProps {
  action: (formData: FormData) => Promise<void>;
  disputeId: number;
  resolvedByEmployeeId: number | string;
}

export function ActivityDisputeResolveForm({
  action,
  disputeId,
  resolvedByEmployeeId,
}: ActivityDisputeResolveFormProps) {
  const [decision, setDecision] = React.useState<string>("approved");

  return (
    <form action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="resolvedByEmployeeId" value={String(resolvedByEmployeeId)} />
      <input type="hidden" name="decision" value={decision} />

      <div className="grid gap-2 text-sm">
        <Label>Keputusan Dispute</Label>
        <Select value={decision} onValueChange={setDecision}>
          <SelectTrigger className="h-9 rounded-xl border border-input bg-background px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Setujui Dispute (Restore Poin Penuh)</SelectItem>
            <SelectItem value="rejected">Tolak Dispute (Pertahankan Penalti)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 text-sm">
        <Label htmlFor={`notes-${disputeId}`}>Catatan Keputusan</Label>
        <Textarea
          id={`notes-${disputeId}`}
          name="resolutionNotes"
          rows={3}
          placeholder="Tulis alasan persetujuan / penolakan agar jejak audit tersimpan jelas."
          required
          minLength={5}
          className="rounded-xl"
        />
      </div>

      <Button type="submit" size="sm" className="w-full h-9 rounded-xl font-semibold">
        Simpan Keputusan
      </Button>
    </form>
  );
}
