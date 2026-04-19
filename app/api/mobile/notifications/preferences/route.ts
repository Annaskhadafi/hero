import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-session";
import {
  getEmployeeTargetByEmail,
  updateNotificationPreferences,
} from "@/lib/push-notifications";

const notificationPreferenceSchema = z.object({
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  approvalRequestsEnabled: z.boolean().optional(),
  shiftRemindersEnabled: z.boolean().optional(),
  hseAlertsEnabled: z.boolean().optional(),
  pointsUpdatesEnabled: z.boolean().optional(),
});

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

  const parsed = notificationPreferenceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const preferences = await updateNotificationPreferences(employee.id, parsed.data);

  return NextResponse.json({ preferences });
}
