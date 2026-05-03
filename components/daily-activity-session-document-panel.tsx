"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Download, FileSignature, ShieldCheck, Users } from "lucide-react";
import { updateDailyActivitySessionDocumentSignoffWithStateAction } from "@/app/dashboard/activity-hub/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DocumentPanelData = {
  sessionId: number;
  sessionCode: string;
  status: string;
  shiftCode: string;
  monthLabel: string;
  employee: {
    name: string;
    employeeSn: string;
    department: string;
    section: string;
    jobTitle: string;
  };
  site: {
    name: string;
    customerName: string;
    contractNumber: string;
  };
  totals: {
    itemCount: number;
    totalPoints: number;
    totalDurationLabel: string;
  };
  signoff: {
    employeeSignerName: string;
    employeeSignatureUrl: string;
    employeeSignedAt: Date | string | null;
    customerSignerName: string;
    customerSignatureUrl: string;
    customerSignedAt: Date | string | null;
    hrCheckerName: string;
    hrChecklistStatus: string;
    hrChecklistNote: string;
    hrSignatureUrl: string;
    hrCheckedAt: Date | string | null;
  };
};

const initialState = {
  status: "idle" as const,
  message: "",
};

function formatSignedAt(value: Date | string | null) {
  if (!value) {
    return "Belum ditandatangani";
  }

  const resolved = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(resolved.getTime())) {
    return "Belum ditandatangani";
  }

  return resolved.toLocaleString("id-ID");
}

function SignoffStatus({
  label,
  signedAt,
  signatureUrl,
}: {
  label: string;
  signedAt: Date | string | null;
  signatureUrl: string;
}) {
  return (
    <div className="rounded-xl bg-surface-container-low px-3 py-3 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1">{formatSignedAt(signedAt)}</p>
      {signatureUrl ? (
        <Link
          prefetch={false}
          href={signatureUrl}
          target="_blank"
          className="mt-2 inline-flex text-[11px] font-semibold text-primary"
        >
          Lihat file tanda tangan
        </Link>
      ) : null}
    </div>
  );
}

export function DailyActivitySessionDocumentPanel({
  data,
  compact = false,
}: {
  data: DocumentPanelData;
  compact?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateDailyActivitySessionDocumentSignoffWithStateAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-[1.4rem] border-0 shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{data.sessionCode}</Badge>
                <Badge variant="outline">{data.status}</Badge>
                <Badge variant="outline">{data.shiftCode}</Badge>
              </div>
              <CardTitle className="text-xl">Dokumen SPL Per User</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Generate dokumen kerja harian per user. TTD karyawan dan checklist HR bisa digital, sedangkan TTD
                customer disiapkan sebagai area tanda tangan manual di PDF.
              </CardDescription>
            </div>
            <Button asChild className="rounded-full">
              <Link prefetch={false} href={`/api/activity-sessions/${data.sessionId}/pdf`} target="_blank">
                <Download className="size-4" />
                Download PDF
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Employee</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.employee.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.employee.department} • {data.employee.section || data.employee.jobTitle}
            </p>
          </div>
          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Site</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.site.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.site.customerName}</p>
          </div>
          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Pekerjaan</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.totals.itemCount} item checked</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.totals.totalDurationLabel}</p>
          </div>
          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Periode</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.monthLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.totals.totalPoints} pts</p>
          </div>
        </CardContent>
      </Card>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="sessionId" value={data.sessionId} />

        <div className={`grid gap-4 ${compact ? "" : "xl:grid-cols-3"}`}>
          <Card className="rounded-[1.3rem]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="size-4 text-primary" />
                TTD Karyawan
              </CardTitle>
              <CardDescription>Nama signer dan gambar tanda tangan user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label className="grid gap-2">
                Nama signer
                <Input name="employeeSignerName" defaultValue={data.signoff.employeeSignerName || data.employee.name} />
              </Label>
              <Label className="grid gap-2">
                Upload tanda tangan
                <Input name="employeeSignatureFile" type="file" accept="image/*" />
              </Label>
              <SignoffStatus
                label="Employee status"
                signedAt={data.signoff.employeeSignedAt}
                signatureUrl={data.signoff.employeeSignatureUrl}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[1.3rem]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" />
                TTD Customer
              </CardTitle>
              <CardDescription>Nama PIC customer opsional. Tanda tangan customer dilakukan manual di hasil print.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label className="grid gap-2">
                Nama signer customer
                <Input name="customerSignerName" defaultValue={data.signoff.customerSignerName} />
              </Label>
              <div className="rounded-xl bg-[#fff8e8] px-3 py-3 text-xs leading-5 text-[#8a5a00]">
                TTD customer tidak diupload ke sistem. PDF akan menyediakan kolom kosong untuk tanda tangan basah saat
                dokumen dicetak.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.3rem]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                Checklist HR
              </CardTitle>
              <CardDescription>Status verifikasi HR, catatan, dan tanda tangan HR.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label className="grid gap-2">
                Nama checker HR
                <Input name="hrCheckerName" defaultValue={data.signoff.hrCheckerName} />
              </Label>
              <Label className="grid gap-2">
                Status checklist
                <select
                  name="hrChecklistStatus"
                  defaultValue={data.signoff.hrChecklistStatus}
                  className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="checked">Checked</option>
                  <option value="revision">Need Revision</option>
                </select>
              </Label>
              <Label className="grid gap-2">
                Catatan HR
                <Textarea name="hrChecklistNote" rows={4} defaultValue={data.signoff.hrChecklistNote} />
              </Label>
              <Label className="grid gap-2">
                Upload tanda tangan HR
                <Input name="hrSignatureFile" type="file" accept="image/*" />
              </Label>
              <SignoffStatus
                label="HR status"
                signedAt={data.signoff.hrCheckedAt}
                signatureUrl={data.signoff.hrSignatureUrl}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] bg-surface-container-low px-4 py-3">
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Simpan signoff lalu generate ulang PDF.</p>
            <p>File tanda tangan disimpan ke object storage. Format gambar, maksimal 2MB per file.</p>
          </div>
          <Button type="submit" className="rounded-full" disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan signoff"}
          </Button>
        </div>

        {state.message ? (
          <p className={`text-sm font-semibold ${state.status === "error" ? "text-rose-700" : "text-emerald-700"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
