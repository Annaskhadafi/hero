import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentMenuPermission } from '@/lib/hero-access';
import { getBusinessCardsAction } from '@/app/actions/business-card';
import { MobileBusinessCardsClient } from './mobile-business-cards-client';

export const metadata: Metadata = {
  title: 'Business Card Scanner | HERO Mobile',
  description: 'Pindai kartu nama di expo, ekstraksi kontak otomatis dengan Vision AI, dan kelola prospek bisnis.',
};

export const dynamic = 'force-dynamic';

export default async function MobileBusinessCardsPage() {
  const permission = await getCurrentMenuPermission('business_cards');
  if (!permission.canView) redirect('/mobile/dashboard');

  const res = await getBusinessCardsAction();
  const initialCards = res.success && res.data ? res.data : [];

  return (
    <div className="w-full">
      <MobileBusinessCardsClient initialCards={initialCards} canEdit={permission.canEdit} canDelete={permission.canDelete} />
    </div>
  );
}
