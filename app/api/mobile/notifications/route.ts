import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotifications } from "@/lib/mobile-data";
import {
  getEmployeeTargetByEmail,
  getNotificationPreferences,
  getPushChannelConfig,
  listPushSubscriptions,
} from "@/lib/push-notifications";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [employee, notifications] = await Promise.all([
    getEmployeeTargetByEmail(email),
    getMobileNotifications(email),
  ]);

  if (!employee) {
    return NextResponse.json({
      notifications,
      preferences: null,
      pushPublicKey: "",
      pushConfigured: false,
      activeSubscriptions: 0,
    });
  }

  const [preferences, pushConfig, subscriptions] = await Promise.all([
    getNotificationPreferences(employee.id),
    getPushChannelConfig(),
    listPushSubscriptions(employee.id),
  ]);

  return NextResponse.json({
    notifications,
    preferences,
    pushPublicKey: pushConfig?.vapidPublicKey ?? "",
    pushConfigured: Boolean(
      pushConfig?.isEnabled &&
        pushConfig.vapidPublicKey &&
        pushConfig.vapidPrivateKey &&
        pushConfig.pushSubject,
    ),
    activeSubscriptions: subscriptions.length,
  });
}
