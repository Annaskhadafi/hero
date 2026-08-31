"use client"

import React, { useState, useEffect, useMemo, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Send, FileCheck, Building2, UserCheck, Search } from "lucide-react"
import { toast } from "sonner"
import { uploadFile } from "@/app/actions/upload";
import { submitSopWinDocumentRequestAction, getEmployeeOptionsForSopAction } from "@/app/dashboard/sop-win/actions"

interface SopWinRequestModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDoc?: {
    id?: number
    documentCode?: string
    title?: string
    docType?: string
    departmentName?: string
    docCount?: number
    docTitleAndNumber?: string
  } | null
  currentEmployee?: {
    id: number
    name: string
    department?: string | null
    section?: string | null
  } | null
  departmentsProp?: Array<{ id: number; name: string; code: string }>
}

export function SopWinRequestModal({
  isOpen,
  onClose,
  selectedDoc,
  currentEmployee,
  departmentsProp = [],
}: SopWinRequestModalProps) {
  const [isPending, startTransition] = useTransition()

  // Form State
  const [requesterName, setRequesterName] = useState("")
  const [targetDepartment, setTargetDepartment] = useState("")
  const [procedureName, setProcedureName] = useState("")
  const [ownDepartment, setOwnDepartment] = useState("")
  const [requestedDocTypes, setRequestedDocTypes] = useState<string[]>(["SOP"])
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split("T")[0])
  const [isProcessOwner, setIsProcessOwner] = useState<"Ya" | "Tidak">("Tidak")

  const [requestReason, setRequestReason] = useState("")
  const [docQty, setDocQty] = useState(1)
  const [docTitleAndNumber, setDocTitleAndNumber] = useState("")
  const [requestType, setRequestType] = useState<"softcopy" | "hardcopy">("softcopy")
  const [fileAttachmentUrl, setFileAttachmentUrl] = useState("")

  // Searchable Dropdowns State
  const [employeeOptions, setEmployeeOptions] = useState<Array<{
    id: number;
    name: string;
    employeeSn?: string;
    position?: string;
    department?: string;
    section?: string;
  }>>([])
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)
  const [showTargetDeptDropdown, setShowTargetDeptDropdown] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (currentEmployee) {
        setRequesterName(currentEmployee.name || "")
        setOwnDepartment(currentEmployee.section || currentEmployee.department || "Internal HERO")
      }
      if (selectedDoc) {
        setProcedureName(selectedDoc.title || "")
        const fullTitle = selectedDoc.docTitleAndNumber || `${selectedDoc.documentCode || ''} - ${selectedDoc.title || ''}`
        setDocTitleAndNumber(fullTitle)
        if (selectedDoc.docCount) {
          setDocQty(selectedDoc.docCount)
        }
        if (selectedDoc.departmentName) {
          setTargetDepartment(selectedDoc.departmentName)
        }
      }

      // Load Employee Database
      getEmployeeOptionsForSopAction()
        .then((res) => {
          if (res.success && res.employees) {
            setEmployeeOptions(res.employees)
          }
        })
        .catch((err) => console.error("Error loading employee database for request modal:", err))
    }
  }, [isOpen, selectedDoc, currentEmployee])

  // Auto-detect document types (POL, SOP, WIN) from selected document text
  useEffect(() => {
    if (docTitleAndNumber) {
      const types: string[] = []
      const upperText = docTitleAndNumber.toUpperCase()
      if (upperText.includes("POL") || upperText.includes("KEBIJAKAN") || upperText.includes("POLICY")) {
        types.push("POL")
      }
      if (upperText.includes("SOP") || upperText.includes("STANDARD OPERATING")) {
        types.push("SOP")
      }
      if (upperText.includes("WIN") || upperText.includes("WORK INSTRUCTION") || upperText.includes("INSTRUKSI KERJA")) {
        types.push("WIN")
      }
      if (types.length > 0) {
        setRequestedDocTypes(types)
      }
    }
  }, [docTitleAndNumber])

  // Filtered employees for searchable dropdown
  const filteredEmployees = useMemo(() => {
    const q = requesterName.toLowerCase().trim()
    if (!q) return employeeOptions
    return employeeOptions.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.position || "").toLowerCase().includes(q) ||
        (emp.department || "").toLowerCase().includes(q) ||
        (emp.section || "").toLowerCase().includes(q) ||
        (emp.employeeSn || "").toLowerCase().includes(q)
    )
  }, [employeeOptions, requesterName])

  // Aggregated Department & Section list for dropdown
  const allDeptNames = useMemo(() => {
    const set = new Set<string>()
    departmentsProp.forEach((d) => set.add(d.name))
    employeeOptions.forEach((e) => {
      if (e.department) set.add(e.department)
      if (e.section) set.add(e.section)
    })
    ;[
      "Continuous Process Improvement & IA Reps",
      "Quality Management",
      "Human Capital & General Affair",
      "Finance & Accounting",
      "Information Technology",
      "Operation & Logistic",
      "Supply Chain Management",
      "Health Safety Environment",
    ].forEach((d) => set.add(d))
    return Array.from(set).sort()
  }, [departmentsProp, employeeOptions])

  const filteredDeptsList = useMemo(() => {
    const q = ownDepartment.toLowerCase().trim()
    if (!q) return allDeptNames
    return allDeptNames.filter((d) => d.toLowerCase().includes(q))
  }, [allDeptNames, ownDepartment])

  const filteredTargetDeptsList = useMemo(() => {
    const q = targetDepartment.toLowerCase().trim()
    if (!q) return allDeptNames
    return allDeptNames.filter((d) => d.toLowerCase().includes(q))
  }, [allDeptNames, targetDepartment])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 128 * 1024 * 1024) {
        toast.error("Ukuran file melebihi batas maksimum 128 MB")
        return
      }
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("uploadTarget", "sop-win-requests")
        const res = await uploadFile(formData)
        if (res.success && res.url) {
          setFileAttachmentUrl(res.url)
          toast.success(`File pendukung berhasil diunggah: ${file.name}`)
          return
        }
      } catch (err) {
        console.error("Upload error:", err)
      }
      const safeName = file.name.replace(/\s+/g, "_")
      const fallbackUrl = `/api/uploads/sop-win-requests/${Date.now()}_${safeName}`
      setFileAttachmentUrl(fallbackUrl)
      toast.success(`File pendukung siap: ${file.name}`)
    }
  }

  // Permohonan Type (Internal vs Eksternal)
  const [isExternal, setIsExternal] = useState<boolean>(false)
  const [externalCompany, setExternalCompany] = useState("")
  const [externalName, setExternalName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!requesterName.trim()) {
      toast.error("Nama pemohon wajib diisi")
      return
    }
    if (!docTitleAndNumber.trim()) {
      toast.error("Judul & Nomor Prosedur Yang Diminta wajib diisi")
      return
    }
    if (isExternal && !requestReason.trim()) {
      toast.error("Alasan permintaan dokumen wajib diisi untuk permohonan eksternal")
      return
    }

    startTransition(async () => {
      const docTypeString = (requestedDocTypes.length > 0 ? requestedDocTypes.join(", ") : "SOP") as any;
      const res = await submitSopWinDocumentRequestAction({
        requesterName,
        requesterDepartment: targetDepartment || ownDepartment || "Internal HERO",
        requestedDocType: docTypeString,
        procedureName: procedureName || docTitleAndNumber,
        ownDepartment,
        isProcessOwner: isProcessOwner === "Ya",
        requestDate,
        isExternal,
        externalCompany: isExternal ? externalCompany : "",
        externalName: isExternal ? externalName : "",
        requestReason: requestReason || "Permintaan akses dokumen internal HERO",
        requestedDocCount: Number(docQty) || 1,
        requestedDocTitleAndNumber: docTitleAndNumber,
        fileAttachmentUrl,
        requestType,
      })

      if (res.success) {
        toast.success(res.message || "Permintaan dokumen berhasil dikirim untuk persetujuan!")
        onClose()
      } else {
        toast.error(res.error || "Gagal mengirimkan permintaan dokumen.")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-[#0f172a] text-white border-none font-bold">
              Formulir Permintaan Dokumen Internal
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
            Permintaan Dokumen Internal HERO
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Setiap permintaan dokumen SOP, WIN, dan POL membutuhkan persetujuan berjenjang dari Quality Management (Ria Annisa Putri) dan Pembuat Dokumen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* ── TIPE PERMOHONAN SELECTOR (INTERNAL VS EKSTERNAL) ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <Label className="text-xs font-bold text-slate-800">Tipe Permohonan Dokumen <span className="text-rose-500">*</span></Label>
            <div className="flex items-center gap-6">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${!isExternal ? "bg-slate-900 border-slate-900 text-white shadow-2xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                <input
                  type="radio"
                  name="permohonanType"
                  checked={!isExternal}
                  onChange={() => setIsExternal(false)}
                  className="sr-only"
                />
                <span>Pihak Internal</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${isExternal ? "bg-slate-900 border-slate-900 text-white shadow-2xs" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                <input
                  type="radio"
                  name="permohonanType"
                  checked={isExternal}
                  onChange={() => setIsExternal(true)}
                  className="sr-only"
                />
                <span>Pihak Eksternal</span>
              </label>
            </div>
          </div>

          {/* ── SECTION 1: PIHAK INTERNAL ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b pb-2">
              <UserCheck className="size-4 text-slate-700" />
              <span>Pihak Internal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Searchable Nama Pemohon */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-slate-700">Nama <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Input
                    value={requesterName}
                    onChange={(e) => {
                      setRequesterName(e.target.value)
                      setShowEmpDropdown(true)
                    }}
                    onFocus={() => setShowEmpDropdown(true)}
                    onBlur={() => setTimeout(() => setShowEmpDropdown(false), 250)}
                    placeholder="Cari atau ketik nama pemohon..."
                    className="bg-slate-50 text-xs pr-8"
                    required
                  />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                </div>

                {showEmpDropdown && filteredEmployees.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl p-1 divide-y divide-slate-100">
                    {filteredEmployees.slice(0, 20).map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setRequesterName(emp.name)
                          if (emp.section || emp.department) {
                            setOwnDepartment(emp.section || emp.department || "")
                          }
                          setShowEmpDropdown(false)
                        }}
                        className="w-full text-left p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {emp.position || "Staff"} • {emp.section || emp.department || "HERO"}
                          </div>
                        </div>
                        {emp.employeeSn && (
                          <Badge variant="outline" className="text-[9px] font-mono text-slate-500 shrink-0">
                            SN: {emp.employeeSn}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Searchable Departemen/Section Prosedur */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-slate-700">Departemen/Section</Label>
                <div className="relative">
                  <Input
                    value={targetDepartment}
                    onChange={(e) => {
                      setTargetDepartment(e.target.value)
                      setShowTargetDeptDropdown(true)
                    }}
                    onFocus={() => setShowTargetDeptDropdown(true)}
                    onBlur={() => setTimeout(() => setShowTargetDeptDropdown(false), 250)}
                    placeholder="- Pilih - / Ketik Departemen"
                    className="bg-slate-50 text-xs pr-8"
                  />
                  <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                </div>

                {showTargetDeptDropdown && filteredTargetDeptsList.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl p-1 divide-y divide-slate-100">
                    {filteredTargetDeptsList.slice(0, 25).map((dept, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setTargetDepartment(dept)
                          setShowTargetDeptDropdown(false)
                        }}
                        className="w-full text-left p-2 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium text-slate-800"
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prosedur Yang Diminta</Label>
                <Input
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  placeholder="- Pilih - / Judul Prosedur"
                  className="bg-slate-50 text-xs"
                />
              </div>

              {/* Searchable Departemen/Section Sendiri */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-slate-700">Departemen/Section Sendiri</Label>
                <div className="relative">
                  <Input
                    value={ownDepartment}
                    onChange={(e) => {
                      setOwnDepartment(e.target.value)
                      setShowDeptDropdown(true)
                    }}
                    onFocus={() => setShowDeptDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDeptDropdown(false), 250)}
                    placeholder="- Pilih -"
                    className="bg-slate-50 text-xs pr-8"
                  />
                  <Building2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                </div>

                {showDeptDropdown && filteredDeptsList.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl p-1 divide-y divide-slate-100">
                    {filteredDeptsList.slice(0, 20).map((dept, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setOwnDepartment(dept)
                          setShowDeptDropdown(false)
                        }}
                        className="w-full text-left p-2 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium text-slate-800"
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Jenis Dokumen Yang Diminta</Label>
                <div className="flex flex-col gap-1.5 pt-1">
                  {(["POL", "SOP", "WIN"] as const).map((type) => {
                    const isChecked = requestedDocTypes.includes(type);
                    return (
                      <label key={type} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="requestedDocTypeRadio"
                          checked={isChecked}
                          onChange={() => setRequestedDocTypes([type])}
                          className="size-3.5 accent-slate-900"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tanggal</Label>
                <Input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="bg-slate-50 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Apakah Anda Pemilik Proses?</Label>
                <Select value={isProcessOwner} onValueChange={(val: "Ya" | "Tidak") => setIsProcessOwner(val)}>
                  <SelectTrigger className="bg-slate-50 text-xs">
                    <SelectValue placeholder="- Pilih -" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ya" className="text-xs">Ya</SelectItem>
                    <SelectItem value="Tidak" className="text-xs">Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: PIHAK EKSTERNAL (CONDITIONAL RENDERING PER IMAGE_F088FF.PNG) ── */}
          {isExternal && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b pb-2">
                <Building2 className="size-4 text-slate-700" />
                <span>Pihak Eksternal</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Instansi/Perusahaan</Label>
                  <Input
                    value={externalCompany}
                    onChange={(e) => setExternalCompany(e.target.value)}
                    placeholder="Nama Instansi/Perusahaan Eksternal"
                    className="bg-slate-50 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nama</Label>
                  <Input
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder="Nama Kontak Eksternal"
                    className="bg-slate-50 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Alasan Permintaan Dokumen <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Jelaskan kebutuhan pengajuan permohonan eksternal..."
                    rows={2}
                    className="bg-slate-50 text-xs resize-none"
                    required={isExternal}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Jumlah Prosedur Yang Diminta</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={docQty}
                    onChange={(e) => setDocQty(Number(e.target.value))}
                    className="bg-slate-50 text-xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Judul & Nomor Prosedur Yang Diminta <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    value={docTitleAndNumber}
                    onChange={(e) => setDocTitleAndNumber(e.target.value)}
                    placeholder="Contoh: SOP-HSE-001 - Prosedur Penggunaan APD..."
                    rows={2}
                    className="bg-slate-50 text-xs font-mono resize-none"
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    File Pendukung <span className="text-rose-500 text-[10px] font-normal italic">(Wajib Diisi untuk Eksternal)</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      className="bg-slate-50 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                    {fileAttachmentUrl && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                        <FileCheck className="size-3" /> File Diunggah
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="text-xs font-semibold rounded-xl">
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs gap-1.5 rounded-xl">
              <Send className="size-3.5" />
              {isPending ? "Mengirim Permintaan..." : "Kirim Permintaan Dokumen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
