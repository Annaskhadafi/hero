"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Compass,
  Crosshair,
  HardHat,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createHseOsmSession, getHseEmployeesList, type OsmTeamMemberInput } from "@/app/actions/hse-osm";
import { HSE_OSM_DEFAULT_FOCUS_ITEMS } from "@/lib/hse-osm-constants";
import { OsmMiniMap } from "@/components/ui/osm-mini-map";

type OsmSessionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    name?: string | null;
    email?: string | null;
    employeeSn?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    siteId?: number | null;
  } | null;
  sitesList?: Array<{ id: number; name: string }>;
  focusItems?: Array<{ id: number; code: string; name: string }>;
  onSuccess: () => void;
};

export function OsmSessionModal({
  isOpen,
  onClose,
  currentUser,
  sitesList = [],
  focusItems = [],
  onSuccess,
}: OsmSessionModalProps) {
  const focusOptions = focusItems.length > 0 ? focusItems : HSE_OSM_DEFAULT_FOCUS_ITEMS;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const [siteId, setSiteId] = useState<number | undefined>(
    currentUser?.siteId || sitesList[0]?.id
  );
  const [inspectionDate, setInspectionDate] = useState(todayStr);
  const [inspectionTime, setInspectionTime] = useState(timeStr);
  const [locationArea, setLocationArea] = useState("Pit West - Sangatta");
  const [locationDetail, setLocationDetail] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState("");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");

  const [focusItemId, setFocusItemId] = useState<number | undefined>(focusItems[0]?.id);
  const [focusItemName, setFocusItemName] = useState(
    focusOptions[0]?.name || "Fatality Prevention"
  );
  const [notes, setNotes] = useState("");

  // Team Members
  const [teamMembers, setTeamMembers] = useState<OsmTeamMemberInput[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<
    Array<{ id: number; name: string; employeeSn: string; departmentName?: string | null }>
  >([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // New member form inline
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [desktopEmpSearch, setDesktopEmpSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBadge, setManualBadge] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [manualCompany, setManualCompany] = useState("PT Chitra Paratama");
  const [isManualExternal, setIsManualExternal] = useState(false);
  const [isManualLeader, setIsManualLeader] = useState(false);

  const filteredAvailableEmployees = useMemo(() => {
    if (!desktopEmpSearch.trim()) return availableEmployees;
    const q = desktopEmpSearch.toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeSn?.toLowerCase().includes(q) ||
        e.departmentName?.toLowerCase().includes(q)
    );
  }, [availableEmployees, desktopEmpSearch]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees list on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingEmployees(true);
      getHseEmployeesList()
        .then((res) => {
          if (res.success && res.data) {
            setAvailableEmployees(res.data);
          }
        })
        .finally(() => setIsLoadingEmployees(false));

      // Set default lead as first team member if empty
      const leadName = currentUser?.name || "Muhammad Ikbal Isisa";
      const leadBadge = currentUser?.employeeSn || "2108847";
      const leadDept = currentUser?.department || "Mining Operations";

      setTeamMembers([
        {
          name: leadName,
          badgeNumber: leadBadge,
          department: leadDept,
          company: "PT Chitra Paratama",
          isTeamLeader: true,
          isExternal: false,
        },
      ]);
    }
  }, [isOpen, currentUser]);

  function handleDetectGps() {
    if (!navigator.geolocation) {
      setGpsMessage("GPS tidak didukung oleh browser Anda.");
      return;
    }

    setIsDetectingGps(true);
    setGpsMessage("Sedang mencari satelit GPS...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(7));
        setLongitude(pos.coords.longitude.toFixed(7));
        setGpsAccuracy(`±${Math.round(pos.coords.accuracy)}m`);
        setGpsMessage(`Lokasi terkunci (Akurasi: ±${Math.round(pos.coords.accuracy)}m)`);
        setIsDetectingGps(false);
      },
      (err) => {
        setGpsMessage(`Gagal membaca GPS: ${err.message}`);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function handleAddMember() {
    if (!isManualExternal) {
      if (!selectedEmpId) {
        setError("Silakan pilih karyawan internal terlebih dahulu.");
        return;
      }
      const emp = availableEmployees.find((e) => e.id === Number(selectedEmpId));
      if (emp) {
        if (teamMembers.some((m) => m.badgeNumber === emp.employeeSn)) {
          setError(`Karyawan ${emp.name} sudah terdaftar dalam tim.`);
          return;
        }
        setTeamMembers((prev) => [
          ...prev,
          {
            employeeId: emp.id,
            badgeNumber: emp.employeeSn,
            name: emp.name,
            department: emp.departmentName || "Mining Operations",
            company: "PT Chitra Paratama",
            isTeamLeader: isManualLeader,
            isExternal: false,
          },
        ]);
        setSelectedEmpId("");
        setIsManualLeader(false);
        setError(null);
        return;
      }
    }

    if (isManualExternal) {
      if (!manualName.trim() || !manualBadge.trim()) {
        setError("Nama dan Badge/NRP personil eksternal wajib diisi.");
        return;
      }
      setTeamMembers((prev) => [
        ...prev,
        {
          badgeNumber: manualBadge.trim(),
          name: manualName.trim(),
          department: manualDept.trim() || "Klien / Kontraktor",
          company: manualCompany.trim() || "PT Kaltim Prima Coal",
          isTeamLeader: isManualLeader,
          isExternal: true,
        },
      ]);
      setManualName("");
      setManualBadge("");
      setManualDept("");
      setIsManualLeader(false);
      setError(null);
    }
  }

  function handleRemoveMember(idx: number) {
    if (teamMembers.length <= 1) {
      setError("Minimal harus ada satu anggota tim (Leader).");
      return;
    }
    setTeamMembers((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleToggleLeader(idx: number) {
    setTeamMembers((prev) =>
      prev.map((m, i) => ({
        ...m,
        isTeamLeader: i === idx ? !m.isTeamLeader : m.isTeamLeader,
      }))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationArea.trim()) {
      setError("Area lokasi inspeksi wajib diisi.");
      return;
    }

    const leader = teamMembers.find((m) => m.isTeamLeader) || teamMembers[0];
    if (!leader) {
      setError("Minimal harus ada satu anggota tim yang ditandai sebagai Team Leader.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createHseOsmSession({
        siteId: siteId || null,
        inspectionDate,
        inspectionTime,
        locationArea: locationArea.trim(),
        locationDetail: locationDetail.trim(),
        latitude,
        longitude,
        gpsAccuracy,
        focusItemId,
        focusItemName,
        leadEmployeeId: leader.employeeId || null,
        leadEmployeeName: leader.name,
        leadBadgeNumber: leader.badgeNumber,
        leadDepartment: leader.department,
        leadCompany: leader.company,
        notes: notes.trim(),
        teamMembers,
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal membuat sesi OSM.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat membuat sesi OSM.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <HardHat className="size-5 text-amber-600" />
            Registrasi Sesi Monitoring Lapangan (OSM)
          </DialogTitle>
          <DialogDescription>
            Membuat sesi On the Spot Monitoring HSE baru dengan penugasan tim dan perekaman geotagging.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2 text-sm">
          {/* Section 1: Lokasi & Waktu */}
          <div className="rounded-xl border bg-card p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
              <MapPin className="size-4 text-amber-600" />
              Data Spasial & Waktu Inspeksi
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Site Kerja</Label>
                <Select
                  value={siteId ? String(siteId) : undefined}
                  onValueChange={(val) => setSiteId(Number(val))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih Site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sitesList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Waktu</Label>
                <Input
                  type="time"
                  value={inspectionTime}
                  onChange={(e) => setInspectionTime(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="locArea" className="text-xs font-semibold">
                  Area Lokasi Lapangan <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">Ketik atau pilih chip</span>
              </div>
              <Input
                id="locArea"
                placeholder="Contoh: Pit B West, Workshop Bay 2, Hauling Road KM 14, Disposal South..."
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                className="text-xs"
                required
              />
              {/* Quick Preset Location Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  "Pit West - Sangatta",
                  "Workshop Central HERO",
                  "Hauling Road KM 12",
                  "Disposal South",
                  "Fuel Station & Washpad",
                  "Warehouse & Yard",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLocationArea(chip)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      locationArea === chip
                        ? "bg-blue-600 text-white border-blue-600 font-bold"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="locDetail" className="text-xs font-semibold">
                Detail Lokasi / Area Spesifik
              </Label>
              <Input
                id="locDetail"
                placeholder="Contoh: Bay 4 Workshop RMI, Bench 3 West, KM 14.5, Front Loading 01..."
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* GPS Geotagging & Mini Map Preview */}
            <div className="rounded-lg bg-muted/60 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Compass className="size-3.5 text-blue-600" />
                  Koordinat GPS Presisi
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="h-7 px-2.5 text-[11px] gap-1"
                >
                  {isDetectingGps ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Crosshair className="size-3 text-blue-600" />
                  )}
                  {latitude ? "Perbarui GPS" : "Deteksi GPS"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude (e.g. -1.1289565)"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="h-7 text-xs bg-background"
                />
                <Input
                  placeholder="Longitude (e.g. 116.8537064)"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="h-7 text-xs bg-background"
                />
              </div>

              {/* Real OpenStreetMap Tile Preview (Leaflet native, no iframe blocks) */}
              {latitude && longitude && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && (
                <div className="mt-1">
                  <OsmMiniMap
                    latitude={Number(latitude)}
                    longitude={Number(longitude)}
                    className="h-40"
                  />
                </div>
              )}

              {gpsMessage && (
                <p className="text-[11px] text-muted-foreground italic">{gpsMessage}</p>
              )}
            </div>

            {/* Focus Item */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Fokus Area Monitoring <span className="text-red-500">*</span>
              </Label>
              <Select
                value={focusItemName}
                onValueChange={(val) => {
                  setFocusItemName(val);
                  const found = focusOptions.find((f) => f.name === val);
                  if (found && "id" in found) setFocusItemId(found.id);
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih Fokus Area..." />
                </SelectTrigger>
                <SelectContent>
                  {focusOptions.map((f, idx) => (
                    <SelectItem key={idx} value={f.name} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Registrasi Tim Inspeksi */}
          <div className="rounded-xl border bg-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="size-4 text-emerald-600" />
                Registrasi Tim Inspeksi ({teamMembers.length} Personil)
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              {teamMembers.map((member, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-200 text-xs">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {member.name}
                        {member.isTeamLeader && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full border border-amber-300">
                            Team Leader
                          </span>
                        )}
                        {member.isExternal && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium px-1.5 py-0.2 rounded-full">
                            Eksternal
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        NRP: {member.badgeNumber} • {member.department} • {member.company}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">
                      <Checkbox
                        checked={member.isTeamLeader}
                        onCheckedChange={() => handleToggleLeader(idx)}
                      />
                      <span>Leader</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="size-7 rounded hover:bg-red-50 text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Member Form */}
            <div className="rounded-lg border border-dashed p-3 space-y-2.5 bg-background">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1">
                  <UserPlus className="size-3.5 text-muted-foreground" />
                  Tambah Personil ke Tim
                </span>
                <label className="flex items-center gap-1.5 text-[11px] font-normal cursor-pointer">
                  <Checkbox
                    checked={isManualExternal}
                    onCheckedChange={(checked) => setIsManualExternal(!!checked)}
                  />
                  <span>Personil Eksternal / Mitra</span>
                </label>
              </div>

              {!isManualExternal ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter nama atau NRP karyawan..."
                      value={desktopEmpSearch}
                      onChange={(e) => setDesktopEmpSearch(e.target.value)}
                      className="h-8 text-xs pl-8 pr-7 bg-background"
                    />
                    {desktopEmpSearch && (
                      <button
                        type="button"
                        onClick={() => setDesktopEmpSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={selectedEmpId}
                      onValueChange={(val) => {
                        setSelectedEmpId(val);
                        const emp = availableEmployees.find((e) => e.id === Number(val));
                        if (emp) {
                          if (teamMembers.some((m) => m.badgeNumber === emp.employeeSn)) {
                            setError(`Karyawan ${emp.name} sudah terdaftar dalam tim.`);
                            return;
                          }
                          setTeamMembers((prev) => [
                            ...prev,
                            {
                              employeeId: emp.id,
                              badgeNumber: emp.employeeSn,
                              name: emp.name,
                              department: emp.departmentName || "Mining Operations",
                              company: "PT Chitra Paratama",
                              isTeamLeader: false,
                              isExternal: false,
                            },
                          ]);
                          setSelectedEmpId("");
                          setError(null);
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs h-8 flex-1">
                        <SelectValue
                          placeholder={
                            desktopEmpSearch
                              ? `Pilih dari ${filteredAvailableEmployees.length} hasil...`
                              : "Pilih karyawan internal HERO..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {filteredAvailableEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                            {emp.name} ({emp.employeeSn}) — {emp.departmentName || "General"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddMember}
                      className="h-8 text-xs px-3"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nama Lengkap..."
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Badge/NRP/KTP..."
                      value={manualBadge}
                      onChange={(e) => setManualBadge(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Divisi/Departemen..."
                      value={manualDept}
                      onChange={(e) => setManualDept(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      placeholder="Perusahaan/Kontraktor..."
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddMember}
                      className="h-7 text-xs px-3"
                    >
                      Tambah Personil Eksternal
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="sessionNotes" className="text-xs font-semibold">
              Catatan / Arahan Umum Sesi (Opsional)
            </Label>
            <Textarea
              id="sessionNotes"
              rows={2}
              placeholder="Tambahkan catatan lingkup inspeksi, kondisi cuaca, atau arahan khusus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none text-xs"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-1.5 size-3.5" />
                  Buat Sesi Monitoring
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
