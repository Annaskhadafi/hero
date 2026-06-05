"use client"

import { useState, useEffect, use } from "react"
import { getCandidateByToken, submitOnboardingData } from "@/app/actions/onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Loader2, UserCircle, Building2, HeartPulse, FileText } from "lucide-react"

export default function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const token = resolvedParams.token
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    nikKtp: "",
    npwpNumber: "",
    bpjsKesehatan: "",
    bpjsKetenagakerjaan: "",
    bankName: "",
    bankAccountNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: ""
  })

  useEffect(() => {
    async function load() {
      const res = await getCandidateByToken(token)
      if (res.success && res.data) {
        setData(res.data)
        setFormData({
          nikKtp: res.data.candidate.nikKtp || "",
          npwpNumber: res.data.candidate.npwpNumber || "",
          bpjsKesehatan: res.data.candidate.bpjsKesehatan || "",
          bpjsKetenagakerjaan: res.data.candidate.bpjsKetenagakerjaan || "",
          bankName: res.data.candidate.bankName || "",
          bankAccountNumber: res.data.candidate.bankAccountNumber || "",
          emergencyContactName: res.data.candidate.emergencyContactName || "",
          emergencyContactPhone: res.data.candidate.emergencyContactPhone || ""
        })
      } else {
        setError(res.error || "Failed to load onboarding link")
      }
      setLoading(false)
    }
    load()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await submitOnboardingData(token, formData)
    if (res.success) {
      setSuccess(true)
    } else {
      alert("Failed to submit: " + res.error)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Data Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you {data.candidate.fullName}. Your onboarding data has been saved successfully.
              The HR team will review your information shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Onboarding Data Collection</h1>
          <p className="mt-2 text-muted-foreground">
            Please fill in your administrative details to complete your onboarding process for {data.recruitment?.jobTitle || "the position"}.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  <CardTitle>Personal Identification</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>NIK KTP <span className="text-destructive">*</span></Label>
                  <Input 
                    required 
                    value={formData.nikKtp} 
                    onChange={e => setFormData({...formData, nikKtp: e.target.value})} 
                    placeholder="16 digit NIK" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>NPWP Number</Label>
                  <Input 
                    value={formData.npwpNumber} 
                    onChange={e => setFormData({...formData, npwpNumber: e.target.value})} 
                    placeholder="15 or 16 digit NPWP" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-primary" />
                  <CardTitle>Insurance / BPJS</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>BPJS Kesehatan Number</Label>
                  <Input 
                    value={formData.bpjsKesehatan} 
                    onChange={e => setFormData({...formData, bpjsKesehatan: e.target.value})} 
                    placeholder="13 digit number" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>BPJS Ketenagakerjaan Number</Label>
                  <Input 
                    value={formData.bpjsKetenagakerjaan} 
                    onChange={e => setFormData({...formData, bpjsKetenagakerjaan: e.target.value})} 
                    placeholder="11 digit number" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Bank Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name <span className="text-destructive">*</span></Label>
                  <Input 
                    required 
                    value={formData.bankName} 
                    onChange={e => setFormData({...formData, bankName: e.target.value})} 
                    placeholder="e.g. BCA, Mandiri, BNI" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number <span className="text-destructive">*</span></Label>
                  <Input 
                    required 
                    value={formData.bankAccountNumber} 
                    onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})} 
                    placeholder="Your account number" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>Emergency Contact</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Name <span className="text-destructive">*</span></Label>
                  <Input 
                    required 
                    value={formData.emergencyContactName} 
                    onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} 
                    placeholder="Name of relative/spouse" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone Number <span className="text-destructive">*</span></Label>
                  <Input 
                    required 
                    value={formData.emergencyContactPhone} 
                    onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} 
                    placeholder="Active phone number" 
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Onboarding Data
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
