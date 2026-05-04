import { createNotificationEventForEmployee } from "@/lib/push-notifications";

export async function notifyPasswordReset(params: {
  employeeId: number;
  employeeName: string;
  resetByName: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    eventType: "password_reset",
    title: "Password Direset",
    body: `Password Anda telah direset oleh ${params.resetByName}. Silakan login dengan password baru.`,
    category: "security",
    url: "/auth/login",
  });
}

export async function notifyRoleChanged(params: {
  employeeId: number;
  employeeName: string;
  oldRole: string;
  newRole: string;
  changedByName: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    eventType: "role_changed",
    title: "Peran Akses Diubah",
    body: `Peran akses Anda diubah dari ${params.oldRole} ke ${params.newRole} oleh ${params.changedByName}.`,
    category: "security",
    url: "/dashboard",
  });
}

export async function notifyAccountBanned(params: {
  employeeId: number;
  employeeName: string;
  bannedByName: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    eventType: "account_banned",
    title: "Akun Dinonaktifkan",
    body: `Akun Anda telah dinonaktifkan oleh ${params.bannedByName}. Hubungi admin untuk informasi lebih lanjut.`,
    category: "security",
    url: "/",
  });
}

export async function notifyUserInvitation(params: {
  employeeId: number;
  employeeName: string;
  invitationUrl: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    eventType: "user_invitation",
    title: "Undangan Akun HERO",
    body: `Selamat datang ${params.employeeName}! Klik untuk mengatur password dan mengaktifkan akun Anda.`,
    category: "info",
    url: params.invitationUrl,
  });
}

export async function notifyEmailVerification(params: {
  employeeId: number;
  employeeName: string;
  verificationUrl: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    eventType: "email_verification",
    title: "Verifikasi Email",
    body: "Silakan verifikasi email Anda untuk mengaktifkan semua fitur akun.",
    category: "info",
    url: params.verificationUrl,
  });
}
