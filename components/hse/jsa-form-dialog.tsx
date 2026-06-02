'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SignaturePad } from '@/components/signature-pad'
import { saveJsa } from '@/app/dashboard/hse/jsa/actions'
import { uploadFile } from '@/app/actions/upload'

const equipmentUsedOptions = [
  'Hand Tool Only',
  'Dioperasikan dgn Batere/listrik',
  'Power Tool',
  'Oxy Set',
  'Pengelasan',
  'Pemotongan/Penggerindaan',
  'Pisau/alat tajam',
  'Gunting Pencabut',
  'Forklift Truck man Cage',
  'Scafolding',
  'Tangga',
  'Tangga Portable',
  'Forklift',
  'Crane',
  'Genset Portable',
  'Pompa Portable',
  'Air Bertekanan',
  'Lain-Lain',
]

const requirementsOptions = [
  'Jumlah Pekerja',
  'Pemutusan Listrik',
  'Pemutusan Instrument',
  'Bypass trip/alarm sistem',
  'Modifikasi',
]

const permitOptions = [
  'Permit Hot Work',
  'Permit Cold Work',
  'Permit Confined Space',
  'Permit Excavation',
  'Permit electrical/machanical',
  'Lain-lainnya',
]

const ppeOptions = [
  'Sarung Tangan',
  'Goggle',
  'Pelindung Muka',
  'Proteksi Pendengaran',
  'Masker',
  'Safety Harness',
  'PPE Pengelasan',
  'Alat Bantu Pernafasan',
  'Jas PVC',
  'Sepatu Karet',
  'Helm',
  'Lainnya',
]

const jsaSchema = z.object({
  jsaNumber: z.string().optional().default(''),
  jobDescription: z.string().min(1, 'Harus diisi'),
  equipmentNumber: z.string().min(1, 'Harus diisi'),
  teamMembers: z.string().min(1, 'Harus diisi'),
  equipmentUsed: z.array(z.string()),
  requirements: z.array(z.string()),
  permits: z.array(z.string()),
  ppeRequirements: z.array(z.string()),
  riskLevel: z.enum(['H', 'M', 'L']),
  steps: z.array(
    z.object({
      workStep: z.string().min(1, 'Harus diisi'),
      hazard: z.string().min(1, 'Harus diisi'),
      consequence: z.string().min(1, 'Harus diisi'),
      control: z.string().min(1, 'Harus diisi'),
      residualRisk: z.string().min(1, 'Harus diisi'),
      pic: z.string().min(1, 'Harus diisi'),
    })
  ),
})

type JsaFormValues = z.infer<typeof jsaSchema>

interface JsaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
  id?: string
}

export function JsaFormDialog({ open, onOpenChange, initialData, id }: JsaFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [executorSignature, setExecutorSignature] = React.useState<File | null>(null)
  const [customEquipment, setCustomEquipment] = React.useState('')
  const [customPermit, setCustomPermit] = React.useState('')
  const [customPpe, setCustomPpe] = React.useState('')
  
  const form = useForm<JsaFormValues>({
    resolver: zodResolver(jsaSchema),
    defaultValues: {
      jsaNumber: initialData?.jsaNumber ?? '',
      jobDescription: initialData?.jobDescription ?? '',
      equipmentNumber: initialData?.equipmentNumber ?? '',
      teamMembers: initialData?.teamMembers ?? '',
      equipmentUsed: initialData?.equipmentUsed ?? [],
      requirements: initialData?.requirements ?? [],
      permits: initialData?.permits ?? [],
      ppeRequirements: initialData?.ppeRequirements ?? [],
      riskLevel: (initialData?.riskLevel as any) ?? 'L',
      steps: initialData?.steps ?? [
        { workStep: '', hazard: '', consequence: '', control: '', residualRisk: '', pic: '' }
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  })

  // Reset form when opened with new initial data
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        const equipmentLain = initialData.equipmentUsed?.find((i: string) => i.startsWith('Lain-Lain: '))
        if (equipmentLain) setCustomEquipment(equipmentLain.replace('Lain-Lain: ', ''))
        const permitLain = initialData.permits?.find((i: string) => i.startsWith('Lain-lainnya: '))
        if (permitLain) setCustomPermit(permitLain.replace('Lain-lainnya: ', ''))
        const ppeLain = initialData.ppeRequirements?.find((i: string) => i.startsWith('Lainnya: '))
        if (ppeLain) setCustomPpe(ppeLain.replace('Lainnya: ', ''))

        form.reset({
          jsaNumber: initialData.jsaNumber || '',
          jobDescription: initialData.jobDescription || '',
          equipmentNumber: initialData.equipmentNumber || '',
          teamMembers: initialData.teamMembers || '',
          equipmentUsed: initialData.equipmentUsed?.map((i: string) => i.startsWith('Lain-Lain:') ? 'Lain-Lain' : i) || [],
          requirements: initialData.requirements || [],
          permits: initialData.permits?.map((i: string) => i.startsWith('Lain-lainnya:') ? 'Lain-lainnya' : i) || [],
          ppeRequirements: initialData.ppeRequirements?.map((i: string) => i.startsWith('Lainnya:') ? 'Lainnya' : i) || [],
          riskLevel: initialData.riskLevel || 'L',
          steps: initialData.steps || [],
        })
      } else {
        setCustomEquipment('')
        setCustomPermit('')
        setCustomPpe('')
        form.reset({
          jsaNumber: 'AUTO',
          jobDescription: '',
          equipmentNumber: '',
          teamMembers: '',
          equipmentUsed: [],
          requirements: [],
          permits: [],
          ppeRequirements: [],
          riskLevel: 'L',
          steps: [{ workStep: '', hazard: '', consequence: '', control: '', residualRisk: '', pic: '' }],
        })
      }
      setExecutorSignature(null)
    }
  }, [open, initialData, form])

  async function onSubmit(data: JsaFormValues) {
    setIsSubmitting(true)
    try {
      let signatureUrl = initialData?.signatures?.executorUrl || ''
      if (executorSignature) {
        const reader = new FileReader()
        const base64Url = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(executorSignature)
        })
        signatureUrl = base64Url
      }

      const signatures = {
        executorUrl: signatureUrl,
        executorDate: new Date().toISOString()
      }

      const res = await saveJsa({
        jsaNumber: data.jsaNumber,
        jobDescription: data.jobDescription,
        equipmentNumber: data.equipmentNumber,
        teamMembers: data.teamMembers,
        equipmentUsed: data.equipmentUsed.map(i => i === 'Lain-Lain' ? (customEquipment ? `Lain-Lain: ${customEquipment}` : 'Lain-Lain') : i),
        requirements: data.requirements,
        permits: data.permits.map(i => i === 'Lain-lainnya' ? (customPermit ? `Lain-lainnya: ${customPermit}` : 'Lain-lainnya') : i),
        ppeRequirements: data.ppeRequirements.map(i => i === 'Lainnya' ? (customPpe ? `Lainnya: ${customPpe}` : 'Lainnya') : i),
        riskLevel: data.riskLevel,
        signatures: signatures
      }, data.steps.map((s, idx) => ({ ...s, stepOrder: idx + 1 })), id)

      if (res.success) {
        toast.success(id ? 'JSA berhasil diupdate' : 'JSA berhasil dibuat')
        onOpenChange(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl xl:max-w-[1400px] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{id ? 'Edit JSA' : 'Buat JSA Baru'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="jsaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. JSA</FormLabel>
                      <FormControl>
                        <Input placeholder="Otomatis" disabled {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. Peralatan (Bagian dari Plant)</FormLabel>
                      <FormControl>
                        <Input placeholder="..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Penjelasan Pekerjaan</FormLabel>
                      <FormControl>
                        <Textarea placeholder="..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamMembers"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Anggota Team JSA</FormLabel>
                      <FormControl>
                        <Input placeholder="..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 gap-6 items-start">
                <FormField
                  control={form.control}
                  name="equipmentUsed"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="text-base font-semibold">Peralatan Yang Dipergunakan</FormLabel>
                      </div>
                      <div className="space-y-1">
                        {equipmentUsedOptions.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="equipmentUsed"
                            render={({ field }) => {
                              return (
                                <div key={item}>
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(
                                                field.value?.filter((value) => value !== item)
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                  </FormItem>
                                  {item === 'Lain-Lain' && field.value?.includes('Lain-Lain') && (
                                    <div className="pl-7 mt-1">
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Sebutkan peralatan..."
                                        value={customEquipment}
                                        onChange={(e) => setCustomEquipment(e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                          }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="requirements"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel className="text-base font-semibold">Keperluan</FormLabel>
                        </div>
                        <div className="space-y-1">
                          {requirementsOptions.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="requirements"
                              render={({ field }) => {
                                return (
                                  <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(field.value?.filter((value) => value !== item))
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="permits"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel className="text-base font-semibold">Permit</FormLabel>
                        </div>
                        <div className="space-y-1">
                          {permitOptions.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="permits"
                              render={({ field }) => {
                              return (
                                <div key={item}>
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(field.value?.filter((value) => value !== item))
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                  </FormItem>
                                  {item === 'Lain-lainnya' && field.value?.includes('Lain-lainnya') && (
                                    <div className="pl-7 mt-1">
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Sebutkan permit..."
                                        value={customPermit}
                                        onChange={(e) => setCustomPermit(e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ppeRequirements"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="text-base font-semibold">Keperluan PPE</FormLabel>
                      </div>
                      <div className="space-y-1">
                        {ppeOptions.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="ppeRequirements"
                            render={({ field }) => {
                              return (
                                <div key={item}>
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item])
                                            : field.onChange(field.value?.filter((value) => value !== item))
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item}</FormLabel>
                                  </FormItem>
                                  {item === 'Lainnya' && field.value?.includes('Lainnya') && (
                                    <div className="pl-7 mt-1">
                                      <Input
                                        className="h-7 text-xs"
                                        placeholder="Sebutkan PPE..."
                                        value={customPpe}
                                        onChange={(e) => setCustomPpe(e.target.value)}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                          }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">Tingkat Resiko</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="H" />
                            </FormControl>
                            <FormLabel className="font-normal">Resiko Tinggi (H)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="M" />
                            </FormControl>
                            <FormLabel className="font-normal">Resiko Menengah (M)</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="L" />
                            </FormControl>
                            <FormLabel className="font-normal">Resiko Rendah (L)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <FormLabel className="text-base font-semibold">Urutan Pekerjaan</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ workStep: '', hazard: '', consequence: '', control: '', residualRisk: '', pic: '' })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Baris
                  </Button>
                </div>
                
                <div className="border rounded-md overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100/80 border-b text-slate-500 font-medium">
                      <tr>
                        <th className="py-2 px-3 text-center w-12">No</th>
                        <th className="py-2 px-3 text-left">Urutan Pekerjaan</th>
                        <th className="py-2 px-3 text-left">Bahaya</th>
                        <th className="py-2 px-3 text-left">Konsekuensi</th>
                        <th className="py-2 px-3 text-left">Kontrol/Pencegahan</th>
                        <th className="py-2 px-3 text-left w-32">Resiko Akhir</th>
                        <th className="py-2 px-3 text-left">Pelaksana</th>
                        <th className="py-2 px-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fields.map((item, index) => (
                        <tr key={item.id} className="group hover:bg-slate-50 align-top">
                          <td className="py-2 px-3 text-center text-slate-500 pt-3">{index + 1}</td>
                          <td className="py-2 px-3">
                            <Textarea {...form.register(`steps.${index}.workStep`)} className="min-h-[60px] min-w-[150px] resize-y border-transparent hover:border-input focus:border-input bg-transparent" />
                          </td>
                          <td className="py-2 px-3">
                            <Textarea {...form.register(`steps.${index}.hazard`)} className="min-h-[60px] min-w-[150px] resize-y border-transparent hover:border-input focus:border-input bg-transparent" />
                          </td>
                          <td className="py-2 px-3">
                            <Textarea {...form.register(`steps.${index}.consequence`)} className="min-h-[60px] min-w-[150px] resize-y border-transparent hover:border-input focus:border-input bg-transparent" />
                          </td>
                          <td className="py-2 px-3">
                            <Textarea {...form.register(`steps.${index}.control`)} className="min-h-[60px] min-w-[150px] resize-y border-transparent hover:border-input focus:border-input bg-transparent" />
                          </td>
                          <td className="py-2 px-3 pt-3">
                            <select 
                              {...form.register(`steps.${index}.residualRisk`)} 
                              className="w-full h-8 px-2 py-1 text-sm bg-transparent border border-transparent rounded hover:border-input focus:border-input outline-none"
                            >
                              <option value="H">H</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <Textarea {...form.register(`steps.${index}.pic`)} className="min-h-[60px] min-w-[150px] resize-y border-transparent hover:border-input focus:border-input bg-transparent" />
                          </td>
                          <td className="py-2 px-3 pt-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {form.formState.errors.steps && (
                  <p className="text-sm font-medium text-destructive mt-2">Mohon lengkapi semua baris urutan pekerjaan.</p>
                )}
              </div>

              {!initialData?.signatures?.executorUrl && (
                <div className="space-y-4 max-w-sm">
                  <FormLabel className="text-base font-semibold">Tanda Tangan Pelaksana</FormLabel>
                  <SignaturePad onSignatureChange={setExecutorSignature} />
                </div>
              )}

            </form>
          </Form>
        </div>
        
        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {id ? 'Simpan Perubahan' : 'Buat JSA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
