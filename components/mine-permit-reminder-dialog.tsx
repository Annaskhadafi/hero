"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Send,
  Loader2,
  Settings2,
  ShieldAlert,
  CheckCircle2,
  Building2,
  Calendar,
  Mail,
  Users,
  Filter,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmployeeMultiSelect, type EmployeeOption } from "@/components/employee-multi-select";
import { toast } from "sonner";

interface SiteOption {
  id: number;
  name: string;
}

interface SiteConfig {
  id?: number;
  siteId: number;
  siteName?: string;
  intervalDays: number;
  reminderDays: number;
  recipientEmails: string[];
  ccEmails: string[];
  additionalCcEmails: string;
  isActive: boolean;
  isConfigured?: boolean;
  lastSentAt: string | null;
}

const STORAGE_KEY = "last_selected_mine_permit_site_id";

export function MinePermitReminderDialog() {
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [allConfigs, setAllConfigs] = useState<SiteConfig[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "configured" | "unconfigured">("all");

  const [config, setConfig] = useState<SiteConfig>({
    siteId: 0,
    intervalDays: 1,
    reminderDays: 30,
    recipientEmails: [],
    ccEmails: [],
    additionalCcEmails: "",
    isActive: true,
    isConfigured: false,
    lastSentAt: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Create a map for quick lookup of configuration state per site
  const configsMap = useMemo(() => {
    const map = new Map<number, SiteConfig>();
    for (const c of allConfigs) {
      map.set(c.siteId, c);
    }
    return map;
  }, [allConfigs]);

  const configuredCount = useMemo(
    () => allConfigs.filter((c) => c.isConfigured).length,
    [allConfigs]
  );
  const unconfiguredCount = useMemo(
    () => Math.max(0, sites.length - configuredCount),
    [sites.length, configuredCount]
  );

  // Filtered sites for dropdown based on filter pill
  const filteredSites = useMemo(() => {
    if (filterType === "configured") {
      return sites.filter((s) => configsMap.get(s.id)?.isConfigured);
    }
    if (filterType === "unconfigured") {
      return sites.filter((s) => !configsMap.get(s.id)?.isConfigured);
    }
    return sites;
  }, [sites, configsMap, filterType]);

  async function loadInitialData() {
    setIsLoading(true);
    try {
      // Determine what site to load
      const savedSiteIdStr =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const savedSiteId = savedSiteIdStr ? parseInt(savedSiteIdStr, 10) : null;

      const url = savedSiteId
        ? `/dashboard/api/mine-permit-reminder-config?siteId=${savedSiteId}`
        : `/dashboard/api/mine-permit-reminder-config`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const loadedSites: SiteOption[] = data.sites || [];
        const loadedConfigs: SiteConfig[] = data.configs || [];

        setSites(loadedSites);
        setEmployees(data.employees || []);
        setAllConfigs(loadedConfigs);

        // Decide which site to select:
        let targetSiteId: number | null = null;

        // 1. If currently selected site is valid, keep it
        if (selectedSiteId && loadedSites.some((s) => s.id === selectedSiteId)) {
          targetSiteId = selectedSiteId;
        }
        // 2. Or if localStorage site is valid in loadedSites
        else if (savedSiteId && loadedSites.some((s) => s.id === savedSiteId)) {
          targetSiteId = savedSiteId;
        }
        // 3. Or prioritize the first site that is already configured!
        else {
          const firstConfigured = loadedConfigs.find((c) => c.isConfigured);
          if (firstConfigured) {
            targetSiteId = firstConfigured.siteId;
          } else if (loadedSites.length > 0) {
            targetSiteId = loadedSites[0].id;
          }
        }

        if (targetSiteId) {
          setSelectedSiteId(targetSiteId);
          if (data.config && data.config.siteId === targetSiteId) {
            applyConfigToForm(data.config);
          } else {
            await loadSiteConfig(targetSiteId);
          }
        }
      } else {
        toast.error("Gagal memuat konfigurasi.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan memuat data.");
    } finally {
      setIsLoading(false);
    }
  }

  function applyConfigToForm(c: any) {
    setConfig({
      id: c.id,
      siteId: c.siteId,
      siteName: c.siteName,
      intervalDays: c.intervalDays ?? 1,
      reminderDays: c.reminderDays ?? 30,
      recipientEmails: c.recipientEmails ?? [],
      ccEmails: c.ccEmails ?? [],
      additionalCcEmails: c.additionalCcEmails ?? "",
      isActive: c.isActive ?? true,
      isConfigured: c.isConfigured ?? Boolean(c.id),
      lastSentAt: c.lastSentAt ?? null,
    });
  }

  async function loadSiteConfig(siteId: number) {
    setIsConfigLoading(true);
    try {
      const res = await fetch(`/dashboard/api/mine-permit-reminder-config?siteId=${siteId}`);
      if (res.ok) {
        const data = await res.json();
        applyConfigToForm(data.config);
        if (data.configs) {
          setAllConfigs(data.configs);
        }
      }
    } catch (e) {
      console.error("Failed loading site config:", e);
    } finally {
      setIsConfigLoading(false);
    }
  }

  const handleSiteChange = (val: string) => {
    const siteId = parseInt(val, 10);
    if (!isNaN(siteId)) {
      setSelectedSiteId(siteId);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(siteId));
      }
      loadSiteConfig(siteId);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSiteId) {
      toast.error("Pilih Site terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/dashboard/api/mine-permit-reminder-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSiteId,
          intervalDays: Number(config.intervalDays) || 1,
          reminderDays: Number(config.reminderDays) || 30,
          recipientEmails: config.recipientEmails,
          ccEmails: config.ccEmails,
          additionalCcEmails: config.additionalCcEmails,
          isActive: config.isActive,
        }),
      });

      if (res.ok) {
        const currentSiteName = sites.find((s) => s.id === selectedSiteId)?.name;
        toast.success(`Pengaturan Reminder Site ${currentSiteName || ""} berhasil disimpan.`);

        // Mark as configured immediately in state
        setConfig((prev) => ({ ...prev, isConfigured: true }));
        setAllConfigs((prev) =>
          prev.map((item) =>
            item.siteId === selectedSiteId
              ? {
                  ...item,
                  isConfigured: true,
                  intervalDays: Number(config.intervalDays) || 1,
                  reminderDays: Number(config.reminderDays) || 30,
                  recipientEmails: config.recipientEmails,
                  ccEmails: config.ccEmails,
                  additionalCcEmails: config.additionalCcEmails,
                  isActive: config.isActive,
                }
              : item
          )
        );
      } else {
        toast.error("Gagal menyimpan pengaturan reminder.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestSendNow() {
    if (!selectedSiteId) return;
    const currentSiteName = sites.find((s) => s.id === selectedSiteId)?.name;

    setIsSending(true);
    try {
      const res = await fetch("/dashboard/api/mine-permit-reminder-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSiteId,
          action: "test",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const r = data.testResult;
        if (r?.sent) {
          toast.success(
            `Berhasil! ${r.count} karyawan terdeteksi. Email dikirim ke ${r.toCount} To & ${r.ccCount} CC.`
          );
          // Reload config to refresh lastSentAt
          loadSiteConfig(selectedSiteId);
        } else if (r?.skipped) {
          toast.info(r.reason || "Pengiriman dilewati (tidak ada yang expired / setting nonaktif).");
        } else {
          toast.error(r?.reason || "Gagal mengirim notifikasi reminder.");
        }
      } else {
        toast.error("Gagal memicu pengiriman email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan pengiriman email.");
    } finally {
      setIsSending(false);
    }
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const isSelectedSiteConfigured = Boolean(config.isConfigured || config.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-dashed gap-2 font-medium">
          <Settings2 className="size-4 text-amber-600" />
          Setting Reminder
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-700">
            <ShieldAlert className="size-5" />
            <DialogTitle className="text-lg font-bold">Setting Reminder Exp. Mine Permit</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Konfigurasi pengingat berkala kadaluarsa Mine Permit per Site, frekuensi interval kirim, batas hari, dan daftar penerima To/CC.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-amber-600" />
            <span>Memuat konfigurasi site...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Site Selector Bar with Config Status Indicator */}
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 space-y-3">
              {/* Overview Counter Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-amber-700" />
                    Status Site HERO ({sites.length}):
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                      filterType === "all"
                        ? "bg-amber-700 text-white"
                        : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/60"
                    }`}
                  >
                    Semua ({sites.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("configured")}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1 ${
                      filterType === "configured"
                        ? "bg-emerald-700 text-white"
                        : "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                    Sudah Diisi ({configuredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("unconfigured")}
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1 ${
                      filterType === "unconfigured"
                        ? "bg-slate-700 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-slate-400 inline-block" />
                    Belum Diisi ({unconfiguredCount})
                  </button>
                </div>
              </div>

              {/* Dropdown Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-amber-950">
                    Pilih Site untuk Dikelola:
                  </Label>
                  <p className="text-[11px] text-amber-700/80">
                    Pilih site untuk melihat dan menyimpan parameter pengingatnya.
                  </p>
                </div>
                <div className="w-full sm:w-80">
                  <Select
                    value={selectedSiteId ? String(selectedSiteId) : ""}
                    onValueChange={handleSiteChange}
                  >
                    <SelectTrigger className="bg-white border-amber-300 min-h-10 text-xs">
                      <SelectValue placeholder="Pilih Site..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredSites.map((site) => {
                        const siteCfg = configsMap.get(site.id);
                        const isSet = Boolean(siteCfg?.isConfigured);
                        return (
                          <SelectItem key={site.id} value={String(site.id)} className="text-xs py-2">
                            <div className="flex items-center justify-between w-full gap-3">
                              <span className="font-semibold text-slate-800">{site.name}</span>
                              {isSet ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  <Check className="size-3 text-emerald-600" />
                                  Sudah Diisi
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  Belum Diisi
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Site Status Banner */}
              {selectedSite && (
                <div className="pt-2 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is-active-switch"
                        checked={config.isActive}
                        onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                      />
                      <Label htmlFor="is-active-switch" className="text-xs font-semibold cursor-pointer">
                        {config.isActive ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <span className="size-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
                            Pengingat Aktif
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <span className="size-2 rounded-full bg-slate-400 inline-block" />
                            Pengingat Nonaktif
                          </span>
                        )}
                      </Label>
                    </div>

                    <div className="h-3 w-px bg-amber-200 hidden sm:block" />

                    {isSelectedSiteConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Data Tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">
                        <AlertCircle className="size-3 text-amber-600" />
                        Belum Dikonfigurasi
                      </span>
                    )}
                  </div>

                  {config.lastSentAt ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3 text-amber-600" />
                      Terakhir dikirim: {new Date(config.lastSentAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">
                      Belum pernah dikirim
                    </span>
                  )}
                </div>
              )}
            </div>

            {isConfigLoading ? (
              <div className="py-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-amber-600" />
                <span>Memuat data pengingat site...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 2-Column Schedule & Threshold Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Threshold / Batas Hari Expired */}
                  <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-amber-600" />
                        Batas H-Minus Expired
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        {config.reminderDays} hari
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Karyawan yang permit-nya habis dalam kurun hari ini akan dirangkum.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={config.reminderDays}
                        onChange={(e) =>
                          setConfig({ ...config, reminderDays: parseInt(e.target.value, 10) || 30 })
                        }
                        className="h-9 w-24 text-sm font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">Hari sebelum expired</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {[15, 30, 60, 90].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig({ ...config, reminderDays: days })}
                          className={`h-6 text-[11px] px-2 rounded-full ${
                            config.reminderDays === days
                              ? "bg-amber-100 text-amber-800 border-amber-300 font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          H-{days}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Frekuensi Pengiriman / Interval */}
                  <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5 text-blue-600" />
                        Frekuensi Pemberitahuan
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        Tiap {config.intervalDays} hari
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Jeda waktu pengiriman notifikasi berikutnya jika masih ada yang expired.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={config.intervalDays}
                        onChange={(e) =>
                          setConfig({ ...config, intervalDays: parseInt(e.target.value, 10) || 1 })
                        }
                        className="h-9 w-24 text-sm font-semibold"
                      />
                      <span className="text-xs text-muted-foreground">Hari sekali</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {[
                        { label: "1 Hari (Harian)", val: 1 },
                        { label: "3 Hari", val: 3 },
                        { label: "7 Hari (Mingguan)", val: 7 },
                        { label: "14 Hari", val: 14 },
                      ].map((item) => (
                        <Button
                          key={item.val}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConfig({ ...config, intervalDays: item.val })}
                          className={`h-6 text-[11px] px-2 rounded-full ${
                            config.intervalDays === item.val
                              ? "bg-blue-100 text-blue-800 border-blue-300 font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Recipients (To) - Multi Select */}
                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      Penerima Utama Notifikasi (To)
                    </Label>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {config.recipientEmails.length} PIC dipilih
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih karyawan / PIC di site ini (atau manajemen) yang akan menerima email rekapitulasi utama & lonceng notifikasi.
                  </p>
                  <EmployeeMultiSelect
                    label="Penerima Utama"
                    selectedEmails={config.recipientEmails}
                    onChange={(emails) => setConfig({ ...config, recipientEmails: emails })}
                    employees={employees}
                    placeholder="Cari & pilih karyawan penerima utama..."
                  />
                </div>

                {/* CC Recipients - Multi Select & Manual Input */}
                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-primary" />
                      Penerima Tembusan (CC)
                    </Label>
                    <span className="text-[11px] font-semibold text-slate-700">
                      {config.ccEmails.length} Karyawan di-CC
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih karyawan yang ingin mendapatkan tembusan email berkala.
                  </p>
                  <EmployeeMultiSelect
                    label="Penerima CC"
                    selectedEmails={config.ccEmails}
                    onChange={(emails) => setConfig({ ...config, ccEmails: emails })}
                    employees={employees}
                    placeholder="Cari & pilih karyawan CC..."
                  />

                  {/* Manual / External CC Emails */}
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <Label className="text-[11px] font-medium text-foreground">
                      Email CC Eksternal / Manual Tambahan (Opsional)
                    </Label>
                    <Input
                      placeholder="admin.site@vendor.com, hc.dept@chitraparatama.co.id"
                      value={config.additionalCcEmails}
                      onChange={(e) => setConfig({ ...config, additionalCcEmails: e.target.value })}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Gunakan tanda koma (,) untuk memisahkan beberapa alamat email.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSending || isSaving || !selectedSiteId}
                onClick={handleTestSendNow}
                className="w-full sm:w-auto border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold gap-1.5"
              >
                {isSending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Test Kirim Sekarang (Site Ini)
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs"
                >
                  Tutup
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || isSending || !selectedSiteId}
                  className="text-xs font-semibold gap-1.5 bg-amber-700 hover:bg-amber-800 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  Simpan Pengaturan
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
