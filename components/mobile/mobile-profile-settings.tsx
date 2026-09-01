"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Mail, PencilLine, PenTool, X } from "lucide-react";

import {
  updateMobileProfileAction,
  updateMobileEmailAction,
  type MobileProfileActionState,
} from "@/app/mobile/profile/actions";
import { ProfilePhotoField } from "@/components/profile-photo-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { MobileSignaturePadDialog } from "@/components/mobile/mobile-signature-pad-dialog";

type MobileProfileSettingsProps = {
  profile: {
    name: string;
    email: string;
    phoneNumber: string;
    domicile: string;
    birthPlaceDate: string;
    profileImage: string;
  };
};

const initialState: MobileProfileActionState = {
  ok: false,
  message: "",
};

export function MobileProfileSettings({ profile, showEmailPrompt }: MobileProfileSettingsProps & { showEmailPrompt?: boolean }) {
  const [profileState, profileAction, isProfilePending] = useActionState(
    updateMobileProfileAction,
    initialState,
  );
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDismissed, setEmailDismissed] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailState, setEmailState] = useState<MobileProfileActionState>({ ok: false, message: '' });
  const [emailPending, setEmailPending] = useState(false);

  useEffect(() => {
    if (showEmailPrompt && !emailDismissed) setEmailOpen(true)
  }, [showEmailPrompt, emailDismissed])

  async function handleEmailSave() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailState({ ok: false, message: 'Format email tidak valid.' })
      return
    }
    setEmailPending(true)
    const fd = new FormData()
    fd.set('email', emailValue)
    const res = await updateMobileEmailAction({ ok: false, message: '' }, fd)
    setEmailState(res)
    setEmailPending(false)
    if (res.ok) {
      setTimeout(() => { setEmailOpen(false); setEmailDismissed(true) }, 1500)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password belum sama.");
      return;
    }

    setIsPasswordPending(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setPasswordError(result.error.message || "Password gagal diubah.");
        return;
      }

      event.currentTarget.reset();
      setPasswordMessage("Password tersimpan.");
    } catch {
      setPasswordError("Password gagal diubah.");
    } finally {
      setIsPasswordPending(false);
    }
  }

  return (
    <section className="grid grid-cols-3 gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-white px-2 text-[11px] font-black uppercase text-[#003461] shadow-[0_12px_28px_rgba(8,32,51,0.08)] active:scale-[0.98]"
          >
            <PencilLine className="size-3.5 shrink-0" />
            Profile
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg bg-white p-5">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Perbarui data kontak dan identitas dasar.</DialogDescription>
          </DialogHeader>

          <form action={profileAction} className="space-y-4">
            <ProfilePhotoField
              initialValue={profile.profileImage}
              fallbackName={profile.name}
              label="Foto Profile"
            />


            <div className="grid gap-2">
              <Label htmlFor="mobile-profile-name">Name</Label>
              <Input
                id="mobile-profile-name"
                name="name"
                defaultValue={profile.name}
                required
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-profile-email">Email</Label>
              <Input
                id="mobile-profile-email"
                name="email"
                defaultValue={profile.email}
                placeholder="nama@email.com"
                className="min-h-12 bg-white border border-gray-200"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-profile-phone">Nomor HP</Label>
              <Input
                id="mobile-profile-phone"
                name="phoneNumber"
                defaultValue={profile.phoneNumber}
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-profile-domicile">Domisili</Label>
              <Input
                id="mobile-profile-domicile"
                name="domicile"
                defaultValue={profile.domicile}
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-profile-birth">Tanggal Lahir</Label>
              <Input
                id="mobile-profile-birth"
                name="birthPlaceDate"
                type="date"
                defaultValue={profile.birthPlaceDate}
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            {profileState.message ? (
              <p
                className={
                  profileState.ok
                    ? "rounded-lg bg-[#dff2e8] px-3 py-2 text-xs font-bold text-[#0f5132]"
                    : "rounded-lg bg-[#f4ddce] px-3 py-2 text-xs font-bold text-[#5a2200]"
                }
              >
                {profileState.message}
              </p>
            ) : null}

            <Button type="submit" disabled={isProfilePending} className="min-h-12 w-full rounded-lg">
              {isProfilePending ? "Menyimpan..." : "Simpan Profile"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#e6f6ff] px-3 text-[11px] font-black uppercase text-[#003461] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.06)] active:scale-[0.98]"
          >
            <KeyRound className="size-4" />
            Password
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg bg-white p-5">
          <DialogHeader>
            <DialogTitle>Edit Password</DialogTitle>
            <DialogDescription>Gunakan password aktif untuk konfirmasi.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="mobile-current-password">Password Lama</Label>
              <Input
                id="mobile-current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-new-password">Password Baru</Label>
              <Input
                id="mobile-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-confirm-password">Konfirmasi Password</Label>
              <Input
                id="mobile-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="min-h-12 bg-[#e6f6ff]"
              />
            </div>

            {passwordError || passwordMessage ? (
              <p
                className={
                  passwordError
                    ? "rounded-lg bg-[#f4ddce] px-3 py-2 text-xs font-bold text-[#5a2200]"
                    : "rounded-lg bg-[#dff2e8] px-3 py-2 text-xs font-bold text-[#0f5132]"
                }
              >
                {passwordError || passwordMessage}
              </p>
            ) : null}

            <Button type="submit" disabled={isPasswordPending} className="min-h-12 w-full rounded-lg">
              {isPasswordPending ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <button
        type="button"
        onClick={() => setSignatureOpen(true)}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-[#eef2ff] px-2 text-[11px] font-black uppercase text-[#3730a3] shadow-[inset_0_0_0_1px_rgba(79,70,229,0.12)] active:scale-[0.98]"
      >
        <PenTool className="size-3.5 shrink-0" />
        TTD Digital
      </button>

      <MobileSignaturePadDialog
        isOpen={signatureOpen}
        onClose={() => setSignatureOpen(false)}
      />

      {emailOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={() => { setEmailOpen(false); setEmailDismissed(true) }}>

          <div className="w-full max-w-[430px] mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Update Email</h2>
                <button onClick={() => { setEmailOpen(false); setEmailDismissed(true) }} className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white">
                  <X className="size-4 text-gray-400" />
                </button>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Email Default Terdeteksi</p>
                    <p className="text-xs text-amber-800 mt-1">
                      Email Anda saat ini (<strong>{profile.email}</strong>) masih menggunakan format default.
                      Segera ganti dengan email pribadi Anda agar notifikasi dan informasi penting dapat diterima.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Email Baru</label>
                  <input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="nama@email.com"
                    className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                {emailState.message ? (
                  <p className={emailState.ok ? 'text-xs font-medium text-emerald-600' : 'text-xs font-medium text-orange-600'}>
                    {emailState.message}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmailOpen(false); setEmailDismissed(true) }}
                    className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700"
                  >
                    Nanti
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEmailSave()}
                    disabled={emailPending || !emailValue.trim()}
                    className="flex-1 h-11 rounded-xl bg-blue-600 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {emailPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
