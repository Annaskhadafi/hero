export interface LoginPageSettingsData {
  id?: number;
  heroTitle: string;
  heroSubtitle: string;
  heroEyebrow: string;
  bannerImageUrl: string;
  bannerOverlayColor: string;
  logoUrl: string;
  formEyebrow: string;
  formTitle: string;
  formDescription: string;
  pageBackgroundType: string;
  pageBackgroundColor: string;
  pageBackgroundImageUrl: string | null;
  footerCopyright: string;
  footerTagline: string;
  helpText: string;
  helpDetails: string;
  featuresJson: Array<{ icon: string; title: string; description: string }>;
}

export const DEFAULT_LOGIN_PAGE_SETTINGS: LoginPageSettingsData = {
  heroTitle: "Kerja hebat,\ndimulai di sini.",
  heroSubtitle: "Satu tempat untuk aktivitas, pelaporan,\ndan operasional Anda.",
  heroEyebrow: "PT CHITRA PARATAMA",
  bannerImageUrl: "/Hero%20Logo/bg%20hero.png",
  bannerOverlayColor: "#0860ee",
  logoUrl: "/logo-hero.png?v=hero-cat-20261012",
  formEyebrow: "AKUN KARYAWAN",
  formTitle: "Selamat datang kembali",
  formDescription: "Masuk ke HERO dengan akun kerja Anda.",
  pageBackgroundType: "default",
  pageBackgroundColor: "#edf7ff",
  pageBackgroundImageUrl: "",
  footerCopyright: "PT Chitra Paratama",
  footerTagline: "Hub for Employee Reporting & Operations",
  helpText: "Butuh bantuan?",
  helpDetails:
    "Gunakan email atau SN karyawan yang terdaftar. Untuk pemulihan kata sandi, pilih “Lupa kata sandi?”. Jika akun belum tersedia atau dinonaktifkan, hubungi tim HR atau admin HERO.",
  featuresJson: [
    { icon: "CalendarDays", title: "Presensi", description: "Catat setiap kehadiran Anda." },
    { icon: "FileText", title: "Pelaporan", description: "Setiap prestasi dihargai." },
    { icon: "Settings", title: "Operasional", description: "Dukung keputusan berbasis data." },
  ],
};
