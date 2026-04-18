"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Mail, Send, Server } from "lucide-react";
import {
  sendEmailTestAction,
  saveEmailSmtpSettingsAction,
  type EmailSettingsActionState,
} from "@/app/dashboard/settings/email/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SmtpSettings = {
  host: string;
  port: number;
  encryption: string;
  username: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  retryLimit: number;
  timeoutSeconds: number;
  queueEnabled: boolean;
  auditEnabled: boolean;
  hasPassword: boolean;
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

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

export function EmailSmtpSettingsPanel({
  smtpSettings,
  currentUserEmail,
}: {
  smtpSettings: SmtpSettings;
  currentUserEmail?: string | null;
}) {
  const router = useRouter();
  const [saveState, saveFormAction, isSaving] = useActionState(
    saveEmailSmtpSettingsAction,
    INITIAL_STATE,
  );
  const [testState, testFormAction, isTesting] = useActionState(
    sendEmailTestAction,
    INITIAL_STATE,
  );

  useEffect(() => {
    if (saveState.status === "success" || testState.status === "success") {
      router.refresh();
    }
  }, [router, saveState.status, testState.status]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Card className="rounded-lg p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">SMTP Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Pengiriman test email akan memakai nilai form saat ini, jadi Anda bisa coba dulu
              sebelum menyimpan permanen.
            </p>
          </div>
          <Badge className="rounded-full border-0 bg-primary/10 text-primary">
            {smtpSettings.hasPassword ? "Password tersimpan" : "Butuh password"}
          </Badge>
        </div>

        <form action={saveFormAction} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Host SMTP">
              <Input name="smtpHost" defaultValue={smtpSettings.host} />
            </Field>
            <Field label="Port">
              <Input name="smtpPort" type="number" defaultValue={smtpSettings.port} />
            </Field>
            <Field label="Encryption" hint="Contoh: tls, ssl, atau none.">
              <Input name="smtpEncryption" defaultValue={smtpSettings.encryption} />
            </Field>
            <Field label="Username SMTP">
              <Input name="smtpUser" defaultValue={smtpSettings.username} />
            </Field>
            <Field
              label="Password"
              hint={
                smtpSettings.hasPassword
                  ? "Kosongkan untuk mempertahankan password yang tersimpan."
                  : "Isi password SMTP untuk mulai mengirim email."
              }
            >
              <Input name="smtpPassword" type="password" placeholder="••••••••••••" />
            </Field>
            <Field label="From Email">
              <Input name="fromEmail" defaultValue={smtpSettings.fromEmail} />
            </Field>
            <Field label="From Name">
              <Input name="fromName" defaultValue={smtpSettings.fromName} />
            </Field>
            <Field label="Reply-To Email" hint="Opsional. Kosongkan bila tidak digunakan.">
              <Input name="replyToEmail" defaultValue={smtpSettings.replyToEmail} />
            </Field>
            <Field
              label="Penerima Test Email"
              hint={
                currentUserEmail
                  ? `Kosongkan untuk memakai email login Anda: ${currentUserEmail}`
                  : "Isi email tujuan test bila akun login tidak punya alamat email."
              }
            >
              <Input
                name="testRecipient"
                type="email"
                defaultValue={currentUserEmail ?? ""}
                placeholder="email.tujuan@contoh.com"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={isSaving || isTesting}
              className="rounded-lg bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary-container)_100%)]"
            >
              <Server className="size-4" />
              {isSaving ? "Menyimpan..." : "Simpan SMTP"}
            </Button>
            <Button
              type="submit"
              formAction={testFormAction}
              disabled={isSaving || isTesting}
              variant="outline"
              className="rounded-lg"
            >
              <Send className="size-4" />
              {isTesting ? "Mengirim..." : "Kirim Test Email"}
            </Button>
          </div>

          <InlineAlert state={saveState} successIcon={<CheckCircle2 className="size-4" />} />
          <InlineAlert state={testState} successIcon={<Mail className="size-4" />} />
        </form>
      </Card>

      <Card className="rounded-lg p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Delivery Policy</h2>
        <div className="mt-4 space-y-4">
          {[
            ["Retry gagal", `${smtpSettings.retryLimit} percobaan`],
            ["Timeout SMTP", `${smtpSettings.timeoutSeconds} detik`],
            ["Queue worker", smtpSettings.queueEnabled ? "Aktif" : "Nonaktif"],
            ["Audit log", smtpSettings.auditEnabled ? "Wajib" : "Nonaktif"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

