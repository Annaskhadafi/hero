import { db } from "@/db";
import { notificationDeliveries, notificationEvents } from "@/db/schema/hero";
import {
  getEmployeeTargetByEmail,
  sendPushNotification,
  type NotificationCategory,
} from "@/lib/push-notifications";

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeEmail).filter(Boolean)));
}

export async function notifyWorkflowBellRecipients(input: {
  recipientEmails: Array<string | null | undefined>;
  eventType: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
  tagPrefix?: string;
  metadata?: Record<string, unknown>;
}) {
  const recipientEmails = uniqueEmails(input.recipientEmails);
  if (recipientEmails.length === 0) {
    return { count: 0 };
  }

  let count = 0;

  for (const recipientEmail of recipientEmails) {
    const eventTime = new Date();
    const [event] = await db
      .insert(notificationEvents)
      .values({
        channel: "in_app",
        eventType: input.eventType,
        recipient: recipientEmail,
        payloadSnapshot: JSON.stringify({
          category: input.category,
          title: input.title,
          body: input.body,
          url: input.url,
        }),
        deliveryStatus: "delivered",
        deliveredAt: eventTime,
        createdAt: eventTime,
      })
      .returning({ id: notificationEvents.id });

    await db.insert(notificationDeliveries).values({
      notificationEventId: event.id,
      deliveryChannel: "in_app",
      recipient: recipientEmail,
      status: "delivered",
      sentAt: eventTime,
      createdAt: eventTime,
      updatedAt: eventTime,
    });

    const employee = await getEmployeeTargetByEmail(recipientEmail);
    if (employee) {
      try {
        await sendPushNotification({
          employeeId: employee.id,
          category: input.category,
          title: input.title,
          body: input.body,
          url: input.url,
          tag: `${input.tagPrefix ?? input.eventType}-${employee.id}`,
          notificationEventId: event.id,
          metadata: input.metadata,
        });
      } catch (error) {
        console.error("Failed to dispatch workflow push notification", error);
      }
    }

    count += 1;
  }

  return { count };
}
