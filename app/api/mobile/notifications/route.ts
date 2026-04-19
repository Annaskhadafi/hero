import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotificationSettings, getMobileNotifications } from "@/lib/mobile-data";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [notifications, settings] = await Promise.all([
    getMobileNotifications(email),
    getMobileNotificationSettings(email),
  ]);

  return NextResponse.json({
    notifications,
    ...settings,
  });
}
