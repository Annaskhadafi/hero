import { redirect } from "next/navigation";
import { MobileNotificationsCenter } from "@/components/mobile/mobile-notifications-center";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotifications } from "@/lib/mobile-data";
import {
  getEmployeeTargetByEmail,
  getNotificationPreferences,
  getPushChannelConfig,
  listPushSubscriptions,
} from "@/lib/push-notifications";

export default async function MobileNotificationsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [employee, notifications] = await Promise.all([
    getEmployeeTargetByEmail(session.user.email),
    getMobileNotifications(session.user.email),
  ]);

  if (!employee) {
    return (
      <MobileNotificationsCenter
        initialData={{
          notifications: notifications.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            sentAt: item.sentAt?.toISOString() ?? null,
          })),
          preferences: null,
          pushPublicKey: "",
          pushConfigured: false,
          activeSubscriptions: 0,
        }}
      />
    );
  }

  const [preferences, pushConfig, subscriptions] = await Promise.all([
    getNotificationPreferences(employee.id),
    getPushChannelConfig(),
    listPushSubscriptions(employee.id),
  ]);

  return (
    <MobileNotificationsCenter
      initialData={{
        notifications: notifications.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          sentAt: item.sentAt?.toISOString() ?? null,
        })),
        preferences,
        pushPublicKey: pushConfig?.vapidPublicKey ?? "",
        pushConfigured: Boolean(
          pushConfig?.isEnabled &&
            pushConfig.vapidPublicKey &&
            pushConfig.vapidPrivateKey &&
            pushConfig.pushSubject,
        ),
        activeSubscriptions: subscriptions.length,
      }}
    />
  );
}
