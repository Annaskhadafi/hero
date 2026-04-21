import { redirect } from "next/navigation";
import { MobileNotificationsCenter } from "@/components/mobile/mobile-notifications-center";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotificationSettings, getMobileNotifications } from "@/lib/mobile-data";

export default async function MobileNotificationsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [notifications, settings] = await Promise.all([
    getMobileNotifications(session.user.email),
    getMobileNotificationSettings(session.user.email),
  ]);

  return (
    <MobileNotificationsCenter
      initialData={{
        notifications,
        ...settings,
      }}
    />
  );
}
