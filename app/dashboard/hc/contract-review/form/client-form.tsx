"use client"

import { useState, useTransition, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Save, Printer, ArrowLeft, Plus, Trash2, Send, Upload } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"

import { completeAdminContractReview, resendContractReviewApprovalEmail, resendContractReviewApprovalToStep, saveAdminContractReview, saveContractReview, updateAdminContractReviewApprovalSignature } from "@/app/actions/contract-review"
import { getUserSignatureAction, saveUserSignatureAction } from "@/app/actions/user-signature"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminPageShell } from "@/components/admin-page-shell"
import { EnterpriseFormGrid } from "@/components/ui/enterprise-table-kit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useSidebar } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type MasterHeadMap = {
  sections?: Record<string, { headEmployeeId?: number | null; headName?: string; headEmail?: string; headTitle?: string; departmentId?: number | null }>
  departments?: Record<string, { headEmployeeId?: number | null; headName?: string; headEmail?: string; headTitle?: string }>
}

export function ContractReviewClientForm({ employees, orgNodes = [], initialData, approvalSettings, approvalHistory, activityTemplates = [], masterHeadMap, adminMode = false }: { employees: any[], orgNodes?: any[], initialData?: any, approvalSettings?: any, approvalHistory?: any[], activityTemplates?: any[], masterHeadMap?: MasterHeadMap, adminMode?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobileRoute = pathname.startsWith('/mobile/')
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode")
  const employeeSnParam = searchParams.get("employeeSn")
  const employeeIdParam = searchParams.get("employeeId")
  const isPrintMode = mode === "print"
  const isEmbeddedPrintPreview = isPrintMode && searchParams.get("embedded") === "1"
  
  const { setOpen } = useSidebar()
  const hasAutoClosed = useRef(false)

  useEffect(() => {
    // Auto-close sidebar for more space, but only on initial mount
    if (!hasAutoClosed.current) {
      setOpen(false)
      hasAutoClosed.current = true
    }
  }, [setOpen])

  const [isPending, startTransition] = useTransition()
  const [isResending, startResend] = useTransition()
  const leaderSigRef = useRef<SignatureCanvas | null>(null)
  const [previewLeaderSig, setPreviewLeaderSig] = useState<string>(initialData?.leaderSignatureDataUrl || '')
  const [registeredSignature, setRegisteredSignature] = useState<string | null>(null)
  const [leaderSignatureOverride, setLeaderSignatureOverride] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [adminSignaturePending, setAdminSignaturePending] = useState<number | null>(null)
  const [adminResendPending, setAdminResendPending] = useState<number | null>(null)

  useEffect(() => {
    getUserSignatureAction().then((result) => {
      if (result.success && result.signatureDataUrl) setRegisteredSignature(result.signatureDataUrl)
    }).catch(() => {})
  }, [])

  const hasVisibleCanvasInk = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context || canvas.width === 0 || canvas.height === 0) return false

    try {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3]
        const isDarkInk = pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245
        if (alpha > 12 && isDarkInk) return true
      }
    } catch {
      return false
    }

    return false
  }

  const getLeaderSignatureDataUrl = () => {
    const signature = leaderSigRef.current
    if (!signature) return ''

    const canvas = signature.getCanvas()
    const hasInk = hasVisibleCanvasInk(canvas) || !signature.isEmpty()
    if (!hasInk) return ''

    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  const updateLeaderSignaturePreview = () => {
    const leaderCanvasSignature = getLeaderSignatureDataUrl()
    const dataUrl = leaderCanvasSignature || previewLeaderSig || initialData?.leaderSignatureDataUrl || ''
    if (dataUrl) {
      setPreviewLeaderSig(dataUrl)
      setLeaderSignatureOverride(dataUrl)
    }
    return dataUrl
  }

  const useRegisteredSignature = () => {
    if (!registeredSignature) return
    leaderSigRef.current?.clear()
    setPreviewLeaderSig(registeredSignature)
    setLeaderSignatureOverride(registeredSignature)
  }

  const handleSignatureFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      setPreviewLeaderSig(dataUrl)
      setLeaderSignatureOverride(dataUrl)
      const result = await saveUserSignatureAction(dataUrl)
      if (result.success) setRegisteredSignature(dataUrl)
      else alert(result.error || 'Tanda tangan gagal disimpan ke profile.')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  
  const [form, setForm] = useState({
    id: initialData?.id,
    employeeId: initialData?.employeeId ? String(initialData.employeeId) : "",
    reviewType: initialData?.reviewType || "probation",
    contractLength: initialData?.contractLength || "",
    todayDate: initialData?.todayDate ? new Date(initialData.todayDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    hireDate: initialData?.hireDate ? new Date(initialData.hireDate).toISOString().slice(0, 10) : "",
    
    performanceActivities: initialData?.performanceActivities || [{ activity: "", achievement: "meet", remark: "" }],
    
    compDisciplineAch: initialData?.compDisciplineAch || "",
    compDisciplineRemark: initialData?.compDisciplineRemark || "",
    compSkillAch: initialData?.compSkillAch || "",
    compSkillRemark: initialData?.compSkillRemark || "",
    compResultAch: initialData?.compResultAch || "",
    compResultRemark: initialData?.compResultRemark || "",
    compQualityAch: initialData?.compQualityAch || "",
    compQualityRemark: initialData?.compQualityRemark || "",
    compCustomerAch: initialData?.compCustomerAch || "",
    compCustomerRemark: initialData?.compCustomerRemark || "",
    compTeamworkAch: initialData?.compTeamworkAch || "",
    compTeamworkRemark: initialData?.compTeamworkRemark || "",
    
    recommendation: initialData?.recommendation || "",
    contractExtendedMonths: initialData?.contractExtendedMonths || "",
    
    leaderName: initialData?.leaderName || "",
    leaderTitle: initialData?.leaderTitle || "",
    employeeNameStr: initialData?.employeeNameStr || "",
    superiorName: initialData?.superiorName || "",
    superiorTitle: initialData?.superiorTitle || "",
    hrName: initialData?.hrName || "Kesuma Bagaskara",
    hrTitle: initialData?.hrTitle || "HR-GA",
    nextSuperiorName: initialData?.nextSuperiorName || "",
    nextSuperiorTitle: initialData?.nextSuperiorTitle || "",
    
    letterIssuance: initialData?.letterIssuance || "",
    status: initialData?.status || "draft",
  })

  const selectedEmp = useMemo(() => {
    if (!form.employeeId) return null
    return employees.find(e => String(e.id) === form.employeeId) || null
  }, [form.employeeId, employees])

  const filteredActivityTemplates = useMemo(() => {
    const section = String(selectedEmp?.section || '').trim().toLowerCase()
    if (!section) return []
    return activityTemplates.filter((template: any) => String(template.section || '').trim().toLowerCase() === section)
  }, [activityTemplates, selectedEmp?.section])

  useEffect(() => {
    setSelectedTemplateId('')
  }, [form.employeeId])

  const autoPopulateSignatories = (employeeId: string, currentForm: any) => {
    const emp = employees.find(e => String(e.id) === employeeId)
    if (!emp) return currentForm

    const isCentralService = emp.department?.toLowerCase().includes('central') || emp.section?.toLowerCase().includes('repair') || emp.section?.toLowerCase().includes('retread') || emp.section?.toLowerCase().includes('mvc') || emp.section?.toLowerCase().includes('service')
    const isHo = emp.siteName && (emp.siteName.toLowerCase().includes('balikpapan') || emp.siteName.toLowerCase().includes('jakarta'))

    // For Central Service employees, use approval matrix settings
    if (isCentralService && approvalSettings) {
      const section = (emp.section || '').toLowerCase()
      const masterSectionHead =
        emp.sectionId != null ? masterHeadMap?.sections?.[String(emp.sectionId)] : undefined
      const masterDepartmentHead =
        emp.departmentId != null ? masterHeadMap?.departments?.[String(emp.departmentId)] : undefined

      let sectionHeadName = masterSectionHead?.headName || ''
      let sectionHeadTitle = masterSectionHead?.headTitle || 'Section Head'

      if (!sectionHeadName) {
        if (section.includes('repair') || section.includes('retread')) {
          sectionHeadName = approvalSettings.approvalMatrix.sectionHeads.repairRetread.name
          sectionHeadTitle = 'Leader Repair/Retread'
        } else if (section.includes('mvc')) {
          sectionHeadName = approvalSettings.approvalMatrix.sectionHeads.serviceMvc.name
          sectionHeadTitle = 'Supervisor Service MVC'
        } else if (section.includes('other')) {
          sectionHeadName = approvalSettings.approvalMatrix.sectionHeads.serviceOthers.name
          sectionHeadTitle = 'Coordinator Service Others'
        }
      }

      const managerName = masterDepartmentHead?.headName || approvalSettings.approvalMatrix.managerName
      const managerTitle = masterDepartmentHead?.headTitle || 'Department Head'

      // For Site: find PJO/TE at same site from employees list
      let leaderName = sectionHeadName
      let leaderTitle = sectionHeadTitle
      let superiorName = managerName
      let superiorTitle = managerTitle

      if (!isHo && emp.siteName) {
        const pjoKeywords = (approvalSettings.approvalMatrix.pjoKeywords || []).map((k: string) => k.toLowerCase())
        const siteEmps = employees.filter((e: any) => e.siteName === emp.siteName && e.id !== emp.id)
        // Prioritize PJO, then TE/Technical
        const pjoEmp = siteEmps.find((e: any) => {
          const pos = (e.position || e.rank || '').toLowerCase()
          return pjoKeywords.some((k: string) => pos.includes(k))
        })
        if (pjoEmp) {
          leaderName = pjoEmp.name
          leaderTitle = pjoEmp.rank || pjoEmp.position || 'PJO/TE'
          superiorName = sectionHeadName
          superiorTitle = sectionHeadTitle
        }
      }

      return {
        ...currentForm,
        employeeId,
        leaderName: currentForm.leaderName || leaderName,
        leaderTitle: currentForm.leaderTitle || leaderTitle,
        superiorName: currentForm.superiorName || superiorName,
        superiorTitle: currentForm.superiorTitle || superiorTitle,
        nextSuperiorName: currentForm.nextSuperiorName || managerName,
        nextSuperiorTitle: currentForm.nextSuperiorTitle || managerTitle,
      }
    }

    // For non-Central Service employees, use org chart as before
    const getRankWeight = (rank: string) => {
       const r = (rank || "").toLowerCase()
       if (r.includes('director') || r.includes('vp') || r.includes('chief')) return 5
       if (r.includes('manager') || r.includes('mgr')) return 4
       if (r.includes('spv') || r.includes('supervisor')) return 3
       if (r.includes('leader') || r.includes('coordinator')) return 2
       return 1
    }
    const empWeight = getRankWeight(emp.rank || emp.position)

    const managerChain = []
    let currentNodeId = orgNodes.find(n => n.id === emp.orgNodeId)?.parentNodeId
    
    while (currentNodeId && managerChain.length < 3) {
      const m = employees.find(e => e.orgNodeId === currentNodeId && e.id !== emp.id && (e.isManagerial || getRankWeight(e.rank || e.position) > empWeight))
      if (m) managerChain.push(m)
      currentNodeId = orgNodes.find(n => n.id === currentNodeId)?.parentNodeId
    }

    // Fallback: if no manager found in parent chain, look for higher-ranked colleagues at same node
    if (managerChain.length === 0 && emp.orgNodeId) {
      const sameNodeHigher = employees
        .filter(e => e.orgNodeId === emp.orgNodeId && e.id !== emp.id && getRankWeight(e.rank || e.position) > empWeight)
        .sort((a, b) => getRankWeight(b.rank || b.position) - getRankWeight(a.rank || a.position))
      if (sameNodeHigher.length > 0) managerChain.push(sameNodeHigher[0])
    }

    let newLeaderName = ""
    let newLeaderTitle = ""
    let newSupName = ""
    let newSupTitle = ""
    let newNextSupName = ""
    let newNextSupTitle = ""

    for (const mgr of managerChain) {
      const weight = getRankWeight(mgr.rank || mgr.position)
      if (weight === 2) { // Leader
        if (!newLeaderName) {
          newLeaderName = mgr.name
          newLeaderTitle = mgr.rank || mgr.position || "Leader"
        }
      } else if (weight === 3) { // SPV
        if (!newSupName) {
          newSupName = mgr.name
          newSupTitle = mgr.rank || mgr.position || "SPV"
        }
      } else if (weight >= 4) { // Manager / Director
        if (!newSupName) {
          newSupName = mgr.name
          newSupTitle = mgr.rank || mgr.position || "Manager"
        } else if (!newNextSupName) {
          newNextSupName = mgr.name
          newNextSupTitle = mgr.rank || mgr.position || "Manager"
        }
      }
    }

    // Fallback if Superior is empty (find someone with higher rank in department)
    if (!newSupName && emp.departmentId) {
      const s = employees.find(
        (e) =>
          e.departmentId === emp.departmentId &&
          e.id !== emp.id &&
          getRankWeight(e.rank || e.position) > Math.max(empWeight, 2),
      )
      if (s && s.name !== newLeaderName) {
        newSupName = s.name
        newSupTitle = s.rank || s.position || 'Superior'
      }
    }

    // Fallback if Next Superior is empty and we still need a higher manager
    if (!newNextSupName && newSupName && emp.departmentId) {
      const supWeight = getRankWeight(newSupTitle)
      const m = employees.find(
        (e) =>
          e.departmentId === emp.departmentId &&
          e.id !== emp.id &&
          getRankWeight(e.rank || e.position) > supWeight,
      )
      if (m && m.name !== newLeaderName && m.name !== newSupName) {
        newNextSupName = m.name
        newNextSupTitle = m.rank || m.position || 'Manager'
      }
    }

    let newHrName = currentForm.hrName || ''
    let newHrTitle = currentForm.hrTitle || 'HR Manager'
    if (!newHrName || newHrName === 'PILIH HR...') {
      const hrManager = employees.find((e) => {
        const isHr =
          e.department?.toLowerCase().includes('hr') ||
          e.department?.toLowerCase().includes('human')
        const isMgr = e.isManagerial || getRankWeight(e.rank || e.position) >= 3 // SPV or Manager
        return isHr && isMgr
      })
      if (hrManager) {
        newHrName = hrManager.name
        newHrTitle = hrManager.rank || hrManager.position || 'HR Manager'
      }
    }

    return {
      ...currentForm,
      employeeId,
      leaderName: currentForm.leaderName || newLeaderName,
      leaderTitle: currentForm.leaderTitle || newLeaderTitle,
      superiorName: currentForm.superiorName || newSupName,
      superiorTitle: currentForm.superiorTitle || newSupTitle,
      nextSuperiorName: currentForm.nextSuperiorName || newNextSupName,
      nextSuperiorTitle: currentForm.nextSuperiorTitle || newNextSupTitle,
      hrName: newHrName,
      hrTitle: newHrTitle,
    }
  }

  // Auto populate on initial load if fields are missing
  useEffect(() => {
    if (
      form.employeeId &&
      (!form.leaderName || !form.superiorName || !form.nextSuperiorName || !form.hrName)
    ) {
      const populatedForm = autoPopulateSignatories(form.employeeId, form)
      if (
        populatedForm.leaderName !== form.leaderName ||
        populatedForm.nextSuperiorName !== form.nextSuperiorName ||
        populatedForm.superiorName !== form.superiorName ||
        populatedForm.hrName !== form.hrName
      ) {
        setForm(populatedForm)
      }
    }
  }, [form.employeeId])

  // Auto-select employee from ?employeeId= or ?employeeSn= query param (e.g. from Monitoring Kontrak / Central Service)
  useEffect(() => {
    if ((employeeIdParam || employeeSnParam) && !form.employeeId) {
      let match = null
      if (employeeIdParam) {
        match = employees.find((e) => String(e.id) === employeeIdParam)
      }
      if (!match && employeeSnParam) {
        match = employees.find(
          (e) =>
            e.employeeId === employeeSnParam ||
            e.employeeId === `EMP-${employeeSnParam}` ||
            e.employeeId?.replace(/^EMP-/i, '') === employeeSnParam,
        )
      }
      if (match) {
        setForm((prev) => {
          const updated = {
            ...prev,
            employeeId: String(match.id),
            hireDate:
              prev.hireDate ||
              (match.joinDate ? new Date(match.joinDate).toISOString().slice(0, 10) : ''),
          }
          return autoPopulateSignatories(String(match.id), updated)
        })
      }
    }
  }, [employeeIdParam, employeeSnParam, employees])

  const achievementScore = useMemo(() => {
    const aVals = form.performanceActivities.map((a: any) => a.achievement).filter(Boolean)
    const bVals = [
      (form as any).compDisciplineAch,
      (form as any).compSkillAch,
      (form as any).compResultAch,
      (form as any).compQualityAch,
      (form as any).compCustomerAch,
      (form as any).compTeamworkAch,
    ].filter(Boolean)

    const allVals = [...aVals, ...bVals]
    if (allVals.length === 0) return 0

    const total = allVals.reduce((sum, val) => {
      if (val === 'exceed') return sum + 115
      if (val === 'meet') return sum + 100
      if (val === 'below') return sum + 80
      return sum
    }, 0)

    return total / allVals.length
  }, [form])

  const achCategory =
    achievementScore >= 106
      ? 'exceed'
      : achievementScore >= 95
        ? 'meet'
        : achievementScore > 0
          ? 'below'
          : ''

  const getApprovedSignature = (...roles: string[]) => {
    return (
      approvalHistory?.find(
        (step: any) =>
          step.status === 'approved' && step.signatureDataUrl && roles.includes(step.approverRole),
      )?.signatureDataUrl || ''
    )
  }

  const getApprovalMeta = (...roles: string[]) => {
    return approvalHistory?.find(
      (step: any) => step.status === 'approved' && roles.includes(step.approverRole),
    )
  }

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const leaderApprovalSig = getApprovedSignature('pjo_or_te_initial', 'section_head_initial')
  const employeeApprovalSig = getApprovedSignature('employee')
  const sectionHeadApprovalSig = getApprovedSignature('section_head_confirmation')
  const managerApprovalSig = getApprovedSignature('central_service_manager')
  const hrApprovalSig = getApprovedSignature('hr')
  const leaderApprovalMeta = getApprovalMeta('pjo_or_te_initial', 'section_head_initial')
  const employeeApprovalMeta = getApprovalMeta('employee')
  const sectionHeadApprovalMeta = getApprovalMeta('section_head_confirmation')
  const managerApprovalMeta = getApprovalMeta('central_service_manager')
  const hrApprovalMeta = getApprovalMeta('hr')
  const leaderPreviewSignature = previewLeaderSig || leaderApprovalSig
  const visibleEmployeeApprovalSig = employeeApprovalSig && employeeApprovalSig !== leaderPreviewSignature ? employeeApprovalSig : ''
  const visibleSectionHeadApprovalSig = sectionHeadApprovalSig && ![leaderPreviewSignature, visibleEmployeeApprovalSig].includes(sectionHeadApprovalSig) ? sectionHeadApprovalSig : ''
  const visibleManagerApprovalSig = managerApprovalSig && ![leaderPreviewSignature, visibleEmployeeApprovalSig, visibleSectionHeadApprovalSig].includes(managerApprovalSig) ? managerApprovalSig : ''
  const visibleHrApprovalSig = hrApprovalSig && ![leaderPreviewSignature, visibleEmployeeApprovalSig, visibleSectionHeadApprovalSig, visibleManagerApprovalSig].includes(hrApprovalSig) ? hrApprovalSig : ''

  const handleSave = () => {
    startTransition(async () => {
      const { leaderTitle, superiorTitle, hrTitle, nextSuperiorTitle, ...formToSave } = form
      const leaderCanvasSignature = getLeaderSignatureDataUrl()
      const leaderSignatureDataUrl = leaderCanvasSignature || previewLeaderSig || initialData?.leaderSignatureDataUrl || leaderSignatureOverride || (!initialData?.id ? previewLeaderSig : '')
      const payload = {
        ...formToSave,
        employeeId: form.employeeId ? parseInt(form.employeeId) : null,
        contractExtendedMonths: form.contractExtendedMonths ? parseInt(form.contractExtendedMonths as string) : null,
        todayDate: new Date(form.todayDate),
        hireDate: form.hireDate ? new Date(form.hireDate) : new Date(),
        employeeNameStr: selectedEmp?.name || form.employeeNameStr,
        leaderSignatureDataUrl,
      }
      const res = adminMode ? await saveAdminContractReview(payload as any) : await saveContractReview(payload as any)
      if (res.success) {
        router.push(adminMode ? `/dashboard/hc/contract-review/form/${initialData?.id}?admin=1` : pathname.startsWith('/mobile/') ? '/mobile/dashboard' : "/dashboard/hc/contract-review")
      } else {
        alert("Gagal menyimpan: " + res.error)
      }
    })
  }

  const saveAdminSignature = (step: any, signatureDataUrl: string) => {
    if (!initialData?.id || !signatureDataUrl) return
    setAdminSignaturePending(step.id)
    startTransition(async () => {
      const result = await updateAdminContractReviewApprovalSignature(initialData.id, step.id, signatureDataUrl)
      setAdminSignaturePending(null)
      if (!result.success) alert(`Gagal menyimpan TTD: ${result.error}`)
      else router.refresh()
    })
  }

  const handleAdminSignatureUpload = (step: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => saveAdminSignature(step, typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const removeAdminSignature = (step: any) => {
    if (!initialData?.id || !confirm(`Hapus TTD ${step.approverName || 'reviewer'}?`)) return
    setAdminSignaturePending(step.id)
    startTransition(async () => {
      const result = await updateAdminContractReviewApprovalSignature(initialData.id, step.id, null)
      setAdminSignaturePending(null)
      if (!result.success) alert(`Gagal menghapus TTD: ${result.error}`)
      else {
        if (step.stepOrder === 1) setPreviewLeaderSig('')
        router.refresh()
      }
    })
  }

  const resendAdminApproval = (step: any) => {
    if (!initialData?.id || !confirm(`Kirim ulang approval ke ${step.approverName || 'reviewer'}? Approval step ini dan step setelahnya akan dibuka ulang.`)) return
    setAdminResendPending(step.id)
    startTransition(async () => {
      const result = await resendContractReviewApprovalToStep(initialData.id, step.id)
      setAdminResendPending(null)
      if (!result.success) alert(`Gagal mengirim ulang approval: ${result.error}`)
      else {
        alert(result.message)
        router.refresh()
      }
    })
  }

  const handleAdminComplete = () => {
    if (!initialData?.id || !confirm('Tandai Contract Review ini sebagai selesai?')) return
    startTransition(async () => {
      const result = await completeAdminContractReview(initialData.id)
      if (result.success) router.push('/dashboard/hc/contract-review')
      else alert(`Gagal menyelesaikan review: ${result.error}`)
    })
  }

  const handleResendApprovalEmail = () => {
    if (!initialData?.id) return

    startResend(async () => {
      const result = await resendContractReviewApprovalEmail(initialData.id)
      if (result.success) {
        alert(result.message)
      } else {
        alert(`Gagal mengirim email: ${result.error}`)
      }
    })
  }

  const handlePrint = () => {
    const pageHtml = Array.from(document.querySelectorAll('.contract-review-print .pdf-wrapper, #contract-review-preview .pdf-wrapper'))
      .map((page) => page.innerHTML)
    const letterheadUrl = new URL('/ChitraParatama_Stationery_Letterhead_jkt.jpg', window.location.origin).toString()
    const printWindow = window.open('', '_blank', 'width=900,height=1200')

    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Contract Review</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; object-fit: cover; }
            .page {
              width: 210mm;
              height: 297mm;
              overflow: hidden;
              page-break-after: always;
              margin: 0 auto;
              padding: 0;
              color: black;
              font-family: Arial, sans-serif;
              font-size: 9pt;
              position: relative;
            }
            .page:last-child {
              page-break-after: auto;
            }
            /* Removing internal paddings from .page since they are already applied in .pdf-wrapper-content via inline styles */
            table { width: 100%; border-collapse: collapse; border-color: black; }
            th, td { border: 1px solid black; padding: 4px; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .w-1\\/3 { width: 33.333333%; }
            .w-2\\/3 { width: 66.666667%; }
            .w-1\\/2 { width: 50%; }
            .w-\\[45\\%\\] { width: 45%; }
            .w-\\[30\\%\\] { width: 30%; }
            .w-\\[25\\%\\] { width: 25%; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-16 { margin-bottom: 4rem; }
            .mt-12 { margin-top: 3rem; }
            .bg-slate-50 { background-color: #f8fafc; }
            .capitalize { text-transform: capitalize; }
            .w-full { width: 100%; }
            .w-12 { width: 3rem; }
            .h-16 { height: 4rem; }
            .object-contain { object-fit: contain; }
            .border-b { border-bottom: 1px solid black; }
            .inline-block { display: inline-block; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .gap-x-8 { column-gap: 2rem; }
            .gap-y-12 { row-gap: 3rem; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .gap-2 { gap: 0.5rem; }
            .gap-8 { gap: 2rem; }
            .break-inside-avoid { break-inside: avoid; }
            thead { display: table-header-group; }
            tr, .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            .break-before-auto { break-before: auto; }
            .text-gray-500 { color: #6b7280; }
            input[type="checkbox"] { margin-right: 4px; }
          </style>
        </head>
        <body>
          <img src="${letterheadUrl}" class="print-bg" />
          <main>
            ${pageHtml.map((html) => `<div class="page">${html}</div>`).join('')}
          </main>
          <script>
            const closeAfterPrint = () => setTimeout(() => window.close(), 250);
            window.addEventListener("afterprint", closeAfterPrint);
            window.addEventListener("load", () => {
              const backgroundImage = new Image();
              backgroundImage.onload = () => setTimeout(() => window.print(), 150);
              backgroundImage.onerror = () => setTimeout(() => window.print(), 150);
              backgroundImage.src = "${letterheadUrl}";
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const estimateRowHeightMm = (item: any) => {
    const act = String(item?.activity || '').trim()
    const rem = String(item?.remark || '').trim()
    const actLines = Math.max(1, Math.ceil(act.length / 50))
    const remLines = Math.max(1, Math.ceil(rem.length / 28))
    const maxLines = Math.max(actLines, remLines)
    return 4 + maxLines * 4.2
  }

  const { firstPageActivities, performanceOverflowChunks } = (() => {
    const all = form.performanceActivities || []
    const PAGE_1_ROWS_MAX_MM = 120
    const CONTINUATION_ROWS_MAX_MM = 180

    const first: any[] = []
    let usedMm = 0
    let i = 0

    for (; i < all.length; i++) {
      const h = estimateRowHeightMm(all[i])
      if (first.length > 0 && usedMm + h > PAGE_1_ROWS_MAX_MM) break
      if (first.length === 0 && h > PAGE_1_ROWS_MAX_MM) {
        first.push(all[i])
        i++
        break
      }
      first.push(all[i])
      usedMm += h
    }

    const overflow = all.slice(i)
    const chunks: any[][] = []
    let currentChunk: any[] = []
    let currentChunkMm = 0

    for (const item of overflow) {
      const h = estimateRowHeightMm(item)
      if (currentChunk.length > 0 && currentChunkMm + h > CONTINUATION_ROWS_MAX_MM) {
        chunks.push(currentChunk)
        currentChunk = [item]
        currentChunkMm = h
      } else {
        currentChunk.push(item)
        currentChunkMm += h
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return { firstPageActivities: first, performanceOverflowChunks: chunks }
  })()
  const competencyRows = [
    ['Discipline', form.compDisciplineAch, form.compDisciplineRemark],
    ['Professional Skill and Knowledge', form.compSkillAch, form.compSkillRemark],
    ['Achieving Result', form.compResultAch, form.compResultRemark],
    ['Concern for Order, Quality and Accuracy', form.compQualityAch, form.compQualityRemark],
    ['Customer Orientation ( internal / external )', form.compCustomerAch, form.compCustomerRemark],
    ['Teamwork', form.compTeamworkAch, form.compTeamworkRemark],
  ]
  const renderAchievementBlock = () => (
    <>
      <div className="font-bold mb-2">Achievement Definition</div>
      <table className="w-full border-collapse border border-black mb-4 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-0.5">
        <tbody>
          <tr><td className="w-1/3"><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "exceed"} />Exceed Requirement (106% - 125%)</label></td><td className="w-2/3">Performance of the employee is exceeding target and He/She consistently <b>demonstrates right attitude and behavior</b> which are aligned with the competency</td></tr>
          <tr><td><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "meet"} />Meet Requirement (95% - 105%)</label></td><td>Performance of the employee is meeting target and in overall He/She <b>demonstrates attitude and behavior</b> which are aligned with the competency</td></tr>
          <tr><td><label className="flex items-center gap-2"><input type="checkbox" readOnly checked={achCategory === "below"} />Below Requirement (&lt; 95%)</label></td><td>Performance of the employee is not meeting target and He/She still <b>demonstrating some attitudes and/ or behaviors which are not aligned</b> with the competency</td></tr>
        </tbody>
      </table>
      <div className="font-bold mb-2">Recommendation</div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'confirm_permanent'} readOnly />Confirm to Permanent</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'terminate_probation'} readOnly />Unsuccessful Probationary (termination)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'contract_extended'} readOnly />Contract Extended <span className="border-b border-black w-12 inline-block text-center">{form.contractExtendedMonths || '\u00A0'}</span> months</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.recommendation === 'contract_ended'} readOnly />Contract ended</label>
      </div>
    </>
  )
  const renderPerformanceTable = (items: any[], keyPrefix: string) => (
    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center">
      <thead>
        <tr className="bg-slate-50">
          <th className="w-[35%]">Activities</th>
          <th className="w-[15%]">Achievement</th>
          <th className="w-[50%]">Remark</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={`${keyPrefix}-${i}`}>
            <td className="text-left">{item.activity || '\u00A0'}</td>
            <td className="capitalize">{item.achievement || '\u00A0'}</td>
            <td className="text-left">{item.remark || '\u00A0'}</td>
          </tr>
        ))}
        {items.length === 0 && Array(5).fill(0).map((_, i) => (
          <tr key={`${keyPrefix}-empty-${i}`}><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        ))}
      </tbody>
    </table>
  )

  const pdfPreviewPage1 = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <h1 className="text-center font-bold text-[11pt] mb-3">EMPLOYEE PROBATION/CONTRACT REVIEW</h1>

      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <tbody>
          <tr>
            <td colSpan={2} className="font-bold bg-slate-50">Details</td>
          </tr>
          <tr>
            <td className="w-1/2">Today's Date: {new Date(form.todayDate).toLocaleDateString('id-ID')}</td>
            <td className="w-1/2">Hire Date: {form.hireDate ? new Date(form.hireDate).toLocaleDateString('id-ID') : '-'}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div className="font-bold mb-1">Purpose of this form (check one):</div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.reviewType === 'probation'} readOnly />
                  Probationary Review
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.reviewType === 'contract'} readOnly />
                  Contract Review (length of contract {form.contractLength || "______"})
                </label>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="font-bold bg-slate-50">Employee Profile</td>
          </tr>
          <tr>
            <td>Name:<br/>{selectedEmp?.name || form.employeeNameStr || '-'}</td>
            <td>SN:<br/>{selectedEmp?.employeeId || '-'}</td>
          </tr>
          <tr>
            <td>Job Title:<br/>{selectedEmp?.position || '-'}</td>
            <td>Department/Section:<br/>{[selectedEmp?.department, selectedEmp?.section].filter(Boolean).join(' / ') || '-'}</td>
          </tr>
          <tr>
            <td>Superior Name:<br/>{form.leaderName || form.superiorName || form.nextSuperiorName || '-'}</td>
            <td>Superior Title:<br/>{form.leaderTitle || form.superiorTitle || form.nextSuperiorTitle || '-'}</td>
          </tr>
        </tbody>
      </table>

      {firstPageActivities.length > 0 ? (
        <><div className="mb-1 font-bold">Progress made towards probation/contract period</div><div className="font-bold ml-4 mb-1">A. Performance</div>{renderPerformanceTable(firstPageActivities, 'first')}</>
      ) : null}
    </div>
  )

  const pdfPreviewPerformancePages = performanceOverflowChunks.map((chunk, index) => (
    <div key={`performance-page-${index}`} className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">A. Performance (lanjutan)</div>
      {renderPerformanceTable(chunk, `overflow-${index}`)}
    </div>
  ))

  const estimateCompetencyRowHeightMm = (label: string, remark: string) => {
    const actLines = Math.max(1, Math.ceil(String(label || '').length / 38))
    const remLines = Math.max(1, Math.ceil(String(remark || '').length / 55))
    const maxLines = Math.max(actLines, remLines)
    return 4 + maxLines * 3.8
  }

  const totalCompetencyHeight = competencyRows.reduce(
    (sum, [label, _, remark]) => sum + estimateCompetencyRowHeightMm(label, remark || ''),
    0
  )
  const achievementBlockOnPage2 = totalCompetencyHeight + 18 + 72 <= 200

  const pdfAchievementBlock = renderAchievementBlock()

  const pdfPreviewPage2 = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">B. Related Competency ( Knowledge & Behavior )</div>
      <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="bg-slate-50 text-center">
            <th className="w-[35%]">Activities</th>
            <th className="w-[15%]">Achievement</th>
            <th className="w-[50%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {competencyRows.map(([label, achievement, remark]) => (
            <tr key={label}>
              <td className="font-bold">{label}</td>
              <td className="text-center capitalize">{achievement}</td>
              <td>{remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {achievementBlockOnPage2 ? pdfAchievementBlock : null}
    </div>
  )

  const pdfPreviewCompetencyPage = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <div className="font-bold ml-4 mb-1">B. Related Competency (lanjutan)</div>
      {pdfAchievementBlock}
    </div>
  )

  const pdfPreviewPage3 = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[8pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '42mm', paddingBottom: '45mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      {!achievementBlockOnPage2 ? (
        <div className="mb-4">
          {pdfAchievementBlock}
        </div>
      ) : null}
      <div className="font-bold mb-4 break-before-auto break-inside-avoid">Signatories</div>
      
      <div className={`grid grid-cols-2 gap-x-8 ${!achievementBlockOnPage2 ? 'gap-y-4 mb-4' : 'gap-y-8 mb-6'} break-inside-avoid`}>
        {form.leaderName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Leader Signature</div>
            <div className="h-20 flex items-end">
              {leaderPreviewSignature ? (
                <img
                  src={leaderPreviewSignature}
                  alt="Leader TTD"
                  className="h-16 object-contain"
                  style={{ maxWidth: '45mm', maxHeight: '16mm' }}
                />
              ) : null}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{form.leaderName}</div>
            <div className="text-xs">{form.leaderTitle || 'Leader'}</div>
            <div className="mt-1 text-[7pt] text-gray-500">Waktu TTD: {formatDateTime(leaderApprovalMeta?.signedAt)}</div>
            {leaderApprovalMeta?.remarks ? <div className="mt-1 text-[7pt] text-left text-gray-600">Catatan: {leaderApprovalMeta.remarks}</div> : null}
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Employee Signature</div>
          <div className="h-20 flex items-end">
              {visibleEmployeeApprovalSig ? <img src={visibleEmployeeApprovalSig} alt="Employee TTD" className="h-16 object-contain" /> : null}
          </div>
          <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{selectedEmp?.name || form.employeeNameStr || '\u00A0'}</div>
          <div className="text-xs">{selectedEmp?.position || 'Employee'}</div>
          <div className="mt-1 text-[7pt] text-gray-500">Waktu TTD: {formatDateTime(employeeApprovalMeta?.signedAt)}</div>
          {employeeApprovalMeta?.remarks ? <div className="mt-1 text-[7pt] text-left text-gray-600">Catatan: {employeeApprovalMeta.remarks}</div> : null}
        </div>
        {form.superiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Superior Signature</div>
            <div className="h-20 flex items-end">
              {visibleSectionHeadApprovalSig ? <img src={visibleSectionHeadApprovalSig} alt="Superior TTD" className="h-16 object-contain" /> : null}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{form.superiorName}</div>
            <div className="text-xs">{form.superiorTitle || 'Superior'}</div>
            <div className="mt-1 text-[7pt] text-gray-500">Waktu TTD: {formatDateTime(sectionHeadApprovalMeta?.signedAt)}</div>
            {sectionHeadApprovalMeta?.remarks ? <div className="mt-1 text-[7pt] text-left text-gray-600">Catatan: {sectionHeadApprovalMeta.remarks}</div> : null}
          </div>
        )}
        {form.hrName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">HR Signature</div>
            <div className="h-20 flex items-end">
              {visibleHrApprovalSig ? <img src={visibleHrApprovalSig} alt="HR TTD" className="h-16 object-contain" /> : null}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{form.hrName}</div>
            <div className="text-xs">{form.hrTitle || 'HR'}</div>
            <div className="mt-1 text-[7pt] text-gray-500">Waktu TTD: {formatDateTime(hrApprovalMeta?.signedAt)}</div>
            {hrApprovalMeta?.remarks ? <div className="mt-1 text-[7pt] text-left text-gray-600">Catatan: {hrApprovalMeta.remarks}</div> : null}
          </div>
        )}
        {form.nextSuperiorName && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Next Superior Signature</div>
            <div className="h-20 flex items-end">
              {visibleManagerApprovalSig ? <img src={visibleManagerApprovalSig} alt="Next Superior TTD" className="h-16 object-contain" /> : null}
            </div>
            <div className="mb-1 border-b" style={{ width: '50%', borderColor: '#9ca3af' }}>{form.nextSuperiorName}</div>
            <div className="text-xs">{form.nextSuperiorTitle || 'Manager'}</div>
            <div className="mt-1 text-[7pt] text-gray-500">Waktu TTD: {formatDateTime(managerApprovalMeta?.signedAt)}</div>
            {managerApprovalMeta?.remarks ? <div className="mt-1 text-[7pt] text-left text-gray-600">Catatan: {managerApprovalMeta.remarks}</div> : null}
          </div>
        )}
        <div>
          <div className="font-bold mb-2">Letter Issuance by HR</div>
          <div className="text-[7pt]" style={{ display: 'grid', gap: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'permanent_confirmation'} readOnly />
              <span>Permanent Confirmation</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'contract_extension'} readOnly />
              <span>Contract extension</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'unsuccessful_probation'} readOnly />
              <span>Unsuccessful probation notification</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={form.letterIssuance === 'end_of_contract'} readOnly />
              <span>End of contract notification</span>
            </label>
          </div>
        </div>
      </div>

      <div className="text-right mt-12 text-gray-500">
        F.HR.STD.012.00
      </div>
    </div>
  )

  if (isEmbeddedPrintPreview) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col gap-8 overflow-auto bg-slate-100 p-4">
        {[pdfPreviewPage1, ...pdfPreviewPerformancePages, pdfPreviewPage2, pdfPreviewPage3].map((page, index) => (
          <div
            key={index}
            className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
          >
            <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
            {page}
          </div>
        ))}
      </div>
    )
  }

  return (
    <AdminPageShell 
      eyebrow="HC • Form" 
      title="Contract & Probation Review" 
      description="Lengkapi evaluasi karyawan."
      compact={isMobileRoute}
    >
      <div className={cn("grid gap-6", isPrintMode ? "xl:grid-cols-1" : "xl:grid-cols-2")}>
        {/* KIRI: Form Input */}
        <div className={cn("flex flex-col gap-6 print:hidden", isPrintMode && "hidden")}>
          <div className={cn("flex gap-4", isMobileRoute && "sticky bottom-2 z-20 flex-wrap gap-2 rounded-2xl bg-white/95 p-1.5 shadow-lg backdrop-blur") }>
            <Button variant="outline" className={cn("min-h-10", isMobileRoute && "min-h-9 px-3 text-xs")} onClick={() => router.back()}>
              <ArrowLeft className="mr-2 size-4" /> Kembali
            </Button>
            <Button onClick={handlePrint} variant="secondary" className={cn("min-h-10", isMobileRoute && "min-h-9 px-3 text-xs")}>
              <Printer className="mr-2 size-4" /> Print / Save PDF
            </Button>
            {initialData?.id && (
              <Button onClick={handleResendApprovalEmail} disabled={isResending} variant="outline" className={cn("min-h-10", isMobileRoute && "min-h-9 px-3 text-xs")}>
                <Send className="mr-2 size-4" /> {isResending ? "Mengirim..." : "Kirim Email Approval"}
              </Button>
            )}
            {adminMode && initialData?.id && initialData.status !== 'completed' && (
              <Button onClick={handleAdminComplete} disabled={isPending} variant="default" className="min-h-10 bg-emerald-600 hover:bg-emerald-700">
                Selesai
              </Button>
            )}
            <Button onClick={handleSave} disabled={isPending} className={cn("ml-auto min-h-10", isMobileRoute && "min-h-9 px-3 text-xs max-sm:flex-1")}>
              <Save className="mr-2 size-4" /> {isPending ? "Menyimpan..." : "Simpan Form"}
            </Button>
          </div>

        <Card>
          <CardHeader>
            <CardTitle>Details & Employee Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <EnterpriseFormGrid>
              <div className="space-y-2">
                <Label>Tujuan Review</Label>
                <Select value={form.reviewType} onValueChange={(val) => setForm({ ...form, reviewType: val })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="probation">Probationary Review</SelectItem>
                    <SelectItem value="contract">Contract Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.reviewType === "contract" && (
                <div className="space-y-2">
                  <Label>Length of Contract</Label>
                  <Input value={form.contractLength} onChange={(e) => setForm({ ...form, contractLength: e.target.value })} placeholder="e.g. 6 months" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Tanggal Review</Label>
                <Input type="date" value={form.todayDate} onChange={(e) => setForm({ ...form, todayDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pilih Karyawan</Label>
                <SearchableSelect
                  label="Karyawan"
                  placeholder="Pilih Karyawan..."
                  value={form.employeeId}
                  onValueChange={(val) => {
                    const populated = autoPopulateSignatories(val, { 
                      ...form, 
                      employeeId: val, 
                      leaderName: "", 
                      leaderTitle: "",
                      superiorName: "", 
                      superiorTitle: "",
                      nextSuperiorName: "",
                      nextSuperiorTitle: "",
                      hrName: "",
                      hrTitle: ""
                    })
                    setForm(populated)
                  }}
                  options={employees.map(emp => ({ value: String(emp.id), label: `${emp.name} (${emp.employeeId})` }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Masuk (Hire Date)</Label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
            </EnterpriseFormGrid>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>A. Performance Activities</CardTitle>
              <div className="flex flex-col gap-1.5 sm:items-end">
                <Select
                  value={selectedTemplateId}
                  onValueChange={(value) => {
                    const template = filteredActivityTemplates.find((item: any) => String(item.id) === value)
                    if (!template) return
                    setSelectedTemplateId(value)
                    setForm({
                      ...form,
                      performanceActivities: template.performanceActivities.map((item: any) => ({
                        activity: item.activity || '',
                        achievement: item.achievement || 'meet',
                        remark: item.remark || '',
                      })),
                    })
                  }}
                  disabled={filteredActivityTemplates.length === 0}
                >
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder={selectedEmp ? 'Pakai template history section' : 'Pilih karyawan dulu'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredActivityTemplates.map((template: any) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.employeeName} · {template.createdAt ? new Date(template.createdAt).toLocaleDateString('id-ID') : 'History'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  {selectedEmp?.section ? `Template section: ${selectedEmp.section}` : 'Template mengikuti section karyawan'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.performanceActivities.map((act: any, idx: number) => (
                <div key={idx} className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1 space-y-2">
                    <Label>Aktivitas</Label>
                    <Textarea 
                      value={act.activity} 
                      onChange={(e) => {
                        const newArr = [...form.performanceActivities]
                        newArr[idx].activity = e.target.value
                        setForm({ ...form, performanceActivities: newArr })
                      }} 
                    />
                  </div>
                  <div className="w-full space-y-2 sm:w-[200px]">
                    <Label>Achievement</Label>
                    <Select 
                      value={act.achievement} 
                      onValueChange={(val) => {
                        const newArr = [...form.performanceActivities]
                        newArr[idx].achievement = val
                        setForm({ ...form, performanceActivities: newArr })
                      }}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="below">Below Requirement</SelectItem>
                        <SelectItem value="meet">Meet Requirement</SelectItem>
                        <SelectItem value="exceed">Exceed Requirement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Remark</Label>
                    <Textarea 
                      value={act.remark} 
                      onChange={(e) => {
                        const newArr = [...form.performanceActivities]
                        newArr[idx].remark = e.target.value
                        setForm({ ...form, performanceActivities: newArr })
                      }} 
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mt-0 self-end sm:mt-8"
                    onClick={() => {
                      const newArr = form.performanceActivities.filter((_: any, i: number) => i !== idx)
                      setForm({ ...form, performanceActivities: newArr })
                    }}
                  >
                    <Trash2 className="size-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button 
                variant="outline" 
                onClick={() => setForm({ 
                  ...form, 
                  performanceActivities: [...form.performanceActivities, { activity: "", achievement: "meet", remark: "" }] 
                })}
              >
                <Plus className="mr-2 size-4" /> Tambah Aktivitas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>B. Related Competency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {[
                { label: "Discipline", achKey: "compDisciplineAch", remKey: "compDisciplineRemark" },
                { label: "Professional Skill and Knowledge", achKey: "compSkillAch", remKey: "compSkillRemark" },
                { label: "Achieving Result", achKey: "compResultAch", remKey: "compResultRemark" },
                { label: "Concern for Order, Quality and Accuracy", achKey: "compQualityAch", remKey: "compQualityRemark" },
                { label: "Customer Orientation", achKey: "compCustomerAch", remKey: "compCustomerRemark" },
                { label: "Teamwork", achKey: "compTeamworkAch", remKey: "compTeamworkRemark" },
              ].map((comp, idx) => (
                <div key={idx} className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
                  <div className="w-full pt-2 font-medium sm:w-[30%]">{comp.label}</div>
                  <div className="w-full sm:w-[200px]">
                    <Select 
                      value={(form as any)[comp.achKey]} 
                      onValueChange={(val) => setForm({ ...form, [comp.achKey]: val })}
                    >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="below">Below</SelectItem>
                        <SelectItem value="meet">Meet</SelectItem>
                        <SelectItem value="exceed">Exceed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input 
                      placeholder="Remark..." 
                      value={(form as any)[comp.remKey]} 
                      onChange={(e) => setForm({ ...form, [comp.remKey]: e.target.value })} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendation & Signatories</CardTitle>
          </CardHeader>
          <CardContent>
            <EnterpriseFormGrid>
              <div className="space-y-2">
                <Label>Rekomendasi</Label>
                <Select value={form.recommendation} onValueChange={(val) => setForm({ ...form, recommendation: val })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Rekomendasi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirm_permanent">Confirm to Permanent</SelectItem>
                    <SelectItem value="contract_extended">Contract Extended</SelectItem>
                    <SelectItem value="terminate_probation">Unsuccessful Probationary</SelectItem>
                    <SelectItem value="contract_ended">Contract Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recommendation === "contract_extended" && (
                <div className="space-y-2">
                  <Label>Extend Duration (Months)</Label>
                  <Input type="number" value={form.contractExtendedMonths} onChange={(e) => setForm({ ...form, contractExtendedMonths: e.target.value })} />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Leader Name</Label>
                <SearchableSelect 
                  label="Leader"
                  placeholder="Pilih Leader..."
                  value={employees.find(e => e.name === form.leaderName)?.id?.toString() || ""}
                  onValueChange={(val) => {
                    const m = employees.find(e => String(e.id) === val)
                    if (m) setForm({ ...form, leaderName: m.name, leaderTitle: m.rank || m.position || "Leader" })
                    else setForm({ ...form, leaderName: "", leaderTitle: "" })
                  }}
                  options={employees
                    .filter(e => !selectedEmp || e.departmentId === selectedEmp.departmentId || e.department?.toLowerCase().includes("hr"))
                    .map(emp => ({ value: String(emp.id), label: `${emp.name} - ${emp.rank || emp.position}` }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Leader Title</Label>
                <Input value={form.leaderTitle} onChange={(e) => setForm({ ...form, leaderTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Superior Name</Label>
                <SearchableSelect 
                  label="Superior"
                  placeholder="Pilih Superior..."
                  value={employees.find(e => e.name === form.superiorName)?.id?.toString() || ""}
                  onValueChange={(val) => {
                    const m = employees.find(e => String(e.id) === val)
                    if (m) setForm({ ...form, superiorName: m.name, superiorTitle: m.rank || m.position || "SPV" })
                    else setForm({ ...form, superiorName: "", superiorTitle: "" })
                  }}
                  options={employees
                    .filter(e => !selectedEmp || e.departmentId === selectedEmp.departmentId || e.department?.toLowerCase().includes("hr"))
                    .map(emp => ({ value: String(emp.id), label: `${emp.name} - ${emp.rank || emp.position}` }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Superior Title</Label>
                <Input value={form.superiorTitle} onChange={(e) => setForm({ ...form, superiorTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>HR Recipient (Email Approval)</Label>
                <SearchableSelect 
                  label="HR"
                  placeholder="Pilih HR penerima email..."
                  value={employees.find(e => e.name === form.hrName)?.id?.toString() || ""}
                  onValueChange={(val) => {
                    const m = employees.find(e => String(e.id) === val)
                    if (m) setForm({ ...form, hrName: m.name, hrTitle: m.rank || m.position || "HR" })
                    else setForm({ ...form, hrName: "", hrTitle: "" })
                  }}
                  options={employees.map(emp => ({ value: String(emp.id), label: `${emp.name} - ${emp.rank || emp.position || 'Employee'}` }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>HR Title</Label>
                <Input value={form.hrTitle} onChange={(e) => setForm({ ...form, hrTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Next Superior Name</Label>
                <SearchableSelect 
                  label="Next Superior"
                  placeholder="Pilih Next Superior..."
                  value={employees.find(e => e.name === form.nextSuperiorName)?.id?.toString() || ""}
                  onValueChange={(val) => {
                    const m = employees.find(e => String(e.id) === val)
                    if (m) setForm({ ...form, nextSuperiorName: m.name, nextSuperiorTitle: m.rank || m.position || "Manager" })
                    else setForm({ ...form, nextSuperiorName: "", nextSuperiorTitle: "" })
                  }}
                  options={employees
                    .filter(e => !selectedEmp || e.departmentId === selectedEmp.departmentId || e.department?.toLowerCase().includes("hr"))
                    .map(emp => ({ value: String(emp.id), label: `${emp.name} - ${emp.rank || emp.position}` }))}
                  widthClassName="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Next Superior Title</Label>
                <Input value={form.nextSuperiorTitle} onChange={(e) => setForm({ ...form, nextSuperiorTitle: e.target.value })} />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>Letter Issuance by HR</Label>
                <Select value={form.letterIssuance} onValueChange={(val) => setForm({ ...form, letterIssuance: val })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Surat Keluaran" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent_confirmation">Permanent Confirmation</SelectItem>
                    <SelectItem value="contract_extension">Contract Extension</SelectItem>
                    <SelectItem value="unsuccessful_probation">Unsuccessful Probation Notification</SelectItem>
                    <SelectItem value="end_of_contract">End of Contract Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </EnterpriseFormGrid>
          </CardContent>
        </Card>

        {approvalHistory && approvalHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Status Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {approvalHistory.map((step: any, idx: number) => {
                  const labels: Record<string, string> = {
                    pjo_or_te_initial: 'PJO/TE',
                    section_head_initial: 'Section Head',
                    employee: 'Karyawan',
                    section_head_confirmation: 'Section Head',
                    central_service_manager: 'Department Head',
                    hr: 'HR',
                  }
                  return (
                    <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{step.approverName}</p>
                        <p className="text-xs text-slate-500">{labels[step.approverRole] || step.approverRole}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {step.status === 'approved' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 rounded-full border-0 px-3">Disetujui</Badge>
                        ) : step.status === 'pending' ? (
                          <Badge className="bg-amber-50 text-amber-600 rounded-full border-0 px-3">Menunggu</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full px-3 text-slate-400">Menunggu</Badge>
                        )}
                        {adminMode && (
                          <div className="mt-1 flex flex-wrap justify-end gap-1">
                            {step.signatureDataUrl && <img src={step.signatureDataUrl} alt={`TTD ${step.approverName}`} className="h-8 max-w-20 object-contain rounded border bg-white" />}
                            {registeredSignature && (
                              <Button type="button" variant="outline" size="sm" disabled={adminSignaturePending === step.id} onClick={() => saveAdminSignature(step, registeredSignature)}>
                                Pilih TTD
                              </Button>
                            )}
                            {step.signatureDataUrl && (
                              <Button type="button" variant="ghost" size="sm" disabled={adminSignaturePending === step.id} onClick={() => removeAdminSignature(step)} className="h-8 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                                Hapus TTD
                              </Button>
                            )}
                            <Button type="button" variant="outline" size="sm" disabled={adminResendPending === step.id} onClick={() => resendAdminApproval(step)} className="h-8 px-2 text-[11px] text-violet-700 hover:bg-violet-50">
                              {adminResendPending === step.id ? 'Mengirim...' : 'Kirim Ulang'}
                            </Button>
                            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-200 px-2 text-[11px] font-medium hover:bg-slate-50">
                              Upload TTD
                              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAdminSignatureUpload(step, event)} />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>TTD Digital - {form.leaderName || 'Leader/Creator'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Tanda tangan digital sebagai pembuat Contract Review ini.</p>
            {registeredSignature && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
                <div className="flex h-14 flex-1 items-center justify-center rounded bg-white px-2">
                  <img src={registeredSignature} alt="TTD tersimpan di profile" className="max-h-12 max-w-full object-contain" />
                </div>
                <span className="text-xs font-medium text-emerald-700">TTD tersimpan</span>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              <SignatureCanvas
                ref={leaderSigRef}
                onEnd={updateLeaderSignaturePreview}
                canvasProps={{ className: 'h-40 w-full rounded-lg bg-white' }}
                backgroundColor="rgba(255,255,255,0)"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                leaderSigRef.current?.clear()
                setPreviewLeaderSig('')
                setLeaderSignatureOverride('')
              }}>Bersihkan</Button>
              {registeredSignature && (
                <Button type="button" variant="outline" size="sm" onClick={useRegisteredSignature}>
                  Pakai TTD Tersimpan
                </Button>
              )}
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="size-4" /> Upload TTD
                <input type="file" accept="image/*" className="hidden" onChange={handleSignatureFileUpload} />
              </label>
              <Button type="button" variant="default" size="sm" onClick={updateLeaderSignaturePreview}>Tambahkan ke PDF</Button>
              {initialData?.leaderSignatureDataUrl && !previewLeaderSig && (
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  setPreviewLeaderSig(initialData.leaderSignatureDataUrl)
                }}>Load TTD Sebelumnya</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KANAN: PDF Preview */}
      {isPrintMode ? (
        <div className="contract-review-print flex flex-col gap-8 overflow-auto rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)]">
          <div
            id="pdf-page-1"
            className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
          >
            <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
            {pdfPreviewPage1}
          </div>
          {pdfPreviewPerformancePages.map((page, index) => (
            <div key={`performance-page-${index}`} id={`pdf-page-performance-${index}`} className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
              <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
              {page}
            </div>
          ))}
          <div id="pdf-page-2" className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
            <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
            {pdfPreviewPage2}
          </div>
          <div
            id="pdf-page-3"
            className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
          >
            <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
            {pdfPreviewPage3}
          </div>
        </div>
      ) : (
      <div id="contract-review-preview" className={cn("rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto", isMobileRoute && "block max-md:p-2")}>
        <Tabs defaultValue="letter" className="flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-2 bg-white">
            <TabsTrigger value="letter">Preview Surat</TabsTrigger>
            <TabsTrigger value="productivity">Produktivitas</TabsTrigger>
          </TabsList>
          <TabsContent value="letter" className="m-0 flex flex-col gap-8">
            <div
              id="pdf-page-1"
              className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
            >
              <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
              {pdfPreviewPage1}
            </div>
            {pdfPreviewPerformancePages.map((page, index) => (
              <div key={`performance-page-${index}`} id={`pdf-page-performance-${index}`} className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
                <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
                {page}
              </div>
            ))}
            <div id="pdf-page-2" className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm">
              <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
              {pdfPreviewPage2}
            </div>
            <div
              id="pdf-page-3"
              className="pdf-wrapper relative mx-auto h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white shadow-sm"
            >
              <img src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" alt="Chitra Paratama letterhead" className="absolute inset-0 z-0 h-full w-full object-cover" />
              {pdfPreviewPage3}
            </div>
          </TabsContent>
          <TabsContent value="productivity" className="m-0">
            {form.employeeId ? (
              <iframe
                title="Profil Produktivitas Karyawan"
                src={`/embedded/hc/employee/${form.employeeId}?view=tabs`}
                className="h-[86vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ) : (
              <Card className="bg-white">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">Pilih karyawan terlebih dahulu untuk melihat profil produktivitas.</CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      )}
    </div>
  </AdminPageShell>
  )
}
