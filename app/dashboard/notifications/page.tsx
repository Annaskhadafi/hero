import { NotificationCenterBoard } from "@/components/notification-center-board";
import { getNotificationCenterData } from "@/lib/approval-blueprint";
import { ensureHeroSeedData } from "@/lib/hero-admin";

export default async function NotificationCenterPage() {
  await ensureHeroSeedData();
  const data = await getNotificationCenterData();

  return <NotificationCenterBoard data={data} />;
}
