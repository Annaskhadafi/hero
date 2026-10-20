import { getMasterApdListAction } from '@/app/actions/master-apd-actions';
import { MasterApdClient } from './master-apd-client';
import { getCurrentMenuPermission } from '@/lib/hero-access';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Master Data APD - Central Service | HERO',
  description: 'Katalog Master APD, Tools, dan Material Central Service',
};

export default async function MasterApdPage() {
  const access = await getCurrentMenuPermission('central-service');

  if (!access.canView) {
    redirect('/dashboard');
  }

  const res = await getMasterApdListAction();
  const items = res.success && res.data ? res.data : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <span>Central Service</span>
            <span>•</span>
            <span>Gudang & Material</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Master Data APD
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Pengelolaan katalog item Alat Pelindung Diri (APD), Tools, dan Material Central Service.
          </p>
        </div>

        <MasterApdClient initialItems={items} />
      </div>
    </div>
  );
}
