"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  ShieldAlert,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type NotificationPreferences = {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  approvalRequestsEnabled: boolean;
  shiftRemindersEnabled: boolean;
  hseAlertsEnabled: boolean;
  pointsUpdatesEnabled: boolean;
};

type NotificationRow = {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  eventType: string | null;
  deliveryStatus: string | null;
  payloadSnapshot: string | null;
  createdAt: string;
  sentAt: string | null;
  errorMessage: string | null;
};

type NotificationApiPayload = {
  notifications: NotificationRow[];
  preferences: NotificationPreferences | null;
  pushPublicKey: string;
  pushConfigured: boolean;
  activeSubscriptions: number;
};

const categoryCards = [
  {
    key: "approvalRequestsEnabled",
    label: "Approval requests",
    description: "Push saat request baru atau reminder SLA masuk.",
    category: "approval_requests",
    icon: BellRing,
  },
  {
    key: "shiftRemindersEnabled",
    label: "Shift reminders",
    description: "Pengingat masuk shift dan attendance.",
    category: "shift_reminders",
    icon: BriefcaseBusiness,
  },
  {
    key: "hseAlertsEnabled",
    label: "HSE alerts",
    description: "Alert observasi/incident site yang perlu perhatian.",
    category: "hse_alerts",
    icon: ShieldAlert,
  },
  {
    key: "pointsUpdatesEnabled",
    label: "Points updates",
    description: "Perubahan poin, streak, dan leaderboard HERO.",
    category: "points_updates",
    icon: Sparkles,
  },
] as const;

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsePayloadPreview(raw?: string | null) {
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as { body?: string; title?: string };
    return parsed.body || parsed.title || raw;
  } catch {
    return raw;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function MobileNotificationsCenter({
  initialData,
}: {
  initialData: NotificationApiPayload;
}) {
  const [data, setData] = useState(initialData);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window === "undefined" || typeof Notification === "undefined"
      ? "default"
      : Notification.permission,
  );
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const refreshData = useEffectEvent(async () => {
    const response = await fetch("/api/mobile/notifications", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const next = (await response.json()) as NotificationApiPayload;
    startTransition(() => setData(next));
  });

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }

    const interval = window.setInterval(() => {
      void refreshData();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [refreshData]);

  async function updatePreferences(patch: Partial<NotificationPreferences>) {
    setIsBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/mobile/notifications/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Gagal menyimpan preferensi.");
      }

      const payload = (await response.json()) as { preferences: NotificationPreferences };
      startTransition(() =>
        setData((current) => ({
          ...current,
          preferences: payload.preferences,
        })),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal menyimpan preferensi.");
    } finally {
      setIsBusy(false);
    }
  }

  async function enablePush() {
    if (typeof Notification === "undefined") {
      setFeedback("Browser ini belum mendukung Notification API.");
      return;
    }

    if (!data.pushConfigured || !data.pushPublicKey) {
      setFeedback("VAPID push belum diisi admin. Lengkapi PWA Push Settings dulu.");
      return;
    }

    setIsBusy(true);
    setFeedback("");

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setFeedback("Izin notifikasi belum diberikan browser.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.pushPublicKey),
        }));

      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscribe",
          subscription: subscription.toJSON(),
          deviceLabel: navigator.platform || "Browser",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Gagal menyimpan subscription.");
      }

      await updatePreferences({ pushEnabled: true });
      await refreshData();
      setFeedback("Push notifications aktif di device ini.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal mengaktifkan push.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disablePush() {
    setIsBusy(true);
    setFeedback("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "unsubscribe",
            subscription: subscription.toJSON(),
          }),
        });

        await subscription.unsubscribe();
      }

      await updatePreferences({ pushEnabled: false });
      await refreshData();
      setFeedback("Push notifications dimatikan untuk device ini.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal mematikan push.");
    } finally {
      setIsBusy(false);
    }
  }

  async function sendTestPush(category: (typeof categoryCards)[number]["category"]) {
    setIsBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Test push gagal.");
      }

      setFeedback("Test push terkirim.");
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Test push gagal.");
    } finally {
      setIsBusy(false);
    }
  }

  const preferences = data.preferences;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Signal Queue</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Notifications</h1>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="border-0 bg-white/16 text-white">
              <Smartphone className="mr-1 size-3" />
              Web Push
            </Badge>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {data.pushConfigured ? "Realtime alerts ready" : "Push config pending"}
            </p>
            <p className="mt-2 max-w-[18rem] text-sm font-medium leading-6 text-[#d9ebf8]">
              Approval, shift, HSE, dan points update bisa dikirim ke device aktif.
            </p>
          </div>
          <div className="rounded-[1.2rem] bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b9dff6]">Devices</p>
            <p className="mt-2 text-3xl font-black leading-none">{data.activeSubscriptions}</p>
            <p className="mt-2 text-[11px] font-semibold text-[#d9ebf8]">Permission: {permission}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={isBusy || !data.pushConfigured}
            onClick={() => void enablePush()}
            className="min-h-12 rounded-2xl bg-white text-[#003f78] hover:bg-white/90"
          >
            Enable push
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => void disablePush()}
            variant="outline"
            className="min-h-12 rounded-2xl border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            Disable push
          </Button>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-[1.1rem] bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#003f78]">
          {feedback}
        </div>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Preferences</p>
          <h2 className="mt-1 text-lg font-black text-[#082033]">Kategori alert per user</h2>
        </div>

        {preferences ? (
          <>
            <article className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#082033]">Push notifications</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#5d7485]">
                    Kirim alert ke browser/mobile yang sudah subscribe.
                  </p>
                </div>
                <Switch
                  checked={preferences.pushEnabled}
                  disabled={isBusy}
                  onCheckedChange={(checked) => void updatePreferences({ pushEnabled: checked })}
                />
              </div>
            </article>

            {categoryCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.key}
                  className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-[#082033]">{item.label}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[#5d7485]">{item.description}</p>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void sendTestPush(item.category)}
                          className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#003f78]"
                        >
                          Send test
                        </button>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[item.key]}
                      disabled={isBusy}
                      onCheckedChange={(checked) => {
                        const patch = {
                          [item.key]: checked,
                        } as Partial<NotificationPreferences>;
                        void updatePreferences(patch);
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </>
        ) : (
          <div className="rounded-[1.2rem] bg-white p-5 text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Employee profile belum tersedia. Preference belum bisa dipakai.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Recent Alerts</p>
        {data.notifications.map((item) => (
          <article
            key={item.id}
            className="flex items-center gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#082033]">
                {(item.eventType ?? item.channel).replaceAll("_", " ")}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#5d7485]">
                {parsePayloadPreview(item.payloadSnapshot) || item.errorMessage || `${item.channel} ${item.status}`}
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#5d7485]">
                {formatDate(item.sentAt ?? item.createdAt)}
              </p>
            </div>
          </article>
        ))}
        {data.notifications.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada notifikasi untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
