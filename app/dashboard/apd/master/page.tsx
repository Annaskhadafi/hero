import { getMasterApdListAction } from '@/app/actions/master-apd-actions';
import { MasterApdClient } from '@/app/dashboard/central-service/master-apd/master-apd-client';
import { getCurrentMenuPermission } from '@/lib/hero-access';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Master Data APD | HERO',
  description: 'Katalog Master APD, Tools, dan Material',
};

export default async function ApdMasterPage() {
  const [masterAccess, apdAccess, csAccess] = await Promise.all([
    getCurrentMenuPermission('central_service_master_apd'),
    getCurrentMenuPermission('apd-request'),
    getCurrentMenuPermission('central-service'),
  ]);

  const canView = masterAccess.canView || apdAccess.canView || csAccess.canView;

  if (!canView) {
    redirect('/dashboard');
  }

  const res = await getMasterApdListAction();
  const items = res.success && res.data ? res.data : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <span>HSE</span>
            <span>•</span>
            <span>Alat Pelindung Diri</span>
            <span>•</span>
            <span>Katalog Master Data</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Master Data APD
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pengelolaan katalog item Alat Pelindung Diri (APD), Tools, dan Material.
          </p>
        </div>

        <MasterApdClient initialItems={items} />
      </div>
    </div>
  );
}
