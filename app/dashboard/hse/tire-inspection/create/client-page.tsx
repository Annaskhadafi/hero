"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createInspection } from "../actions"
import { uploadFile } from "@/app/actions/upload"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const CHECKLIST_TEMPLATES = [
  { section: "loading_area", question: "Apakah daerah loading relatif rata dan bebas tumpahan?" },
  { section: "loading_area", question: "Apakah operator truk mengendarai & melintasinya dengan aman?" },
  { section: "loading_area", question: "Apakah Dozer difungsikan?" },
  { section: "loading_area", question: "Apakah frekuensi pembersihan jalan dari tumpahan sering dilakukan?" },
  { section: "haul_road", question: "Adakah drainase di jalan tambang?" },
  { section: "haul_road", question: "Apakah kemiringan jalan cukup membuat air mengalir ke drainase?" },
  { section: "haul_road", question: "Apakah jalan bebas dari tumpahan material atau lubang?" },
  { section: "haul_road", question: "Adakah genangan / kubangan air?" },
  { section: "dumping_area", question: "Adakah tumpahan batuan di daerah lokasi dumping?" },
  { section: "dumping_area", question: "Apakah permukaan jalan bebas dari lubang dan gelombang?" },
  { section: "dumping_area", question: "Apakah semua operator menggunakan putaran L di dumping point?" },
  { section: "dumping_area", question: "Apakah ada unit dozer selama di daerah dumpingan?" },
];

export function TireInspectionCreateClient({ basePath = "/dashboard/hse/tire-inspection" }: { basePath?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    siteName: "",
    customerName: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    shift: "Siang",
    unitName: "",
    notes: "",
  })

  const [checklists, setChecklists] = useState(CHECKLIST_TEMPLATES.map(c => ({
    ...c,
    answer: true,
    score: 10,
    remarks: "",
  })))

  const [photos, setPhotos] = useState<Array<{ section: string; file: File; caption: string }>>([])

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
      // 1. Upload photos first
      const uploadedPhotos = []
      let sortOrder = 0;
      for (const p of photos) {
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
      }

      // 2. Save to database
      const result = await createInspection({
        siteName: formData.siteName,
        customerName: formData.customerName,
        inspectionDate: new Date(formData.inspectionDate),
        shift: formData.shift,
        unitName: formData.unitName,
        notes: formData.notes,
        checklists: checklists,
        photos: uploadedPhotos,
      })

      toast.success("Inspeksi berhasil disimpan. Memulai generasi laporan AI...")
      router.push(`${basePath}/detail/${result.id}`)
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan")
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
            <Input className="h-11 rounded-xl" type="date" value={formData.inspectionDate} onChange={e => setFormData({ ...formData, inspectionDate: e.target.value })} />
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
              {checklists.filter(c => c.section === section).map((item, idx) => {
                const globalIdx = checklists.findIndex(c => c.section === section && c.question === item.question);
                return (
                  <div key={idx} className="grid gap-3 border-b border-slate-100 pb-4 md:grid-cols-12 md:items-center md:gap-4">
                    <div className="md:col-span-5">
                      <Label className="text-sm font-medium">{item.question}</Label>
                    </div>
                    <div className="md:col-span-2">
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
                    <div className="md:col-span-2">
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
                    <div className="md:col-span-3">
                      <Input 
                        className="h-11 rounded-xl"
                        placeholder="Keterangan..." 
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
              {photos.filter(p => p.section === section).length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  {photos.map((p, pIdx) => p.section === section ? (
                    <div key={pIdx} className="relative group border p-2 rounded">
                      <img src={URL.createObjectURL(p.file)} alt="Preview" className="w-full h-24 object-cover rounded mb-2" />
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
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hidden group-hover:flex"
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

      <div className="grid gap-3 md:flex md:justify-end md:gap-4">
        <Button className="h-11 rounded-xl" type="button" variant="outline" onClick={() => router.push(basePath)} disabled={loading}>
          Batal
        </Button>
        <Button className="h-11 rounded-xl bg-[#003f78] text-white" onClick={submitForm} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Inspeksi
        </Button>
      </div>
    </div>
  )
}
