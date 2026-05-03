"use client";

import { useActionState, useState, type FormEvent } from "react";
import { KeyRound, PencilLine } from "lucide-react";

import {
  updateMobileProfileAction,
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

export function MobileProfileSettings({ profile }: MobileProfileSettingsProps) {
  const [profileState, profileAction, isProfilePending] = useActionState(
    updateMobileProfileAction,
    initialState,
  );
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordPending, setIsPasswordPending] = useState(false);

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
    <section className="grid grid-cols-2 gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black uppercase text-[#003461] shadow-[0_12px_28px_rgba(8,32,51,0.08)] active:scale-[0.98]"
          >
            <PencilLine className="size-4" />
            Edit Profile
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
                value={profile.email}
                disabled
                className="min-h-12 bg-[#e6f6ff]"
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
    </section>
  );
}
