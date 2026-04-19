import { NotificationCenterBoard } from "@/components/notification-center-board";
import { getNotificationCenterData } from "@/lib/approval-blueprint";
import { ensureNotificationInfrastructure } from "@/lib/notification-infrastructure";

export default async function NotificationCenterPage() {
  await ensureNotificationInfrastructure();
  const data = await getNotificationCenterData();

  return <NotificationCenterBoard data={data} />;
}
