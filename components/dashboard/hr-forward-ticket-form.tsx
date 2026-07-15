"use client";

import { useMemo, useState, useTransition } from "react";
import { forwardTicket } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ReactNode } from "react";

type Option = { id: number; name: string; sectionId?: number | null; sectionName?: string | null };

export function HrForwardTicketForm({ sessionId, sections, pics, trigger }: { sessionId: number; sections: Option[]; pics: Option[]; trigger?: ReactNode }) {
  const [sectionId, setSectionId] = useState("");
  const [picId, setPicId] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const ActionIcon = pending ? Loader2 : Send;
  const availablePics = useMemo(() => pics.filter((pic) => String(pic.sectionId ?? "") === sectionId), [pics, sectionId]);

  function submit() {
    if (!sectionId || !picId) return toast.error("Pilih Section dan PIC terlebih dahulu");
    startTransition(async () => {
      try {
        const result = await forwardTicket(sessionId, Number(sectionId), Number(picId), note);
        toast.success(`Tiket diteruskan ke ${result.recipient}`);
        setNote("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal meneruskan tiket");
      }
    });
  }

  const form = (
    <div className="border-b bg-sky-50/50 p-3 md:p-4">
      <p className="mb-3 text-sm font-semibold">Teruskan Pengaduan</p>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end">
        <div className="space-y-1.5"><Label htmlFor="forward-section">Section Tujuan</Label><select id="forward-section" value={sectionId} onChange={(event) => { setSectionId(event.target.value); setPicId(""); }} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Pilih Section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="forward-pic">PIC Tujuan</Label><select id="forward-pic" value={picId} onChange={(event) => setPicId(event.target.value)} disabled={!sectionId} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Pilih PIC</option>{availablePics.map((pic) => <option key={pic.id} value={pic.id}>{pic.name}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="forward-note">Catatan HR (opsional)</Label><Textarea id="forward-note" value={note} onChange={(event) => setNote(event.target.value.slice(0, 2000))} className="min-h-10 resize-none" placeholder="Tambahkan konteks untuk PIC..." /></div>
        <Button type="button" onClick={submit} disabled={pending || !sectionId || !picId} className="h-10"><ActionIcon className={`mr-2 size-4 ${pending ? "animate-spin" : ""}`} />{pending ? "Mengirim..." : "Kirim Email"}</Button>
      </div>
    </div>
  );

  if (!trigger) return form;
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Teruskan Pengaduan</DialogTitle></DialogHeader>{form}</DialogContent></Dialog>;
}
