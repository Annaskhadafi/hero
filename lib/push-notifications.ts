"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import * as webpush from "web-push";
import { db } from "@/db";
import {
  employees,
  notificationChannelSettings,
  notificationDeliveries,
  notificationEvents,
  notificationPushSubscriptions,
  notificationUserPreferences,
} from "@/db/schema/hero";
import { ensureNotificationInfrastructure } from "@/lib/notification-infrastructure";

export type NotificationCategory =
  | "approval_requests"
  | "shift_reminders"
  | "hse_alerts"
  | "points_updates"
  | "security"
  | "info";

export type NotificationPreferenceSnapshot = {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  approvalRequestsEnabled: boolean;
  shiftRemindersEnabled: boolean;
  hseAlertsEnabled: boolean;
  pointsUpdatesEnabled: boolean;
};

export type NotificationPreferencePatch = Partial<NotificationPreferenceSnapshot>;

export type PushDispatchInput = {
  employeeId: number;
  category: NotificationCategory;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requirePreference?: boolean;
  notificationEventId?: number;
  metadata?: Record<string, unknown>;
};

type WebPushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type EmployeeNotificationTarget = {
  id: number;
  name: string;
  email: string;
};

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase();
      const isNetworkError =
        err?.code === "ECONNRESET" ||
        err?.code === "53300" ||
        errStr.includes("econnreset") ||
        errStr.includes("connection terminated") ||
        errStr.includes("timeout exceeded") ||
        errStr.includes("trying to connect") ||
        errStr.includes("too many clients") ||
        errStr.includes("sorry, too many clients") ||
        errStr.includes("connection reset") ||
        errStr.includes("remaining connection slots are reserved");
      if (attempt <= retries && isNetworkError) {
        await new Promise((res) => setTimeout(res, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await withDbRetry(fn);
  } catch (err) {
    console.warn(`[push-notifications] Warning in ${label}:`, (err as any)?.message || err);
    return fallback;
  }
}

type PushChannelConfig = typeof notificationChannelSettings.$inferSelect;

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceSnapshot = {
  pushEnabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  approvalRequestsEnabled: true,
  shiftRemindersEnabled: true,
  hseAlertsEnabled: true,
  pointsUpdatesEnabled: true,
};

function getCategoryPreferenceKey(category: NotificationCategory): keyof NotificationPreferenceSnapshot | undefined {
  switch (category) {
    case "approval_requests":
      return "approvalRequestsEnabled";
    case "shift_reminders":
      return "shiftRemindersEnabled";
    case "hse_alerts":
      return "hseAlertsEnabled";
    case "points_updates":
      return "pointsUpdatesEnabled";
    case "security":
    case "info":
      return undefined;
    default:
      return undefined;
  }
}

function buildPushPayload(input: PushDispatchInput) {
  return {
    title: input.title,
    body: input.body,
    tag: input.tag ?? `${input.category}-${input.employeeId}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: input.url ?? "/mobile/notifications",
      category: input.category,
      employeeId: input.employeeId,
      ...input.metadata,
    },
  };
}

function getEnvValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
}

function resolvePushChannelConfig(settings: PushChannelConfig | null) {
  if (!settings) {
    return null;
  }

  const vapidPublicKey =
    settings.vapidPublicKey ||
    getEnvValue("WEB_PUSH_VAPID_PUBLIC_KEY", "VAPID_PUBLIC_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidPrivateKey =
    settings.vapidPrivateKey ||
    getEnvValue("WEB_PUSH_VAPID_PRIVATE_KEY", "VAPID_PRIVATE_KEY");
  const pushSubject =
    settings.pushSubject ||
    getEnvValue("WEB_PUSH_SUBJECT", "VAPID_SUBJECT") ||
    "mailto:noreply@chitraparatama.co.id";

  return {
    ...settings,
    vapidPublicKey,
    vapidPrivateKey,
    pushSubject,
  };
}

async function getEmployeeTargetById(employeeId: number): Promise<EmployeeNotificationTarget | null> {
  const [employee] = await safeQuery(
    () =>
      db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1),
    [],
    "getEmployeeTargetById"
  );

  return employee ?? null;
}

export async function getEmployeeTargetByEmail(email: string) {
  await ensureNotificationInfrastructure();

  const normalizedEmail = email.trim().toLowerCase();

  const [employee] = await safeQuery(
    () =>
      db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees)
        .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
        .limit(1),
    [],
    "getEmployeeTargetByEmail"
  );

  return employee ?? null;
}

export async function getNotificationPreferences(employeeId: number) {
  await ensureNotificationInfrastructure();

  const [preferences] = await safeQuery(
    () =>
      db
        .select()
        .from(notificationUserPreferences)
        .where(eq(notificationUserPreferences.employeeId, employeeId))
        .limit(1),
    [],
    "getNotificationPreferences"
  );

  if (preferences) {
    return preferences;
  }

  const [created] = await safeQuery(
    () =>
      db
        .insert(notificationUserPreferences)
        .values({
          employeeId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        })
        .onConflictDoNothing({
          target: notificationUserPreferences.employeeId,
        })
        .returning(),
    [],
    "createNotificationPreferences"
  );

  if (created) {
    return created;
  }

  return {
    id: 0,
    employeeId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateNotificationPreferences(employeeId: number, patch: NotificationPreferencePatch) {
  await ensureNotificationInfrastructure();
  const existing = await getNotificationPreferences(employeeId);

  const [updated] = await safeQuery(
    () =>
      db
        .update(notificationUserPreferences)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(notificationUserPreferences.id, existing.id))
        .returning(),
    [],
    "updateNotificationPreferences"
  );

  return updated ?? existing;
}

export async function getPushChannelConfig() {
  await ensureNotificationInfrastructure();

  const [settings] = await safeQuery(
    () =>
      db
        .select()
        .from(notificationChannelSettings)
        .where(eq(notificationChannelSettings.channel, "pwa_push"))
        .limit(1),
    [],
    "getPushChannelConfig"
  );

  return resolvePushChannelConfig(settings ?? null);
}

export async function upsertPushSubscription(input: {
  employeeId: number;
  subscription: WebPushSubscriptionInput;
  deviceLabel?: string;
  userAgent?: string;
}) {
  await ensureNotificationInfrastructure();

  const existing = await safeQuery(
    () =>
      db
        .select()
        .from(notificationPushSubscriptions)
        .where(eq(notificationPushSubscriptions.endpoint, input.subscription.endpoint))
        .limit(1),
    [],
    "findPushSubscription"
  );

  if (existing[0]) {
    const [updated] = await safeQuery(
      () =>
        db
          .update(notificationPushSubscriptions)
          .set({
            employeeId: input.employeeId,
            p256dhKey: input.subscription.keys.p256dh,
            authKey: input.subscription.keys.auth,
            deviceLabel: input.deviceLabel?.trim() || "Browser",
            userAgent: input.userAgent?.trim() || "",
            isActive: true,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(notificationPushSubscriptions.id, existing[0].id))
          .returning(),
      [],
      "updatePushSubscription"
    );

    return updated ?? existing[0];
  }

  const [created] = await safeQuery(
    () =>
      db
        .insert(notificationPushSubscriptions)
        .values({
          employeeId: input.employeeId,
          endpoint: input.subscription.endpoint,
          p256dhKey: input.subscription.keys.p256dh,
          authKey: input.subscription.keys.auth,
          deviceLabel: input.deviceLabel?.trim() || "Browser",
          userAgent: input.userAgent?.trim() || "",
          isActive: true,
          lastSeenAt: new Date(),
        })
        .returning(),
    [],
    "insertPushSubscription"
  );

  return created;
}

export async function deactivatePushSubscription(employeeId: number, endpoint: string) {
  await ensureNotificationInfrastructure();

  await safeQuery(
    () =>
      db
        .update(notificationPushSubscriptions)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notificationPushSubscriptions.employeeId, employeeId),
            eq(notificationPushSubscriptions.endpoint, endpoint),
          ),
        ),
    null,
    "deactivatePushSubscription"
  );
}

export async function listPushSubscriptions(employeeId: number) {
  await ensureNotificationInfrastructure();

  return safeQuery(
    () =>
      db
        .select()
        .from(notificationPushSubscriptions)
        .where(
          and(
            eq(notificationPushSubscriptions.employeeId, employeeId),
            eq(notificationPushSubscriptions.isActive, true),
          ),
        )
        .orderBy(desc(notificationPushSubscriptions.updatedAt)),
    [],
    "listPushSubscriptions"
  );
}

export async function createNotificationEventForEmployee(input: {
  employeeId: number;
  eventType: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url?: string;
  submissionId?: number | null;
  inboxItemId?: number | null;
  approvalId?: number | null;
  createdAt?: Date;
}) {
  await ensureNotificationInfrastructure();

  const employee = await getEmployeeTargetById(input.employeeId);
  if (!employee) {
    return null;
  }

  const eventTime = input.createdAt ?? new Date();
  const [event] = await safeQuery(
    () =>
      db
        .insert(notificationEvents)
        .values({
          submissionId: input.submissionId ?? null,
          inboxItemId: input.inboxItemId ?? null,
          approvalId: input.approvalId ?? null,
          channel: "in_app",
          eventType: input.eventType,
          recipient: employee.email,
          payloadSnapshot: JSON.stringify({
            category: input.category,
            title: input.title,
            body: input.body,
            url: input.url ?? "/mobile/notifications",
          }),
          deliveryStatus: "delivered",
          deliveredAt: eventTime,
          createdAt: eventTime,
        })
        .returning(),
    [],
    "insertNotificationEvent"
  );

  if (event?.id) {
    await safeQuery(
      () =>
        db.insert(notificationDeliveries).values({
          notificationEventId: event.id,
          deliveryChannel: "in_app",
          recipient: employee.email,
          status: "delivered",
          sentAt: eventTime,
          createdAt: eventTime,
          updatedAt: eventTime,
        }),
      null,
      "insertNotificationDelivery"
    );
  }

  return event ?? null;
}

export async function sendPushNotification(input: PushDispatchInput) {
  try {
    await ensureNotificationInfrastructure();

    const [employee, settings] = await Promise.all([
      getEmployeeTargetById(input.employeeId),
      getPushChannelConfig(),
    ]);

    if (!employee) {
      return {
        status: "skipped" as const,
        reason: "employee_not_found",
        delivered: 0,
        failed: 0,
      };
    }

    if (!settings?.isEnabled || !settings.vapidPublicKey || !settings.vapidPrivateKey || !settings.pushSubject) {
      return {
        status: "skipped" as const,
        reason: "push_not_configured",
        delivered: 0,
        failed: 0,
      };
    }

    const [preferences, subscriptions] = await Promise.all([
      getNotificationPreferences(input.employeeId),
      listPushSubscriptions(input.employeeId),
    ]);

    if (input.requirePreference !== false) {
      const categoryPreferenceKey = getCategoryPreferenceKey(input.category);
      if (categoryPreferenceKey && (!preferences.pushEnabled || !preferences[categoryPreferenceKey])) {
        return {
          status: "skipped" as const,
          reason: "preference_disabled",
          delivered: 0,
          failed: 0,
        };
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return {
        status: "skipped" as const,
        reason: "no_active_subscription",
        delivered: 0,
        failed: 0,
      };
    }

    webpush.setVapidDetails(settings.pushSubject, settings.vapidPublicKey, settings.vapidPrivateKey);

    const payload = JSON.stringify(buildPushPayload(input));
    let delivered = 0;
    let failed = 0;

    for (const subscriptionRow of subscriptions) {
      const subscription = {
        endpoint: subscriptionRow.endpoint,
        keys: {
          p256dh: subscriptionRow.p256dhKey,
          auth: subscriptionRow.authKey,
        },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        delivered += 1;

        const notificationEventId = input.notificationEventId;
        if (notificationEventId) {
          await safeQuery(
            () =>
              db.insert(notificationDeliveries).values({
                notificationEventId,
                deliveryChannel: "pwa_push",
                recipient: employee.email,
                status: "delivered",
                sentAt: new Date(),
              }),
            null,
            "insertPushDeliveryDelivered"
          );
        }
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;
        const message =
          error instanceof Error ? error.message : "Push notification failed.";

        const notificationEventId = input.notificationEventId;
        if (notificationEventId) {
          await safeQuery(
            () =>
              db.insert(notificationDeliveries).values({
                notificationEventId,
                deliveryChannel: "pwa_push",
                recipient: employee.email,
                status: "failed",
                errorMessage: message,
              }),
            null,
            "insertPushDeliveryFailed"
          );
        }

        if (statusCode === 404 || statusCode === 410) {
          await safeQuery(
            () =>
              db
                .delete(notificationPushSubscriptions)
                .where(eq(notificationPushSubscriptions.id, subscriptionRow.id)),
            null,
            "deleteExpiredSubscription"
          );
        }
      }
    }

    return {
      status: delivered > 0 ? ("sent" as const) : ("skipped" as const),
      reason: delivered > 0 ? undefined : "delivery_failed",
      delivered,
      failed,
    };
  } catch (err) {
    console.warn("[sendPushNotification] Safe catch error:", err);
    return {
      status: "skipped" as const,
      reason: "error",
      delivered: 0,
      failed: 1,
    };
  }
}
