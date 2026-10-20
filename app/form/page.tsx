import Link from 'next/link'
import { FileText, Globe, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function FormRootPortalPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <Globe className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Form & Survey Portal
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Portal pengisian formulir, survei NPS, dan kuesioner resmi PT Chitra Paratama.
        </p>

        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Format URL formulir: <code>form.chitraparatama.com/f/[slug]</code></span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Terhubung langsung ke Cloud Engine HERO</span>
          </div>
        </div>

        <div className="mt-8">
          <Link href="https://hero.chitraparatama.com">
            <Button variant="outline" className="w-full gap-2 text-slate-700">
              Menuju Portal HERO Utama
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-6">
        &copy; {new Date().getFullYear()} PT Chitra Paratama. All rights reserved.
      </p>
    </div>
  )
}
