'use client'

import * as React from 'react'
import { ClipboardCheck, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JsaFormDialog } from '@/components/hse/jsa-form-dialog'

export function PublicJsaForm() {
  const [open, setOpen] = React.useState(false)
  const [submittedJsaId, setSubmittedJsaId] = React.useState<string | undefined>()

  const handleSavePdf = () => {
    if (!submittedJsaId) return
    window.open(`/print/jsa/${submittedJsaId}`, '_blank')
  }

  return (
    <main className="min-h-dvh bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl items-center justify-center">
        <Card className="w-full rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ClipboardCheck className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <CardTitle className="font-[Manrope] text-2xl font-bold tracking-tight sm:text-3xl">
                Form Job Safety Analysis (JSA)
              </CardTitle>
              <CardDescription className="mx-auto max-w-2xl text-base text-slate-600">
                Link publik untuk pengisian JSA oleh pelaksana atau pihak eksternal tanpa login ke sistem HERO.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <Button className="min-h-12 rounded-xl px-6" onClick={() => setOpen(true)}>
              Buka Form JSA
            </Button>
            {submittedJsaId && (
              <Button variant="outline" className="min-h-12 rounded-xl px-6" onClick={handleSavePdf}>
                <Download className="mr-2 h-4 w-4" />
                Save PDF
              </Button>
            )}
            <p className="text-center text-sm text-slate-500">
              {submittedJsaId
                ? 'Form berhasil dikirim. Silakan simpan PDF bila dibutuhkan.'
                : 'Setelah dikirim, data masuk ke daftar JSA dashboard HSE.'}
            </p>
          </CardContent>
        </Card>
      </div>
      <JsaFormDialog open={open} onOpenChange={setOpen} publicMode onSuccess={setSubmittedJsaId} />
    </main>
  )
}
