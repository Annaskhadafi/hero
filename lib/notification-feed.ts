import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { notificationDeliveries, notificationEvents } from "@/db/schema/hero";
import { ensureNotificationInfrastructure } from "@/lib/notification-infrastructure";

type NotificationPayloadSnapshot = {
  title?: string;
  body?: string;
  url?: string;
};

export type NotificationFeedItem = {
  id: number;
  title: string;
  body: string;
  href: string;
  channel: string;
  status: string;
  eventType: string | null;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
  isRead: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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

function buildRecipientFilter(email: string) {
  return sql`lower(${notificationDeliveries.recipient}) = ${normalizeEmail(email)}`;
}

export async function getRecipientNotifications(email: string, limit = 20): Promise<NotificationFeedItem[]> {
  await ensureNotificationInfrastructure();

  const rows = await db
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
      readAt: notificationDeliveries.readAt,
    })
    .from(notificationDeliveries)
    .leftJoin(notificationEvents, eq(notificationDeliveries.notificationEventId, notificationEvents.id))
    .where(
      and(
        buildRecipientFilter(email),
        eq(notificationDeliveries.deliveryChannel, "in_app"),
        isNull(notificationDeliveries.clearedAt),
      ),
    )
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(limit);

  return rows.map((row) => {
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
      readAt: row.readAt?.toISOString() ?? null,
      isRead: Boolean(row.readAt),
    };
  });
}

export async function getRecipientUnreadNotificationCount(email: string) {
  await ensureNotificationInfrastructure();

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationDeliveries)
    .where(
      and(
        buildRecipientFilter(email),
        eq(notificationDeliveries.deliveryChannel, "in_app"),
        ne(notificationDeliveries.status, "failed"),
        isNull(notificationDeliveries.clearedAt),
        isNull(notificationDeliveries.readAt),
      ),
    );

  return row?.count ?? 0;
}

function buildNotificationScope(email: string, ids?: number[]) {
  return and(
    buildRecipientFilter(email),
    eq(notificationDeliveries.deliveryChannel, "in_app"),
    isNull(notificationDeliveries.clearedAt),
    ids && ids.length > 0 ? inArray(notificationDeliveries.id, ids) : undefined,
  );
}

export async function markNotificationsRead(email: string, ids?: number[]) {
  await ensureNotificationInfrastructure();

  const targetIds = ids?.filter((value) => Number.isInteger(value) && value > 0) ?? [];
  const now = new Date();

  const rows = await db
    .update(notificationDeliveries)
    .set({
      readAt: now,
      updatedAt: now,
    })
    .where(
      and(
        buildNotificationScope(email, targetIds.length > 0 ? targetIds : undefined),
        isNull(notificationDeliveries.readAt),
      ),
    )
    .returning({ id: notificationDeliveries.id });

  return rows.length;
}

export async function clearNotifications(email: string, ids?: number[]) {
  await ensureNotificationInfrastructure();

  const targetIds = ids?.filter((value) => Number.isInteger(value) && value > 0) ?? [];
  const now = new Date();

  const rows = await db
    .update(notificationDeliveries)
    .set({
      readAt: now,
      clearedAt: now,
      updatedAt: now,
    })
    .where(buildNotificationScope(email, targetIds.length > 0 ? targetIds : undefined))
    .returning({ id: notificationDeliveries.id });

  return rows.length;
}
