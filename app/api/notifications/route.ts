import { NextResponse } from "next/server";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { notificationDeliveries, notificationEvents } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

type NotificationPayloadSnapshot = {
  title?: string;
  body?: string;
  url?: string;
};

function parsePayloadSnapshot(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as NotificationPayloadSnapshot;
  } catch {
    return {
      body: value,
    };
  }
}

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const recentWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: notificationDeliveries.id,
        channel: notificationDeliveries.deliveryChannel,
        recipient: notificationDeliveries.recipient,
        status: notificationDeliveries.status,
        eventType: notificationEvents.eventType,
        payloadSnapshot: notificationEvents.payloadSnapshot,
        createdAt: notificationDeliveries.createdAt,
        sentAt: notificationDeliveries.sentAt,
        errorMessage: notificationDeliveries.errorMessage,
      })
      .from(notificationDeliveries)
      .leftJoin(notificationEvents, eq(notificationDeliveries.notificationEventId, notificationEvents.id))
      .where(sql`lower(${notificationDeliveries.recipient}) = ${email}`)
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(8),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationDeliveries)
      .where(
        and(
          sql`lower(${notificationDeliveries.recipient}) = ${email}`,
          ne(notificationDeliveries.status, "failed"),
          gte(notificationDeliveries.createdAt, recentWindowStart),
        ),
      ),
  ]);

  return NextResponse.json({
    count: countRows[0]?.count ?? 0,
    notifications: rows.map((row) => {
      const payload = parsePayloadSnapshot(row.payloadSnapshot);

      return {
        id: row.id,
        title: payload.title || row.eventType || "HERO notification",
        body: payload.body || row.errorMessage || "Update baru dari HERO.",
        href: payload.url || "/dashboard/notifications",
        channel: row.channel,
        status: row.status,
        eventType: row.eventType,
        createdAt: row.createdAt.toISOString(),
        sentAt: row.sentAt?.toISOString() ?? null,
      };
    }),
  });
}
