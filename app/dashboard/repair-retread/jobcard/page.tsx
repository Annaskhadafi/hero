import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { JobcardDesktopClient } from './_components/jobcard-desktop-client';
import { getTireRepairJobcardsAction } from '@/app/actions/tire-repair-jobcard-actions';
import { getWaitingWoFromApi, getFormWoList } from '@/app/actions/form-wo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Repair Job Card | HERO Dashboard',
  description: 'Sistem Pengelolaan Dokumen Official Repair Job Card (F.INPR.REM.003.00) dan Form WO.',
};

async function JobcardContent() {
  const [jobcardRes, waitingWoRes, formWoRes] = await Promise.all([
    getTireRepairJobcardsAction().catch((err) => {
      console.error('[JobcardContent:jobcards] Error:', err);
      return { success: false, data: [] };
    }),
    getWaitingWoFromApi().catch((err) => {
      console.error('[JobcardContent:waitingWo] Error:', err);
      return [];
    }),
    getFormWoList().catch((err) => {
      console.error('[JobcardContent:formWo] Error:', err);
      return [];
    }),
  ]);

  const initialJobcards = jobcardRes?.success && Array.isArray(jobcardRes.data) ? jobcardRes.data : [];
  const waitingWoList = Array.isArray(waitingWoRes) ? waitingWoRes : [];
  const formWoList = Array.isArray(formWoRes) ? formWoRes : [];

  return (
    <JobcardDesktopClient
      initialJobcards={initialJobcards}
      waitingWoList={waitingWoList}
      formWoList={formWoList}
    />
  );
}

export default function JobcardDesktopPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-[#003f78]" />
            <span className="text-sm font-medium">Memuat data Repair Job Card System...</span>
          </div>
        }
      >
        <JobcardContent />
      </Suspense>
    </div>
  );
}
