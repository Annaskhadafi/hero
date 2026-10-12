'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Star,
  CheckCircle2,
  Upload,
  ArrowRight,
  ArrowLeft,
  Lock,
  Globe,
  Loader2,
  FileCheck,
} from 'lucide-react'
import type { FormTemplateDetail, FormFieldDefinition } from '@/lib/form-builder-types'
import {
  submitPublicResponseAction,
  trackFormStartAction,
} from '@/app/dashboard/form-studio/actions'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { getBackgroundPatternStyle } from '@/lib/form-theme-presets'

export function PublicFormViewerClient({
  formDetail,
}: {
  formDetail: FormTemplateDetail
}) {
  const [isPending, startTransition] = useTransition()

  // State Gate Identitas
  const [hasEnteredIdentity, setHasEnteredIdentity] = useState(!formDetail.settings.requireIdentity)
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [respondentPhone, setRespondentPhone] = useState('')
  const [respondentCompany, setRespondentCompany] = useState('')
  const [respondentSite, setRespondentSite] = useState('')
  const [respondentDepartment, setRespondentDepartment] = useState('')

  // State Jawaban
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Track start metric saat identitas disubmit atau form dimulai
  useEffect(() => {
    setStartTime(Date.now())
  }, [])

  function handleStartForm(e: React.FormEvent) {
    e.preventDefault()
    if (!respondentName.trim()) {
      setErrorMsg('Silakan masukkan nama Anda')
      return
    }
    if (formDetail.settings.requireEmail && !respondentEmail.trim()) {
      setErrorMsg('Silakan masukkan alamat email yang valid')
      return
    }
    if (formDetail.settings.requireCompany && !respondentCompany.trim()) {
      setErrorMsg(`Silakan isi ${formDetail.settings.companyLabel || 'Nama Customer / Perusahaan'}`)
      return
    }
    if (formDetail.settings.requireSite && !respondentSite.trim()) {
      setErrorMsg(`Silakan isi ${formDetail.settings.siteLabel || 'Nama Site / Lokasi Kerja'}`)
      return
    }
    if (formDetail.settings.requireDepartment && !respondentDepartment.trim()) {
      setErrorMsg(`Silakan isi ${formDetail.settings.departmentLabel || 'Departemen / Divisi'}`)
      return
    }

    setErrorMsg(null)
    setHasEnteredIdentity(true)
    // Track start
    trackFormStartAction(formDetail.slug)
  }

  function handleAnswerChange(fieldKey: string, value: any) {
    setAnswers((prev) => ({ ...prev, [fieldKey]: value }))
  }

  async function handleFileUpload(fieldKey: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingField(fieldKey)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        handleAnswerChange(fieldKey, res.url)
      } else {
        alert(res.error || 'Gagal mengunggah berkas')
      }
    } catch (err: any) {
      alert('Gagal mengunggah berkas')
    } finally {
      setUploadingField(null)
    }
  }

  function handleSubmit() {
    setErrorMsg(null)
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000))

    startTransition(async () => {
      const res = await submitPublicResponseAction({
        slug: formDetail.slug,
        respondentName: respondentName || 'Anonim',
        respondentEmail: respondentEmail || 'anonim@chitraparatama.com',
        respondentPhone,
        respondentCompany,
        respondentSite,
        respondentDepartment,
        durationSeconds,
        answers,
      })

      if (res.success) {
        setIsSubmitted(true)
      } else {
        setErrorMsg(res.error || 'Terjadi kesalahan saat mengirim jawaban.')
      }
    })
  }

  const primaryColor = formDetail.themeConfig?.primaryColor || '#2563eb'
  const accentColor = formDetail.themeConfig?.accentColor || '#38bdf8'
  const bgColor = formDetail.themeConfig?.backgroundColor || '#f8fafc'
  const bgPattern = formDetail.themeConfig?.bgPattern || 'none'
  const headerBannerStyle = formDetail.themeConfig?.headerBannerStyle || 'corporate'
  const isDark = bgColor.startsWith('#0') || bgColor.startsWith('#1')

  // Completion Screen
  if (isSubmitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={getBackgroundPatternStyle(bgPattern, bgColor)}
      >
        <Card
          className={`max-w-lg w-full border shadow-xl text-center p-8 backdrop-blur-md ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200'
          }`}
        >
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Jawaban Terkirim!</h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {formDetail.settings.customThankYouMessage ||
              'Terima kasih telah meluangkan waktu untuk mengisi survei ini. Masukan Anda sangat berharga bagi kami.'}
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            <span>PT Chitra Paratama Form Portal</span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen py-10 px-4 sm:px-6 transition-all duration-300"
      style={getBackgroundPatternStyle(bgPattern, bgColor)}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Form Brand Header */}
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-sm relative overflow-hidden backdrop-blur-md transition-all ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
              : 'bg-white/95 border-slate-200/90 text-slate-900'
          }`}
        >
          <div
            className="absolute top-0 left-0 right-0 h-3"
            style={{
              background:
                headerBannerStyle === 'gradient'
                  ? `linear-gradient(90deg, ${primaryColor}, ${accentColor})`
                  : primaryColor,
            }}
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {formDetail.name}
          </h1>
          {formDetail.description && (
            <p className={`text-sm mt-2.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {formDetail.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Kuesioner Resmi PT Chitra Paratama</span>
          </div>
        </div>

        {/* STEP 1: IDENTITY GATE (Jika Diwajibkan) */}
        {!hasEnteredIdentity ? (
          <Card
            className={`border shadow-sm overflow-hidden backdrop-blur-md transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl' : 'bg-white/95 border-slate-200/90 text-slate-900'
            }`}
          >
            <form onSubmit={handleStartForm}>
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <h3 className="text-lg font-bold">
                    {formDetail.settings.identityTitle || 'Konfirmasi Identitas Responden'}
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formDetail.settings.identitySubtitle ||
                      'Sebelum memulai kuesioner, silakan lengkapi data diri Anda di bawah ini.'}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Masukkan nama lengkap Anda"
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Alamat Email {formDetail.settings.requireEmail && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      type="email"
                      placeholder="nama@email.com"
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      required={formDetail.settings.requireEmail}
                      className="h-10 text-sm"
                    />
                  </div>

                  {formDetail.settings.requirePhone && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Nomor WhatsApp / HP <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="tel"
                        placeholder="Contoh: 08123456789"
                        value={respondentPhone}
                        onChange={(e) => setRespondentPhone(e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                  )}

                  {/* CUSTOMER / PERUSAHAAN */}
                  {formDetail.settings.requireCompany && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        {formDetail.settings.companyLabel || 'Nama Customer / Perusahaan'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Contoh: PT Adaro Indonesia / PT Kaltim Prima Coal"
                        value={respondentCompany}
                        onChange={(e) => setRespondentCompany(e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                  )}

                  {/* SITE / LOKASI KERJA */}
                  {formDetail.settings.requireSite && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        {formDetail.settings.siteLabel || 'Nama Site / Lokasi Operasional'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Contoh: Site Sangatta / Site Tabang"
                        value={respondentSite}
                        onChange={(e) => setRespondentSite(e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                  )}

                  {/* DEPARTEMEN */}
                  {formDetail.settings.requireDepartment && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        {formDetail.settings.departmentLabel || 'Departemen / Divisi'}{' '}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Contoh: Plant / Logistic / Procurement"
                        value={respondentDepartment}
                        onChange={(e) => setRespondentDepartment(e.target.value)}
                        required
                        className="h-10 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full gap-2 text-sm h-11 text-white shadow-sm font-semibold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Mulai Mengisi Kuesioner
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        ) : (
          /* STEP 2: QUESTIONNAIRE QUESTIONS */
          <div className="space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 font-medium">
                {errorMsg}
              </div>
            )}

            {formDetail.fields.map((field, idx) => (
              <Card
                key={field.fieldKey}
                className={`border shadow-sm overflow-hidden p-6 sm:p-7 backdrop-blur-md transition-all ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl'
                    : 'bg-white/95 border-slate-200/90 text-slate-900'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-bold text-slate-400 mt-0.5">
                      {idx + 1}.
                    </span>
                    <div className="flex-1">
                      <Label className="text-base font-bold leading-snug">
                        {field.label}
                        {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.helpText && (
                        <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
                      )}
                    </div>
                  </div>

                  {/* FIELD RENDERERS */}
                  <div className="pt-2">
                    {renderInteractiveField({
                      field,
                      value: answers[field.fieldKey],
                      onChange: (val) => handleAnswerChange(field.fieldKey, val),
                      primaryColor,
                      uploading: uploadingField === field.fieldKey,
                      onFileUpload: (e) => handleFileUpload(field.fieldKey, e),
                    })}
                  </div>
                </div>
              </Card>
            ))}

            <div className="pt-4 pb-12 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full sm:w-auto px-8 h-12 text-sm font-bold text-white shadow-md gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengirim Jawaban...
                  </>
                ) : (
                  <>
                    Kirim Kuesioner
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderInteractiveField({
  field,
  value,
  onChange,
  primaryColor,
  uploading,
  onFileUpload,
}: {
  field: FormFieldDefinition
  value: any
  onChange: (val: any) => void
  primaryColor: string
  uploading: boolean
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  switch (field.fieldType) {
    case 'short_text':
    case 'email':
    case 'phone':
      return (
        <Input
          placeholder={field.placeholder || 'Ketik jawaban Anda...'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-sm"
        />
      )
    case 'long_text':
      return (
        <Textarea
          placeholder={field.placeholder || 'Tuliskan jawaban Anda di sini...'}
          rows={3}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          placeholder="0"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-sm w-48"
        />
      )
    case 'nps':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {Array.from({ length: 11 }).map((_, i) => {
              const isSelected = value === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(i)}
                  className={`h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border text-sm font-bold transition-all shadow-xs ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-600/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                >
                  {i}
                </button>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
            <span>0 = Sangat Tidak Mungkin</span>
            <span>10 = Sangat Mungkin</span>
          </div>
        </div>
      )
    case 'star_rating':
      return (
        <div className="flex items-center gap-2 py-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (value || 0) >= star
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
              >
                <Star
                  className={`h-8 w-8 ${
                    isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                  }`}
                />
              </button>
            )
          })}
          {value && <span className="text-sm font-bold text-slate-700 ml-2">{value} / 5</span>}
        </div>
      )
    case 'single_choice':
      return (
        <div className="space-y-2">
          {field.options?.map((opt) => {
            const isChecked = value === opt.value
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={field.fieldKey}
                  value={opt.value}
                  checked={isChecked}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
              </label>
            )
          })}
        </div>
      )
    case 'multiple_choice':
      const selectedList: string[] = Array.isArray(value) ? value : []
      return (
        <div className="space-y-2">
          {field.options?.map((opt) => {
            const isChecked = selectedList.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedList, opt.value])
                    } else {
                      onChange(selectedList.filter((v) => v !== opt.value))
                    }
                  }}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm font-medium text-slate-800">{opt.label}</span>
              </label>
            )
          })}
        </div>
      )
    case 'likert_matrix':
      const matrixVal: Record<string, string> = typeof value === 'object' && value ? value : {}
      return (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/30">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600">
                <th className="py-3 px-4 font-semibold">Aspek</th>
                {field.likertColumns?.map((col) => (
                  <th key={col.id} className="py-3 px-3 text-center font-semibold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {field.likertRows?.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 bg-white">
                  <td className="py-3 px-4 font-medium text-slate-800">{row.label}</td>
                  {field.likertColumns?.map((col) => {
                    const isChecked = matrixVal[row.id] === col.id || matrixVal[row.id] === col.label
                    return (
                      <td key={col.id} className="py-3 px-3 text-center">
                        <input
                          type="radio"
                          name={`${field.fieldKey}_${row.id}`}
                          checked={isChecked}
                          onChange={() =>
                            onChange({
                              ...matrixVal,
                              [row.id]: col.id,
                            })
                          }
                          className="h-4 w-4 text-blue-600 cursor-pointer"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'file_upload':
      return (
        <div className="space-y-3">
          <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 transition-all">
            <Upload className="h-6 w-6 text-slate-400 mb-1" />
            <span className="text-xs font-semibold text-slate-700">
              {uploading ? 'Mengunggah berkas...' : 'Klik untuk pilih berkas (JPG, PNG, PDF)'}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={onFileUpload}
              disabled={uploading}
            />
          </label>
          {value && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <FileCheck className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 font-mono">{value}</span>
              <a
                href={resolveUploadUrl(value)}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Lihat
              </a>
            </div>
          )}
        </div>
      )
    default:
      return (
        <Input
          placeholder="Jawaban Anda..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-sm"
        />
      )
  }
}
