'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconClock,
  IconFileText,
  IconPencil,
  IconPlus,
  IconRoute,
  IconShieldCheck,
  IconTrash,
  IconUser,
  IconUsers,
  IconCheck,
  IconFolder,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  HeroSearchableSelect,
  HeroConfirmDialog,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroTextarea,
  type HeroSearchableSelectOption,
} from '@/components/templates'
import {
  ServiceDeskCategorySetting,
  ServiceDeskTemplateItem,
  updateCategoryRoutingAction,
  createProblemTemplateAction,
  updateProblemTemplateAction,
  deleteProblemTemplateAction,
  type CreateTemplateInput,
} from '@/app/actions/service-desk-settings'

interface SettingsClientProps {
  initialCategories: ServiceDeskCategorySetting[]
  initialTemplates: ServiceDeskTemplateItem[]
  employees: Array<{ id: number; name: string; employee_sn: string; role: string }>
  departments: Array<{ id: number; name: string }>
  currentEmployee: { id: number; name: string; email: string; role?: string }
  isAdmin: boolean
}

export function ServiceDeskSettingsClient({
  initialCategories,
  initialTemplates,
  employees,
  departments,
  currentEmployee,
  isAdmin,
}: SettingsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<ServiceDeskCategorySetting[]>(initialCategories)
  const [templates, setTemplates] = useState<ServiceDeskTemplateItem[]>(initialTemplates)
  const [activeTab, setActiveTab] = useState<'routing' | 'templates'>('routing')

  // Edit Category Routing Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ServiceDeskCategorySetting | null>(null)
  const [catSlaHours, setCatSlaHours] = useState<number>(24)
  const [catPriority, setCatPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('sedang')
  const [catDeptId, setCatDeptId] = useState<string>('none')
  const [catPicIds, setCatPicIds] = useState<string[]>([])

  // Template Modal (Create / Edit)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [tplName, setTplName] = useState('')
  const [tplCategoryId, setTplCategoryId] = useState<string>(categories[0]?.id ? String(categories[0].id) : '1')
  const [tplTitle, setTplTitle] = useState('')
  const [tplDescription, setTplDescription] = useState('')
  const [tplPriority, setTplPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('tinggi')
  const [tplSlaHours, setTplSlaHours] = useState<number>(12)
  const [tplPicIds, setTplPicIds] = useState<string[]>([])

  // Delete Template Confirmation Modal
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<ServiceDeskTemplateItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Map employees to HeroSearchableSelect options (Prioritize Admin Mochamad Annas Khadafi)
  const employeeOptions: HeroSearchableSelectOption[] = useMemo(() => {
    const sorted = [...employees].sort((a, b) => {
      const aIsKhadafi = a.id === 5 || a.employee_sn === '71261' || a.name.toLowerCase().includes('khadafi')
      const bIsKhadafi = b.id === 5 || b.employee_sn === '71261' || b.name.toLowerCase().includes('khadafi')
      if (aIsKhadafi && !bIsKhadafi) return -1
      if (!aIsKhadafi && bIsKhadafi) return 1
      return a.name.localeCompare(b.name)
    })

    return sorted.map((emp) => {
      const isKhadafi = emp.id === 5 || emp.employee_sn === '71261' || emp.name.toLowerCase().includes('khadafi')
      return {
        value: String(emp.id),
        label: isKhadafi ? `⭐ ${emp.name} (Admin HERO / SDS)` : `${emp.name} (${emp.employee_sn || 'SN'})`,
        description: isKhadafi
          ? 'Default Admin HERO (mochamad.khadafi@chitraparatama.co.id)'
          : (emp.role || 'Staff HERO'),
        badge: isKhadafi ? 'Admin SDS' : emp.role,
      }
    })
  }, [employees])

  // Open Edit Category Routing Dialog
  const handleOpenCategoryEdit = (cat: ServiceDeskCategorySetting) => {
    setSelectedCategory(cat)
    setCatSlaHours(cat.defaultSlaHours)
    setCatPriority(cat.defaultPriority)
    setCatDeptId(cat.targetDepartmentId ? String(cat.targetDepartmentId) : 'none')
    setCatPicIds(cat.defaultAssignedEmployees.map((e) => String(e.id)))
    setCategoryModalOpen(true)
  }

  // Save Category Routing
  const handleSaveCategoryRouting = async () => {
    if (!selectedCategory) return

    const assignedObjs = catPicIds
      .map((id) => {
        const emp = employees.find((e) => String(e.id) === id)
        return emp ? { id: emp.id, name: emp.name, employeeSn: emp.employee_sn, role: emp.role } : null
      })
      .filter(Boolean) as Array<{ id: number; name: string; employeeSn?: string; role?: string }>

    startTransition(async () => {
      const res = await updateCategoryRoutingAction(selectedCategory.id, {
        defaultSlaHours: Number(catSlaHours),
        defaultPriority: catPriority,
        defaultAssignedEmployees: assignedObjs,
        targetDepartmentId: catDeptId !== 'none' ? parseInt(catDeptId, 10) : null,
      })

      if (res.success) {
        toast.success(res.message || 'Routing kategori berhasil disimpan.')
        setCategories((prev) =>
          prev.map((c) =>
            c.id === selectedCategory.id
              ? {
                  ...c,
                  defaultSlaHours: Number(catSlaHours),
                  defaultPriority: catPriority,
                  defaultAssignedEmployees: assignedObjs,
                  targetDepartmentId: catDeptId !== 'none' ? parseInt(catDeptId, 10) : null,
                }
              : c
          )
        )
        setCategoryModalOpen(false)
      } else {
        toast.error(res.error || 'Gagal menyimpan routing kategori.')
      }
    })
  }

  // Open Template Modal for Create
  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null)
    setTplName('')
    setTplCategoryId(categories[0]?.id ? String(categories[0].id) : '1')
    setTplTitle('')
    setTplDescription('')
    setTplPriority('tinggi')
    setTplSlaHours(12)
    setTplPicIds([])
    setTemplateModalOpen(true)
  }

  // Open Template Modal for Edit
  const handleOpenEditTemplate = (tpl: ServiceDeskTemplateItem) => {
    setEditingTemplateId(tpl.id)
    setTplName(tpl.templateName)
    setTplCategoryId(String(tpl.categoryId))
    setTplTitle(tpl.titleTemplate)
    setTplDescription(tpl.descriptionTemplate)
    setTplPriority(tpl.priority)
    setTplSlaHours(tpl.slaHours)
    setTplPicIds(tpl.assignedEmployees.map((e) => String(e.id)))
    setTemplateModalOpen(true)
  }

  // Save Template (Create or Update)
  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !tplTitle.trim()) {
      toast.error('Mohon isi nama template dan judul kendala bawaan.')
      return
    }

    const assignedObjs = tplPicIds
      .map((id) => {
        const emp = employees.find((e) => String(e.id) === id)
        return emp ? { id: emp.id, name: emp.name, employeeSn: emp.employee_sn, role: emp.role } : null
      })
      .filter(Boolean) as Array<{ id: number; name: string; employeeSn?: string; role?: string }>

    const payload: CreateTemplateInput = {
      categoryId: parseInt(tplCategoryId, 10),
      templateName: tplName.trim(),
      titleTemplate: tplTitle.trim(),
      descriptionTemplate: tplDescription.trim(),
      priority: tplPriority,
      slaHours: Number(tplSlaHours),
      assignedEmployees: assignedObjs,
    }

    startTransition(async () => {
      if (editingTemplateId) {
        const res = await updateProblemTemplateAction(editingTemplateId, payload)
        if (res.success) {
          toast.success(res.message || 'Template kendala berhasil diperbarui.')
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingTemplateId
                ? {
                    ...t,
                    ...payload,
                    categoryName: categories.find((c) => c.id === payload.categoryId)?.name || t.categoryName,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            )
          )
          setTemplateModalOpen(false)
        } else {
          toast.error(res.error || 'Gagal mengubah template kendala.')
        }
      } else {
        const res = await createProblemTemplateAction(payload)
        if (res.success) {
          toast.success(res.message || 'Template kendala baru berhasil dibuat.')
          const newTpl: ServiceDeskTemplateItem = {
            id: res.templateId || Date.now(),
            categoryId: payload.categoryId,
            categoryName: categories.find((c) => c.id === payload.categoryId)?.name || 'Kategori',
            templateName: payload.templateName,
            titleTemplate: payload.titleTemplate,
            descriptionTemplate: payload.descriptionTemplate,
            priority: payload.priority,
            slaHours: payload.slaHours,
            assignedEmployees: assignedObjs,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setTemplates((prev) => [newTpl, ...prev])
          setTemplateModalOpen(false)
        } else {
          toast.error(res.error || 'Gagal membuat template kendala.')
        }
      }
    })
  }

  // Delete Template
  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete) return
    setIsDeleting(true)
    try {
      const res = await deleteProblemTemplateAction(templateToDelete.id)
      if (res.success) {
        toast.success(`Template ${templateToDelete.templateName} berhasil dihapus.`)
        setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
        setDeleteTemplateOpen(false)
        setTemplateToDelete(null)
      } else {
        toast.error(res.error || 'Gagal menghapus template.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      {/* ─── Top Header Navigation ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/helpdesk"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <IconArrowLeft className="size-4" />
              Kembali ke Helpdesk Command Center
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Pengaturan Service Desk: Routing PIC &amp; Master Template
            </h1>
            {isAdmin && (
              <Badge className="bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5 gap-1 shadow-xs">
                <IconShieldCheck className="size-3.5" />
                Mode Admin Aktif
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi otomatisasi penugasan &quot;Masalah Apa ke Siapa&quot; per kategori serta template kendala siap pakai.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'templates' && (
            <Button
              onClick={handleOpenCreateTemplate}
              size="sm"
              className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              <IconPlus className="size-4" />
              + Tambah Template Kendala
            </Button>
          )}
        </div>
      </div>

      {/* ─── Tabs: Matriks Routing vs Master Template ─────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="h-10 bg-slate-100 p-1 mb-4">
          <TabsTrigger
            value="routing"
            className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
          >
            <IconRoute className="size-4" />
            Matriks Routing PIC Kategori ({categories.length})
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
          >
            <IconFileText className="size-4" />
            Master Template Kendala ({templates.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Matriks Routing Kategori ("Masalah Apa ke Siapa") ───── */}
        <TabsContent value="routing" className="m-0 focus-visible:outline-hidden">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Matriks Otomatisasi Penugasan (Masalah Apa -&gt; Ditugaskan ke Siapa)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saat pengguna memilih Kategori di form tiket, sistem akan otomatis memilih teknisi PIC dan batas SLA di bawah ini.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Kategori &amp; Kode</th>
                    <th className="py-3 px-4">Departemen Terkait</th>
                    <th className="py-3 px-4">Prioritas Default</th>
                    <th className="py-3 px-4">Target SLA Default</th>
                    <th className="py-3 px-4">Teknisi PIC Otomatis (Multi-User)</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => {
                    const pics = cat.defaultAssignedEmployees || []
                    const isHeroIssue =
                      cat.code?.startsWith('HERO_') ||
                      (cat as any)?.is_system_issue === true ||
                      cat.name.toLowerCase().includes('hero') ||
                      cat.name.toLowerCase().includes('aplikasi') ||
                      cat.name.toLowerCase().includes('presensi') ||
                      cat.name.toLowerCase().includes('bug') ||
                      cat.name.toLowerCase().includes('timesheet') ||
                      cat.name.toLowerCase().includes('server')

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{cat.name}</span>
                            {isHeroIssue && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold px-1.5 py-0">
                                Default Admin HERO
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">{cat.code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-700 font-medium">
                            {cat.targetDepartmentName || 'Umum / Lintas Departemen'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0.5 capitalize',
                              cat.defaultPriority === 'kritis'
                                ? 'bg-red-600 text-white'
                                : cat.defaultPriority === 'tinggi'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-blue-600 text-white'
                            )}
                          >
                            {cat.defaultPriority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-slate-800 font-semibold">
                            <IconClock className="size-3.5 text-slate-400" />
                            {cat.defaultSlaHours} Jam
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {pics.length === 0 ? (
                            <span className="text-slate-400 italic">Belum ada PIC default</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {pics.map((pic, idx) => {
                                const isKhadafi =
                                  pic.id === 5 ||
                                  pic.employeeSn === '71261' ||
                                  pic.name?.toLowerCase().includes('khadafi')
                                return (
                                  <span
                                    key={idx}
                                    className={cn(
                                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border',
                                      isKhadafi
                                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                                        : 'bg-blue-50 text-blue-900 border-blue-200'
                                    )}
                                  >
                                    <IconUser className={cn('size-3', isKhadafi ? 'text-amber-600' : 'text-blue-600')} />
                                    {isKhadafi ? '⭐ Admin: Mochamad Annas Khadafi' : pic.name}
                                    {pic.role && (
                                      <span className={cn('text-[10px]', isKhadafi ? 'text-amber-700' : 'text-blue-600/70')}>
                                        ({isKhadafi ? 'mochamad.khadafi@chitraparatama.co.id' : pic.role})
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCategoryEdit(cat)}
                            className="h-8 text-xs font-semibold gap-1 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                          >
                            <IconPencil className="size-3.5" />
                            Atur PIC &amp; SLA
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Master Template Kendala Siap Pakai ──────────────────── */}
        <TabsContent value="templates" className="m-0 focus-visible:outline-hidden">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Daftar Template Kendala Cepat
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Template mempermudah pelapor mengisi judul, deskripsi temuan, dan otomatis menugaskan tim teknisi yang relevan.
                </p>
              </div>
              <Button
                onClick={handleOpenCreateTemplate}
                size="sm"
                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              >
                <IconPlus className="size-3.5" />
                + Buat Template Baru
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Template</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Draf Judul &amp; Deskripsi</th>
                    <th className="py-3 px-4">Prioritas &amp; SLA</th>
                    <th className="py-3 px-4">Teknisi PIC Ditugaskan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada template kendala. Klik &quot;+ Buat Template Baru&quot; untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    templates.map((tpl) => {
                      const pics = tpl.assignedEmployees || []
                      return (
                        <tr key={tpl.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 text-sm block">{tpl.templateName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                              {tpl.categoryName}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-900 line-clamp-1">{tpl.titleTemplate}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {tpl.descriptionTemplate || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                className={cn(
                                  'text-[10px] px-1.5 py-0 capitalize',
                                  tpl.priority === 'kritis'
                                    ? 'bg-red-600 text-white'
                                    : tpl.priority === 'tinggi'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-blue-600 text-white'
                                )}
                              >
                                {tpl.priority}
                              </Badge>
                              <span className="text-slate-600 font-medium">{tpl.slaHours} Jam</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {pics.length === 0 ? (
                              <span className="text-slate-400 italic">Mengikuti kategori</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {pics.map((pic, idx) => {
                                  const isKhadafi =
                                    pic.id === 5 ||
                                    pic.employeeSn === '71261' ||
                                    pic.name?.toLowerCase().includes('khadafi')
                                  return (
                                    <span
                                      key={idx}
                                      className={cn(
                                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                        isKhadafi
                                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                                          : 'bg-slate-100 text-slate-800 border-slate-200'
                                      )}
                                    >
                                      <IconUser className={cn('size-2.5', isKhadafi ? 'text-amber-600' : 'text-slate-500')} />
                                      {isKhadafi ? '⭐ Admin (Khadafi)' : pic.name.split(' ')[0]}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditTemplate(tpl)}
                                className="h-8 px-2 text-xs text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                              >
                                <IconPencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTemplateToDelete(tpl)
                                  setDeleteTemplateOpen(true)
                                }}
                                className="h-8 px-2 text-xs text-rose-700 bg-rose-50/50 border-rose-200 hover:bg-rose-100"
                              >
                                <IconTrash className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: ATUR ROUTING PIC KATEGORI ────────────────────────────── */}
      <HeroFormDialog
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        title={`Atur Routing PIC: ${selectedCategory?.name || ''}`}
        description="Tentukan teknisi/karyawan yang otomatis menerima tiket saat kategori ini dipilih."
        submitLabel="Simpan Routing Kategori"
        onSubmit={(e) => {
          e.preventDefault()
          handleSaveCategoryRouting()
        }}
        isSubmitting={isPending}
        maxWidth="lg"
      >
        <div className="flex flex-col gap-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Target SLA Default (Jam) *">
              <HeroInput
                type="number"
                value={catSlaHours}
                onChange={(e) => setCatSlaHours(parseInt(e.target.value, 10) || 24)}
                required
              />
            </HeroFormField>

            <HeroFormField label="Prioritas Default *">
              <Select value={catPriority} onValueChange={(v: any) => setCatPriority(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kritis">Kritis</SelectItem>
                  <SelectItem value="tinggi">Tinggi</SelectItem>
                  <SelectItem value="sedang">Sedang</SelectItem>
                  <SelectItem value="rendah">Rendah</SelectItem>
                </SelectContent>
              </Select>
            </HeroFormField>
          </div>

          <HeroFormField label="Departemen Penanggungjawab (Opsional)">
            <Select value={catDeptId} onValueChange={setCatDeptId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Departemen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Umum / Lintas Departemen</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HeroFormField>

          {/* Multi-User PIC Select */}
          <HeroFormField
            label="Teknisi / PIC Penanggungjawab Otomatis (Multi-User)"
            description="Pilih satu atau beberapa karyawan yang akan langsung terpilih otomatis di form tiket"
          >
            <HeroSearchableSelect
              options={employeeOptions}
              value={catPicIds}
              onChange={(val) => setCatPicIds(val)}
              isMulti={true}
              placeholder="Pilih teknisi/karyawan penanggungjawab..."
              width="w-full"
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: BUAT / EDIT TEMPLATE KENDALA ──────────────────────────── */}
      <HeroFormDialog
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        title={editingTemplateId ? 'Edit Template Kendala' : 'Tambah Template Kendala Baru'}
        description="Template siap pakai untuk mempercepat pelaporan kendala teknis dan operasional."
        submitLabel={editingTemplateId ? 'Simpan Perubahan Template' : 'Buat Template Baru'}
        onSubmit={(e) => {
          e.preventDefault()
          handleSaveTemplate()
        }}
        isSubmitting={isPending}
        maxWidth="lg"
      >
        <div className="flex flex-col gap-3 py-2 text-xs">
          <HeroFormField label="Nama Template *" description="Contoh: Kamera Presensi Gelap / Gagal Sinkron Roster">
            <HeroInput
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Contoh: Kamera Presensi Wajah Gelap"
              required
            />
          </HeroFormField>

          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Kategori Terkait *">
              <Select value={tplCategoryId} onValueChange={setTplCategoryId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HeroFormField>

            <HeroFormField label="Prioritas & Target SLA *">
              <div className="grid grid-cols-2 gap-2">
                <Select value={tplPriority} onValueChange={(v: any) => setTplPriority(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kritis">Kritis</SelectItem>
                    <SelectItem value="tinggi">Tinggi</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="rendah">Rendah</SelectItem>
                  </SelectContent>
                </Select>
                <HeroInput
                  type="number"
                  value={tplSlaHours}
                  onChange={(e) => setTplSlaHours(parseInt(e.target.value, 10) || 12)}
                  placeholder="Jam"
                  required
                />
              </div>
            </HeroFormField>
          </div>

          <HeroFormField label="Draf Judul Kendala Bawaan *">
            <HeroInput
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
              placeholder="Contoh: Kendala Kamera Presensi Wajah Gelap / Tidak Deteksi Wajah"
              required
            />
          </HeroFormField>

          <HeroFormField label="Draf Deskripsi Temuan Bawaan">
            <HeroTextarea
              value={tplDescription}
              onChange={(e) => setTplDescription(e.target.value)}
              placeholder="Tuliskan draf kronologi dan langkah pengecekan awal yang lazim terjadi..."
              rows={3}
            />
          </HeroFormField>

          {/* Multi-User PIC Select in Template */}
          <HeroFormField
            label="Teknisi PIC Ditugaskan Otomatis (Multi-User)"
            description="Pilih teknisi khusus yang otomatis terpilih saat template ini dipakai"
          >
            <HeroSearchableSelect
              options={employeeOptions}
              value={tplPicIds}
              onChange={(val) => setTplPicIds(val)}
              isMulti={true}
              placeholder="Pilih teknisi penanggungjawab template..."
              width="w-full"
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ─── MODAL: HAPUS TEMPLATE CONFIRM ───────────────────────────────── */}
      <HeroConfirmDialog
        open={deleteTemplateOpen}
        onOpenChange={setDeleteTemplateOpen}
        title="Hapus Template Kendala?"
        description={
          <span>
            Tindakan ini tidak dapat dibatalkan. Template kendala{' '}
            <strong className="text-slate-900">{templateToDelete?.templateName}</strong> akan dihapus permanen dari
            sistem.
          </span>
        }
        confirmLabel="Ya, Hapus Template"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDeleteTemplate}
      />
    </div>
  )
}
