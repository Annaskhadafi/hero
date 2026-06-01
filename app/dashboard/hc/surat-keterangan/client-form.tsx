"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Printer } from "lucide-react";

type EmployeeForLetter = {
  id: number;
  name: string;
  employeeSn: string;
  joinYear: number;
  section: string;
  jobTitle: string;
};

export function SuratKeteranganClient({ employees }: { employees: EmployeeForLetter[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [noSurat, setNoSurat] = useState("");
  const [tanggal, setTanggal] = useState(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  });
  
  const selectedEmp = employees.find((e) => e.id.toString() === selectedEmpId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminPageShell
      eyebrow="HC • Surat Keterangan Kerja"
      title="Generate Surat Keterangan"
      description="Buat dan cetak surat keterangan bekerja untuk karyawan."
    >
      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col gap-4 print:hidden">
          <Card className="p-4 space-y-4 shadow-none">
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
                placeholder="Contoh: 012/HR/VI/2026"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tanggal</Label>
              <Input
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
          </Card>

          <Card className="p-4 space-y-4 shadow-none bg-primary/5 border-primary/20">
            <h3 className="font-semibold text-sm">Data Autofill</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SN/NIK</span>
                <span className="font-medium">{selectedEmp?.employeeSn || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{selectedEmp?.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Section</span>
                <span className="font-medium">{selectedEmp?.section || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mulai Bekerja</span>
                <span className="font-medium">{selectedEmp?.joinYear || "-"}</span>
              </div>
            </div>
          </Card>

          <Button onClick={handlePrint} className="w-full gap-2">
            <Printer className="size-4" />
            Print Surat
          </Button>
        </div>

        {/* Print Preview Area */}
        <div className="rounded-xl border bg-white p-8 shadow-sm print:m-0 print:border-none print:bg-transparent print:p-0 print:shadow-none min-h-[800px]">
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
                <h1 className="text-xl font-bold uppercase underline mb-1">Surat Keterangan Bekerja</h1>
                <p>No: {noSurat || "______________________"}</p>
              </div>

              <p className="mb-6">
                Yang bertanda tangan di bawah ini, menerangkan bahwa:
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
                    <td className="py-1">Jabatan / Section</td>
                    <td>:</td>
                    <td>{selectedEmp?.jobTitle || "________________"} / {selectedEmp?.section || "________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Tahun Masuk</td>
                    <td>:</td>
                    <td>{selectedEmp?.joinYear || "______________________"}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-6 text-justify">
                Adalah benar karyawan kami dan masih aktif bekerja di PT Chitra Paratama terhitung 
                sejak tahun {selectedEmp?.joinYear || "____"} hingga surat ini dikeluarkan. 
                Selama bekerja yang bersangkutan menunjukkan dedikasi dan kinerja yang baik.
              </p>

              <p className="mb-12 text-justify">
                Demikian surat keterangan kerja ini dibuat agar dapat dipergunakan sebagaimana mestinya.
              </p>

              <div className="flex justify-end mt-16 text-center">
                <div>
                  <p className="mb-1">Balikpapan, {tanggal || "_________________"}</p>
                  <p className="font-bold mb-20">PT Chitra Paratama</p>
                  
                  <p className="font-bold underline">_________________________</p>
                  <p>HR & GA Dept. Head</p>
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
