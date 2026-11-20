import { redirect } from "next/navigation";
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from "@/lib/hero-access";
import { getServerSession } from "@/lib/auth-session";
import { getLoginPageSettings } from "./actions";
import { LoginPageCustomizerClient } from "@/components/settings/login-page-customizer-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengaturan Halaman Login | HERO",
  description: "Kelola gambar banner, logo, teks headline, formulir masuk, dan tampilan login HERO",
};

export default async function LoginPageSettingsPage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard/settings/login-page");
  }

  const roleName = await getCurrentEmployeeAccessRole();
  const isSuperAdmin = isSuperAdminRole(roleName);

  if (!isSuperAdmin) {
    const perm = await getCurrentMenuPermission("settings_login_page");
    const navPerm = await getCurrentMenuPermission("settings_navbar");
    if (!perm.canView && !navPerm.canView) {
      redirect("/dashboard");
    }
  }

  const settings = await getLoginPageSettings();

  return <LoginPageCustomizerClient initialSettings={settings} />;
}
