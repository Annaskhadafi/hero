"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Send, Smartphone } from "lucide-react";
import {
  savePwaPushSettingsAction,
  testPwaPushSettingsAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PwaPushSettings = {
  isEnabled: boolean;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  pushSubject: string;
  serviceWorkerPath: string;
};

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <Label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </Label>
  );
}

function InlineAlert({
  state,
  successIcon,
}: {
  state: EmailSettingsActionState;
  successIcon: React.ReactNode;
}) {
  if (state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <span className="mt-0.5">
        {isError ? <AlertCircle className="size-4" /> : successIcon}
      </span>
      <p>{state.message}</p>
    </div>
  );
}

export function PwaPushSettingsPanel({
  settings,
}: {
  settings: PwaPushSettings;
}) {
  const router = useRouter();
  const [saveState, saveFormAction, isSaving] = useActionState(
    savePwaPushSettingsAction,
    INITIAL_STATE,
  );
  const [testState, testFormAction, isTesting] = useActionState(
    testPwaPushSettingsAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (saveState.status === "success") {
      router.refresh();
    }
  }, [router, saveState.status]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_420px]">
      <Card className="rounded-lg p-4 shadow-sm">
        <form action={saveFormAction} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">PWA Push Settings</h2>
              <p className="text-sm text-muted-foreground">
                Simpan VAPID key dan service worker yang dipakai browser untuk web push.
              </p>
            </div>
            <Badge className="rounded-full border-0 bg-tertiary-container text-on-tertiary-container">
              {settings.isEnabled ? "PWA Push aktif" : "PWA Push nonaktif"}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="VAPID Public Key">
              <Textarea
                name="vapidPublicKey"
                rows={3}
                defaultValue={settings.vapidPublicKey}
                placeholder="Masukkan VAPID public key"
              />
            </Field>
            <Field label="VAPID Private Key">
              <Textarea
                name="vapidPrivateKey"
                rows={3}
                defaultValue={settings.vapidPrivateKey}
                placeholder="Masukkan VAPID private key"
              />
            </Field>
            <Field
              label="Push Subject"
              hint="Gunakan format mailto:alamat@email.com sesuai standar web push."
            >
              <Input
                name="pushSubject"
                defaultValue={settings.pushSubject}
                placeholder="mailto:noreply@contoh.com"
              />
            </Field>
            <Field label="Service Worker">
              <Input
                name="serviceWorkerPath"
                defaultValue={settings.serviceWorkerPath}
                placeholder="/sw.js"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSaving || isTesting}
              className="rounded-lg bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
            >
              <Smartphone className="size-4" />
              {isSaving ? "Menyimpan..." : "Simpan Push"}
            </Button>
            <Button
              type="submit"
              formAction={testFormAction}
              disabled={isSaving || isTesting}
              variant="outline"
              className="rounded-lg"
            >
              <Send className="size-4" />
              {isTesting ? "Mengecek..." : "Test Push"}
            </Button>
          </div>

          <InlineAlert state={saveState} successIcon={<CheckCircle2 className="size-4" />} />
          <InlineAlert state={testState} successIcon={<Send className="size-4" />} />
        </form>
      </Card>

      <Card className="rounded-lg p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Checklist Integrasi</h2>
        <div className="mt-4 space-y-4">
          {[
            ["Channel", "pwa_push"],
            ["Push subject", settings.pushSubject || "Belum diisi"],
            ["Service worker", settings.serviceWorkerPath || "/sw.js"],
            ["VAPID public", settings.vapidPublicKey ? "Tersimpan" : "Belum diisi"],
            ["VAPID private", settings.vapidPrivateKey ? "Tersimpan" : "Belum diisi"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="max-w-[220px] truncate text-right text-sm font-semibold">
                {value}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
