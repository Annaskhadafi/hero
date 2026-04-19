import { sql } from "drizzle-orm";

import { db } from "@/db";

let notificationInfrastructurePromise: Promise<void> | null = null;

export async function ensureNotificationInfrastructure() {
  if (notificationInfrastructurePromise) {
    return notificationInfrastructurePromise;
  }

  notificationInfrastructurePromise = (async () => {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('hero_notification_infrastructure'));`);

      await tx.execute(sql`
        create table if not exists hero_notification_channel_settings (
          id serial primary key,
          channel text not null unique,
          is_enabled boolean not null default true,
          realtime_badge boolean not null default true,
          sound_enabled boolean not null default false,
          auto_mark_read boolean not null default true,
          vapid_public_key text not null default '',
          vapid_private_key text not null default '',
          push_subject text not null default '',
          service_worker_path text not null default '/sw.js',
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        create table if not exists hero_notification_events (
          id serial primary key,
          submission_id integer references hero_form_submissions(id) on delete cascade,
          inbox_item_id integer references hero_inbox_items(id) on delete cascade,
          approval_id integer references hero_approvals(id) on delete set null,
          channel text not null default 'email',
          event_type text not null,
          recipient text not null,
          payload_snapshot text not null default '',
          delivery_status text not null default 'queued',
          delivered_at timestamp,
          created_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        create table if not exists hero_notification_deliveries (
          id serial primary key,
          notification_event_id integer not null references hero_notification_events(id) on delete cascade,
          delivery_channel text not null default 'in_app',
          recipient text not null,
          status text not null default 'queued',
          sent_at timestamp,
          error_message text,
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        create table if not exists hero_reminder_jobs (
          id serial primary key,
          inbox_item_id integer not null references hero_inbox_items(id) on delete cascade,
          reminder_type text not null default 'before_due',
          reminder_at timestamp not null,
          status text not null default 'scheduled',
          execution_log text not null default '',
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        create table if not exists hero_notification_user_preferences (
          id serial primary key,
          employee_id integer not null unique references hero_employees(id) on delete cascade,
          push_enabled boolean not null default true,
          in_app_enabled boolean not null default true,
          email_enabled boolean not null default true,
          approval_requests_enabled boolean not null default true,
          shift_reminders_enabled boolean not null default true,
          hse_alerts_enabled boolean not null default true,
          points_updates_enabled boolean not null default true,
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        create table if not exists hero_notification_push_subscriptions (
          id serial primary key,
          employee_id integer not null references hero_employees(id) on delete cascade,
          endpoint text not null unique,
          p256dh_key text not null,
          auth_key text not null,
          device_label text not null default 'Browser',
          user_agent text not null default '',
          is_active boolean not null default true,
          last_seen_at timestamp not null default now(),
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);

      await tx.execute(sql`
        insert into hero_notification_channel_settings (
          channel,
          is_enabled,
          realtime_badge,
          sound_enabled,
          auto_mark_read,
          vapid_public_key,
          vapid_private_key,
          push_subject,
          service_worker_path
        )
        values
          ('bell', true, true, true, true, '', '', '', '/sw.js'),
          ('pwa_push', true, false, false, false, '', '', 'mailto:noreply@chitraparatama.co.id', '/sw.js')
        on conflict (channel) do nothing;
      `);
    });
  })().catch((error) => {
    notificationInfrastructurePromise = null;
    throw error;
  });

  return notificationInfrastructurePromise;
}
