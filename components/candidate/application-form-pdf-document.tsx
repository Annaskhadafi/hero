"use client";

import React from "react";
import { format } from "date-fns";

interface ApplicationFormPdfDocumentProps {
  entry: any;
  testTitle?: string;
}

export function ApplicationFormPdfDocument({ entry, testTitle }: ApplicationFormPdfDocumentProps) {
  // Parse answer data from entry
  const answerObj = React.useMemo(() => {
    const rawAnswer = entry?.answers?.[0]?.answerText;
    if (!rawAnswer) return {};
    try {
      return typeof rawAnswer === "string" ? JSON.parse(rawAnswer) : rawAnswer;
    } catch {
      return {};
    }
  }, [entry]);

  const candidate = entry?.candidate || {};
  const getVal = (key: string, fallback = "") => answerObj[key] || candidate[key] || fallback;

  const appliedCompanies: string[] = Array.isArray(answerObj.appliedCompanies) ? answerObj.appliedCompanies : [];
  const simTypes: string[] = Array.isArray(answerObj.simType) ? answerObj.simType : [];
  const diseases: string[] = Array.isArray(answerObj.diseases) ? answerObj.diseases : [];
  const familyMembers: any[] = Array.isArray(answerObj.familyMembers) ? answerObj.familyMembers : [];
  const educationList: any[] = Array.isArray(answerObj.educationList) ? answerObj.educationList : [];
  const coursesList: any[] = Array.isArray(answerObj.coursesList) ? answerObj.coursesList : [];
  const experienceList: any[] = Array.isArray(answerObj.experienceList) ? answerObj.experienceList : [];
  const skillsApps: Record<string, number> = answerObj.skills_apps || {};
  const skillsLang: Record<string, number> = answerObj.skills_lang || {};

  // Checkbox box renderer
  const renderBox = (checked: boolean) => (
    <span className="inline-flex items-center justify-center w-3 h-3 border border-black text-[8px] font-bold leading-none align-middle mr-1.5 bg-white">
      {checked ? "✓" : ""}
    </span>
  );

  // Common Header component for each page
  const PageHeader = () => (
    <div className="flex items-start justify-between pb-2 mb-3">
      <div className="flex items-center gap-2">
        {/* Chitra Paratama Logo */}
        <img
          src="/cp_logo-removebg-preview.png"
          alt="Chitra Paratama Logo"
          className="h-10 object-contain"
        />
      </div>
      <div className="text-right">
        <p className="text-[7.5pt] font-semibold text-amber-500">
          Internal information - Yellow - Mahadasha Group.
        </p>
      </div>
    </div>
  );

  // Common Footer component for each page
  const PageFooter = ({ pageNum }: { pageNum: number }) => (
    <div className="pt-2 mt-auto border-t border-black/30 flex items-center justify-between text-[7pt] text-black">
      <span className="font-bold">Confidential</span>
      <div className="text-center">
        <span>Page {pageNum} of 4</span>
        <div className="text-[6pt] text-amber-500 font-semibold">
          Internal information - Yellow - Mahadasha Group
        </div>
      </div>
      <span className="font-mono font-bold italic">F.HR.STD.006.00</span>
    </div>
  );

  return (
    <div className="application-form-print-container flex flex-col gap-6 text-black bg-slate-200/50 p-4 print:p-0 print:bg-white print:gap-0">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
          .application-form-print-container { padding: 0 !important; background: transparent !important; gap: 0 !important; }
          .app-form-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            height: 297mm !important;
            width: 210mm !important;
            max-height: 297mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ========================================================
          PAGE 1: DATA PRIBADI (PERSONAL DATA)
          ======================================================== */}
      <div className="app-form-page pdf-wrapper bg-white shadow-md print:shadow-none w-[210mm] min-h-[297mm] h-[297mm] p-[10mm] text-[8pt] font-sans mx-auto flex flex-col justify-between box-border overflow-hidden leading-tight border border-slate-300 print:border-none relative">
        <PageHeader />

        <div className="flex-1 flex flex-col">
          {/* Title */}
          <div className="text-center mb-3">
            <h1 className="text-sm font-extrabold tracking-wider uppercase underline underline-offset-4">
              APPLICATION FORM
            </h1>
          </div>

          {/* Section: DATA PRIBADI */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-2">
                DATA PRIBADI / <span className="italic font-normal">PERSONAL DATA</span>
              </h2>

              <div className="space-y-1 text-[8pt]">
                <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
                  <span>Posisi yang dilamar / <span className="italic text-[7pt]">Position Applied</span></span>
                  <span>:</span>
                  <span className="font-semibold border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                    {getVal("positionApplied", candidate.jobApplied || "-")}
                  </span>
                </div>
                <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
                  <span>Lokasi Tes / <span className="italic text-[7pt]">Test Location</span></span>
                  <span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                    {getVal("testLocation", candidate.siteLocation || "Balikpapan")}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Box 3x4 */}
            <div className="w-[28mm] h-[36mm] border-2 border-black flex flex-col items-center justify-center text-center p-1 shrink-0 bg-slate-50/50">
              <span className="text-[7pt] text-slate-500 font-semibold uppercase">Pas Foto</span>
              <span className="text-[6.5pt] text-slate-400">3 x 4 cm</span>
            </div>
          </div>

          {/* Personal Data Fields */}
          <div className="space-y-1.5 text-[8pt]">
            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span className="font-bold">
                Nama Lengkap (huruf cetak) / <span className="italic font-normal text-[7pt]">Full Name</span>
              </span>
              <span>:</span>
              <span className="font-bold uppercase tracking-wide border-b border-black pb-0.5 min-h-[16px]">
                {getVal("fullName", candidate.fullName || "-")}
              </span>
            </div>

            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span>Nama Panggilan / <span className="italic text-[7pt]">Nick Name</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("nickName", "-")}
              </span>
            </div>

            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span>Tempat Tanggal Lahir / <span className="italic text-[7pt]">Place & Date of Birth</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {[getVal("placeOfBirth"), getVal("dateOfBirth")].filter(Boolean).join(", ") || "-"}
              </span>
            </div>

            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span>Agama / <span className="italic text-[7pt]">Religion</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("religion", "-")}
              </span>
            </div>

            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span>Suku Bangsa / <span className="italic text-[7pt]">Ethnic Origin</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("ethnic", "-")}
              </span>
            </div>

            <div className="grid grid-cols-[170px_10px_1fr] items-baseline">
              <span>Kewarganegaraan / <span className="italic text-[7pt]">Citizenship</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("citizenship", "WNI")}
              </span>
            </div>

            {/* Permanent Address */}
            <div className="grid grid-cols-[170px_10px_1fr] items-baseline pt-1">
              <span>Alamat Tetap / <span className="italic text-[7pt]">Permanent Address</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("permanentAddress", candidate.address || "-")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-[180px]">
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Kota</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("permanentCity", "-")}</span>
              </div>
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Propinsi</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("permanentProvince", "-")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-[180px]">
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Kode Pos</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("permanentZip", "-")}</span>
              </div>
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Negara</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">Indonesia</span>
              </div>
            </div>

            {/* Phone numbers */}
            <div className="grid grid-cols-[170px_10px_1fr] items-baseline pt-1">
              <span className="font-semibold">Nomor Telepon / <span className="italic font-normal text-[7pt]">Phone Number</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5"></span>
            </div>
            <div className="pl-[180px] space-y-1">
              <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
                <span>Rumah / <span className="italic text-[7pt]">Home</span></span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("homePhone", "-")}</span>
              </div>
              <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
                <span>Telepon Genggam / <span className="italic text-[7pt]">HP</span></span><span>:</span>
                <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{getVal("handphone", candidate.phone || "-")}</span>
              </div>
            </div>

            {/* Present Address */}
            <div className="grid grid-cols-[170px_10px_1fr] items-baseline pt-1">
              <span>Alamat Sekarang / <span className="italic text-[7pt]">Present Address</span></span>
              <span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5 min-h-[16px]">
                {getVal("presentAddress", getVal("permanentAddress", candidate.address || "-"))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-[180px]">
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Kota</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("presentCity", getVal("permanentCity", "-"))}</span>
              </div>
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Propinsi</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("presentProvince", getVal("permanentProvince", "-"))}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-[180px]">
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Kode Pos</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("presentZip", getVal("permanentZip", "-"))}</span>
              </div>
              <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                <span>Alamat E-mail</span><span>:</span>
                <span className="font-mono text-[7.5pt] border-b border-dotted border-black/60 pb-0.5">{getVal("email", candidate.email || "-")}</span>
              </div>
            </div>

            {/* Sex & Blood Group */}
            <div className="grid grid-cols-2 gap-6 pt-2 border-t border-black/20">
              <div>
                <span className="font-semibold block mb-1">Jenis Kelamin / <span className="italic font-normal text-[7pt]">Sex</span> :</span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center">
                    {renderBox(getVal("sex") === "Pria" || candidate.gender === "Laki-laki")}
                    <span>Pria / <span className="italic text-[7pt]">Male</span></span>
                  </label>
                  <label className="flex items-center">
                    {renderBox(getVal("sex") === "Wanita" || candidate.gender === "Perempuan")}
                    <span>Wanita / <span className="italic text-[7pt]">Female</span></span>
                  </label>
                </div>
              </div>
              <div>
                <span className="font-semibold block mb-1">Golongan Darah / <span className="italic font-normal text-[7pt]">Blood Group</span> :</span>
                <div className="flex items-center gap-4">
                  {["A", "B", "AB", "O"].map((bg) => (
                    <label key={bg} className="flex items-center">
                      {renderBox(getVal("bloodGroup") === bg)}
                      <span>{bg}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* KTP */}
            <div className="pt-1">
              <span className="font-semibold">KTP / <span className="italic font-normal text-[7pt]">ID</span> :</span>
              <div className="pl-6 space-y-0.5">
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Nomor / <span className="italic text-[7pt]">Number</span></span><span>:</span>
                  <span className="font-mono font-semibold border-b border-dotted border-black/60 pb-0.5">{getVal("ktpNumber", "-")}</span>
                </div>
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Tempat Dikeluarkan / <span className="italic text-[7pt]">Place</span></span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("ktpPlace", "-")}</span>
                </div>
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Tanggal Dikeluarkan / <span className="italic text-[7pt]">Date of Issue</span></span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("ktpDate", "-")}</span>
                </div>
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Berlaku sampai / <span className="italic text-[7pt]">Valid to</span></span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("ktpValid", "Seumur Hidup")}</span>
                </div>
              </div>
            </div>

            {/* SIM */}
            <div className="pt-1">
              <span className="font-semibold">SIM / <span className="italic font-normal text-[7pt]">Driving License</span> :</span>
              <div className="pl-6 space-y-0.5">
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Nomor / <span className="italic text-[7pt]">Number</span></span><span>:</span>
                  <span className="font-mono border-b border-dotted border-black/60 pb-0.5">{getVal("simNumber", "-")}</span>
                </div>
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Tipe / <span className="italic text-[7pt]">Type</span></span><span>:</span>
                  <div className="flex items-center gap-4">
                    {["A", "B", "C", "B1", "B2"].map((st) => (
                      <span key={st} className="flex items-center">
                        {renderBox(simTypes.includes(st))}
                        <span>{st}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* NPWP & BPJS */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                <span>NPWP / <span className="italic text-[7pt]">Tax ID</span></span><span>:</span>
                <span className="font-mono border-b border-dotted border-black/60 pb-0.5">{getVal("npwp", "-")}</span>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                <span>No. BPJS</span><span>:</span>
                <span className="font-mono border-b border-dotted border-black/60 pb-0.5">{getVal("bpjs", "-")}</span>
              </div>
            </div>

            {/* Hobbies */}
            <div className="pt-1">
              <span>Hobi dan kegiatan di waktu luang / <span className="italic text-[7pt]">Hobbies & Activities</span> :</span>
              <div className="border-b border-dotted border-black/60 pb-0.5 min-h-[18px] pl-4 italic">
                {getVal("hobbies", "-")}
              </div>
            </div>

            {/* Marital Status */}
            <div className="pt-2 border-t border-black/20">
              <span className="font-semibold block mb-1">Status Perkawinan / <span className="italic font-normal text-[7pt]">Marital Status</span> :</span>
              <div className="flex items-center gap-6 mb-1">
                <label className="flex items-center">
                  {renderBox(getVal("marital") === "Lajang" || getVal("marital") === "Single")}
                  <span>Lajang / <span className="italic text-[7pt]">Single</span></span>
                </label>
                <label className="flex items-center">
                  {renderBox(getVal("marital") === "Menikah" || getVal("marital") === "Married")}
                  <span>Menikah / <span className="italic text-[7pt]">Married</span></span>
                </label>
                <label className="flex items-center">
                  {renderBox(getVal("marital") === "Janda" || getVal("marital") === "Widow")}
                  <span>Janda / <span className="italic text-[7pt]">Widow</span></span>
                </label>
                <label className="flex items-center">
                  {renderBox(getVal("marital") === "Duda" || getVal("marital") === "Widower")}
                  <span>Duda / <span className="italic text-[7pt]">Widower</span></span>
                </label>
              </div>
              {getVal("marital") === "Menikah" && (
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline pl-4">
                  <span>Tanggal Menikah / <span className="italic text-[7pt]">Date of Marriage</span></span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("marriageDate", "-")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <PageFooter pageNum={1} />
      </div>

      {/* ========================================================
          PAGE 2: DATA KELUARGA, PENDIDIKAN, KURSUS, PENYAKIT
          ======================================================== */}
      <div className="app-form-page pdf-wrapper bg-white shadow-md print:shadow-none w-[210mm] min-h-[297mm] h-[297mm] p-[10mm] text-[8pt] font-sans mx-auto flex flex-col justify-between box-border overflow-hidden leading-tight border border-slate-300 print:border-none relative">
        <PageHeader />

        <div className="flex-1 flex flex-col space-y-3">
          {/* Section: DATA KELUARGA */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">
              DATA KELUARGA (Diisi jika sudah menikah) / <span className="italic font-normal">FAMILY DATA</span>
            </h2>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
              <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
                <span>Nama Pasangan</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("spouseName", "-")}</span>
              </div>
              <div className="grid grid-cols-[120px_10px_1fr] items-baseline">
                <span>Pekerjaan</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("spouseOccupation", "-")}</span>
              </div>
              <div className="grid grid-cols-[120px_10px_1fr] items-baseline col-span-2">
                <span>Alamat</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("spouseAddress", "-")}</span>
              </div>
            </div>

            {/* Table: Anggota Keluarga */}
            <span className="font-semibold text-[7.5pt] block mb-0.5">Susunan Anggota Keluarga:</span>
            <table className="w-full border-collapse border border-black text-[7.5pt] text-center mb-2">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-black p-1 w-8">No</th>
                  <th className="border border-black p-1 text-left">Nama Lengkap</th>
                  <th className="border border-black p-1 w-20">L / P</th>
                  <th className="border border-black p-1 w-24">Tanggal Lahir</th>
                  <th className="border border-black p-1 w-28">Hubungan</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((idx) => {
                  const m = familyMembers[idx] || {};
                  return (
                    <tr key={idx} className="h-5">
                      <td className="border border-black p-0.5">{idx + 1}</td>
                      <td className="border border-black p-0.5 text-left pl-2">{m.name || ""}</td>
                      <td className="border border-black p-0.5">{m.sex || ""}</td>
                      <td className="border border-black p-0.5">{m.birthDate || ""}</td>
                      <td className="border border-black p-0.5">{m.relationship || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Orang Tua & Kontak Darurat */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
              <div className="grid grid-cols-[110px_10px_1fr] items-baseline">
                <span>Nama Ayah</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("fatherName", "-")}</span>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr] items-baseline">
                <span>Pekerjaan Ayah</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("fatherOccupation", "-")}</span>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr] items-baseline">
                <span>Nama Ibu</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("motherName", "-")}</span>
              </div>
              <div className="grid grid-cols-[110px_10px_1fr] items-baseline">
                <span>Pekerjaan Ibu</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("motherOccupation", "-")}</span>
              </div>
            </div>

            <div className="border border-black/60 p-2 rounded-xs bg-slate-50/40 text-[7.5pt]">
              <span className="font-bold block text-red-600 mb-1">Dalam keadaan darurat harap hubungi:</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span>Nama</span><span>:</span>
                  <span className="font-semibold border-b border-dotted border-black/40 pb-0.5">{getVal("emergencyName", "-")}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span>No. Telepon</span><span>:</span>
                  <span className="font-semibold border-b border-dotted border-black/40 pb-0.5">{getVal("emergencyPhone", "-")}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span>Hubungan</span><span>:</span>
                  <span className="border-b border-dotted border-black/40 pb-0.5">{getVal("emergencyRel", "-")}</span>
                </div>
                <div className="grid grid-cols-[70px_10px_1fr] items-baseline">
                  <span>Alamat</span><span>:</span>
                  <span className="border-b border-dotted border-black/40 pb-0.5">{getVal("emergencyAddress", "-")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: PENDIDIKAN */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">
              PENDIDIKAN / <span className="italic font-normal">EDUCATION</span>
            </h2>
            <table className="w-full border-collapse border border-black text-[7.5pt] text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-black p-1 w-16">Tingkat</th>
                  <th className="border border-black p-1 text-left">Nama Sekolah / Universitas</th>
                  <th className="border border-black p-1 w-14">Dari</th>
                  <th className="border border-black p-1 w-14">Sampai</th>
                  <th className="border border-black p-1 w-32">Jurusan</th>
                  <th className="border border-black p-1 w-14">IPK / Nilai</th>
                </tr>
              </thead>
              <tbody>
                {["SLTA", "D3", "S1", "S2", "Lain-lain"].map((lvl, idx) => {
                  const ed = educationList.find((e: any) => e.grade === lvl) || educationList[idx] || {};
                  return (
                    <tr key={lvl} className="h-5">
                      <td className="border border-black p-0.5 font-bold">{lvl}</td>
                      <td className="border border-black p-0.5 text-left pl-2">{ed.school || ""}</td>
                      <td className="border border-black p-0.5">{ed.from || ""}</td>
                      <td className="border border-black p-0.5">{ed.till || ""}</td>
                      <td className="border border-black p-0.5">{ed.major || ""}</td>
                      <td className="border border-black p-0.5 font-semibold">{ed.gpa || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section: KURSUS */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">
              KURSUS & TRAINING / <span className="italic font-normal">COURSES & TRAININGS</span>
            </h2>
            <table className="w-full border-collapse border border-black text-[7.5pt] text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-black p-1 text-left">Jenis Kursus / Pelatihan</th>
                  <th className="border border-black p-1 text-left w-36">Nama Institusi</th>
                  <th className="border border-black p-1 w-20">Kota</th>
                  <th className="border border-black p-1 w-16">Waktu</th>
                  <th className="border border-black p-1 w-24">Sertifikat</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((idx) => {
                  const c = coursesList[idx] || {};
                  return (
                    <tr key={idx} className="h-5">
                      <td className="border border-black p-0.5 text-left pl-2">{c.subject || ""}</td>
                      <td className="border border-black p-0.5 text-left pl-2">{c.institution || ""}</td>
                      <td className="border border-black p-0.5">{c.city || ""}</td>
                      <td className="border border-black p-0.5">{c.time || ""}</td>
                      <td className="border border-black p-0.5">{c.certificate || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section: RIWAYAT PENYAKIT */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">
              RIWAYAT PENYAKIT / <span className="italic font-normal">MEDICAL HISTORY</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 text-[7.5pt]">
              <div className="space-y-0.5 border border-black/40 p-1.5">
                {[
                  "Tuberkulosis",
                  "Asma",
                  "Epilepsi",
                  "Hepatitis",
                  "Diabetes",
                  "Malaria",
                  "Penyakit Ginjal",
                  "Lain-lain",
                ].map((d) => (
                  <div key={d} className="flex items-center justify-between">
                    <span>{d}</span>
                    {renderBox(diseases.includes(d))}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5 border border-black/40 p-1.5">
                {[
                  "Rematik",
                  "Penyakit Jantung",
                  "Gangguan Mental",
                  "Hipertensi",
                  "Anemia",
                  "Wasir",
                  "Gangguan Lambung",
                ].map((d) => (
                  <div key={d} className="flex items-center justify-between">
                    <span>{d}</span>
                    {renderBox(diseases.includes(d))}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[140px_10px_1fr] items-baseline mt-1 text-[7.5pt]">
              <span>Keterangan Tambahan</span><span>:</span>
              <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("additionalDiseaseInfo", "-")}</span>
            </div>
          </div>
        </div>

        <PageFooter pageNum={2} />
      </div>

      {/* ========================================================
          PAGE 3: KEAHLIAN (SKILLS) & RIWAYAT PEKERJAAN (1 & 2)
          ======================================================== */}
      <div className="app-form-page pdf-wrapper bg-white shadow-md print:shadow-none w-[210mm] min-h-[297mm] h-[297mm] p-[10mm] text-[8pt] font-sans mx-auto flex flex-col justify-between box-border overflow-hidden leading-tight border border-slate-300 print:border-none relative">
        <PageHeader />

        <div className="flex-1 flex flex-col space-y-3">
          {/* Section: KEAHLIAN / SKILLS */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1.5">
              KEAHLIAN / <span className="italic font-normal">SKILLS</span>
            </h2>

            <div className="border border-black text-[7.5pt] mb-2">
              <div className="grid grid-cols-[200px_1fr] border-b border-black p-1.5 bg-slate-50 font-semibold">
                <span>Pengetahuan khusus terkait dengan Bisnis / <span className="italic font-normal text-[6.5pt]">Business Knowledge</span></span>
                <span className="font-normal pl-2">{getVal("businessKnowledge", "-")}</span>
              </div>
            </div>

            <p className="text-[7pt] italic text-slate-600 mb-1">
              *) Beri tanda (V) pada kotak yang sesuai dengan kemampuan Anda (1: Kurang ... 9: Mahir)
            </p>

            <div className="grid grid-cols-2 gap-4 text-[7.5pt]">
              {/* Computer Skills */}
              <div className="border border-black p-2">
                <div className="flex items-center justify-between font-bold mb-1 border-b border-black/40 pb-1">
                  <span>Aplikasi Komputer</span>
                  <div className="flex gap-1 text-[6.5pt] font-normal text-slate-500">
                    <span>Kurang</span>
                    <span>...</span>
                    <span>Mahir</span>
                  </div>
                </div>
                {["MS Office", "Auto Cad", "Lainnya (Sebutkan)", "Lainnya (Sebutkan)"].map((app, idx) => {
                  const score = skillsApps[app] || (idx === 0 && skillsApps["MS Office"] ? skillsApps["MS Office"] : null);
                  return (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-dotted border-black/20 last:border-none">
                      <span className="truncate pr-2">{app}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <span
                            key={num}
                            className={`w-3.5 h-3.5 border border-black text-[6.5pt] flex items-center justify-center font-bold ${
                              score === num ? "bg-black text-white" : "bg-white text-black"
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Language Skills */}
              <div className="border border-black p-2">
                <div className="flex items-center justify-between font-bold mb-1 border-b border-black/40 pb-1">
                  <span>Bahasa / Language</span>
                  <div className="flex gap-1 text-[6.5pt] font-normal text-slate-500">
                    <span>Kurang</span>
                    <span>...</span>
                    <span>Mahir</span>
                  </div>
                </div>
                {["English", "Lainnya (Sebutkan)", "Lainnya (Sebutkan)"].map((lang, idx) => {
                  const score = skillsLang[lang] || (idx === 0 && skillsLang["Inggris"] ? skillsLang["Inggris"] : null);
                  return (
                    <div key={idx} className="flex items-center justify-between py-0.5 border-b border-dotted border-black/20 last:border-none">
                      <span className="truncate pr-2">{lang}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <span
                            key={num}
                            className={`w-3.5 h-3.5 border border-black text-[6.5pt] flex items-center justify-center font-bold ${
                              score === num ? "bg-black text-white" : "bg-white text-black"
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: RIWAYAT PEKERJAAN (Pengalaman 1 & 2) */}
          <div>
            <h2 className="font-bold text-[8.5pt] uppercase tracking-wide border-b border-black pb-0.5 mb-1">
              RIWAYAT PEKERJAAN / <span className="italic font-normal">EMPLOYMENT HISTORY</span>
            </h2>
            <p className="text-[7pt] italic text-slate-600 mb-2">
              Tiga pengalaman terakhir / <span className="italic">Three latest experiences</span>
            </p>

            {/* Experience Block 1 */}
            {(() => {
              const exp1 = experienceList[0] || {};
              return (
                <div className="border border-black p-2 mb-2 bg-slate-50/20 text-[7.5pt]">
                  <div className="flex items-baseline justify-between border-b border-black pb-1 mb-1 font-bold">
                    <span>1. Pengalaman Terakhir / <span className="italic font-normal">Latest Experience</span></span>
                    <div className="flex gap-4">
                      <span>Dari / From: <span className="font-semibold underline">{exp1.from || "-"}</span></span>
                      <span>Sampai / Till: <span className="font-semibold underline">{exp1.till || "-"}</span></span>
                      <span>Lamanya / Service Years: <span className="font-semibold underline">{exp1.years || "-"}</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Nama Perusahaan</span><span>:</span>
                      <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp1.companyName || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Posisi / Position</span><span>:</span>
                      <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp1.position || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Jenis Usaha</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp1.businessType || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Gaji / Salary</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp1.salary ? `Rp. ${exp1.salary}` : "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Jumlah Karyawan</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp1.employeeCount || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Alasan Berhenti</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp1.resignationReason || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Kota / City</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp1.city || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Referensi & No Telp</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">
                        {[exp1.reference, exp1.phone].filter(Boolean).join(" - ") || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Experience Block 2 */}
            {(() => {
              const exp2 = experienceList[1] || {};
              return (
                <div className="border border-black p-2 bg-slate-50/20 text-[7.5pt]">
                  <div className="flex items-baseline justify-between border-b border-black pb-1 mb-1 font-bold">
                    <span>2. Pengalaman Sebelumnya / <span className="italic font-normal">Previous Experience</span></span>
                    <div className="flex gap-4">
                      <span>Dari / From: <span className="font-semibold underline">{exp2.from || "-"}</span></span>
                      <span>Sampai / Till: <span className="font-semibold underline">{exp2.till || "-"}</span></span>
                      <span>Lamanya / Service Years: <span className="font-semibold underline">{exp2.years || "-"}</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Nama Perusahaan</span><span>:</span>
                      <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp2.companyName || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Posisi / Position</span><span>:</span>
                      <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp2.position || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Jenis Usaha</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp2.businessType || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Gaji / Salary</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp2.salary ? `Rp. ${exp2.salary}` : "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Jumlah Karyawan</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp2.employeeCount || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Alasan Berhenti</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp2.resignationReason || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Kota / City</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">{exp2.city || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                      <span>Referensi & No Telp</span><span>:</span>
                      <span className="border-b border-dotted border-black/60 pb-0.5">
                        {[exp2.reference, exp2.phone].filter(Boolean).join(" - ") || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <PageFooter pageNum={3} />
      </div>

      {/* ========================================================
          PAGE 4: PENGALAMAN 3, TMT GROUP QUESTION, DEKLARASI, SIGNATURE & HR RESULT
          ======================================================== */}
      <div className="app-form-page pdf-wrapper bg-white shadow-md print:shadow-none w-[210mm] min-h-[297mm] h-[297mm] p-[10mm] text-[8pt] font-sans mx-auto flex flex-col justify-between box-border overflow-hidden leading-tight border border-slate-300 print:border-none relative">
        <PageHeader />

        <div className="flex-1 flex flex-col space-y-3">
          {/* Experience Block 3 */}
          {(() => {
            const exp3 = experienceList[2] || {};
            return (
              <div className="border border-black p-2 bg-slate-50/20 text-[7.5pt]">
                <div className="flex items-baseline justify-between border-b border-black pb-1 mb-1 font-bold">
                  <span>3. Pengalaman Sebelumnya / <span className="italic font-normal">Previous Experience</span></span>
                  <div className="flex gap-4">
                    <span>Dari / From: <span className="font-semibold underline">{exp3.from || "-"}</span></span>
                    <span>Sampai / Till: <span className="font-semibold underline">{exp3.till || "-"}</span></span>
                    <span>Lamanya / Service Years: <span className="font-semibold underline">{exp3.years || "-"}</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Nama Perusahaan</span><span>:</span>
                    <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp3.companyName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Posisi / Position</span><span>:</span>
                    <span className="font-semibold border-b border-dotted border-black/60 pb-0.5">{exp3.position || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Jenis Usaha</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">{exp3.businessType || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Gaji / Salary</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">{exp3.salary ? `Rp. ${exp3.salary}` : "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Jumlah Karyawan</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">{exp3.employeeCount || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Alasan Berhenti</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">{exp3.resignationReason || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Kota / City</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">{exp3.city || "-"}</span>
                  </div>
                  <div className="grid grid-cols-[130px_10px_1fr] items-baseline">
                    <span>Referensi & No Telp</span><span>:</span>
                    <span className="border-b border-dotted border-black/60 pb-0.5">
                      {[exp3.reference, exp3.phone].filter(Boolean).join(" - ") || "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Question: TMT Group Application History */}
          <div className="border border-black p-2 text-[7.5pt]">
            <div className="flex items-center justify-between border-b border-black pb-1 mb-2">
              <span className="font-semibold">
                Apakah Anda pernah melamar ke Tiara Marga Trakindo (TMT) Group sebelumnya? /{" "}
                <span className="italic font-normal">Have you previously applied to TMT Group?</span>
              </span>
              <div className="flex gap-4">
                <label className="flex items-center">
                  {renderBox(getVal("appliedBefore") === "Yes")}
                  <span>Ya / <span className="italic">Yes</span></span>
                </label>
                <label className="flex items-center">
                  {renderBox(getVal("appliedBefore") === "No")}
                  <span>Tidak / <span className="italic">No</span></span>
                </label>
              </div>
            </div>

            {/* Companies Checklist */}
            <div className="pl-2 space-y-1">
              <span className="font-semibold block">Kalau Ya / <span className="italic font-normal">If So, what company:</span></span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {[
                  "Tiara Marga Trakindo (TMT)",
                  "Cipta Kridatama (CK)",
                  "Trakindo Utama (TU)",
                  "Cipta Krida Bahari (CKB)",
                  "Mitra Solusi Telematika (MST)",
                  "Chakra Jawara (CJ)",
                  "Sanggar Sarana Baja (SSB)",
                  "Chitra Paratama (CP)",
                  "Sumberdaya Sewatama (SS)",
                  "Chandra Sakti Utama Leasing (CSUL)",
                ].map((comp) => (
                  <span key={comp} className="flex items-center">
                    {renderBox(appliedCompanies.includes(comp))}
                    <span>{comp}</span>
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="grid grid-cols-[140px_10px_1fr] items-baseline">
                  <span>Posisi yang dilamar</span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("appliedPosition", "-")}</span>
                </div>
                <div className="grid grid-cols-[100px_10px_1fr] items-baseline">
                  <span>Kapan / When</span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("appliedDate", "-")}</span>
                </div>
              </div>

              <div className="grid grid-cols-[250px_10px_1fr] items-baseline pt-0.5">
                <span>Tahap Seleksi Terakhir yang pernah diikuti</span><span>:</span>
                <span className="border-b border-dotted border-black/60 pb-0.5">{getVal("appliedStage", "-")}</span>
              </div>
            </div>
          </div>

          {/* Expected Salary & Relocation Agreement */}
          <div className="border border-black p-2 space-y-1.5 text-[7.5pt]">
            <div className="grid grid-cols-[200px_10px_1fr] items-baseline">
              <span className="font-semibold">Gaji yang diharapkan / <span className="italic font-normal">Expected Salary</span></span>
              <span>:</span>
              <span className="font-bold border-b border-dotted border-black/60 pb-0.5 font-mono">
                {getVal("expectedSalary") ? `Rp. ${Number(getVal("expectedSalary")).toLocaleString("id-ID")}` : "-"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1 border-t border-black/20">
              <div className="flex-1">
                <span className="font-semibold block">
                  Bersedia ditugaskan dan ditempatkan di mana saja dalam wilayah Indonesia /{" "}
                  <span className="italic font-normal">Agree to work and located in any part of Indonesia</span>
                </span>
                <div className="grid grid-cols-[60px_10px_1fr] items-baseline mt-1 pl-2">
                  <span>Alasan</span><span>:</span>
                  <span className="border-b border-dotted border-black/60 pb-0.5 italic">{getVal("agreeRelocateReason", "-")}</span>
                </div>
              </div>
              <div className="flex gap-4 shrink-0">
                <label className="flex items-center">
                  {renderBox(getVal("agreeRelocate") === "Yes")}
                  <span>Ya / <span className="italic">Yes</span></span>
                </label>
                <label className="flex items-center">
                  {renderBox(getVal("agreeRelocate") === "No")}
                  <span>Tidak / <span className="italic">No</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* Statement & Signature */}
          <div className="pt-2 text-[7.5pt]">
            <p className="italic text-slate-700 leading-normal mb-4">
              Dengan ini saya nyatakan bahwa keterangan di atas benar, dan saya bertanggung jawab penuh atas segala konsekuensinya. /{" "}
              <span className="text-[6.5pt]">Here by certify that the information given is true. If any misinformation is found, I will be fully responsible.</span>
            </p>

            <div className="flex items-end justify-between px-6 pt-2">
              <div className="space-y-1">
                <div className="grid grid-cols-[60px_10px_1fr] items-baseline">
                  <span className="font-semibold">Tanggal</span><span>:</span>
                  <span className="font-semibold border-b border-black pb-0.5 min-w-[120px] inline-block">
                    {getVal("signatureDate")
                      ? format(new Date(getVal("signatureDate")), "dd MMMM yyyy")
                      : entry?.createdAt
                      ? format(new Date(entry.createdAt), "dd MMMM yyyy")
                      : format(new Date(), "dd MMMM yyyy")}
                  </span>
                </div>
              </div>

              <div className="text-center w-52">
                <p className="font-semibold mb-12">Tanda tangan / <span className="italic font-normal">Signature</span></p>
                <p className="border-t border-black pt-1 font-bold uppercase tracking-wider">
                  ( {getVal("fullName", candidate.fullName || "........................................")} )
                </p>
              </div>
            </div>
          </div>

          {/* Box: HASIL TEST / TEST RESULT (Diisi oleh HR Dept / Terisi otomatis dari Tes APM & AMR) */}
          <div className="border-2 border-black p-2 mt-4 bg-slate-50/50">
            <span className="font-bold text-[8pt] uppercase tracking-wide block mb-1">
              HASIL TEST / <span className="italic font-normal">TEST RESULT</span>
            </span>
            <div className="grid grid-cols-3 gap-3 mb-1">
              <div className="border border-black p-1 text-center bg-white">
                <span className="font-bold text-[7pt] block border-b border-black pb-0.5">*APM</span>
                <div className="h-9 flex flex-col items-center justify-center font-mono font-bold text-sm">
                  {entry?.testScores?.apm !== null && entry?.testScores?.apm !== undefined ? (
                    <span className="text-black">{entry.testScores.apm}</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">-</span>
                  )}
                </div>
              </div>
              <div className="border border-black p-1 text-center bg-white">
                <span className="font-bold text-[7pt] block border-b border-black pb-0.5">*AMR</span>
                <div className="h-9 flex flex-col items-center justify-center font-mono font-bold text-sm">
                  {entry?.testScores?.amr !== null && entry?.testScores?.amr !== undefined ? (
                    <span className="text-black">{entry.testScores.amr}</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">-</span>
                  )}
                </div>
              </div>
              <div className="border border-black p-1 text-center bg-white">
                <span className="font-bold text-[7pt] block border-b border-black pb-0.5">*TOEIC</span>
                <div className="h-9 flex flex-col items-center justify-center font-mono font-bold text-sm">
                  {entry?.testScores?.toeic !== null && entry?.testScores?.toeic !== undefined ? (
                    <span className="text-black">{entry.testScores.toeic}</span>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">-</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[6.5pt] italic text-slate-500">
              *) Diisi oleh HR. Dept. / <span className="italic">Filled by HR. Dept</span> (Terhubung otomatis dengan tes APM & AMR bila ada)
            </p>
          </div>
        </div>

        <PageFooter pageNum={4} />
      </div>
    </div>
  );
}
