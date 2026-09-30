'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ClipboardCheck, Wrench, Lock, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SelectActivityPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 pb-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#003f78] via-[#003566] to-[#00274d] rounded-[1.6rem] p-6 text-white shadow-[0_16px_36px_rgba(0,63,120,0.18)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push('/mobile/dashboard')}
              className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all active:scale-95 shadow-xs"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white font-mono">
                  TIRE REPAIR HUB
                </h1>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-200 font-medium">Workshop Operational System</p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-mono font-bold bg-white/15 text-white border-white/25 px-3 py-1.5 shadow-xs">
            KPC SANGATTA
          </Badge>
        </div>
      </div>

      {/* Option 1: Tire Repair Inspection */}
      <Link
        href="/mobile/tire-repair/inspection"
        className="group block p-7 bg-white rounded-[1.6rem] border border-slate-100 shadow-[0_14px_36px_rgba(8,32,51,0.08)] border-l-[6px] border-l-emerald-500 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-[#082033] group-hover:text-[#003f78] transition-colors leading-snug">
              Tire Repair Inspection
            </h3>
            <div className="mt-3 py-2.5 px-4 bg-[#e9f6fd] group-hover:bg-[#003f78] rounded-xl text-xs font-black text-[#003f78] group-hover:text-white transition-all flex items-center justify-between">
              <span>Buka Laporan Inspeksi</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      </Link>

      {/* Option 2: Jobcard Repair */}
      <Link
        href="/mobile/tire-repair/jobcard"
        className="group block p-7 bg-white rounded-[1.6rem] border border-slate-100 shadow-[0_14px_36px_rgba(8,32,51,0.08)] border-l-[6px] border-l-[#003f78] hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#003f78] border border-sky-200/80 flex items-center justify-center shrink-0 group-hover:bg-[#003f78] group-hover:text-white transition-all shadow-xs">
            <Wrench className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-[#082033] group-hover:text-[#003f78] transition-colors leading-snug">
              Jobcard Repair
            </h3>
            <div className="mt-3 py-2.5 px-4 bg-[#e9f6fd] group-hover:bg-[#003f78] rounded-xl text-xs font-black text-[#003f78] group-hover:text-white transition-all flex items-center justify-between">
              <span>Kelola Repair Job Card</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

