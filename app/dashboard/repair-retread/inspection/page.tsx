import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { TireInspectionDesktopClient } from './_components/tire-inspection-desktop-client';
import {
  getTireRepairInspectionsAction,
  getTireRepairMasterDataAction,
} from '@/app/actions/tire-repair-actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tire Inspection Report | HERO Dashboard',
  description: 'Daftar dan data laporan inspeksi fisik ban masuk (Initial Inspection) di workshop repair & retread.',
};

async function TireInspectionContent() {
  const [inspectionsRes, masterDataRes] = await Promise.all([
    getTireRepairInspectionsAction().catch((err) => {
      console.error('[TireInspectionContent:inspections] Error:', err);
      return { success: false, data: [] };
    }),
    getTireRepairMasterDataAction().catch((err) => {
      console.error('[TireInspectionContent:masterData] Error:', err);
      return { success: false, data: null };
    }),
  ]);

  const initialInspections = inspectionsRes?.success && Array.isArray(inspectionsRes.data) ? inspectionsRes.data : [];
  const masterData = masterDataRes?.success && masterDataRes.data ? masterDataRes.data : {
    customers: [],
    sites: [],
    locations: [],
    sizes: [],
    brands: [],
    patterns: [],
    userDefaultLocation: '',
    userDefaultName: '',
  };

  return (
    <TireInspectionDesktopClient
      initialInspections={initialInspections}
      masterData={masterData}
    />
  );
}

export default function TireInspectionDesktopPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat data Tire Inspection Report...</span>
          </div>
        }
      >
        <TireInspectionContent />
      </Suspense>
    </div>
  );
}

