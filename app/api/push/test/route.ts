import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-session";
import {
  createNotificationEventForEmployee,
  getEmployeeTargetByEmail,
  sendPushNotification,
  type NotificationCategory,
} from "@/lib/push-notifications";

const testPushCategories = [
  "approval_requests",
  "shift_reminders",
  "hse_alerts",
  "points_updates",
] as const;

const testPushSchema = z.object({
  category: z.enum(testPushCategories),
});

const testCopy: Record<NotificationCategory, { title: string; body: string; url: string }> = {
  approval_requests: {
    title: "Approval request test",
    body: "Ada request baru masuk ke inbox approval HERO.",
    url: "/mobile/notifications",
  },
  shift_reminders: {
    title: "Shift reminder test",
    body: "Shift akan dimulai sebentar lagi. Cek attendance sebelum mulai kerja.",
    url: "/mobile/attendance",
  },
  hse_alerts: {
    title: "HSE alert test",
    body: "Ada alert HSE baru. Review detail risiko di mobile HSE board.",
    url: "/mobile/hse",
  },
  points_updates: {
    title: "Points update test",
    body: "Poin HERO bertambah. Buka Point Arena untuk lihat leaderboard terbaru.",
    url: "/mobile/gamification",
  },
};

export async function POST(request: Request) {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const employee = await getEmployeeTargetByEmail(email);
  if (!employee) {
    return NextResponse.json({ message: "Employee not found" }, { status: 404 });
  }

  const parsed = testPushSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const copy = testCopy[parsed.data.category];
  const event = await createNotificationEventForEmployee({
    employeeId: employee.id,
    eventType: `test_${parsed.data.category}`,
    category: parsed.data.category,
    title: copy.title,
    body: copy.body,
    url: copy.url,
  });

  const result = await sendPushNotification({
    employeeId: employee.id,
    category: parsed.data.category,
    title: copy.title,
    body: copy.body,
    url: copy.url,
    tag: `test-${parsed.data.category}-${employee.id}`,
    notificationEventId: event?.id,
    requirePreference: false,
  });

  if (result.status !== "sent") {
    return NextResponse.json(
      { message: `Push not sent (${result.reason ?? "unknown"})` },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
