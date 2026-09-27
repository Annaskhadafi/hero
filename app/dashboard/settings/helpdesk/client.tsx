'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  GitFork,
  Headphones,
  Layers,
  Loader2,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  deleteHelpdeskRoutingRuleAction,
  updateHelpdeskSettingsAction,
  upsertHelpdeskCategoryAction,
  upsertHelpdeskRoutingRuleAction,
} from '@/app/actions/helpdesk'

interface Props {
  settings: any
  categories: any[]
  routingRules: any[]
  employees: Array<{ id: number; name: string; email: string | null; department: string | null }>
  sites: Array<{ id: number; name: string; code: string | null }>
}

export function HelpdeskSettingsClient({
  settings: initialSettings,
  categories: initialCategories,
  routingRules: initialRoutingRules,
  employees,
  sites,
}: Props) {
  const [activeTab, setActiveTab] = useState<'routing' | 'categories' | 'ai'>('routing')

  // AI Settings State
  const [aiEnabled, setAiEnabled] = useState<boolean>(initialSettings?.aiEnabled ?? true)
  const [aiModel, setAiModel] = useState<string>(initialSettings?.aiModel || 'openai/gpt-4o-mini')
  const [aiSystemPrompt, setAiSystemPrompt] = useState<string>(initialSettings?.aiSystemPrompt || '')
  const [aiGreetingMessage, setAiGreetingMessage] = useState<string>(initialSettings?.aiGreetingMessage || '')
  const [autoKeywords, setAutoKeywords] = useState<string>(
    Array.isArray(initialSettings?.autoEscalateKeywords)
      ? initialSettings.autoEscalateKeywords.join(', ')
      : 'kecelakaan, darurat, urgent, bahaya, kebakaran, tumpahan, breakdown',
  )
  const [maxTurns, setMaxTurns] = useState<number>(initialSettings?.maxBotTurnsBeforeEscalate || 5)
  const [isSavingAi, setIsSavingAi] = useState(false)

  // Categories State
  const [categories, setCategories] = useState(initialCategories)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [catName, setCatName] = useState('')
  const [catCode, setCatCode] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catColor, setCatColor] = useState('#3b82f6')
  const [catSla, setCatSla] = useState(24)
  const [catAiEnabled, setCatAiEnabled] = useState(true)
  const [catIsActive, setCatIsActive] = useState(true)
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  // Routing Rules State
  const [routingRules, setRoutingRules] = useState(initialRoutingRules)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any | null>(null)
  const [ruleCategoryId, setRuleCategoryId] = useState('')
  const [ruleSiteId, setRuleSiteId] = useState('all')
  const [ruleAssignedEmpId, setRuleAssignedEmpId] = useState('none')
  const [ruleNotifyIds, setRuleNotifyIds] = useState<number[]>([])
  const [ruleIsActive, setRuleIsActive] = useState(true)
  const [isSavingRule, setIsSavingRule] = useState(false)

  // AI Settings Save
  async function handleSaveAiSettings(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingAi(true)
    try {
      const keywordsArray = autoKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)

      const res = await updateHelpdeskSettingsAction({
        aiEnabled,
        aiModel: aiModel.trim(),
        aiSystemPrompt: aiSystemPrompt.trim(),
        aiGreetingMessage: aiGreetingMessage.trim(),
        autoEscalateKeywords: keywordsArray,
        maxBotTurnsBeforeEscalate: Number(maxTurns) || 5,
      })

      if (res.success) {
        toast.success('Pengaturan AI Chatbot berhasil disimpan!')
      } else {
        toast.error('Gagal menyimpan pengaturan AI.')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem.')
    } finally {
      setIsSavingAi(false)
    }
  }

  // Category Modal Handlers
  function openAddCategoryModal() {
    setEditingCategory(null)
    setCatName('')
    setCatCode('')
    setCatDesc('')
    setCatColor('#3b82f6')
    setCatSla(24)
    setCatAiEnabled(true)
    setCatIsActive(true)
    setIsCategoryModalOpen(true)
  }

  function openEditCategoryModal(cat: any) {
    setEditingCategory(cat)
    setCatName(cat.name)
    setCatCode(cat.code)
    setCatDesc(cat.description || '')
    setCatColor(cat.color || '#3b82f6')
    setCatSla(cat.defaultSlaHours || 24)
    setCatAiEnabled(cat.isAiEnabled ?? true)
    setCatIsActive(cat.isActive ?? true)
    setIsCategoryModalOpen(true)
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim() || (!editingCategory && !catCode.trim())) {
      toast.error('Nama dan Kode kategori wajib diisi.')
      return
    }

    setIsSavingCategory(true)
    try {
      const res = await upsertHelpdeskCategoryAction({
        id: editingCategory?.id,
        name: catName.trim(),
        code: catCode.trim(),
        description: catDesc.trim(),
        color: catColor,
        defaultSlaHours: Number(catSla) || 24,
        isAiEnabled: catAiEnabled,
        isActive: catIsActive,
      })

      if (res.success) {
        toast.success('Kategori berhasil disimpan!')
        setIsCategoryModalOpen(false)
        window.location.reload()
      } else {
        toast.error('Gagal menyimpan kategori.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  // Routing Rule Handlers
  function openAddRuleModal() {
    setEditingRule(null)
    setRuleCategoryId(categories[0]?.id ? String(categories[0].id) : '')
    setRuleSiteId('all')
    setRuleAssignedEmpId('none')
    setRuleNotifyIds([])
    setRuleIsActive(true)
    setIsRuleModalOpen(true)
  }

  function openEditRuleModal(rule: any) {
    setEditingRule(rule)
    setRuleCategoryId(String(rule.categoryId))
    setRuleSiteId(rule.siteId ? String(rule.siteId) : 'all')
    setRuleAssignedEmpId(rule.assignedEmployeeId ? String(rule.assignedEmployeeId) : 'none')
    setRuleNotifyIds(Array.isArray(rule.notifyEmployeeIds) ? rule.notifyEmployeeIds : [])
    setRuleIsActive(rule.isActive ?? true)
    setIsRuleModalOpen(true)
  }

  function toggleNotifyEmployee(empId: number) {
    setRuleNotifyIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    )
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault()
    if (!ruleCategoryId) {
      toast.error('Kategori wajib dipilih.')
      return
    }

    setIsSavingRule(true)
    try {
      const res = await upsertHelpdeskRoutingRuleAction({
        id: editingRule?.id,
        categoryId: Number(ruleCategoryId),
        siteId: ruleSiteId === 'all' ? null : Number(ruleSiteId),
        assignedEmployeeId: ruleAssignedEmpId === 'none' ? null : Number(ruleAssignedEmpId),
        notifyEmployeeIds: ruleNotifyIds,
        isActive: ruleIsActive,
      })

      if (res.success) {
        toast.success('Aturan penugasan berhasil disimpan!')
        setIsRuleModalOpen(false)
        window.location.reload()
      } else {
        toast.error('Gagal menyimpan aturan penugasan.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    } finally {
      setIsSavingRule(false)
    }
  }

  async function handleDeleteRule(id: number) {
    if (!confirm('Hapus aturan penugasan ini?')) return
    try {
      const res = await deleteHelpdeskRoutingRuleAction(id)
      if (res.success) {
        toast.success('Aturan penugasan telah dihapus.')
        setRoutingRules((prev) => prev.filter((r) => r.id !== id))
      } else {
        toast.error('Gagal menghapus aturan.')
      }
    } catch {
      toast.error('Terjadi kesalahan.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm font-bold">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Pusat Pengaturan Helpdesk &amp; AI Routing
              </h1>
              <p className="text-xs text-slate-500">
                Atur PIC spesialis untuk masing-masing kategori masalah (Productivity, HSE, SPM, Penjualan, dll.),
                matriks penugasan per site, dan perilaku AI First Responder.
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setActiveTab('routing')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                activeTab === 'routing'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Matriks Penugasan (PIC)</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                activeTab === 'categories'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Master Kategori ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                activeTab === 'ai'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>AI Chatbot Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ROUTING MATRIX */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Matriks Routing Eskalasi Tiket (Kategori &times; Site &rarr; PIC)
              </h3>
              <p className="text-xs text-slate-500">
                Tiket yang dialihkan dari AI akan otomatis masuk ke antrean karyawan penanggung jawab
                dan membunyikan Notification Bell serta alert email tim terkait.
              </p>
            </div>

            <Button
              onClick={openAddRuleModal}
              className="h-9 gap-1.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Aturan Penugasan</span>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            {routingRules.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada aturan routing. Klik "Tambah Aturan Penugasan" untuk menentukan PIC per kategori.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Site Operasional</th>
                    <th className="px-4 py-3">PIC Otomatis (Assignee)</th>
                    <th className="px-4 py-3">Notifikasi Pool Tim</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routingRules.map((rule) => {
                    const notifyNames = Array.isArray(rule.notifyEmployeeIds)
                      ? rule.notifyEmployeeIds
                          .map((id: number) => employees.find((e) => e.id === id)?.name)
                          .filter(Boolean)
                      : []

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {rule.categoryName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rule.siteName ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                              {rule.siteName}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Semua Site (Global)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {rule.assignedEmployeeName ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              {rule.assignedEmployeeName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Antrean Terbuka (Claim-only)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {notifyNames.length > 0 ? (
                            <span className="text-slate-600 truncate max-w-xs block">
                              {notifyNames.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              rule.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rule.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditRuleModal(rule)}
                              className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="h-7 text-xs text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MASTER CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Master Kategori Tiket Pengaduan
              </h3>
              <p className="text-xs text-slate-500">
                Kelola kategori keluhan yang dapat dipilih pelanggan saat mengajukan tiket di Maestro.
              </p>
            </div>

            <Button
              onClick={openAddCategoryModal}
              className="h-9 gap-1.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Kategori</span>
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kode Unik</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Target SLA</th>
                  <th className="px-4 py-3">AI First Responder</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-semibold text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{c.code}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{c.description || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {c.defaultSlaHours} Jam
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.isAiEnabled
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.isAiEnabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCategoryModal(c)}
                        className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AI CHATBOT ENGINE */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSaveAiSettings} className="space-y-6">
          <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  <span>AI First Responder Global Toggle</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Aktifkan AI untuk otomatis memberikan respon ramah dan menganalisis keluhan saat customer membuka tiket.
                </p>
              </div>

              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Model AI</label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="Misal: openai/gpt-4o-mini"
                  className="mt-1 h-9 text-xs"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Mendukung model via OpenRouter / Ollama API endpoint.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Maksimal Giliran Chat Sebelum Ditawarkan Eskalasi
                </label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(parseInt(e.target.value, 10))}
                  className="mt-1 h-9 text-xs"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Jika masalah belum tuntas setelah sekian putaran, bot otomatis menyarankan oper ke manusia.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Pesan Sapaan Awal AI (Greeting Template)
              </label>
              <Textarea
                value={aiGreetingMessage}
                onChange={(e) => setAiGreetingMessage(e.target.value)}
                rows={2}
                placeholder="Halo! Saya Asisten Pintar HERO Helpdesk..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                System Prompt &amp; Panduan Persona AI
              </label>
              <Textarea
                value={aiSystemPrompt}
                onChange={(e) => setAiSystemPrompt(e.target.value)}
                rows={4}
                placeholder="Tentukan instruksi perilaku AI, tone of voice, batasan jawaban..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Kata Kunci Pemicu Auto-Eskalasi (Krisis / Darurat / Minta Manusia)</span>
              </label>
              <Input
                value={autoKeywords}
                onChange={(e) => setAutoKeywords(e.target.value)}
                placeholder="kecelakaan, darurat, urgent, bahaya, kebakaran, tumpahan, breakdown"
                className="mt-1 h-9 text-xs"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Pisahkan dengan koma. Jika pesan customer mengandung kata-kata ini, status tiket otomatis menjadi <strong>Escalated</strong> ke tim HERO.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={isSavingAi}
                className="h-9 gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {isSavingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Simpan Konfigurasi AI</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Category Add/Edit Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingCategory ? 'Edit Kategori Tiket' : 'Tambah Kategori Tiket Baru'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Nama Kategori *</label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Misal: Penjualan & Komersial"
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            {!editingCategory && (
              <div>
                <label className="text-xs font-semibold text-slate-700">Kode Unik (Slug) *</label>
                <Input
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  placeholder="Misal: sales-inquiry"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700">Deskripsi Singkat</label>
              <Input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Penjelasan cakupan masalah pada kategori ini..."
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Warna Badge</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border border-slate-200 p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-600">{catColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Default SLA (Jam)</label>
                <Input
                  type="number"
                  min={1}
                  value={catSla}
                  onChange={(e) => setCatSla(parseInt(e.target.value, 10))}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-700">AI Responder Aktif</span>
              <Switch checked={catAiEnabled} onCheckedChange={setCatAiEnabled} />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-xs font-semibold text-slate-700">Status Kategori Aktif</span>
              <Switch checked={catIsActive} onCheckedChange={setCatIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingCategory}
                className="h-8 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {isSavingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                <span>Simpan Kategori</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Routing Rule Add/Edit Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingRule ? 'Edit Aturan Penugasan' : 'Tambah Aturan Penugasan PIC'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tentukan siapa karyawan yang bertanggung jawab menangani tiket pada kategori dan site tertentu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700">Kategori Tiket *</label>
              <Select value={ruleCategoryId} onValueChange={setRuleCategoryId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Cakupan Site Operasional</label>
              <Select value={ruleSiteId} onValueChange={setRuleSiteId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Site (Global)</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                PIC Utama (Auto-assigned Employee)
              </label>
              <Select value={ruleAssignedEmpId} onValueChange={setRuleAssignedEmpId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">Tidak Ada (Masuk Pool Bebas / Claim Manual)</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name} {emp.department ? `(${emp.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Staf Penerima Notifikasi Bell &amp; Email Alert</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({ruleNotifyIds.length} dipilih)
                </span>
              </label>
              <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
                {employees.map((emp) => {
                  const checked = ruleNotifyIds.includes(emp.id)
                  return (
                    <label
                      key={emp.id}
                      onClick={() => toggleNotifyEmployee(emp.id)}
                      className={`flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition ${
                        checked ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        {emp.name} <span className="text-[10px] text-slate-400">{emp.department ? `(${emp.department})` : ''}</span>
                      </span>
                      {checked && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-700">Aturan Aktif</span>
              <Switch checked={ruleIsActive} onCheckedChange={setRuleIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRuleModalOpen(false)}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSavingRule}
                className="h-8 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {isSavingRule ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                <span>Simpan Aturan</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
