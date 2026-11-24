import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from '@/lib/auth-session';
import { getBusinessCardsAction } from '@/app/actions/business-card';
import { MobileBusinessCardsClient } from './mobile-business-cards-client';

export const metadata: Metadata = {
  title: 'Business Card Scanner | HERO Mobile',
  description: 'Pindai kartu nama di expo, ekstraksi kontak otomatis dengan Vision AI, dan kelola prospek bisnis.',
};

export const dynamic = 'force-dynamic';

export default async function MobileBusinessCardsPage() {
  const session = await getServerSession();
  if (!session?.user?.email && !session?.user?.id) {
    redirect('/sign-in');
  }

  const res = await getBusinessCardsAction();
  const initialCards = res.success && res.data ? res.data : [];

  return (
    <div className="w-full">
      <MobileBusinessCardsClient initialCards={initialCards} />
    </div>
  );
}
