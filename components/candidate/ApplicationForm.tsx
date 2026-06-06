"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

const NativeSelect = ({ value, onChange, options, placeholder, className }: any) => (
  <select
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
    value={value}
    onChange={onChange}
  >
    <option value="" disabled>{placeholder || "-- Pilih --"}</option>
    {options.map((opt: string) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

export function ApplicationForm({ 
  answers, 
  setAnswers,
  questionId
}: { 
  answers: Record<number, string>, 
  setAnswers: (a: Record<number, string>) => void,
  questionId: number
}) {
  const getFormData = () => {
    try {
      return JSON.parse(answers[questionId] || "{}");
    } catch {
      return {};
    }
  };

  const sigCanvasRef = useRef<SignatureCanvas>(null);

  // Load existing signature on mount if exists
  useEffect(() => {
    const data = getFormData();
    if (sigCanvasRef.current && data.signatureImage) {
      if (sigCanvasRef.current.isEmpty()) {
        sigCanvasRef.current.fromDataURL(data.signatureImage);
      }
    }
  }, [answers[questionId]]);

  // Ensure default signature date is set
  useEffect(() => {
    const data = getFormData();
    if (!data.signatureDate) {
      const defaultDate = new Date().toISOString().split('T')[0];
      const newData = { ...data, signatureDate: defaultDate };
      setAnswers({ ...answers, [questionId]: JSON.stringify(newData) });
    }
  }, []);

  const updateData = (key: string, value: any) => {
    const data = getFormData();
    data[key] = value;
    setAnswers({ ...answers, [questionId]: JSON.stringify(data) });
  };

  const getVal = (key: string) => getFormData()[key] || "";

  const getVal = (key: string) => getFormData()[key] || "";

  return (
    <div className="space-y-8 p-6 bg-white text-black max-w-5xl mx-auto rounded-lg shadow-sm border">
      <div className="text-center mb-8 border-b pb-4 flex flex-col items-center">
        <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-16 object-contain mb-4" />
        <h1 className="text-2xl font-bold uppercase">Formulir Lamaran Kerja</h1>
      </div>

      {/* 1. DATA PRIBADI */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase">Data Pribadi</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Posisi yang Dilamar</Label>
            <Input value={getVal("positionApplied")} onChange={(e) => updateData("positionApplied", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lokasi Tes</Label>
            <Input value={getVal("testLocation")} onChange={(e) => updateData("testLocation", e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap (Sesuai KTP)</Label>
            <Input value={getVal("fullName")} onChange={(e) => updateData("fullName", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Panggilan</Label>
              <Input value={getVal("nickName")} onChange={(e) => updateData("nickName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tempat dan Tanggal Lahir</Label>
              <div className="flex space-x-2">
                <Input placeholder="Tempat" value={getVal("placeOfBirth")} onChange={(e) => updateData("placeOfBirth", e.target.value)} />
                <Input type="date" value={getVal("dateOfBirth")} onChange={(e) => updateData("dateOfBirth", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Agama</Label>
              <NativeSelect 
                value={getVal("religion")} 
                onChange={(e: any) => updateData("religion", e.target.value)} 
                options={["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"]} 
              />
            </div>
            <div className="space-y-2">
              <Label>Suku Bangsa</Label>
              <Input value={getVal("ethnic")} onChange={(e) => updateData("ethnic", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Kewarganegaraan</Label>
              <NativeSelect 
                value={getVal("citizenship")} 
                onChange={(e: any) => updateData("citizenship", e.target.value)} 
                options={["WNI", "WNA"]} 
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-2 mt-4">
            <Label>Alamat Sesuai KTP</Label>
            <Textarea value={getVal("permanentAddress")} onChange={(e) => updateData("permanentAddress", e.target.value)} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input placeholder="Kota" value={getVal("permanentCity")} onChange={(e) => updateData("permanentCity", e.target.value)} />
              <Input placeholder="Provinsi" value={getVal("permanentProvince")} onChange={(e) => updateData("permanentProvince", e.target.value)} />
              <Input placeholder="Kode Pos" value={getVal("permanentZip")} onChange={(e) => updateData("permanentZip", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alamat Domisili Sekarang</Label>
            <Textarea value={getVal("presentAddress")} onChange={(e) => updateData("presentAddress", e.target.value)} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input placeholder="Kota" value={getVal("presentCity")} onChange={(e) => updateData("presentCity", e.target.value)} />
              <Input placeholder="Provinsi" value={getVal("presentProvince")} onChange={(e) => updateData("presentProvince", e.target.value)} />
              <Input placeholder="Kode Pos" value={getVal("presentZip")} onChange={(e) => updateData("presentZip", e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nomor Telepon Rumah</Label>
              <Input value={getVal("homePhone")} onChange={(e) => updateData("homePhone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nomor Handphone</Label>
              <Input value={getVal("handphone")} onChange={(e) => updateData("handphone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Alamat Email</Label>
              <Input type="email" value={getVal("email")} onChange={(e) => updateData("email", e.target.value)} />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <NativeSelect 
                value={getVal("sex")} 
                onChange={(e: any) => updateData("sex", e.target.value)} 
                options={["Pria", "Wanita"]} 
              />
            </div>
            <div className="space-y-2">
              <Label>Golongan Darah</Label>
              <NativeSelect 
                value={getVal("bloodGroup")} 
                onChange={(e: any) => updateData("bloodGroup", e.target.value)} 
                options={["A", "B", "AB", "O"]} 
              />
            </div>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2 border p-4 rounded">
              <Label className="font-bold">Kartu Tanda Penduduk (KTP)</Label>
              <Input placeholder="Nomor KTP" value={getVal("ktpNumber")} onChange={(e) => updateData("ktpNumber", e.target.value)} />
              <Input placeholder="Tempat Dikeluarkan" value={getVal("ktpPlace")} onChange={(e) => updateData("ktpPlace", e.target.value)} />
              <div className="flex space-x-2 items-center">
                <Label className="w-24 text-xs">Tgl Dikeluarkan:</Label><Input type="date" value={getVal("ktpDate")} onChange={(e) => updateData("ktpDate", e.target.value)} />
              </div>
              <div className="flex space-x-2 items-center">
                <Label className="w-24 text-xs">Berlaku s/d:</Label><Input type="date" value={getVal("ktpValid")} onChange={(e) => updateData("ktpValid", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 border p-4 rounded">
              <Label className="font-bold">Surat Izin Mengemudi (SIM)</Label>
              <Input placeholder="Nomor SIM" value={getVal("simNumber")} onChange={(e) => updateData("simNumber", e.target.value)} />
              <Label className="text-xs mt-2 block">Tipe SIM</Label>
              <div className="flex space-x-2 flex-wrap gap-y-2">
                {["A", "B", "C", "B1", "B2"].map(sim => (
                  <div key={sim} className="flex items-center space-x-1">
                    <Checkbox id={`sim-${sim}`} checked={(getVal("simType") || []).includes(sim)} onCheckedChange={(c) => {
                      const arr = getVal("simType") || [];
                      updateData("simType", c ? [...arr, sim] : arr.filter((x: string) => x !== sim));
                    }} />
                    <Label htmlFor={`sim-${sim}`}>{sim}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>NPWP</Label>
              <Input value={getVal("npwp")} onChange={(e) => updateData("npwp", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>No. BPJS Ketenagakerjaan</Label>
              <Input value={getVal("bpjs")} onChange={(e) => updateData("bpjs", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label>Hobi dan kegiatan di waktu luang</Label>
            <Textarea rows={3} value={getVal("hobbies")} onChange={(e) => updateData("hobbies", e.target.value)} />
          </div>

          <div className="space-y-2 mt-4 border-t pt-4">
            <Label className="font-bold">Status Perkawinan</Label>
            <div className="w-full md:w-1/2">
              <NativeSelect 
                value={getVal("marital")} 
                onChange={(e: any) => updateData("marital", e.target.value)} 
                options={["Lajang", "Menikah", "Janda", "Duda"]} 
              />
            </div>
            {getVal("marital") === "Menikah" && (
               <div className="flex space-x-2 items-center mt-2">
                 <Label>Tanggal Menikah:</Label><Input type="date" className="w-48" value={getVal("marriageDate")} onChange={(e) => updateData("marriageDate", e.target.value)} />
               </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. KELUARGA */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Data Keluarga (Diisi jika sudah menikah)</h2>
        <div className="space-y-2 mb-4">
          <Input placeholder="Nama Pasangan" value={getVal("spouseName")} onChange={(e) => updateData("spouseName", e.target.value)} />
          <Input placeholder="Alamat" value={getVal("spouseAddress")} onChange={(e) => updateData("spouseAddress", e.target.value)} />
          <Input placeholder="Pekerjaan" value={getVal("spouseOccupation")} onChange={(e) => updateData("spouseOccupation", e.target.value)} />
        </div>
        
        <Label className="font-bold mt-4 mb-2 block">Anggota Keluarga</Label>
        <div className="overflow-x-auto border rounded mb-4">
          <table className="w-full text-sm min-w-[800px] lg:min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="border p-2">No</th>
                <th className="border p-2">Nama Lengkap</th>
                <th className="border p-2">Jenis Kelamin</th>
                <th className="border p-2">Tanggal Lahir</th>
                <th className="border p-2">Hubungan</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => {
                const arr = getVal("familyMembers") || [];
                const row = arr[i-1] || {};
                return (
                  <tr key={i}>
                    <td className="border p-2 text-center">{i}</td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.name || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i-1] = { ...row, name: e.target.value }; updateData("familyMembers", newArr);
                    }}/></td>
                    <td className="border p-0">
                      <select className="flex h-10 w-full rounded-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:outline-none" value={row.sex || ""} onChange={(e) => {
                        const newArr = [...arr]; newArr[i-1] = { ...row, sex: e.target.value }; updateData("familyMembers", newArr);
                      }}>
                        <option value="" disabled>-- Pilih --</option>
                        <option value="Pria">Pria</option>
                        <option value="Wanita">Wanita</option>
                      </select>
                    </td>
                    <td className="border p-0"><Input type="date" className="border-0 rounded-none w-full" value={row.birthDate || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i-1] = { ...row, birthDate: e.target.value }; updateData("familyMembers", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.relationship || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i-1] = { ...row, relationship: e.target.value }; updateData("familyMembers", newArr);
                    }}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Label className="font-bold mt-4 mb-2 block">Nama Orang Tua</Label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input placeholder="Nama Ayah" value={getVal("fatherName")} onChange={(e) => updateData("fatherName", e.target.value)} />
          <Input placeholder="Pekerjaan Ayah" value={getVal("fatherOccupation")} onChange={(e) => updateData("fatherOccupation", e.target.value)} />
          <Input placeholder="Nama Ibu" value={getVal("motherName")} onChange={(e) => updateData("motherName", e.target.value)} />
          <Input placeholder="Pekerjaan Ibu" value={getVal("motherOccupation")} onChange={(e) => updateData("motherOccupation", e.target.value)} />
        </div>

        <Label className="font-bold mt-4 mb-2 block text-red-600">Dalam keadaan darurat harap hubungi:</Label>
        <div className="space-y-2 border p-4 bg-red-50/30 rounded">
          <Input placeholder="Nama" value={getVal("emergencyName")} onChange={(e) => updateData("emergencyName", e.target.value)} />
          <Input placeholder="Alamat" value={getVal("emergencyAddress")} onChange={(e) => updateData("emergencyAddress", e.target.value)} />
          <Input placeholder="Nomor Telepon" value={getVal("emergencyPhone")} onChange={(e) => updateData("emergencyPhone", e.target.value)} />
          <Input placeholder="Hubungan Keluarga" value={getVal("emergencyRel")} onChange={(e) => updateData("emergencyRel", e.target.value)} />
        </div>
      </section>

      {/* 3. PENDIDIKAN */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Pendidikan</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm min-w-[800px] lg:min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="border p-2">Tingkat</th>
                <th className="border p-2">Nama Sekolah / Institusi</th>
                <th className="border p-2">Dari</th>
                <th className="border p-2">Sampai</th>
                <th className="border p-2">Jurusan</th>
                <th className="border p-2">IPK</th>
              </tr>
            </thead>
            <tbody>
              {["SLTA", "D3", "S1", "S2", "Lain-lain"].map((lvl, i) => {
                const arr = getVal("educationList") || [];
                const row = arr[i] || { grade: lvl };
                return (
                  <tr key={lvl}>
                    <td className="border p-2 font-medium">{lvl}</td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.school || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, school: e.target.value, grade: lvl }; updateData("educationList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.from || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, from: e.target.value, grade: lvl }; updateData("educationList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.till || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, till: e.target.value, grade: lvl }; updateData("educationList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.major || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, major: e.target.value, grade: lvl }; updateData("educationList", newArr);
                    }}/></td>
                    <td className="border p-0 w-24"><Input className="border-0 rounded-none w-full text-center" value={row.gpa || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, gpa: e.target.value, grade: lvl }; updateData("educationList", newArr);
                    }}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. KURSUS */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Kursus yang Pernah Diikuti</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm min-w-[800px] lg:min-w-full">
            <thead className="bg-muted">
              <tr>
                <th className="border p-2">Jenis Kursus</th>
                <th className="border p-2">Nama Institusi</th>
                <th className="border p-2">Kota</th>
                <th className="border p-2">Waktu</th>
                <th className="border p-2">Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2].map(i => {
                const arr = getVal("coursesList") || [];
                const row = arr[i] || {};
                return (
                  <tr key={i}>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.subject || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, subject: e.target.value }; updateData("coursesList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.institution || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, institution: e.target.value }; updateData("coursesList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.city || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, city: e.target.value }; updateData("coursesList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.time || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, time: e.target.value }; updateData("coursesList", newArr);
                    }}/></td>
                    <td className="border p-0"><Input className="border-0 rounded-none w-full" value={row.certificate || ""} onChange={(e) => {
                      const newArr = [...arr]; newArr[i] = { ...row, certificate: e.target.value }; updateData("coursesList", newArr);
                    }}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. RIWAYAT PENYAKIT */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Riwayat Penyakit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr><th className="border p-2 text-left">Nama Penyakit</th><th className="border p-2 w-12 text-center">✔</th></tr>
              </thead>
              <tbody>
                {["Tuberkulosis", "Asma", "Epilepsi", "Hepatitis", "Diabetes", "Malaria", "Penyakit Ginjal", "Lain-lain"].map(disease => (
                  <tr key={disease}>
                    <td className="border p-2">{disease}</td>
                    <td className="border p-2 text-center">
                      <Checkbox checked={(getVal("diseases") || []).includes(disease)} onCheckedChange={(c) => {
                        const arr = getVal("diseases") || [];
                        updateData("diseases", c ? [...arr, disease] : arr.filter((x: string) => x !== disease));
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr><th className="border p-2 text-left">Nama Penyakit</th><th className="border p-2 w-12 text-center">✔</th></tr>
              </thead>
              <tbody>
                {["Rematik", "Penyakit Jantung", "Gangguan Mental", "Hipertensi", "Anemia", "Wasir", "Gangguan Lambung"].map(disease => (
                  <tr key={disease}>
                    <td className="border p-2">{disease}</td>
                    <td className="border p-2 text-center">
                      <Checkbox checked={(getVal("diseases") || []).includes(disease)} onCheckedChange={(c) => {
                        const arr = getVal("diseases") || [];
                        updateData("diseases", c ? [...arr, disease] : arr.filter((x: string) => x !== disease));
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:space-x-2 mt-4 md:items-center">
          <Label className="w-full md:w-64 whitespace-normal md:whitespace-nowrap mb-2 md:mb-0">Keterangan Tambahan:</Label>
          <Input value={getVal("additionalDiseaseInfo")} onChange={(e) => updateData("additionalDiseaseInfo", e.target.value)} />
        </div>
      </section>

      {/* 6. KEAHLIAN / SKILLS */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Keahlian</h2>
        <div className="flex flex-col md:flex-row md:space-x-2 border p-3 md:p-2 mb-4 gap-2 md:gap-0">
          <Label className="w-full md:w-64">Pengetahuan Khusus Terkait Bisnis</Label>
          <Input className="border-0 rounded-none border-b w-full shadow-none" value={getVal("businessKnowledge")} onChange={(e) => updateData("businessKnowledge", e.target.value)} />
        </div>

        <p className="text-sm italic mb-2">*) Beri tanda (V) pada kotak yang sesuai dengan kemampuan Anda</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between font-bold mb-2 text-sm"><span className="w-32">Aplikasi Komputer</span><span className="flex-1 flex justify-between px-2"><span>Kurang...</span><span>Mahir</span></span></div>
            {["MS Office", "Auto Cad", "Lainnya 1", "Lainnya 2"].map(app => (
              <div key={app} className="flex items-center mb-2">
                <div className="w-32 flex items-center space-x-2">
                  <Checkbox checked={!!(getVal("skills_apps") || {})[app]} onCheckedChange={(c) => {
                    updateData("skills_apps", { ...(getVal("skills_apps") || {}), [app]: c ? 5 : null });
                  }} />
                  <span className="text-sm truncate">{app}</span>
                </div>
                <div className="flex-1 flex space-x-1 justify-between px-2">
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <div key={num} 
                      onClick={() => updateData("skills_apps", { ...(getVal("skills_apps") || {}), [app]: num })}
                      className={`w-4 h-4 sm:w-5 sm:h-5 border text-xs flex items-center justify-center cursor-pointer ${(getVal("skills_apps") || {})[app] === num ? 'bg-primary text-white' : ''}`}
                    >{num}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between font-bold mb-2 text-sm"><span className="w-32">Bahasa</span><span className="flex-1 flex justify-between px-2"><span>Kurang...</span><span>Mahir</span></span></div>
            {["Inggris", "Lainnya 1", "Lainnya 2"].map(lang => (
              <div key={lang} className="flex items-center mb-2">
                <div className="w-32 flex items-center space-x-2">
                  <Checkbox checked={!!(getVal("skills_lang") || {})[lang]} onCheckedChange={(c) => {
                    updateData("skills_lang", { ...(getVal("skills_lang") || {}), [lang]: c ? 5 : null });
                  }} />
                  <span className="text-sm truncate">{lang}</span>
                </div>
                <div className="flex-1 flex space-x-1 justify-between px-2">
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <div key={num} 
                      onClick={() => updateData("skills_lang", { ...(getVal("skills_lang") || {}), [lang]: num })}
                      className={`w-4 h-4 sm:w-5 sm:h-5 border text-xs flex items-center justify-center cursor-pointer ${(getVal("skills_lang") || {})[lang] === num ? 'bg-primary text-white' : ''}`}
                    >{num}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. RIWAYAT PEKERJAAN */}
      <section>
        <h2 className="font-bold border-b border-black mb-4 uppercase mt-8">Riwayat Pekerjaan</h2>
        <p className="text-sm italic mb-4">Tiga pengalaman terakhir</p>
        
        {[0, 1, 2].map(idx => {
          const arr = getVal("experienceList") || [];
          const exp = arr[idx] || {};
          const setExp = (key: string, val: string) => {
            const newArr = [...arr]; newArr[idx] = { ...exp, [key]: val }; updateData("experienceList", newArr);
          };
          return (
            <div key={idx} className="border p-4 rounded mb-4">
              <h3 className="font-bold underline mb-2 text-sm">Pengalaman Terakhir</h3>
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4 gap-4 md:gap-0">
                <div className="space-y-2 md:space-y-1">
                  <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-24 mb-1 md:mb-0">Dari:</Label><Input className="h-8" value={exp.from || ""} onChange={e => setExp("from", e.target.value)}/></div>
                  <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-24 mb-1 md:mb-0">Sampai:</Label><Input className="h-8" value={exp.till || ""} onChange={e => setExp("till", e.target.value)}/></div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="mb-1 md:mb-0 md:mr-2">Lama Bekerja:</Label><Input className="h-8 md:w-24 text-center" value={exp.years || ""} onChange={e => setExp("years", e.target.value)}/></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-4">
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Nama Perusahaan</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.companyName || ""} onChange={e => setExp("companyName", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Posisi</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.position || ""} onChange={e => setExp("position", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Jenis Usaha</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.businessType || ""} onChange={e => setExp("businessType", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Gaji Terakhir</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.salary || ""} onChange={e => setExp("salary", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Jumlah Karyawan</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.employeeCount || ""} onChange={e => setExp("employeeCount", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Alasan Berhenti</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.resignationReason || ""} onChange={e => setExp("resignationReason", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Kota</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.city || ""} onChange={e => setExp("city", e.target.value)}/></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Referensi</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.reference || ""} onChange={e => setExp("reference", e.target.value)}/></div>
                <div className="hidden md:block"></div>
                <div className="flex flex-col md:flex-row md:items-center"><Label className="w-full md:w-48 text-muted-foreground mb-1 md:mb-0">Nomor Telepon</Label> <span className="hidden md:inline">:</span> <Input className="h-8 shadow-none border-t-0 border-x-0 rounded-none md:ml-2 border-b" value={exp.phone || ""} onChange={e => setExp("phone", e.target.value)}/></div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 8. LAIN LAIN / DECLARATION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-dashed pb-2">
          <Label className="flex-1">Apakah Anda pernah melamar ke Tiara Marga Trakindo (TMT) Group sebelumnya?</Label>
          <RadioGroup value={getVal("appliedBefore")} onValueChange={v => updateData("appliedBefore", v)} className="flex space-x-4">
            <div className="flex items-center space-x-1"><RadioGroupItem value="Yes" id="ap-yes"/><Label htmlFor="ap-yes">Ya</Label></div>
            <div className="flex items-center space-x-1"><RadioGroupItem value="No" id="ap-no"/><Label htmlFor="ap-no">Tidak</Label></div>
          </RadioGroup>
        </div>

        {getVal("appliedBefore") === "Yes" && (
          <div className="border p-4 bg-muted/20 rounded space-y-4">
            <Label className="font-bold">Jika Ya, Perusahaan apa:</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {["Tiara Marga Trakindo (TMT)", "Trakindo Utama (TU)", "Mitra Solusi Telematika (MST)", "Sanggar Sarana Baja (SSB)", "Sumberdaya Sewatama (SS)", "Cipta Kridatama (CK)", "Cipta Krida Bahari (CKB)", "Chakra Jawara (CJ)", "Chitra Paratama (CP)", "Chandra Sakti Utama Leasing (CSUL)"].map(comp => (
                <div key={comp} className="flex items-center space-x-2">
                  <Checkbox id={`comp-${comp}`} checked={(getVal("appliedCompanies") || []).includes(comp)} onCheckedChange={(c) => {
                    const arr = getVal("appliedCompanies") || [];
                    updateData("appliedCompanies", c ? [...arr, comp] : arr.filter((x: string) => x !== comp));
                  }} />
                  <Label htmlFor={`comp-${comp}`} className="font-normal">{comp}</Label>
                </div>
              ))}
            </div>
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 mt-4">
              <div className="flex-1"><Label>Posisi yang Dilamar:</Label><Input value={getVal("appliedPosition")} onChange={e => updateData("appliedPosition", e.target.value)} /></div>
              <div className="w-full md:w-1/3"><Label>Kapan:</Label><Input value={getVal("appliedDate")} onChange={e => updateData("appliedDate", e.target.value)} /></div>
            </div>
            <div>
              <Label>Tahap seleksi terakhir yang pernah diikuti pada perusahaan tersebut:</Label>
              <Input value={getVal("appliedStage")} onChange={e => updateData("appliedStage", e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:space-x-2 py-2 mb-4">
          <Label className="w-full md:w-64 mb-2 md:mb-0">Gaji yang Diharapkan : Rp.</Label>
          <Input className="w-full md:w-64" type="number" value={getVal("expectedSalary")} onChange={e => updateData("expectedSalary", e.target.value)} />
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between border-b border-dashed pb-4 gap-4">
          <div className="flex-1 w-full">
            <Label className="block leading-relaxed">Bersedia ditugaskan dan ditempatkan di mana saja dalam wilayah Indonesia</Label>
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 mt-4">
              <Label className="w-full md:w-32">Alasan:</Label><Input className="flex-1" value={getVal("agreeRelocateReason")} onChange={e => updateData("agreeRelocateReason", e.target.value)} />
            </div>
          </div>
          <RadioGroup value={getVal("agreeRelocate")} onValueChange={v => updateData("agreeRelocate", v)} className="flex flex-col space-y-2 mt-2 w-full md:w-auto p-4 md:p-0 bg-muted/10 md:bg-transparent rounded border md:border-0">
            <div className="flex items-center space-x-1"><RadioGroupItem value="Yes" id="ar-yes"/><Label htmlFor="ar-yes">Ya</Label></div>
            <div className="flex items-center space-x-1"><RadioGroupItem value="No" id="ar-no"/><Label htmlFor="ar-no">Tidak</Label></div>
          </RadioGroup>
        </div>

        <div className="mt-8 mb-12">
          <p className="text-sm text-muted-foreground mb-8">Dengan ini saya nyatakan bahwa keterangan di atas benar,<br/>dan saya bertanggung jawab penuh atas segala konsekuensinya.</p>

          <div className="flex flex-col md:flex-row justify-between items-end mt-12 gap-8 md:gap-0">
            <div className="flex items-center space-x-2">
              <Label>Tanggal :</Label>
              <Input type="date" value={getVal("signatureDate") || new Date().toISOString().split('T')[0]} onChange={e => updateData("signatureDate", e.target.value)} />
            </div>
            <div className="w-full md:w-64">
              <p className="mb-2 font-bold text-center">Tanda Tangan</p>
              <div className="border border-dashed border-gray-400 bg-white rounded h-32 relative group">
                <SignatureCanvas 
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{className: 'w-full h-full'}}
                  onEnd={() => {
                    if (sigCanvasRef.current) {
                      updateData("signatureImage", sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png'));
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (sigCanvasRef.current) {
                      sigCanvasRef.current.clear();
                      updateData("signatureImage", null);
                    }
                  }}
                  className="absolute top-1 right-1 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Clear
                </button>
              </div>
              <p className="border-t border-black pt-1 mt-2 text-center">( {getVal("fullName") || "......................................."} )</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
