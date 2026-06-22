"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { PlusCircle, Loader2 } from "lucide-react"

type HrPersonnel = { id: number; name: string; jobTitle: string | null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full h-12 rounded-xl text-base font-bold">
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Membuat sesi...
        </>
      ) : (
        "Mulai Chat"
      )}
    </Button>
  )
}

export function CurhatCreateForm({ hrList, createSessionAction }: { hrList: HrPersonnel[]; createSessionAction: (formData: FormData) => Promise<void> }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full h-14 rounded-2xl text-md font-bold shadow-lg" size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Mulai Konsultasi Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md mx-4 rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Mulai Sesi Curhat Baru</DialogTitle>
        </DialogHeader>
        <form action={createSessionAction}>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="hrId" className="text-sm font-semibold text-[#486275]">Pilih HR</Label>
              <Select name="hrId" required>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Pilih HR..." />
                </SelectTrigger>
                <SelectContent>
                  {hrList.map((hr) => (
                    <SelectItem key={hr.id} value={hr.id.toString()}>
                      {hr.name} ({hr.jobTitle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-[#486275]">Kategori Masalah</Label>
              <Select name="category" required>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Pilih Kategori..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Karir">Karir</SelectItem>
                  <SelectItem value="Masalah Pribadi">Masalah Pribadi</SelectItem>
                  <SelectItem value="Konflik Pekerjaan">Konflik Pekerjaan</SelectItem>
                  <SelectItem value="Pelecehan/Kekerasan">Pelecehan/Kekerasan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}