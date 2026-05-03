import { createNotificationEventForEmployee } from "@/lib/push-notifications";

export async function notifyPasswordReset(params: {
  employeeId: number;
  employeeName: string;
  resetByName: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    title: "Password Direset",
    body: `Password Anda telah direset oleh ${params.resetByName}. Silakan login dengan password baru.`,
    category: "security",
    priority: "high",
    actionUrl: "/auth/login",
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
    title: "Peran Akses Diubah",
    body: `Peran akses Anda diubah dari ${params.oldRole} ke ${params.newRole} oleh ${params.changedByName}.`,
    category: "security",
    priority: "high",
    actionUrl: "/dashboard",
  });
}

export async function notifyAccountBanned(params: {
  employeeId: number;
  employeeName: string;
  bannedByName: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    title: "Akun Dinonaktifkan",
    body: `Akun Anda telah dinonaktifkan oleh ${params.bannedByName}. Hubungi admin untuk informasi lebih lanjut.`,
    category: "security",
    priority: "critical",
    actionUrl: "/",
  });
}

export async function notifyUserInvitation(params: {
  employeeId: number;
  employeeName: string;
  invitationUrl: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    title: "Undangan Akun HERO",
    body: `Selamat datang ${params.inviteName}! Klik untuk mengatur password dan mengaktifkan akun Anda.`,
    category: "info",
    priority: "high",
    actionUrl: params.invitationUrl,
  });
}

export async function notifyEmailVerification(params: {
  employeeId: number;
  employeeName: string;
  verificationUrl: string;
}) {
  await createNotificationEventForEmployee({
    employeeId: params.employeeId,
    title: "Verifikasi Email",
    body: "Silakan verifikasi email Anda untuk mengaktifkan semua fitur akun.",
    category: "info",
    priority: "normal",
    actionUrl: params.verificationUrl,
  });
}
