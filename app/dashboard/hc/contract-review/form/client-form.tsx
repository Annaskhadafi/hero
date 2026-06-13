"use client"

import { useState, useTransition, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Save, Printer, ArrowLeft, Plus, Trash2 } from "lucide-react"

import { saveContractReview } from "@/app/actions/contract-review"
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
import { cn } from "@/lib/utils"

export function ContractReviewClientForm({ employees, orgNodes = [], initialData }: { employees: any[], orgNodes?: any[], initialData?: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode")
  const employeeSnParam = searchParams.get("employeeSn")
  const isPrintMode = mode === "print"
  
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
    hrName: initialData?.hrName || "",
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

  const autoPopulateSignatories = (employeeId: string, currentForm: any) => {
    const emp = employees.find(e => String(e.id) === employeeId)
    if (!emp) return currentForm

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
       const s = employees.find(e => e.departmentId === emp.departmentId && e.id !== emp.id && getRankWeight(e.rank || e.position) > Math.max(empWeight, 2))
       if (s && s.name !== newLeaderName) {
         newSupName = s.name
         newSupTitle = s.rank || s.position || "Superior"
       }
    }

    // Fallback if Next Superior is empty and we still need a higher manager
    if (!newNextSupName && newSupName && emp.departmentId) {
       const supWeight = getRankWeight(newSupTitle)
       const m = employees.find(e => e.departmentId === emp.departmentId && e.id !== emp.id && getRankWeight(e.rank || e.position) > supWeight)
       if (m && m.name !== newLeaderName && m.name !== newSupName) {
         newNextSupName = m.name
         newNextSupTitle = m.rank || m.position || "Manager"
       }
    }
    
    let newHrName = currentForm.hrName || ""
    let newHrTitle = currentForm.hrTitle || "HR Manager"
    if (!newHrName || newHrName === "PILIH HR...") {
      const hrManager = employees.find(e => {
        const isHr = e.department?.toLowerCase().includes("hr") || e.department?.toLowerCase().includes("human");
        const isMgr = e.isManagerial || getRankWeight(e.rank || e.position) >= 3; // SPV or Manager
        return isHr && isMgr;
      })
      if (hrManager) {
          newHrName = hrManager.name
          newHrTitle = hrManager.rank || hrManager.position || "HR Manager"
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
      hrTitle: newHrTitle
    }
  }

  // Auto populate on initial load if fields are missing
  useEffect(() => {
    if (form.employeeId && (!form.leaderName || !form.superiorName || !form.nextSuperiorName || !form.hrName)) {
      const populatedForm = autoPopulateSignatories(form.employeeId, form)
      // Only set state if something actually changed to avoid infinite loops
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

  // Auto-select employee from ?employeeSn= query param (e.g. from Central Service page)
  useEffect(() => {
    if (employeeSnParam && !form.employeeId) {
      const match = employees.find(e => e.employeeId === employeeSnParam || e.employeeId === `EMP-${employeeSnParam}` || e.employeeId?.replace(/^EMP-/i, '') === employeeSnParam)
      if (match) {
        setForm(prev => {
          const updated = {
            ...prev,
            employeeId: String(match.id),
            hireDate: prev.hireDate || (match.joinDate ? new Date(match.joinDate).toISOString().slice(0, 10) : ""),
          }
          return autoPopulateSignatories(String(match.id), updated)
        })
      }
    }
  }, [employeeSnParam, employees])

  const achievementScore = useMemo(() => {
    const aVals = form.performanceActivities.map((a: any) => a.achievement).filter(Boolean)
    const bVals = [
      (form as any).compDisciplineAch,
      (form as any).compSkillAch,
      (form as any).compResultAch,
      (form as any).compQualityAch,
      (form as any).compCustomerAch,
      (form as any).compTeamworkAch
    ].filter(Boolean)
    
    const allVals = [...aVals, ...bVals]
    if (allVals.length === 0) return 0
    
    const total = allVals.reduce((sum, val) => {
      if (val === "exceed") return sum + 115
      if (val === "meet") return sum + 100
      if (val === "below") return sum + 80
      return sum
    }, 0)
    
    return total / allVals.length
  }, [form])

  const achCategory = achievementScore >= 106 ? "exceed" : achievementScore >= 95 ? "meet" : achievementScore > 0 ? "below" : ""

  const handleSave = () => {
    startTransition(async () => {
      // Destructure out the temporary title fields so we don't send them to the DB
      const { leaderTitle, superiorTitle, hrTitle, nextSuperiorTitle, ...formToSave } = form
      
      const payload = {
        ...formToSave,
        employeeId: form.employeeId ? parseInt(form.employeeId) : null,
        contractExtendedMonths: form.contractExtendedMonths ? parseInt(form.contractExtendedMonths as string) : null,
        todayDate: new Date(form.todayDate),
        hireDate: form.hireDate ? new Date(form.hireDate) : new Date(),
        employeeNameStr: selectedEmp?.name || form.employeeNameStr,
      }
      const res = await saveContractReview(payload as any)
      if (res.success) {
        router.push("/dashboard/hc/contract-review")
      } else {
        alert("Gagal menyimpan: " + res.error)
      }
    })
  }

  const handlePrint = () => {
    // Get both pages' HTML
    const page1Html = document.querySelector('#pdf-page-1')?.innerHTML || ''
    const page2Html = document.querySelector('#pdf-page-2')?.innerHTML || ''
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
            .break-before-auto { break-before: auto; }
            .text-gray-500 { color: #6b7280; }
            input[type="checkbox"] { margin-right: 4px; }
          </style>
        </head>
        <body>
          <img src="${letterheadUrl}" class="print-bg" />
          <main>
            <div class="page">${page1Html}</div>
            <div class="page">${page2Html}</div>
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

  const pdfPreviewPage1 = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[9pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
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
            <td>Department/Section:<br/>{selectedEmp?.department || '-'}</td>
          </tr>
          <tr>
            <td>Superior Name:<br/>{form.leaderName || form.superiorName || form.nextSuperiorName || '-'}</td>
            <td>Superior Title:<br/>{form.leaderTitle || form.superiorTitle || form.nextSuperiorTitle || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-1 font-bold">Progress made towards probation/contract period</div>
      <div className="font-bold ml-4 mb-1">A. Performance</div>
      
      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-[45%]">Activities</th>
            <th className="w-[30%]">Achievement<br/>( Below/ Meet/ Exceed<br/>Requirement )</th>
            <th className="w-[25%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          {form.performanceActivities.map((item: any, i: number) => (
            <tr key={i}>
              <td className="text-left">{item.activity || '\u00A0'}</td>
              <td className="capitalize">{item.achievement || '\u00A0'}</td>
              <td className="text-left">{item.remark || '\u00A0'}</td>
            </tr>
          ))}
          {form.performanceActivities.length < 5 && Array(5 - form.performanceActivities.length).fill(0).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="font-bold ml-4 mb-1 mt-1">B. Related Competency ( Knowledge & Behavior)</div>
      
      <table className="w-full border-collapse border border-black mb-2 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="bg-slate-50 text-center">
            <th className="w-[45%]">Activities</th>
            <th className="w-[30%]">Achievement<br/>( Below/ Meet/ Exceed<br/>Requirement )</th>
            <th className="w-[25%]">Remark</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-bold">Discipline</td>
            <td className="text-center capitalize">{form.compDisciplineAch}</td>
            <td>{form.compDisciplineRemark}</td>
          </tr>
          <tr>
            <td className="font-bold">Professional Skill and Knowledge</td>
            <td className="text-center capitalize">{form.compSkillAch}</td>
            <td>{form.compSkillRemark}</td>
          </tr>
          <tr>
            <td className="font-bold">Achieving Result</td>
            <td className="text-center capitalize">{form.compResultAch}</td>
            <td>{form.compResultRemark}</td>
          </tr>
          <tr>
            <td className="font-bold">Concern for Order, Quality and Accuracy</td>
            <td className="text-center capitalize">{form.compQualityAch}</td>
            <td>{form.compQualityRemark}</td>
          </tr>
          <tr>
            <td className="font-bold">Customer Orientation ( internal / external )</td>
            <td className="text-center capitalize">{form.compCustomerAch}</td>
            <td>{form.compCustomerRemark}</td>
          </tr>
          <tr>
            <td className="font-bold">Teamwork</td>
            <td className="text-center capitalize">{form.compTeamworkAch}</td>
            <td>{form.compTeamworkRemark}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  const pdfPreviewPage2 = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[9pt] font-sans leading-tight" style={{ color: 'black', paddingTop: '40mm', paddingBottom: '35mm', paddingLeft: '20mm', paddingRight: '20mm', height: '297mm', overflow: 'hidden' }}>
      <table className="w-full border-collapse border border-black mb-4 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 break-inside-avoid">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th colSpan={2}>Achievement Definition</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="w-1/3">
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={achCategory === "exceed"} />
                Exceed Requirement (106% - 125%)
              </label>
            </td>
            <td className="w-2/3">Performance of the employee is exceeding target and He/She consistently <b>demonstrates right attitude and behavior</b> which are aligned with the competency</td>
          </tr>
          <tr>
            <td>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={achCategory === "meet"} />
                Meet Requirement (95% - 105%)
              </label>
            </td>
            <td>Performance of the employee is meeting target and in overall He/She <b>demonstrates attitude and behavior</b> which are aligned with the competency</td>
          </tr>
          <tr>
            <td>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={achCategory === "below"} />
                Below Requirement (&#60; 95%)
              </label>
            </td>
            <td>Performance of the employee is not meeting target and He/She still <b>demonstrating some attitudes and/ or behaviors which are not aligned</b> with the competency</td>
          </tr>
        </tbody>
      </table>

      <div className="font-bold mb-2 break-inside-avoid">Recommendation</div>
      <div className="grid grid-cols-2 gap-4 mb-6 break-inside-avoid">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.recommendation === 'confirm_permanent'} readOnly />
          Confirm to Permanent
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.recommendation === 'terminate_probation'} readOnly />
          Unsuccessful Probationary (termination)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.recommendation === 'contract_extended'} readOnly />
          Contract Extended <span className="border-b border-black w-12 inline-block text-center">{form.contractExtendedMonths || '\u00A0'}</span> months
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.recommendation === 'contract_ended'} readOnly />
          Contract ended
        </label>
      </div>

      <div className="font-bold mb-4 break-before-auto break-inside-avoid">Signatories</div>
      
      <div className="grid grid-cols-2 gap-x-8 gap-y-12 mb-8 break-inside-avoid">
        {form.leaderName && (
          <div>
            <div className="mb-16">Leader Signature</div>
            <div className="border-b border-black w-full mb-1">{form.leaderName}</div>
            <div>{form.leaderTitle || 'Leader'}</div>
          </div>
        )}
        <div>
          <div className="mb-16">Employee Signature</div>
          <div className="border-b border-black w-full mb-1">{selectedEmp?.name || form.employeeNameStr || '\u00A0'}</div>
          <div>{selectedEmp?.position || 'Employee'}</div>
        </div>
        {form.superiorName && (
          <div>
            <div className="mb-16">Superior Signature</div>
            <div className="border-b border-black w-full mb-1">{form.superiorName}</div>
            <div>{form.superiorTitle || 'Superior'}</div>
          </div>
        )}
        {form.hrName && (
          <div>
            <div className="mb-16">HR Signature</div>
            <div className="border-b border-black w-full mb-1">{form.hrName}</div>
            <div>{form.hrTitle || 'HR'}</div>
          </div>
        )}
        {form.nextSuperiorName && (
          <div>
            <div className="mb-16">Next Superior Signature</div>
            <div className="border-b border-black w-full mb-1">{form.nextSuperiorName}</div>
            <div>{form.nextSuperiorTitle || 'Manager'}</div>
          </div>
        )}
        <div>
          <div className="font-bold mb-4">Letter Issuance by HR</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.letterIssuance === 'permanent_confirmation'} readOnly />
              Permanent Confirmation
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.letterIssuance === 'contract_extension'} readOnly />
              Contract extension
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.letterIssuance === 'unsuccessful_probation'} readOnly />
              Unsuccessful probation notification
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.letterIssuance === 'end_of_contract'} readOnly />
              End of contract notification
            </label>
          </div>
        </div>
      </div>

      <div className="text-right mt-12 text-gray-500">
        F.HR.STD.012.00
      </div>
    </div>
  )

  return (
    <AdminPageShell 
      eyebrow="HC • Form" 
      title="Contract & Probation Review" 
      description="Lengkapi evaluasi karyawan."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_850px]">
        {/* KIRI: Form Input */}
        <div className="flex flex-col gap-6 print:hidden">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 size-4" /> Kembali
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="mr-2 size-4" /> Print / Save PDF
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="ml-auto">
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <CardTitle>A. Performance Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.performanceActivities.map((act: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4">
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
                  <div className="w-[200px] space-y-2">
                    <Label>Achievement</Label>
                    <Select 
                      value={act.achievement} 
                      onValueChange={(val) => {
                        const newArr = [...form.performanceActivities]
                        newArr[idx].achievement = val
                        setForm({ ...form, performanceActivities: newArr })
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    className="mt-8"
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
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-[30%] pt-2 font-medium">{comp.label}</div>
                  <div className="w-[200px]">
                    <Select 
                      value={(form as any)[comp.achKey]} 
                      onValueChange={(val) => setForm({ ...form, [comp.achKey]: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Pilih Rekomendasi" /></SelectTrigger>
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
                <Label>HR Name</Label>
                <SearchableSelect 
                  label="HR"
                  placeholder="Pilih HR..."
                  value={employees.find(e => e.name === form.hrName)?.id?.toString() || ""}
                  onValueChange={(val) => {
                    const m = employees.find(e => String(e.id) === val)
                    if (m) setForm({ ...form, hrName: m.name, hrTitle: m.rank || m.position || "HR" })
                    else setForm({ ...form, hrName: "", hrTitle: "" })
                  }}
                  options={employees
                    .filter(e => {
                      const isHr = e.department?.toLowerCase().includes("hr") || e.department?.toLowerCase().includes("human");
                      const isMgr = e.isManagerial || e.rank?.toLowerCase().includes('manager') || e.rank?.toLowerCase().includes('spv') || e.rank?.toLowerCase().includes('supervisor');
                      return isHr && isMgr;
                    })
                    .map(emp => ({ value: String(emp.id), label: `${emp.name} - ${emp.rank || emp.position}` }))}
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
                  <SelectTrigger><SelectValue placeholder="Pilih Surat Keluaran" /></SelectTrigger>
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
      </div>

      {/* KANAN: PDF Preview */}
      <div className="rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:hidden overflow-auto flex flex-col gap-8">
        <div
          id="pdf-page-1"
          className="pdf-wrapper relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-sm"
          style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)', backgroundSize: '100% 100%' }}
        >
          {pdfPreviewPage1}
        </div>
        
        <div
          id="pdf-page-2"
          className="pdf-wrapper relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-sm"
          style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)', backgroundSize: '100% 100%' }}
        >
          {pdfPreviewPage2}
        </div>
      </div>
    </div>
  </AdminPageShell>
  )
}
