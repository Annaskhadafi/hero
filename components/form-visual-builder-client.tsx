'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Settings,
  Palette,
  Eye,
  CheckCircle,
  Star,
  ListOrdered,
  ChevronDown,
  Hash,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckSquare,
  Radio,
  Sliders,
  Upload,
  FileCheck,
  TrendingUp,
  LayoutTemplate,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { THEME_PRESETS, getBackgroundPatternStyle } from '@/lib/form-theme-presets'
import type {
  FormFieldDefinition,
  FormFieldType,
  FormSettings,
  FormThemeConfig,
  FormTemplateDetail,
  FormOptionItem,
  LikertRow,
  LikertColumn,
} from '@/lib/form-builder-types'
import { saveFormBuilderAction } from '@/app/dashboard/form-studio/actions'
import { getFormBaseUrl } from '@/lib/form-config'

const FIELD_PALETTE: {
  category: string
  items: { type: FormFieldType; label: string; icon: any; defaultProps: Partial<FormFieldDefinition> }[]
}[] = [
  {
    category: 'Standar & Input Teks',
    items: [
      {
        type: 'short_text',
        label: 'Teks Pendek',
        icon: Type,
        defaultProps: { label: 'Pertanyaan Teks Pendek', placeholder: 'Ketik jawaban Anda di sini...' },
      },
      {
        type: 'long_text',
        label: 'Teks Panjang / Paragraf',
        icon: AlignLeft,
        defaultProps: { label: 'Pertanyaan Esai / Deskripsi', placeholder: 'Tuliskan jawaban lengkap Anda di sini...' },
      },
      {
        type: 'number',
        label: 'Angka / Numerik',
        icon: Hash,
        defaultProps: { label: 'Berapa jumlahnya?', placeholder: '0' },
      },
      {
        type: 'email',
        label: 'Alamat Email',
        icon: Mail,
        defaultProps: { label: 'Alamat Email Anda', placeholder: 'nama@domain.com' },
      },
      {
        type: 'phone',
        label: 'Nomor Telepon / WA',
        icon: Phone,
        defaultProps: { label: 'Nomor WhatsApp / HP', placeholder: '08123456789' },
      },
      {
        type: 'date',
        label: 'Tanggal',
        icon: Calendar,
        defaultProps: { label: 'Pilih Tanggal' },
      },
      {
        type: 'time',
        label: 'Waktu / Jam',
        icon: Clock,
        defaultProps: { label: 'Pilih Waktu' },
      },
    ],
  },
  {
    category: 'SurveyMonkey Rating & Pilihan',
    items: [
      {
        type: 'single_choice',
        label: 'Pilihan Tunggal (Radio)',
        icon: Radio,
        defaultProps: {
          label: 'Pilih salah satu jawaban',
          options: [
            { id: '1', value: 'Sangat Setuju', label: 'Sangat Setuju' },
            { id: '2', value: 'Setuju', label: 'Setuju' },
            { id: '3', value: 'Cukup', label: 'Cukup' },
            { id: '4', value: 'Kurang Setuju', label: 'Kurang Setuju' },
          ],
        },
      },
      {
        type: 'multiple_choice',
        label: 'Pilihan Ganda (Checkbox)',
        icon: CheckSquare,
        defaultProps: {
          label: 'Pilih semua yang sesuai',
          options: [
            { id: '1', value: 'Opsi A', label: 'Opsi A' },
            { id: '2', value: 'Opsi B', label: 'Opsi B' },
            { id: '3', value: 'Opsi C', label: 'Opsi C' },
          ],
        },
      },
      {
        type: 'dropdown',
        label: 'Dropdown Pilihan',
        icon: ChevronDown,
        defaultProps: {
          label: 'Pilih dari daftar menu',
          options: [
            { id: '1', value: 'Pilihan 1', label: 'Pilihan 1' },
            { id: '2', value: 'Pilihan 2', label: 'Pilihan 2' },
          ],
        },
      },
      {
        type: 'nps',
        label: 'Net Promoter Score (NPS 0-10)',
        icon: TrendingUp,
        defaultProps: {
          label: 'Seberapa besar kemungkinan Anda merekomendasikan kami kepada kolega Anda?',
          helpText: 'Skala 0 (Sangat tidak mungkin) sampai 10 (Sangat mungkin)',
          min: 0,
          max: 10,
        },
      },
      {
        type: 'star_rating',
        label: 'Penilaian Bintang (Star Rating)',
        icon: Star,
        defaultProps: {
          label: 'Beri penilaian kepuasan Anda',
          max: 5,
        },
      },
      {
        type: 'likert_matrix',
        label: 'Matriks Likert (Matrix Scale)',
        icon: LayoutTemplate,
        defaultProps: {
          label: 'Silakan nilai aspek-aspek berikut sesuai pengalaman Anda:',
          likertRows: [
            { id: 'r1', label: 'Kecepatan Pelayanan' },
            { id: 'r2', label: 'Kualitas Pekerjaan' },
            { id: 'r3', label: 'Keramahan & Komunikasi' },
          ],
          likertColumns: [
            { id: 'c1', label: 'Sangat Buruk', points: 1 },
            { id: 'c2', label: 'Buruk', points: 2 },
            { id: 'c3', label: 'Netral', points: 3 },
            { id: 'c4', label: 'Baik', points: 4 },
            { id: 'c5', label: 'Sangat Baik', points: 5 },
          ],
        },
      },
      {
        type: 'ranking',
        label: 'Urutan Prioritas (Ranking)',
        icon: ListOrdered,
        defaultProps: {
          label: 'Urutkan opsi berikut berdasarkan prioritas Anda',
          options: [
            { id: '1', value: 'Prioritas 1', label: 'Aspek Keselamatan (Safety)' },
            { id: '2', value: 'Prioritas 2', label: 'Efisiensi Waktu' },
            { id: '3', value: 'Prioritas 3', label: 'Efisiensi Biaya' },
          ],
        },
      },
      {
        type: 'slider',
        label: 'Skala Geser (Slider / Range)',
        icon: Sliders,
        defaultProps: {
          label: 'Geser untuk memilih tingkat kepuasan (0 - 100)',
          min: 0,
          max: 100,
          step: 5,
        },
      },
    ],
  },
  {
    category: 'Media & File',
    items: [
      {
        type: 'file_upload',
        label: 'Unggah Berkas / Dokumen / Foto',
        icon: Upload,
        defaultProps: {
          label: 'Lampirkan Bukti / Dokumen Pendukung',
          helpText: 'Format JPG, PNG, PDF maks 10MB',
          maxFileSizeMb: 10,
        },
      },
      {
        type: 'signature',
        label: 'Tanda Tangan Digital',
        icon: FileCheck,
        defaultProps: {
          label: 'Tanda Tangan Responden',
          helpText: 'Bubuhkan tanda tangan Anda di kotak ini',
        },
      },
    ],
  },
  {
    category: 'Tata Letak & Navigasi',
    items: [
      {
        type: 'section_header',
        label: 'Header Bagian / Deskripsi',
        icon: LayoutTemplate,
        defaultProps: {
          label: 'Bagian Baru',
          helpText: 'Penjelasan atau petunjuk untuk bagian ini.',
        },
      },
      {
        type: 'page_break',
        label: 'Pemisah Halaman (Page Break)',
        icon: HelpCircle,
        defaultProps: {
          label: 'Lanjut ke Halaman Berikutnya',
        },
      },
    ],
  },
]

export function FormVisualBuilderClient({
  initialForm,
}: {
  initialForm: FormTemplateDetail
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form Basic Info
  const [name, setName] = useState(initialForm.name)
  const [slug, setSlug] = useState(initialForm.slug)
  const [description, setDescription] = useState(initialForm.description || '')
  const [isActive, setIsActive] = useState(initialForm.isActive)

  // Fields State
  const [fields, setFields] = useState<FormFieldDefinition[]>(initialForm.fields || [])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    fields.length > 0 ? fields[0].fieldKey : null,
  )

  // Settings & Theme
  const [settings, setSettings] = useState<FormSettings>(initialForm.settings)
  const [themeConfig, setThemeConfig] = useState<FormThemeConfig>(initialForm.themeConfig)

  const selectedField = fields.find((f) => f.fieldKey === selectedFieldId) || null
  const baseUrl = getFormBaseUrl()
  const publicFormUrl = `${baseUrl}/f/${slug}`

  // Add field
  function handleAddField(type: FormFieldType, defaultProps: Partial<FormFieldDefinition>) {
    const newKey = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`
    const newField: FormFieldDefinition = {
      fieldKey: newKey,
      fieldType: type,
      label: defaultProps.label || 'Pertanyaan Baru',
      placeholder: defaultProps.placeholder,
      helpText: defaultProps.helpText,
      defaultValue: defaultProps.defaultValue,
      isRequired: defaultProps.isRequired ?? true,
      sortOrder: fields.length + 1,
      options: defaultProps.options,
      likertRows: defaultProps.likertRows,
      likertColumns: defaultProps.likertColumns,
      min: defaultProps.min,
      max: defaultProps.max,
      step: defaultProps.step,
      maxFileSizeMb: defaultProps.maxFileSizeMb,
      pageNumber: defaultProps.pageNumber || 1,
    }

    setFields([...fields, newField])
    setSelectedFieldId(newKey)
  }

  // Update selected field
  function handleUpdateField(fieldKey: string, updates: Partial<FormFieldDefinition>) {
    setFields((prev) =>
      prev.map((f) => (f.fieldKey === fieldKey ? { ...f, ...updates } : f)),
    )
  }

  // Remove field
  function handleRemoveField(fieldKey: string) {
    const next = fields.filter((f) => f.fieldKey !== fieldKey)
    setFields(next)
    if (selectedFieldId === fieldKey) {
      setSelectedFieldId(next.length > 0 ? next[0].fieldKey : null)
    }
  }

  // Duplicate field
  function handleDuplicateField(field: FormFieldDefinition) {
    const newKey = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`
    const cloned: FormFieldDefinition = {
      ...field,
      fieldKey: newKey,
      label: `${field.label} (Salinan)`,
      sortOrder: fields.length + 1,
    }
    setFields([...fields, cloned])
    setSelectedFieldId(newKey)
  }

  // Save all
  function handleSave() {
    startTransition(async () => {
      const res = await saveFormBuilderAction({
        formId: initialForm.id,
        name,
        slug,
        description,
        isActive,
        settings,
        themeConfig,
        fields,
      })

      if (res.success) {
        alert('Formulir berhasil disimpan!')
        router.refresh()
      } else {
        alert(res.error || 'Gagal menyimpan')
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Action Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/form-studio">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-48 sm:w-64 text-sm font-semibold border-slate-200 hover:border-slate-300 focus:border-blue-500"
              placeholder="Nama Kuesioner..."
            />
            <span className="hidden sm:inline-block text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              /f/{slug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <span className="text-xs text-slate-500">Status Form:</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-xs font-medium">{isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>

          <Link href={`/dashboard/form-studio/${initialForm.id}/analytics`}>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Analitik</span>
            </Button>
          </Link>

          <a href={publicFormUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buka Form Publik</span>
            </Button>
          </a>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Field Palette */}
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4 flex flex-col gap-6 shrink-0 shadow-xs z-10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Komponen Pertanyaan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Klik komponen di bawah untuk menambahkan ke kuesioner Anda:
            </p>
          </div>

          {FIELD_PALETTE.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {cat.category}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {cat.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleAddField(item.type, item.defaultProps)}
                      className="flex items-center gap-2.5 p-2 rounded-lg text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-blue-600">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Center Column: Live Questionnaire Canvas */}
        <div
          className="flex-1 overflow-y-auto p-8 flex flex-col items-center transition-all duration-300"
          style={getBackgroundPatternStyle(themeConfig.bgPattern, themeConfig.backgroundColor || '#f8fafc')}
        >
          <div className="w-full max-w-2xl space-y-4">
            {/* Form Header Preview */}
            <div
              className={`rounded-2xl p-6 sm:p-8 border shadow-sm relative overflow-hidden backdrop-blur-md transition-all ${
                themeConfig.backgroundColor && themeConfig.backgroundColor.startsWith('#0')
                  ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
                  : 'bg-white/95 border-slate-200/90 text-slate-900'
              }`}
            >
              <div
                className="absolute top-0 left-0 right-0 h-3"
                style={{
                  background:
                    themeConfig.headerBannerStyle === 'gradient'
                      ? `linear-gradient(90deg, ${themeConfig.primaryColor || '#2563eb'}, ${themeConfig.accentColor || '#38bdf8'})`
                      : themeConfig.primaryColor || '#2563eb',
                }}
              />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {name || 'Judul Formulir'}
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                {description || 'Belum ada deskripsi kuesioner.'}
              </p>

              {settings.requireIdentity && (
                <div className="mt-4 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Field Identitas aktif:{' '}
                    <b>
                      Nama
                      {settings.requireEmail ? ', Email' : ''}
                      {settings.requirePhone ? ', No HP/WA' : ''}
                      {settings.requireCompany ? `, ${settings.companyLabel || 'Nama Customer'}` : ''}
                      {settings.requireSite ? `, ${settings.siteLabel || 'Nama Site'}` : ''}
                      {settings.requireDepartment ? `, ${settings.departmentLabel || 'Departemen'}` : ''}
                    </b>
                  </span>
                </div>
              )}
            </div>

            {/* Questions List */}
            {fields.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                <LayoutTemplate className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kuesioner masih kosong
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih tipe pertanyaan dari panel sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              fields.map((field, index) => {
                const isSelected = selectedFieldId === field.fieldKey
                return (
                  <div
                    key={field.fieldKey}
                    onClick={() => setSelectedFieldId(field.fieldKey)}
                    className={`bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all cursor-pointer relative shadow-sm ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="text-xs font-bold text-slate-400 mt-0.5">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {field.label}
                            {field.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </div>
                          {field.helpText && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {field.helpText}
                            </p>
                          )}

                          {/* Dynamic Preview Component */}
                          <div className="mt-4 pointer-events-none opacity-80">
                            {renderFieldPreview(field)}
                          </div>
                        </div>
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateField(field)
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveField(field.fieldKey)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Field / Form Settings Inspector */}
        <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4">
          <Tabs defaultValue="field" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="field">Field</TabsTrigger>
              <TabsTrigger value="settings">Aturan</TabsTrigger>
              <TabsTrigger value="theme">Tema</TabsTrigger>
            </TabsList>

            {/* TAB 1: FIELD PROPERTIES */}
            <TabsContent value="field" className="space-y-4">
              {selectedField ? (
                <>
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      {selectedField.fieldType.replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Pengaturan Pertanyaan
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Teks Pertanyaan</Label>
                    <Input
                      value={selectedField.label}
                      onChange={(e) =>
                        handleUpdateField(selectedField.fieldKey, { label: e.target.value })
                      }
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Keterangan Tambahan / Hint</Label>
                    <Input
                      value={selectedField.helpText || ''}
                      onChange={(e) =>
                        handleUpdateField(selectedField.fieldKey, { helpText: e.target.value })
                      }
                      placeholder="Contoh: Skala 1 sampai 5"
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
                    <Label className="text-xs cursor-pointer">Wajib Diisi (Required)</Label>
                    <Switch
                      checked={selectedField.isRequired}
                      onCheckedChange={(checked) =>
                        handleUpdateField(selectedField.fieldKey, { isRequired: checked })
                      }
                    />
                  </div>

                  {/* Options Editor (Radio, Checkbox, Dropdown) */}
                  {['single_choice', 'multiple_choice', 'dropdown', 'ranking'].includes(
                    selectedField.fieldType,
                  ) && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold">Daftar Pilihan Jawaban</Label>
                      <div className="space-y-2">
                        {selectedField.options?.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1.5">
                            <Input
                              value={opt.label}
                              onChange={(e) => {
                                const newOpts = [...(selectedField.options || [])]
                                newOpts[optIdx] = { ...newOpts[optIdx], label: e.target.value, value: e.target.value }
                                handleUpdateField(selectedField.fieldKey, { options: newOpts })
                              }}
                              className="text-xs h-7"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                              onClick={() => {
                                const newOpts = (selectedField.options || []).filter(
                                  (_, i) => i !== optIdx,
                                )
                                handleUpdateField(selectedField.fieldKey, { options: newOpts })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7 gap-1"
                          onClick={() => {
                            const newOpts = [
                              ...(selectedField.options || []),
                              { id: String(Date.now()), label: `Pilihan Baru`, value: `Pilihan Baru` },
                            ]
                            handleUpdateField(selectedField.fieldKey, { options: newOpts })
                          }}
                        >
                          <Plus className="h-3 w-3" /> Tambah Pilihan
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Likert Rows Editor */}
                  {selectedField.fieldType === 'likert_matrix' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <Label className="text-xs font-semibold">Baris Aspek Evaluasi</Label>
                        <div className="space-y-1.5 mt-1">
                          {selectedField.likertRows?.map((row, rIdx) => (
                            <div key={row.id} className="flex items-center gap-1.5">
                              <Input
                                value={row.label}
                                onChange={(e) => {
                                  const newRows = [...(selectedField.likertRows || [])]
                                  newRows[rIdx] = { ...newRows[rIdx], label: e.target.value }
                                  handleUpdateField(selectedField.fieldKey, { likertRows: newRows })
                                }}
                                className="text-xs h-7"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Pilih salah satu pertanyaan di kanvas untuk mengubah propertinya.
                </div>
              )}
            </TabsContent>

            {/* TAB 2: FORM SETTINGS */}
            <TabsContent value="settings" className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Akses & Responden
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Wajibkan Identitas</div>
                    <div className="text-slate-400 text-[11px]">Responden input Nama & Kontak</div>
                  </div>
                  <Switch
                    checked={settings.requireIdentity}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireIdentity: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Wajibkan Email</div>
                    <div className="text-slate-400 text-[11px]">Email aktif responden</div>
                  </div>
                  <Switch
                    checked={settings.requireEmail}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requireEmail: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Wajibkan Nomor HP / WA</div>
                    <div className="text-slate-400 text-[11px]">Kontak telepon/WhatsApp</div>
                  </div>
                  <Switch
                    checked={settings.requirePhone}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, requirePhone: checked })
                    }
                  />
                </div>

                {/* Field Customer / Perusahaan */}
                <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Nama Customer / Perusahaan</div>
                      <div className="text-slate-400 text-[11px]">Tampilkan field perusahaan</div>
                    </div>
                    <Switch
                      checked={Boolean(settings.requireCompany)}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireCompany: checked })
                      }
                    />
                  </div>
                  {settings.requireCompany && (
                    <Input
                      placeholder="Label field (misal: Nama Customer / Perusahaan)"
                      value={settings.companyLabel || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, companyLabel: e.target.value })
                      }
                      className="text-xs h-7 bg-white dark:bg-slate-800"
                    />
                  )}
                </div>

                {/* Field Site / Lokasi Kerja */}
                <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Nama Site / Lokasi Kerja</div>
                      <div className="text-slate-400 text-[11px]">Tampilkan field Site</div>
                    </div>
                    <Switch
                      checked={Boolean(settings.requireSite)}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireSite: checked })
                      }
                    />
                  </div>
                  {settings.requireSite && (
                    <Input
                      placeholder="Label field (misal: Nama Site / Lokasi Operasional)"
                      value={settings.siteLabel || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, siteLabel: e.target.value })
                      }
                      className="text-xs h-7 bg-white dark:bg-slate-800"
                    />
                  )}
                </div>

                {/* Field Departemen */}
                <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Departemen / Divisi</div>
                      <div className="text-slate-400 text-[11px]">Tampilkan field Departemen</div>
                    </div>
                    <Switch
                      checked={Boolean(settings.requireDepartment)}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireDepartment: checked })
                      }
                    />
                  </div>
                  {settings.requireDepartment && (
                    <Input
                      placeholder="Label field (misal: Departemen / Divisi Kerja)"
                      value={settings.departmentLabel || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, departmentLabel: e.target.value })
                      }
                      className="text-xs h-7 bg-white dark:bg-slate-800"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Progress Bar</div>
                    <div className="text-slate-400 text-[11px]">Tampilkan persentase isi</div>
                  </div>
                  <Switch
                    checked={settings.showProgressBar}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, showProgressBar: checked })
                    }
                  />
                </div>

                <div className="space-y-1 pt-2">
                  <Label className="text-xs">Custom URL Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400">form.chitraparatama.com/f/{slug}</span>
                </div>

                <div className="space-y-1 pt-2">
                  <Label className="text-xs">Pesan Terima Kasih Kustom</Label>
                  <Textarea
                    value={settings.customThankYouMessage || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, customThankYouMessage: e.target.value })
                    }
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: THEME (PRESETS & ADVANCED BACKGROUND PATTERNS) */}
            <TabsContent value="theme" className="space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Preset Tema Desain (1-Click)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih preset tema visual siap pakai untuk mengubah tampilan kuesioner Anda seketika:
                </p>
              </div>

              {/* 1-Click Presets Grid */}
              <div className="grid grid-cols-2 gap-2">
                {THEME_PRESETS.map((preset) => {
                  const isSelected =
                    themeConfig.primaryColor === preset.primaryColor &&
                    themeConfig.backgroundColor === preset.backgroundColor
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setThemeConfig({
                          ...themeConfig,
                          primaryColor: preset.primaryColor,
                          accentColor: preset.accentColor,
                          backgroundColor: preset.backgroundColor,
                          bgPattern: preset.bgPattern,
                          headerBannerStyle: preset.headerBannerStyle,
                        })
                      }
                      className={`group relative p-2.5 rounded-xl border text-left transition-all text-xs ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm bg-blue-50/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`h-7 w-full rounded-lg bg-gradient-to-r ${preset.previewGradient} shadow-xs mb-2 flex items-center justify-end px-2`}
                      >
                        {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Pola: {preset.bgPattern}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Custom Pattern Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-semibold">Pola Background (Background Pattern)</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'Polos' },
                      { id: 'dots', label: 'Bintik (Dots)' },
                      { id: 'grid', label: 'Kotak (Grid)' },
                      { id: 'mesh', label: 'Mesh Glow' },
                      { id: 'waves', label: 'Gelombang' },
                      { id: 'luxury', label: 'Luxury Dark' },
                    ] as const
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => setThemeConfig({ ...themeConfig, bgPattern: pat.id })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all ${
                        (themeConfig.bgPattern || 'none') === pat.id
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header Banner Style */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-semibold">Gaya Banner Header Kartu</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'corporate', label: 'Garis Solid' },
                      { id: 'gradient', label: 'Gradasi Modern' },
                      { id: 'glass', label: 'Glassmorphism' },
                      { id: 'minimal', label: 'Minimalis' },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setThemeConfig({ ...themeConfig, headerBannerStyle: b.id })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all ${
                        (themeConfig.headerBannerStyle || 'corporate') === b.id
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Color Pickers */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Warna Aksen Tombol (Primary)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeConfig.primaryColor || '#2563eb'}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, primaryColor: e.target.value })
                      }
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                    />
                    <Input
                      value={themeConfig.primaryColor || '#2563eb'}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, primaryColor: e.target.value })
                      }
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Warna Latar Dasar (Background)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeConfig.backgroundColor || '#f8fafc'}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, backgroundColor: e.target.value })
                      }
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                    />
                    <Input
                      value={themeConfig.backgroundColor || '#f8fafc'}
                      onChange={(e) =>
                        setThemeConfig({ ...themeConfig, backgroundColor: e.target.value })
                      }
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function renderFieldPreview(field: FormFieldDefinition) {
  switch (field.fieldType) {
    case 'short_text':
      return <Input placeholder={field.placeholder || 'Jawaban singkat...'} className="h-9 text-xs" />
    case 'long_text':
      return <Textarea placeholder={field.placeholder || 'Jawaban paragraf...'} rows={2} className="text-xs" />
    case 'number':
      return <Input type="number" placeholder="0" className="h-9 text-xs w-48" />
    case 'nps':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs"
              >
                {i}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Sangat Tidak Mungkin (0)</span>
            <span>Sangat Mungkin (10)</span>
          </div>
        </div>
      )
    case 'star_rating':
      return (
        <div className="flex items-center gap-1.5 py-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="h-6 w-6 fill-amber-400" />
          ))}
        </div>
      )
    case 'single_choice':
      return (
        <div className="space-y-1.5">
          {field.options?.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
              <div className="h-3.5 w-3.5 rounded-full border border-slate-300" />
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )
    case 'multiple_choice':
      return (
        <div className="space-y-1.5">
          {field.options?.map((opt, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
              <div className="h-3.5 w-3.5 rounded border border-slate-300" />
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )
    case 'likert_matrix':
      return (
        <div className="overflow-x-auto text-xs border border-slate-200 rounded-lg p-2 bg-slate-50/50">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-1 px-2 font-medium">Aspek</th>
                {field.likertColumns?.map((col) => (
                  <th key={col.id} className="py-1 px-2 text-center font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {field.likertRows?.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-1 px-2 font-medium text-slate-700">{row.label}</td>
                  {field.likertColumns?.map((col) => (
                    <td key={col.id} className="py-1 px-2 text-center">
                      <div className="h-3.5 w-3.5 mx-auto rounded-full border border-slate-300" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'file_upload':
      return (
        <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-500 bg-slate-50">
          <Upload className="h-5 w-5 mx-auto text-slate-400 mb-1" />
          <span>Klik atau seret berkas ke sini</span>
        </div>
      )
    default:
      return <Input placeholder="Input preview..." className="h-9 text-xs" />
  }
}
