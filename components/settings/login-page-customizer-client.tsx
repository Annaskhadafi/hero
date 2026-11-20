"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ExternalLink,
  Eye,
  ImageIcon,
  Layout,
  Loader2,
  LockKeyhole,
  Mail,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Smartphone,
  Sparkles,
  Type,
  CalendarDays,
  FileText,
  Settings,
  ShieldCheck,
  Clock,
  Award,
  CheckCircle2,
  Users,
  BarChart3,
  Flame,
  Target,
  Zap,
  Briefcase,
  Headphones,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HeroConfirmDialog,
  HeroFileUpload,
  HeroFormField,
  HeroInput,
  HeroKpiCard,
  HeroSearchableSelect,
  HeroTextarea,
} from "@/components/templates";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import {
  DEFAULT_LOGIN_PAGE_SETTINGS,
  type LoginPageSettingsData,
} from "@/app/dashboard/settings/login-page/types";
import {
  resetLoginPageSettingsAction,
  updateLoginPageSettingsAction,
} from "@/app/dashboard/settings/login-page/actions";

const ICON_OPTIONS = [
  { value: "CalendarDays", label: "Kalender (CalendarDays)" },
  { value: "FileText", label: "Dokumen (FileText)" },
  { value: "Settings", label: "Pengaturan (Settings)" },
  { value: "ShieldCheck", label: "Keamanan (ShieldCheck)" },
  { value: "Clock", label: "Waktu / Jam (Clock)" },
  { value: "Sparkles", label: "Kilau / AI (Sparkles)" },
  { value: "Award", label: "Prestasi / Award" },
  { value: "CheckCircle2", label: "Centang (CheckCircle2)" },
  { value: "Users", label: "Pengguna / Tim (Users)" },
  { value: "BarChart3", label: "Grafik (BarChart3)" },
  { value: "Flame", label: "Semangat (Flame)" },
  { value: "Target", label: "Target Operasional" },
  { value: "Zap", label: "Kilat / Cepat (Zap)" },
  { value: "Briefcase", label: "Karier / Pekerjaan" },
];

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  CalendarDays,
  FileText,
  Settings,
  ShieldCheck,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  Users,
  BarChart3,
  Flame,
  Target,
  Zap,
  Briefcase,
};

const BACKGROUND_TYPE_OPTIONS = [
  { value: "default", label: "Default HERO (Gradien Biru Dinamis)" },
  { value: "solid", label: "Warna Polos (Solid Color)" },
  { value: "gradient", label: "Gradien Kustom (CSS Gradient)" },
  { value: "image", label: "Gambar Kustom Penuh (Full Background Image)" },
];

export function LoginPageCustomizerClient({
  initialSettings,
}: {
  initialSettings: LoginPageSettingsData;
}) {
  const [formData, setFormData] = React.useState<LoginPageSettingsData>(initialSettings);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = React.useState("banner");

  const handleChange = <K extends keyof LoginPageSettingsData>(
    field: K,
    value: LoginPageSettingsData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (index: number, key: "icon" | "title" | "description", val: string) => {
    setFormData((prev) => {
      const copy = [...prev.featuresJson];
      if (!copy[index]) {
        copy[index] = { icon: "CheckCircle2", title: "", description: "" };
      }
      copy[index] = { ...copy[index], [key]: val };
      return { ...prev, featuresJson: copy };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateLoginPageSettingsAction(formData);
      if (result.success) {
        toast.success(result.message || "Pengaturan halaman login berhasil disimpan!");
      } else {
        toast.error(result.error || "Gagal menyimpan perubahan");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetLoginPageSettingsAction();
      if (result.success) {
        setFormData(DEFAULT_LOGIN_PAGE_SETTINGS);
        toast.success(result.message || "Berhasil dikembalikan ke pengaturan default HERO!");
        setIsResetConfirmOpen(false);
      } else {
        toast.error(result.error || "Gagal mereset ke default");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat mereset");
    } finally {
      setIsResetting(false);
    }
  };

  // Preview background styles
  const previewBackgroundStyle: React.CSSProperties = {};
  if (formData.pageBackgroundType === "solid" && formData.pageBackgroundColor) {
    previewBackgroundStyle.background = formData.pageBackgroundColor;
  } else if (formData.pageBackgroundType === "gradient" && formData.pageBackgroundColor) {
    previewBackgroundStyle.background = formData.pageBackgroundColor;
  } else if (formData.pageBackgroundType === "image" && formData.pageBackgroundImageUrl) {
    previewBackgroundStyle.backgroundImage = `url(${resolveUploadUrl(formData.pageBackgroundImageUrl)})`;
    previewBackgroundStyle.backgroundSize = "cover";
    previewBackgroundStyle.backgroundPosition = "center";
  } else {
    previewBackgroundStyle.background =
      "radial-gradient(ellipse at 90% 10%, #cce5ff 0, transparent 55%), linear-gradient(145deg, #edf7ff, #d9eeff)";
  }

  const isCustomized =
    formData.heroTitle !== DEFAULT_LOGIN_PAGE_SETTINGS.heroTitle ||
    formData.bannerImageUrl !== DEFAULT_LOGIN_PAGE_SETTINGS.bannerImageUrl ||
    formData.logoUrl !== DEFAULT_LOGIN_PAGE_SETTINGS.logoUrl ||
    formData.formTitle !== DEFAULT_LOGIN_PAGE_SETTINGS.formTitle;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Sparkles className="size-3.5" />
            <span>Kustomisasi Antarmuka Publik</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Pengaturan Halaman Login
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kustomisasi gambar banner, teks headline, formulir masuk, logo, dan tampilan latar halaman login HERO.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/sign-in"
            target="_blank"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-sm transition-colors"
          >
            <ExternalLink className="size-3.5" />
            <span>Buka /sign-in</span>
          </Link>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isSaving || isResetting}
            className="h-9 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <RefreshCw className="size-3.5" />
            <span>Reset Default</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isResetting}
            className="h-9 gap-1.5 text-xs bg-[#0753e7] hover:bg-[#0647c4] text-white shadow-sm font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Status Tampilan"
          value={isCustomized ? "Kustom Aktif" : "Standar Bawaan"}
          description={isCustomized ? "Memakai konfigurasi khusus admin" : "Menggunakan tema default HERO"}
          icon={Palette}
          color={isCustomized ? "blue" : "emerald"}
        />
        <HeroKpiCard
          title="Banner Visual"
          value={formData.bannerImageUrl ? "Terpasang" : "Kosong"}
          description="Area ilustrasi & cerita sisi kiri"
          icon={ImageIcon}
          color="cyan"
        />
        <HeroKpiCard
          title="Branding Logo"
          value={formData.logoUrl ? "Kustom" : "Default"}
          description="Logo utama header halaman"
          icon={Sparkles}
          color="purple"
        />
        <HeroKpiCard
          title="Highlight Fitur"
          value={`${formData.featuresJson?.length || 3} Pilar`}
          description="Kartu presensi, pelaporan & operasional"
          icon={Layout}
          color="amber"
        />
      </div>

      {/* Two Column Layout: Editor Tabs on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Settings Tabs (7 Cols) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-slate-100 rounded-lg">
                <TabsTrigger value="banner" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0753e7] font-semibold">
                  <ImageIcon className="size-3.5" />
                  <span className="hidden sm:inline">Banner Kiri</span>
                  <span className="sm:hidden">Banner</span>
                </TabsTrigger>
                <TabsTrigger value="form" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0753e7] font-semibold">
                  <Type className="size-3.5" />
                  <span className="hidden sm:inline">Form & Logo</span>
                  <span className="sm:hidden">Form</span>
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0753e7] font-semibold">
                  <Layout className="size-3.5" />
                  <span className="hidden sm:inline">Fitur (3 Pilar)</span>
                  <span className="sm:hidden">Fitur</span>
                </TabsTrigger>
                <TabsTrigger value="page" className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0753e7] font-semibold">
                  <Palette className="size-3.5" />
                  <span className="hidden sm:inline">Latar & Footer</span>
                  <span className="sm:hidden">Latar</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: BANNER KIRI */}
              <TabsContent value="banner" className="space-y-4 mt-5">
                <div className="border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Visual & Narasi Banner Sisi Kiri</h3>
                  <p className="text-xs text-muted-foreground">
                    Atur foto latar, teks identitas perusahaan, judul besar, dan deskripsi singkat.
                  </p>
                </div>

                <HeroFormField label="Gambar Banner Sisi Kiri" tooltip="Disimpan secara persisten di S3 CloudHost">
                  <HeroFileUpload
                    value={formData.bannerImageUrl}
                    onChange={(url) => handleChange("bannerImageUrl", url || DEFAULT_LOGIN_PAGE_SETTINGS.bannerImageUrl)}
                    label="Pilih Foto Banner (S3)"
                    description="Format JPG, PNG, WebP (Rekomendasi rasio portrait atau lanskap resolusi tinggi)"
                    accept="image/*"
                  />
                </HeroFormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <HeroFormField label="Eyebrow Banner (Teks Kecil Atas)" required>
                    <HeroInput
                      value={formData.heroEyebrow}
                      onChange={(e) => handleChange("heroEyebrow", e.target.value)}
                      placeholder="Contoh: PT CHITRA PARATAMA"
                    />
                  </HeroFormField>

                  <HeroFormField label="Warna Latar Banner (Aksen)">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.bannerOverlayColor}
                        onChange={(e) => handleChange("bannerOverlayColor", e.target.value)}
                        className="size-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <HeroInput
                        value={formData.bannerOverlayColor}
                        onChange={(e) => handleChange("bannerOverlayColor", e.target.value)}
                        placeholder="#0860ee"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </HeroFormField>
                </div>

                <HeroFormField label="Headline Utama Banner" required tooltip="Gunakan enter untuk membuat baris baru">
                  <HeroTextarea
                    value={formData.heroTitle}
                    onChange={(e) => handleChange("heroTitle", e.target.value)}
                    placeholder="Kerja hebat,&#10;dimulai di sini."
                    rows={3}
                  />
                </HeroFormField>

                <HeroFormField label="Subtitle / Ringkasan Narasi" required tooltip="Deskripsi di bawah headline">
                  <HeroTextarea
                    value={formData.heroSubtitle}
                    onChange={(e) => handleChange("heroSubtitle", e.target.value)}
                    placeholder="Satu tempat untuk aktivitas, pelaporan,&#10;dan operasional Anda."
                    rows={2}
                  />
                </HeroFormField>
              </TabsContent>

              {/* TAB 2: FORMULIR & LOGO */}
              <TabsContent value="form" className="space-y-4 mt-5">
                <div className="border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Formulir Masuk & Identitas Logo</h3>
                  <p className="text-xs text-muted-foreground">
                    Atur logo di pojok kiri atas dan teks instruksi pada formulir otentikasi.
                  </p>
                </div>

                <HeroFormField label="Logo Header (Kiri Atas)" tooltip="Logo resmi sistem HERO atau logo perusahaan">
                  <HeroFileUpload
                    value={formData.logoUrl}
                    onChange={(url) => handleChange("logoUrl", url || DEFAULT_LOGIN_PAGE_SETTINGS.logoUrl)}
                    label="Unggah File Logo Baru"
                    description="Format PNG transparan atau SVG (Maks. 5MB)"
                    accept="image/*"
                  />
                </HeroFormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <HeroFormField label="Eyebrow Formulir">
                    <HeroInput
                      value={formData.formEyebrow}
                      onChange={(e) => handleChange("formEyebrow", e.target.value)}
                      placeholder="AKUN KARYAWAN"
                    />
                  </HeroFormField>

                  <HeroFormField label="Judul Formulir (Title)" required>
                    <HeroInput
                      value={formData.formTitle}
                      onChange={(e) => handleChange("formTitle", e.target.value)}
                      placeholder="Selamat datang kembali"
                    />
                  </HeroFormField>
                </div>

                <HeroFormField label="Deskripsi Formulir" required>
                  <HeroInput
                    value={formData.formDescription}
                    onChange={(e) => handleChange("formDescription", e.target.value)}
                    placeholder="Masuk ke HERO dengan akun kerja Anda."
                  />
                </HeroFormField>

                <div className="border-t pt-3 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Bantuan Akses Akun & Dukungan
                  </h4>
                  <div className="space-y-3">
                    <HeroFormField label="Teks Tombol Bantuan">
                      <HeroInput
                        value={formData.helpText}
                        onChange={(e) => handleChange("helpText", e.target.value)}
                        placeholder="Butuh bantuan?"
                      />
                    </HeroFormField>

                    <HeroFormField label="Rincian Instruksi Bantuan (Popup/Dropdown)">
                      <HeroTextarea
                        value={formData.helpDetails}
                        onChange={(e) => handleChange("helpDetails", e.target.value)}
                        placeholder="Gunakan email atau SN karyawan..."
                        rows={3}
                      />
                    </HeroFormField>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: FITUR HIGHLIGHT (3 PILAR) */}
              <TabsContent value="features" className="space-y-4 mt-5">
                <div className="border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-800">3 Kartu Fitur Utama (Pilar Operasional)</h3>
                  <p className="text-xs text-muted-foreground">
                    Ditampilkan di bagian bawah banner kiri pada layar desktop.
                  </p>
                </div>

                {(formData.featuresJson || DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson).map((feat, index) => (
                  <div key={index} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                        Pilar #{index + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <HeroFormField label="Ikon">
                          <HeroSearchableSelect
                            value={feat.icon}
                            options={ICON_OPTIONS}
                            onChange={(val) => handleFeatureChange(index, "icon", val as string)}
                            placeholder="Pilih Ikon"
                          />
                        </HeroFormField>
                      </div>
                      <div className="sm:col-span-2">
                        <HeroFormField label="Judul Pilar">
                          <HeroInput
                            value={feat.title}
                            onChange={(e) => handleFeatureChange(index, "title", e.target.value)}
                            placeholder="Presensi / Pelaporan / Operasional"
                          />
                        </HeroFormField>
                      </div>
                    </div>

                    <HeroFormField label="Deskripsi Ringkas">
                      <HeroInput
                        value={feat.description}
                        onChange={(e) => handleFeatureChange(index, "description", e.target.value)}
                        placeholder="Deskripsi singkat fungsi pilar ini"
                      />
                    </HeroFormField>
                  </div>
                ))}
              </TabsContent>

              {/* TAB 4: LATAR BELAKANG & FOOTER */}
              <TabsContent value="page" className="space-y-4 mt-5">
                <div className="border-b pb-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Latar Belakang Halaman & Footer</h3>
                  <p className="text-xs text-muted-foreground">
                    Atur tampilan kanvas keseluruhan halaman login serta teks legal hak cipta di bagian bawah.
                  </p>
                </div>

                <HeroFormField label="Tipe Latar Belakang (Page Background)">
                  <HeroSearchableSelect
                    value={formData.pageBackgroundType}
                    options={BACKGROUND_TYPE_OPTIONS}
                    onChange={(val) => handleChange("pageBackgroundType", val as string)}
                  />
                </HeroFormField>

                {formData.pageBackgroundType === "solid" && (
                  <HeroFormField label="Warna Background Polos (Hex)">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.pageBackgroundColor}
                        onChange={(e) => handleChange("pageBackgroundColor", e.target.value)}
                        className="size-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <HeroInput
                        value={formData.pageBackgroundColor}
                        onChange={(e) => handleChange("pageBackgroundColor", e.target.value)}
                        placeholder="#edf7ff"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </HeroFormField>
                )}

                {formData.pageBackgroundType === "gradient" && (
                  <HeroFormField label="Kode CSS Gradien Latar Belakang" tooltip="Misal: linear-gradient(135deg, #0f172a, #1e3a8a)">
                    <HeroInput
                      value={formData.pageBackgroundColor}
                      onChange={(e) => handleChange("pageBackgroundColor", e.target.value)}
                      placeholder="linear-gradient(145deg, #edf7ff, #d9eeff)"
                    />
                  </HeroFormField>
                )}

                {formData.pageBackgroundType === "image" && (
                  <HeroFormField label="Unggah Foto Background Layar Penuh">
                    <HeroFileUpload
                      value={formData.pageBackgroundImageUrl}
                      onChange={(url) => handleChange("pageBackgroundImageUrl", url)}
                      label="Foto Background Halaman"
                      description="Format JPG, PNG (Resolusi minimal 1920x1080)"
                      accept="image/*"
                    />
                  </HeroFormField>
                )}

                <div className="border-t pt-3 mt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Teks Footer Bawah
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HeroFormField label="Nama Perusahaan (Hak Cipta)">
                      <HeroInput
                        value={formData.footerCopyright}
                        onChange={(e) => handleChange("footerCopyright", e.target.value)}
                        placeholder="PT Chitra Paratama"
                      />
                    </HeroFormField>
                    <HeroFormField label="Tagline Sistem">
                      <HeroInput
                        value={formData.footerTagline}
                        onChange={(e) => handleChange("footerTagline", e.target.value)}
                        placeholder="Hub for Employee Reporting & Operations"
                      />
                    </HeroFormField>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Mockup (5 Cols) */}
        <div className="xl:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-[#0753e7]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Live Interactive Preview
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  previewDevice === "desktop"
                    ? "bg-white text-[#0753e7] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Monitor className="size-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  previewDevice === "mobile"
                    ? "bg-white text-[#0753e7] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone className="size-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Browser Window Mockup Container */}
          <div className="rounded-xl border border-slate-300 bg-slate-900 shadow-md overflow-hidden">
            {/* Browser Header Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span className="size-2.5 rounded-full bg-amber-500" />
                <span className="size-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="px-3 py-0.5 rounded-full bg-slate-900 text-[11px] font-mono text-slate-400 border border-slate-700 max-w-[200px] truncate">
                https://hero.chitraparatama.com/sign-in
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {previewDevice === "desktop" ? "1080p View" : "Phone View"}
              </div>
            </div>

            {/* Simulated Sign-in Page Content */}
            <div
              className={`p-3 transition-all duration-300 overflow-y-auto max-h-[620px] ${
                previewDevice === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
              }`}
              style={previewBackgroundStyle}
            >
              {/* Header Mini */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="relative h-6 w-24">
                  <Image
                    src={resolveUploadUrl(formData.logoUrl || "/logo-hero.png?v=hero-cat-20261012")}
                    alt="Logo"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#0753e7] flex items-center gap-1">
                  <Headphones className="size-3" />
                  {formData.helpText || "Butuh bantuan?"}
                </span>
              </div>

              {/* Main Card Panel Simulation */}
              <div
                className={`rounded-xl bg-white shadow-lg overflow-hidden border border-slate-200/80 ${
                  previewDevice === "desktop" ? "grid grid-cols-12 min-h-[380px]" : "flex flex-col"
                }`}
              >
                {/* Left Story / Banner Section */}
                <div
                  className={`relative p-4 text-white flex flex-col justify-between overflow-hidden ${
                    previewDevice === "desktop" ? "col-span-7" : "min-h-[160px]"
                  }`}
                  style={{ backgroundColor: formData.bannerOverlayColor || "#0860ee" }}
                >
                  <Image
                    src={resolveUploadUrl(formData.bannerImageUrl || "/Hero%20Logo/bg%20hero.png")}
                    alt="Hero Banner"
                    fill
                    className="object-cover opacity-80"
                  />
                  <div className="relative z-10 space-y-1">
                    <p className="text-[9px] font-bold tracking-widest uppercase opacity-90">
                      {formData.heroEyebrow || "PT CHITRA PARATAMA"}
                    </p>
                    <h3 className="text-base sm:text-lg font-extrabold leading-tight whitespace-pre-line drop-shadow-xs">
                      {formData.heroTitle || "Kerja hebat,\ndimulai di sini."}
                    </h3>
                    <p className="text-[11px] opacity-90 leading-relaxed whitespace-pre-line">
                      {formData.heroSubtitle || "Satu tempat untuk aktivitas dan pelaporan Anda."}
                    </p>
                  </div>

                  {/* Feature Highlights (Desktop Only Simulation) */}
                  {previewDevice === "desktop" && (
                    <div className="relative z-10 grid grid-cols-3 gap-1.5 mt-4 pt-2.5 border-t border-white/20 bg-blue-900/30 -mx-4 -mb-4 p-3">
                      {(formData.featuresJson || DEFAULT_LOGIN_PAGE_SETTINGS.featuresJson).map((f, i) => {
                        const IconC = LUCIDE_ICON_MAP[f.icon] || CheckCircle2;
                        return (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="p-1 rounded-full bg-white/20 shrink-0">
                              <IconC className="size-2.5 text-white" />
                            </span>
                            <div className="text-[9px] leading-tight">
                              <span className="font-bold block">{f.title}</span>
                              <span className="opacity-80 line-clamp-1">{f.description}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Form Simulation Section */}
                <div
                  className={`p-4 flex flex-col justify-center bg-white ${
                    previewDevice === "desktop" ? "col-span-5" : ""
                  }`}
                >
                  <p className="text-[9px] font-bold tracking-wider uppercase text-[#0753e7]">
                    {formData.formEyebrow || "AKUN KARYAWAN"}
                  </p>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {formData.formTitle || "Selamat datang kembali"}
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-3">
                    {formData.formDescription || "Masuk ke HERO dengan akun kerja Anda."}
                  </p>

                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-semibold text-slate-600">Email atau SN</span>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        <Mail className="size-3 text-slate-400" />
                        <span>71261@chitraparatama.com</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-semibold text-slate-600">Kata Sandi</span>
                      <div className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <LockKeyhole className="size-3 text-slate-400" />
                          <span>••••••••</span>
                        </div>
                        <Eye className="size-3 text-slate-400" />
                      </div>
                    </div>

                    <div className="w-full py-1.5 rounded bg-[#0753e7] text-white text-[11px] font-bold text-center mt-2 shadow-xs">
                      Masuk ke HERO
                    </div>

                    <div className="text-[8px] text-slate-400 text-center pt-1">
                      Akses akun dibuat oleh admin HERO.
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Mini */}
              <div className="mt-3 text-center text-[9px] text-slate-500 space-y-0.5">
                <p>© {new Date().getFullYear()} {formData.footerCopyright || "PT Chitra Paratama"}</p>
                <p className="font-semibold">{formData.footerTagline || "Hub for Employee Reporting & Operations"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Reset to Default */}
      <HeroConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Kembalikan ke Pengaturan Default?"
        description="Seluruh teks, gambar banner, logo, dan preferensi latar belakang akan dikembalikan ke konfigurasi standar asli HERO. Tindakan ini langsung berefek pada halaman login publik."
        confirmText="Ya, Reset Default"
        cancelText="Batal"
        tone="warning"
        onConfirm={handleReset}
        isLoading={isResetting}
      />
    </div>
  );
}
