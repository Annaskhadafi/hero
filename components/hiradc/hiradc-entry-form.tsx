"use client"

import * as React from "react"
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  saveHiradcEntryAction,
  type HiradcActionState,
} from "@/app/dashboard/hse/hiradc/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  LIKELIHOOD_DESCRIPTIONS,
  LIKELIHOOD_LETTERS,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_NUMBERS,
} from "@/lib/hiradc/risk"
import type { HiradcEntryRow, HiradcRegisterRow } from "@/lib/hiradc/queries"

const INITIAL: HiradcActionState = { ok: false, message: "" }

type FieldProps = {
  label: string
  name: string
  defaultValue?: string | number | null
  placeholder?: string
  textarea?: boolean
  className?: string
  required?: boolean
}

function Field({ label, name, defaultValue, placeholder, textarea, className, required }: FieldProps) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {textarea ? (
        <Textarea name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} rows={3} className="resize-y" />
      ) : (
        <Input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} />
      )}
    </label>
  )
}

function ScaleSelect({
  label,
  name,
  kind,
  defaultValue,
}: {
  label: string
  name: string
  kind: "likelihood" | "severity"
  defaultValue?: string | number | null
}) {
  const options =
    kind === "likelihood"
      ? LIKELIHOOD_LETTERS.map((l) => ({ value: l, label: `${l} — ${LIKELIHOOD_DESCRIPTIONS[l]}` }))
      : SEVERITY_NUMBERS.map((s) => ({ value: `${s}`, label: `${s} — ${SEVERITY_DESCRIPTIONS[s]}` }))
  return (
    <label>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue != null ? `${defaultValue}` : ""}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value="">-</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full mt-1 flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function HiradcEntryFormDialog({
  open,
  onOpenChange,
  entry,
  registers,
  defaultRegisterId,
  canEdit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: HiradcEntryRow | null
  registers: HiradcRegisterRow[]
  defaultRegisterId?: number | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(saveHiradcEntryAction, INITIAL)

  useEffect(() => {
    if (state.ok) {
      onOpenChange(false)
      router.refresh()
    }
  }, [state.ok, state, onOpenChange, router])

  const isEdit = Boolean(entry?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100vh-2rem)] w-[min(1100px,96vw)] gap-0 overflow-hidden p-0 sm:max-w-[1100px]">
        <DialogHeader className="border-b bg-surface-container-low px-5 py-4">
          <DialogTitle>{isEdit ? "Edit Baris HIRADC" : "Tambah Baris HIRADC"}</DialogTitle>
          <DialogDescription>
            Form mengikuti kolom worksheet HIRADC. Nilai Risiko & Tingkat dihitung otomatis dari Peluang × Akibat.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex max-h-[72vh] flex-col overflow-hidden">
          <div className="grid grid-cols-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-4">
            {entry?.id ? <input type="hidden" name="id" value={entry.id} /> : null}

            <label className="md:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Register / Dokumen</span>
              <select
                name="registerId"
                defaultValue={`${entry?.registerId ?? defaultRegisterId ?? ""}`}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="">(Tanpa register)</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Departemen" name="department" defaultValue={entry?.department} className="md:col-span-1" />
            <Field label="Lokasi / Area" name="location" defaultValue={entry?.location} className="md:col-span-1" />

            <SectionTitle>Identifikasi Kegiatan</SectionTitle>
            <Field label="Nama Kegiatan" name="activityName" defaultValue={entry?.activityName} required className="md:col-span-2" />
            <label className="md:col-span-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Rutin / Tidak Rutin</span>
              <select
                name="routineType"
                defaultValue={entry?.routineType ?? "Rutin"}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="Rutin">Rutin</option>
                <option value="Tidak Rutin">Tidak Rutin</option>
              </select>
            </label>
            <Field label="Alat (Equipment)" name="equipment" defaultValue={entry?.equipment} className="md:col-span-1" />

            <SectionTitle>Identifikasi Bahaya</SectionTitle>
            <Field label="Bahaya (Kategori)" name="hazardCategory" defaultValue={entry?.hazardCategory} className="md:col-span-2" />
            <Field label="Rincian Bahaya" name="hazardDetails" defaultValue={entry?.hazardDetails} textarea className="md:col-span-2" />
            <Field label="Resiko / Konsekuensi" name="riskConsequence" defaultValue={entry?.riskConsequence} textarea className="md:col-span-4" />

            <SectionTitle>Penilaian Risiko Awal (Before Control)</SectionTitle>
            <ScaleSelect label="Peluang (A–E)" name="likelihoodBefore" kind="likelihood" defaultValue={entry?.likelihoodBefore} />
            <ScaleSelect label="Akibat (1–5)" name="severityBefore" kind="severity" defaultValue={entry?.severityBefore} />
            <Field label="Override Tingkat (opsional)" name="riskLevelBefore" defaultValue={entry?.riskLevelBefore} placeholder="auto" className="md:col-span-2" />

            <SectionTitle>Pengendalian & Legal</SectionTitle>
            <Field label="Pengendalian yang Ada" name="existingControl" defaultValue={entry?.existingControl} textarea className="md:col-span-2" />
            <Field label="Referensi Legal" name="legalReference" defaultValue={entry?.legalReference} textarea className="md:col-span-2" />

            <SectionTitle>Penilaian Risiko Sisa (After Control)</SectionTitle>
            <ScaleSelect label="Peluang (A–E)" name="likelihoodAfter" kind="likelihood" defaultValue={entry?.likelihoodAfter} />
            <ScaleSelect label="Akibat (1–5)" name="severityAfter" kind="severity" defaultValue={entry?.severityAfter} />
            <Field label="Override Tingkat (opsional)" name="riskLevelAfter" defaultValue={entry?.riskLevelAfter} placeholder="auto" className="md:col-span-2" />

            <SectionTitle>Pengendalian Tambahan</SectionTitle>
            <Field label="Pengendalian Tambahan (Kode IK / WIN / SOP)" name="additionalControl" defaultValue={entry?.additionalControl} textarea className="md:col-span-4" />

            {state.message && !state.ok ? (
              <p className="col-span-full text-sm font-medium text-destructive">{state.message}</p>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-surface-container-low px-5 py-4">
            <Button type="button" variant="outline" size="dense" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" size="dense" disabled={isPending || !canEdit}>
              {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Baris"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
