"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { uploadFile } from "@/app/actions/upload"
import { createSafetyInspection, updateSafetyInspection, type SafetyInspection } from "@/app/actions/safety-inspections"

const formSchema = z.object({
  title: z.string().min(1, "Judul Inspeksi wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  location: z.string().min(1, "Lokasi wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  findings: z.string().min(1, "Temuan wajib diisi"),
  recommendation: z.string().min(1, "Rekomendasi wajib diisi"),
  status: z.string().min(1, "Status wajib diisi"),
  assessmentScore: z.coerce.number().min(0).max(100).optional(),
  picName: z.string().min(1, "Inspektur wajib diisi"),
  reportAttachmentUrl: z.string().optional(),
  resultAttachmentUrl: z.string().optional(),
})

interface InspectionFormDialogProps {
  inspection?: SafetyInspection
  trigger?: React.ReactNode
  categories?: string[]
  pics?: string[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  currentUser?: string
}

export function InspectionFormDialog({ 
  inspection, 
  trigger, 
  categories = [], 
  pics = [],
  open: controlledOpen,
  onOpenChange,
  currentUser = ""
}: InspectionFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled && onOpenChange ? onOpenChange : setInternalOpen
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingReport, setUploadingReport] = useState(false)
  const [uploadingResult, setUploadingResult] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: inspection?.title ?? "",
      date: inspection?.date ? new Date(inspection.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      location: inspection?.location ?? "",
      category: inspection?.category ?? "",
      findings: inspection?.findings ?? "",
      recommendation: inspection?.recommendation ?? "",
      status: inspection?.status ?? "Pending",
      assessmentScore: inspection?.assessmentScore ?? undefined,
      picName: inspection?.picName ?? currentUser,
      reportAttachmentUrl: inspection?.reportAttachmentUrl ?? "",
      resultAttachmentUrl: inspection?.resultAttachmentUrl ?? "",
    },
  })

  // Ensure form resets properly when dialog opens or inspection changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: inspection?.title ?? "",
        date: inspection?.date ? new Date(inspection.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        location: inspection?.location ?? "",
        category: inspection?.category ?? "",
        findings: inspection?.findings ?? "",
        recommendation: inspection?.recommendation ?? "",
        status: inspection?.status ?? "Pending",
        assessmentScore: inspection?.assessmentScore ?? undefined,
        picName: inspection?.picName ?? currentUser,
        reportAttachmentUrl: inspection?.reportAttachmentUrl ?? "",
        resultAttachmentUrl: inspection?.resultAttachmentUrl ?? "",
      })
    }
  }, [open, inspection, currentUser, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const data = {
        ...values,
        date: new Date(values.date),
        assessmentScore: values.assessmentScore || null,
        reportAttachmentUrl: values.reportAttachmentUrl || "",
        resultAttachmentUrl: values.resultAttachmentUrl || "",
      }
      
      if (inspection) {
        await updateSafetyInspection(inspection.id, data)
      } else {
        await createSafetyInspection(data)
      }
      setOpen(false)
      if (!inspection) {
        form.reset()
      }
    } catch (error) {
      console.error(error)
      alert("Terjadi kesalahan saat menyimpan data.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>, 
    field: "reportAttachmentUrl" | "resultAttachmentUrl",
    setLoading: (v: boolean) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 2 * 1024 * 1024) {
      alert("File maksimal 2MB")
      return
    }
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        form.setValue(field, res.url)
      } else {
        alert("Gagal upload file")
      }
    } catch (error) {
      console.error(error)
      alert("Gagal upload file")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspection ? "Edit Inspeksi" : "Riwayat Inspeksi"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Judul Inspeksi</FormLabel>
                    <FormControl>
                      <Input placeholder="Judul Inspeksi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokasi</FormLabel>
                    <FormControl>
                      <Input placeholder="Lokasi Inspeksi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        options={categories}
                        placeholder="Pilih atau ketik Kategori..."
                        allowCustom={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="findings"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Temuan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Deskripsi temuan..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="recommendation"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Rekomendasi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Rekomendasi perbaikan..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control as any}
                name="assessmentScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nilai Assessment</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0 - 100" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="picName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Inspektur (PIC)</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        options={pics}
                        placeholder="Pilih atau ketik nama PIC..."
                        allowCustom={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="reportAttachmentUrl"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Lampiran Laporan <span className="text-red-500 text-xs font-normal">(Maks. 2MB)</span></FormLabel>
                    <div className="flex items-center gap-4 p-2 border rounded-md bg-slate-50/50">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        className="relative overflow-hidden shrink-0"
                        disabled={uploadingReport}
                      >
                        {uploadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploadingReport ? "Uploading..." : "Pilih Laporan"}
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileUpload(e, "reportAttachmentUrl", setUploadingReport)}
                        />
                      </Button>
                      <div className="flex-1 text-xs text-muted-foreground truncate">
                        {field.value ? field.value.split('/').pop() : "Pilih file (JPG/PDF)"}
                      </div>
                      {field.value && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("reportAttachmentUrl", "")}>
                          Hapus
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="resultAttachmentUrl"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Lampiran Hasil <span className="text-red-500 text-xs font-normal">(Maks. 2MB)</span></FormLabel>
                    <div className="flex items-center gap-4 p-2 border rounded-md bg-slate-50/50">
                      <Button 
                        type="button" 
                        className="relative overflow-hidden shrink-0 bg-sky-500 hover:bg-sky-600 text-white"
                        disabled={uploadingResult}
                      >
                        {uploadingResult ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploadingResult ? "Uploading..." : "Pilih Hasil"}
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileUpload(e, "resultAttachmentUrl", setUploadingResult)}
                        />
                      </Button>
                      <div className="flex-1 text-xs text-muted-foreground truncate">
                        {field.value ? field.value.split('/').pop() : "Pilih file (JPG/PDF)"}
                      </div>
                      {field.value && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("resultAttachmentUrl", "")}>
                          Hapus
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
            <div className="flex justify-start pt-4">
              <Button type="submit" disabled={isSubmitting} className="bg-sky-500 hover:bg-sky-600 min-w-[120px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
