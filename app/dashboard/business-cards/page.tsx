import { redirect } from 'next/navigation';
import { getCurrentMenuPermission } from '@/lib/hero-access';
import { BusinessCardsClient } from './business-cards-client';

export default async function BusinessCardsPage() {
  const permission = await getCurrentMenuPermission('business_cards');
  if (!permission.canView) redirect('/dashboard');
  return <BusinessCardsClient canEdit={permission.canEdit} canDelete={permission.canDelete} />;
}
