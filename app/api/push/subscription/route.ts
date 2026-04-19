import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-session";
import {
  deactivatePushSubscription,
  getEmployeeTargetByEmail,
  upsertPushSubscription,
} from "@/lib/push-notifications";

const subscriptionSchema = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  deviceLabel: z.string().optional(),
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

  const parsed = subscriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.action === "unsubscribe") {
    await deactivatePushSubscription(employee.id, parsed.data.subscription.endpoint);
    return NextResponse.json({ ok: true });
  }

  const subscription = await upsertPushSubscription({
    employeeId: employee.id,
    subscription: parsed.data.subscription,
    deviceLabel: parsed.data.deviceLabel,
    userAgent: request.headers.get("user-agent") ?? "",
  });

  return NextResponse.json({ ok: true, subscription });
}
