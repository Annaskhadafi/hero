"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateInspectionFull } from "../../actions"
import { uploadFile } from "@/app/actions/upload"
import { toast } from "sonner"

export function TireInspectionEditClient({ detail, basePath = "/dashboard/hse/tire-inspection" }: { detail: any, basePath?: string }) {
  const router = useRouter()
  const { inspection, checklists: initialChecklists, photos: initialPhotos } = detail
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    siteName: inspection.siteName || "",
    customerName: inspection.customerName || "",
    inspectionDate: new Date(inspection.inspectionDate),
    shift: inspection.shift || "",
    unitName: inspection.unitName || "",
    notes: inspection.notes || "",
  })

  const [attendees, setAttendees] = useState<Array<{ sn: string; name: string; dept: string }>>(
    inspection.attendees || []
  )

  const [checklists, setChecklists] = useState(initialChecklists.map((c: any) => ({
    ...c,
    answer: c.answer ?? true,
    score: c.score ?? 10,
    remarks: c.remarks ?? "",
  })))

  // old photos have id, imageUrl. new photos have file.
  const [photos, setPhotos] = useState<Array<{ id?: string; section: string; file?: File; imageUrl?: string; caption: string; readableImageUrl?: string }>>(
    initialPhotos.map((p: any) => ({
      id: p.id,
      section: p.section,
      imageUrl: p.imageUrl,
      readableImageUrl: p.readableImageUrl,
      caption: p.caption || "",
    }))
  )

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, section: string) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map(file => ({ section, file, caption: "" }))
      setPhotos([...photos, ...newPhotos])
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const submitForm = async () => {
    setLoading(true)
    try {
      const uploadedPhotos = []
      let sortOrder = 0;
      for (const p of photos) {
        if (p.file) {
          // New photo upload
          const fileData = new FormData()
          fileData.append("file", p.file)
          const res = await uploadFile(fileData)
          if (res.success && res.url) {
            uploadedPhotos.push({
              section: p.section,
              imageUrl: res.url,
              caption: p.caption,
              sortOrder: sortOrder++,
            })
          } else {
            toast.error(`Gagal upload foto: ${p.file.name}`)
          }
        } else if (p.imageUrl) {
          // Old photo, preserve
          uploadedPhotos.push({
            id: p.id,
            section: p.section,
            imageUrl: p.imageUrl,
            caption: p.caption,
            sortOrder: sortOrder++,
          })
        }
      }

      // Format attendees
      const processedAttendees = attendees.map(att => ({
        sn: att.sn,
        name: att.name,
        dept: att.dept,
        section: "", // Section is merged with dept, leaving this blank
        signatureUrl: ""
      }))

      // Save to database
      const result = await updateInspectionFull(inspection.id, {
        siteName: formData.siteName,
        customerName: formData.customerName,
        inspectionDate: formData.inspectionDate, // already a Date object
        shift: formData.shift,
        unitName: formData.unitName,
        notes: formData.notes,
        attendees: processedAttendees,
        checklists: checklists,
        photos: uploadedPhotos,
      })

      toast.success("Perubahan data inspeksi berhasil disimpan.")
      router.push(`${basePath}/detail/${inspection.id}`)
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan perubahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-12 md:space-y-8">
      {/* Basic Info */}
      <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
        <h2 className="mb-4 text-base font-black text-[#082033] md:text-xl">Informasi Umum</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input className="h-11 rounded-xl" value={formData.siteName} onChange={e => setFormData({ ...formData, siteName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input className="h-11 rounded-xl" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Inspeksi</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-11 rounded-xl justify-start text-left font-normal",
                    !formData.inspectionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.inspectionDate ? format(formData.inspectionDate, "PPP", { locale: idLocale }) : <span>Pilih Tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.inspectionDate}
                  onSelect={(date) => date && setFormData({ ...formData, inspectionDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Shift</Label>
            <Input className="h-11 rounded-xl" value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Unit Name</Label>
            <Input className="h-11 rounded-xl" value={formData.unitName} onChange={e => setFormData({ ...formData, unitName: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <Label>Catatan Tambahan</Label>
          <Textarea className="rounded-xl" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
        </div>
      </div>

      {/* Checklists */}
      <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
        <h2 className="mb-4 text-base font-black text-[#082033] md:text-xl">Form Checklist Lapangan</h2>
        {["loading_area", "haul_road", "dumping_area"].map((section) => (
          <div key={section} className="mb-8">
            <h3 className="mb-4 rounded-xl bg-[#f3faff] p-3 text-sm font-black uppercase tracking-[0.12em] text-[#082033] md:text-lg">
              {section.replace("_", " ")}
            </h3>
            <div className="space-y-4">
              {checklists.filter((c: any) => c.section === section).map((item: any, idx: number) => {
                const globalIdx = checklists.findIndex((c: any) => c.section === section && c.question === item.question);
                return (
                  <div key={idx} className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:grid md:grid-cols-12 md:items-start md:gap-4">
                    <div className="md:col-span-5 md:pt-2">
                      <Label className="text-sm font-medium leading-relaxed">{item.question}</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:col-span-4 md:grid-cols-2">
                      <div>
                        <select 
                          className="h-11 w-full rounded-xl border bg-background p-2 text-sm"
                          value={item.answer ? "YA" : "TIDAK"}
                          onChange={e => {
                            const newCheck = [...checklists];
                            newCheck[globalIdx].answer = e.target.value === "YA";
                            setChecklists(newCheck);
                          }}
                        >
                          <option value="YA">YA</option>
                          <option value="TIDAK">TIDAK (TDK)</option>
                        </select>
                      </div>
                      <div>
                        <Input 
                          className="h-11 rounded-xl"
                          type="number" min="1" max="10" placeholder="Skor (1-10)" 
                          value={item.score}
                          onChange={e => {
                            const newCheck = [...checklists];
                            newCheck[globalIdx].score = parseInt(e.target.value) || 0;
                            setChecklists(newCheck);
                          }}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <Textarea 
                        className="min-h-[80px] rounded-xl resize-none text-sm"
                        placeholder="Keterangan / Catatan..." 
                        value={item.remarks}
                        onChange={e => {
                          const newCheck = [...checklists];
                          newCheck[globalIdx].remarks = e.target.value;
                          setChecklists(newCheck);
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Photo Upload per section */}
            <div className="mt-4 rounded-xl border border-dashed bg-muted/20 p-4">
              <Label className="block mb-2">Unggah Foto Area Ini</Label>
              <Input type="file" multiple accept="image/*" onChange={(e) => handlePhotoUpload(e, section)} />
              {photos.filter((p: any) => p.section === section).length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {photos.map((p: any, pIdx: number) => p.section === section ? (
                    <div key={pIdx} className="relative group border p-2 rounded bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.file ? URL.createObjectURL(p.file) : (p.readableImageUrl || p.imageUrl)} alt="Preview" className="w-full h-24 object-cover rounded mb-2 bg-slate-100" />
                      <Input 
                        placeholder="Caption foto..." 
                        className="text-xs h-8"
                        value={p.caption}
                        onChange={e => {
                          const newPhotos = [...photos];
                          newPhotos[pIdx].caption = e.target.value;
                          setPhotos(newPhotos);
                        }}
                      />
                      <button 
                        onClick={() => removePhoto(pIdx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 items-center justify-center hidden group-hover:flex"
                      >
                        &times;
                      </button>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Daftar Hadir */}
      <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-[#082033] md:text-xl">Daftar Hadir Inspeksi</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl h-9"
            onClick={() => setAttendees([...attendees, { sn: "", name: "", dept: "" }])}
          >
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        </div>
        
        <div className="space-y-6">
          {attendees.map((att, idx) => (
            <div key={idx} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute right-3 top-3 h-8 w-8 rounded-full"
                onClick={() => setAttendees(attendees.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <h4 className="mb-3 font-semibold text-sm">Peserta #{idx + 1}</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">SN / NRP</Label>
                  <Input 
                    className="h-10 rounded-lg text-sm" 
                    value={att.sn} 
                    onChange={e => {
                      const newAtt = [...attendees];
                      newAtt[idx].sn = e.target.value;
                      setAttendees(newAtt);
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nama Lengkap</Label>
                  <Input 
                    className="h-10 rounded-lg text-sm" 
                    value={att.name} 
                    onChange={e => {
                      const newAtt = [...attendees];
                      newAtt[idx].name = e.target.value;
                      setAttendees(newAtt);
                    }} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Departemen / Seksi</Label>
                  <Input 
                    className="h-10 rounded-lg text-sm" 
                    value={att.dept} 
                    onChange={e => {
                      const newAtt = [...attendees];
                      newAtt[idx].dept = e.target.value;
                      setAttendees(newAtt);
                    }} 
                  />
                </div>
              </div>
            </div>
          ))}
          {attendees.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500 border-2 border-dashed rounded-xl">
              Belum ada peserta yang ditambahkan.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:flex md:justify-end md:gap-4">
        <Button className="h-11 rounded-xl" type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Batal
        </Button>
        <Button className="h-11 rounded-xl bg-[#003f78] text-white" onClick={submitForm} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Perubahan
        </Button>
      </div>
    </div>
  )
}
