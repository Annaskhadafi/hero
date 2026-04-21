import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import {
  clearNotifications,
  getRecipientNotifications,
  getRecipientUnreadNotificationCount,
  markNotificationsRead,
} from "@/lib/notification-feed";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [notifications, count] = await Promise.all([
    getRecipientNotifications(email, 20),
    getRecipientUnreadNotificationCount(email),
  ]);

  return NextResponse.json({
    count,
    notifications,
  });
}

type NotificationActionBody = {
  action?: "mark-read" | "clear";
  ids?: number[];
  scope?: "all";
};

export async function POST(request: Request) {
  const session = await getServerSession();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as NotificationActionBody | null;
  if (!body?.action) {
    return NextResponse.json({ message: "Action is required." }, { status: 400 });
  }

  const ids = body.scope === "all" ? undefined : body.ids;

  const affected =
    body.action === "mark-read"
      ? await markNotificationsRead(email, ids)
      : body.action === "clear"
        ? await clearNotifications(email, ids)
        : null;

  if (affected == null) {
    return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
  }

  const [notifications, count] = await Promise.all([
    getRecipientNotifications(email, 20),
    getRecipientUnreadNotificationCount(email),
  ]);

  return NextResponse.json({
    affected,
    count,
    notifications,
  });
}
