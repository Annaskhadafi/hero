"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcMutedPanelClassName, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner";
import { getNextLetterNumber, saveLetter } from "@/app/actions/surat";
import { Archive, Printer } from "lucide-react";
import Link from "next/link";

type EmployeeForLetter = {
  id: number;
  name: string;
  employeeSn: string;
  joinYear: number;
  section: string;
  jobTitle: string;
};

export function SuratTugasClient({ employees }: { employees: EmployeeForLetter[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [noSurat, setNoSurat] = useState("");
  const [tanggal, setTanggal] = useState(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  });

  // Custom inputs for Surat Tugas
  const [tujuan, setTujuan] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [tglBerangkat, setTglBerangkat] = useState("");
  const [tglKembali, setTglKembali] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const letterNumberFetched = useRef(false);

  const selectedEmp = employees.find((e) => e.id.toString() === selectedEmpId);

  // Auto-generate letter number on mount
  useEffect(() => {
    if (letterNumberFetched.current) return;
    letterNumberFetched.current = true;

    getNextLetterNumber("surat_tugas")
      .then((num) => {
        setNoSurat(num);
      })
      .catch((err) => {
        console.error("Failed to generate letter number:", err);
      });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToArchive = useCallback(async () => {
    if (!selectedEmp) {
      setSaveMessage("Pilih karyawan terlebih dahulu.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const today = new Date().toISOString().split("T")[0];
      const contentHtml = document.querySelector(".pdf-wrapper")?.innerHTML || "";

      const result = await saveLetter({
        letterType: "surat_tugas",
        letterNumber: noSurat,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        subject: keperluan || "Surat Tugas",
        content: contentHtml,
        destination: tujuan,
        purpose: keperluan,
        departureDate: tglBerangkat || undefined,
        returnDate: tglKembali || undefined,
        issuedDate: today,
        issuedPlace: "Balikpapan",
        signatoryName: "",
        signatoryTitle: "Direktur / HR Manager",
        status: "draft",
      });

      if (result.success) {
        setSaveMessage("Surat berhasil disimpan ke arsip.");
        // Refresh letter number for next use
        const nextNum = await getNextLetterNumber("surat_tugas");
        setNoSurat(nextNum);
      } else {
        setSaveMessage(result.error || "Gagal menyimpan surat.");
      }
    } catch (error) {
      console.error("Error saving letter:", error);
      setSaveMessage("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  }, [selectedEmp, noSurat, tujuan, keperluan, tglBerangkat, tglKembali]);

  return (
    <AdminPageShell
      eyebrow="HC • Surat Tugas"
      title="Generate Surat Tugas"
      description="Buat dan cetak surat penugasan kerja untuk karyawan."
    >
      <HcWorkspaceBanner
        title="Assignment Letter Composer"
        description="Form penugasan dibuat lebih fokus: identitas, tujuan, keperluan, periode, lalu preview surat yang siap cetak dan arsip."
        items={[
          { label: "Karyawan", value: employees.length, tone: "slate" },
          { label: "Dipilih", value: selectedEmp ? "Siap" : "Belum", tone: selectedEmp ? "emerald" : "amber" },
          { label: "Tujuan", value: tujuan ? "Terisi" : "Kosong", tone: tujuan ? "sky" : "amber" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col gap-4 print:hidden">
          <Card className={`space-y-4 p-4 ${hcMutedPanelClassName}`}>
            <div>
              <Label className="mb-2 block">Karyawan</Label>
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeSn} - {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block">No Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="Contoh: 015/HR-ST/VI/2026"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tanggal Dibuat</Label>
              <Input
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-semibold text-sm mb-3">Detail Penugasan</h4>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Tujuan / Lokasi</Label>
                  <Input
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    placeholder="Contoh: Site Melak - Kaltim"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Keperluan</Label>
                  <Input
                    value={keperluan}
                    onChange={(e) => setKeperluan(e.target.value)}
                    placeholder="Contoh: Inspeksi K3 Tahunan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="mb-2 block">Berangkat</Label>
                    <Input
                      type="date"
                      value={tglBerangkat}
                      onChange={(e) => setTglBerangkat(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Kembali</Label>
                    <Input
                      type="date"
                      value={tglKembali}
                      onChange={(e) => setTglKembali(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={handlePrint} className={`w-full ${hcPrimaryActionClassName}`}>
              <Printer className="size-4" />
              Print Surat
            </Button>
            <Button
              onClick={handleSaveToArchive}
              variant="outline"
              className="w-full gap-2 rounded-xl"
              disabled={saving}
            >
              <Archive className="size-4" />
              {saving ? "Menyimpan..." : "Simpan ke Arsip"}
            </Button>
            {saveMessage && (
              <p
                className={`text-xs text-center ${
                  saveMessage.includes("berhasil")
                    ? "text-emerald-600"
                    : "text-destructive"
                }`}
              >
                {saveMessage}
              </p>
            )}
            <Link
              href="/dashboard/hc/surat/archive"
              className="text-center text-xs text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Lihat Arsip Surat
            </Link>
          </div>
        </div>

        {/* Print Preview Area */}
        <div className="min-h-[800px] rounded-[1.1rem] bg-white p-8 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:m-0 print:border-none print:bg-transparent print:p-0 print:shadow-none">
          <div className="pdf-wrapper">
            <div
              contentEditable
              suppressContentEditableWarning
              className="outline-none"
              style={{
                fontFamily: "Arial, sans-serif",
                fontSize: "12pt",
                lineHeight: "1.5",
                color: "black",
              }}
            >
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold uppercase underline mb-1">Surat Tugas</h1>
                <p>No: {noSurat || "______________________"}</p>
              </div>

              <p className="mb-6 text-justify">
                Yang bertanda tangan di bawah ini, selaku pimpinan perusahaan PT Chitra Paratama,
                memberikan tugas kepada:
              </p>

              <table className="w-full mb-6 ml-6">
                <tbody>
                  <tr>
                    <td className="w-48 py-1">Nama</td>
                    <td className="w-4">:</td>
                    <td className="font-bold">{selectedEmp?.name || "______________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">NIK</td>
                    <td>:</td>
                    <td>{selectedEmp?.employeeSn || "______________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Jabatan</td>
                    <td>:</td>
                    <td>{selectedEmp?.jobTitle || "______________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Departemen / Section</td>
                    <td>:</td>
                    <td>{selectedEmp?.section || "______________________"}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-4">Untuk melaksanakan pekerjaan / penugasan sebagai berikut:</p>

              <table className="w-full mb-6 ml-6">
                <tbody>
                  <tr>
                    <td className="w-48 py-1">Tempat / Tujuan</td>
                    <td className="w-4">:</td>
                    <td className="font-semibold">{tujuan || "______________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Keperluan</td>
                    <td>:</td>
                    <td>{keperluan || "______________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Waktu Pelaksanaan</td>
                    <td>:</td>
                    <td>
                      {tglBerangkat || "________"} s/d {tglKembali || "________"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-12 text-justify">
                Demikian surat tugas ini diberikan agar dapat dilaksanakan dengan penuh tanggung jawab.
                Setelah selesai melaksanakan tugas, harap segera memberikan laporan kepada atasan.
              </p>

              <div className="flex justify-end mt-16 text-center">
                <div>
                  <p className="mb-1">Balikpapan, {tanggal || "_________________"}</p>
                  <p className="font-bold mb-20">PT Chitra Paratama</p>

                  <p className="font-bold underline">_________________________</p>
                  <p>Direktur / HR Manager</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .pdf-wrapper, .pdf-wrapper * {
            visibility: visible;
          }
          .pdf-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}} />
    </AdminPageShell>
  );
}
