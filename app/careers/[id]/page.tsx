"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
// Removed Select imports
import { uploadFile } from "@/app/actions/upload";
import { getRecruitmentById, createCandidate } from "@/app/actions/recruitment";
import { toast } from "sonner";
import { ArrowLeft, UploadCloud, Plus, Trash2, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function CareerApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [submitTimeout, setSubmitTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // -- Form State --
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  
  const [education, setEducation] = useState([{ jenjang: "", institution: "", major: "", yearIn: "", yearOut: "" }]);
  const [workExperience, setWorkExperience] = useState([{ company: "", role: "", yearIn: "", yearOut: "", description: "" }]);
  const [certificates, setCertificates] = useState([{ name: "", publisher: "", year: "" }]);
  
  const [drivingLicenses, setDrivingLicenses] = useState<string[]>([]);
  const [achievements, setAchievements] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const SIM_OPTIONS = ["SIM A", "SIM B1", "SIM B2", "SIM C"];
  const JENJANG_OPTIONS = ["SMA/SMK", "D3", "D4", "S1", "S2"];

  useEffect(() => {
    async function loadJob() {
      try {
        const data = await getRecruitmentById(id);
        if (!data || !data.isPublic) {
          setIsExpired(true);
          return;
        }
        
        if (data.endDate) {
          const end = new Date(data.endDate);
          const now = new Date();
          // Reset time to compare just dates
          end.setHours(23,59,59,999);
          if (now > end) {
            setIsExpired(true);
            return;
          }
        }
        
        setJob(data);
      } catch (e) {
        console.error(e);
        toast.error("Error loading job details.");
      } finally {
        setLoading(false);
      }
    }
    loadJob();
    
    // Cleanup timeout on unmount
    return () => {
      if (submitTimeout) {
        clearTimeout(submitTimeout);
      }
    };
  }, [id, submitTimeout]);

  const handleSimChange = (sim: string, checked: boolean) => {
    if (checked) {
      setDrivingLicenses([...drivingLicenses, sim]);
    } else {
      setDrivingLicenses(drivingLicenses.filter(l => l !== sim));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !dateOfBirth || !gender || !address) {
      toast.error("Mohon lengkapi Data Diri.");
      return;
    }

    setSubmitting(true);
    let cvUrl = "";

    // Set timeout to prevent stuck button
    const timeout = setTimeout(() => {
      setSubmitting(false);
      toast.error("Waktu pengiriman habis. Silakan coba lagi.");
    }, 30000); // 30 seconds timeout
    setSubmitTimeout(timeout);

    try {
      // 1. Upload CV
      if (cvFile) {
        if (cvFile.type !== "application/pdf" && !cvFile.name.toLowerCase().endsWith(".pdf")) {
          toast.error("Format file tidak didukung. Mohon unggah file PDF.");
          clearTimeout(timeout);
          setSubmitting(false);
          return;
        }
        const form = new FormData();
        form.append("file", cvFile);
        const uploadResult = await uploadFile(form);
        if (!uploadResult.success) {
          toast.warning("CV gagal diunggah: " + (uploadResult.error || "Kendala teknis") + ". Data Anda tetap akan dikirim tanpa CV.");
        } else {
          cvUrl = uploadResult.url || "";
        }
      } else {
        toast.warning("Anda belum mengunggah CV. Aplikasi tetap akan dikirim.");
      }
    } catch (uploadErr: any) {
      console.error("Upload CV error:", uploadErr);
      toast.warning("CV gagal diunggah. Data Anda tetap akan dikirim tanpa CV.");
    }

    try {
      // 2. Clean up arrays (remove empty entries)
      const cleanEducation = education.filter(e => e.institution && e.jenjang);
      const cleanWork = workExperience.filter(w => w.company && w.role);
      const cleanCerts = certificates.filter(c => c.name);

      // 3. Create Candidate
      await createCandidate({
        recruitmentId: id,
        fullName,
        email,
        phone,
        dateOfBirth,
        gender,
        address,
        education: cleanEducation.map(e => ({ level: e.jenjang, institution: e.institution, major: e.major, yearIn: e.yearIn, yearOut: e.yearOut })),
        workExperience: cleanWork,
        certificates: cleanCerts,
        drivingLicenses,
        achievements,
        source: "Careers Page",
        cvUrl,
      });

      clearTimeout(timeout);
      toast.success("Aplikasi berhasil dikirim!");
      router.push("/careers/success");
    } catch (e: any) {
      clearTimeout(timeout);
      console.error("Create candidate error:", e);
      toast.error(e.message || "Gagal mengirim aplikasi. Silakan coba lagi.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Memuat Lowongan...</div>;
  
  if (isExpired) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4 bg-muted/20">
        <Card className="max-w-md w-full text-center border-dashed">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Lowongan Ditutup</CardTitle>
            <CardDescription>
              Maaf, lowongan ini sudah tidak aktif atau batas waktu pendaftaran telah berakhir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/careers">Lihat Lowongan Lain</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-muted/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link href="/careers" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Lowongan
          </Link>
          <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{job.jobTitle}</h1>
              <p className="mt-2 text-lg text-muted-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5"/> {job.department} • {job.section}
              </p>
            </div>
            {job.endDate && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm">
                <CalendarDays className="w-4 h-4"/>
                Ditutup pada {format(new Date(job.endDate), "dd MMMM yyyy")}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-3 space-y-6">
            <Card className="bg-card/50 border-primary/20 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-primary">Deskripsi Pekerjaan & Persyaratan</h3>
                <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground">
                  <div className="whitespace-pre-wrap">
                    <span className="font-semibold text-foreground block mb-2">Deskripsi:</span>
                    {job.jobDescription || "Tidak ada deskripsi spesifik."}
                  </div>
                  <div className="whitespace-pre-wrap">
                    <span className="font-semibold text-foreground block mb-2">Persyaratan:</span>
                    {job.requirements || "Tidak ada persyaratan spesifik."}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader className="bg-muted/30 border-b pb-6">
                <CardTitle className="text-2xl">Formulir Pendaftaran</CardTitle>
                <CardDescription>
                  Mohon isi data diri, riwayat pendidikan, dan pengalaman Anda selengkap mungkin. 
                  Data yang lengkap akan meningkatkan peluang Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-10">
                  
                  {/* --- DATA DIRI --- */}
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                      1. Data Diri
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
                        <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tanggal Lahir <span className="text-destructive">*</span></Label>
                          <Input type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Jenis Kelamin <span className="text-destructive">*</span></Label>
                          <select 
                            required 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="" disabled>Pilih...</option>
                            <option value="Laki-laki">Laki-laki</option>
                            <option value="Perempuan">Perempuan</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email <span className="text-destructive">*</span></Label>
                        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor Telepon / WhatsApp <span className="text-destructive">*</span></Label>
                        <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Alamat Lengkap (Domisili) <span className="text-destructive">*</span></Label>
                        <Textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                      </div>
                    </div>
                  </section>

                  {/* --- PENDIDIKAN --- */}
                  <section className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-lg font-semibold">2. Riwayat Pendidikan</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => setEducation([...education, { jenjang: "", institution: "", major: "", yearIn: "", yearOut: "" }])}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah
                      </Button>
                    </div>
                    {education.map((edu, idx) => (
                      <div key={idx} className="grid md:grid-cols-12 gap-4 items-start bg-muted/20 p-4 rounded-lg relative group">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Jenjang</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={edu.jenjang} 
                            onChange={(e) => {
                              const newEdu = [...education]; newEdu[idx].jenjang = e.target.value; setEducation(newEdu);
                            }}
                          >
                            <option value="" disabled>Pilih</option>
                            {JENJANG_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label>Nama Institusi/Sekolah</Label>
                          <Input value={edu.institution} onChange={(e) => {
                            const newEdu = [...education]; newEdu[idx].institution = e.target.value; setEducation(newEdu);
                          }} placeholder="Cth: Universitas Indonesia" />
                        </div>
                        <div className="md:col-span-3 space-y-2">
                          <Label>Jurusan</Label>
                          <Input value={edu.major} onChange={(e) => {
                            const newEdu = [...education]; newEdu[idx].major = e.target.value; setEducation(newEdu);
                          }} placeholder="Cth: Ilmu Komputer" />
                        </div>
                        <div className="md:col-span-1 space-y-2">
                          <Label>Mulai</Label>
                          <Input placeholder="YYYY" value={edu.yearIn} onChange={(e) => {
                            const newEdu = [...education]; newEdu[idx].yearIn = e.target.value; setEducation(newEdu);
                          }} />
                        </div>
                        <div className="md:col-span-1 space-y-2">
                          <Label>Lulus</Label>
                          <Input placeholder="YYYY" value={edu.yearOut} onChange={(e) => {
                            const newEdu = [...education]; newEdu[idx].yearOut = e.target.value; setEducation(newEdu);
                          }} />
                        </div>
                        {education.length > 1 && (
                          <div className="md:col-span-1 flex justify-end pt-8">
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                              const newEdu = [...education]; newEdu.splice(idx, 1); setEducation(newEdu);
                            }}>
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>

                  {/* --- PENGALAMAN KERJA --- */}
                  <section className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-lg font-semibold">3. Pengalaman Kerja</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => setWorkExperience([...workExperience, { company: "", role: "", yearIn: "", yearOut: "", description: "" }])}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah
                      </Button>
                    </div>
                    {workExperience.map((work, idx) => (
                      <div key={idx} className="grid md:grid-cols-12 gap-4 items-start bg-muted/20 p-4 rounded-lg relative">
                        <div className="md:col-span-4 space-y-2">
                          <Label>Nama Perusahaan</Label>
                          <Input value={work.company} onChange={(e) => {
                            const newWork = [...workExperience]; newWork[idx].company = e.target.value; setWorkExperience(newWork);
                          }} placeholder="Cth: PT Hero Supermarket" />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label>Posisi / Jabatan</Label>
                          <Input value={work.role} onChange={(e) => {
                            const newWork = [...workExperience]; newWork[idx].role = e.target.value; setWorkExperience(newWork);
                          }} placeholder="Cth: Staff Administrasi" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Tahun Mulai</Label>
                          <Input placeholder="YYYY" value={work.yearIn} onChange={(e) => {
                            const newWork = [...workExperience]; newWork[idx].yearIn = e.target.value; setWorkExperience(newWork);
                          }} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Tahun Selesai</Label>
                          <Input placeholder="YYYY / Saat ini" value={work.yearOut} onChange={(e) => {
                            const newWork = [...workExperience]; newWork[idx].yearOut = e.target.value; setWorkExperience(newWork);
                          }} />
                        </div>
                        <div className="md:col-span-11 space-y-2">
                          <Label>Deskripsi Pekerjaan</Label>
                          <Textarea rows={2} value={work.description} onChange={(e) => {
                            const newWork = [...workExperience]; newWork[idx].description = e.target.value; setWorkExperience(newWork);
                          }} placeholder="Jelaskan secara singkat tanggung jawab Anda..." />
                        </div>
                        {workExperience.length > 1 && (
                          <div className="md:col-span-1 flex justify-end pt-8">
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                              const newWork = [...workExperience]; newWork.splice(idx, 1); setWorkExperience(newWork);
                            }}>
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>

                  {/* --- KEAHLIAN & SERTIFIKAT --- */}
                  <section className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                      4. Keahlian & Sertifikasi
                    </h3>
                    
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Lisensi Mengemudi (SIM)</Label>
                      <div className="flex flex-wrap gap-6">
                        {SIM_OPTIONS.map((sim) => (
                          <div key={sim} className="flex items-center space-x-2">
                            <Checkbox 
                              id={sim} 
                              checked={drivingLicenses.includes(sim)}
                              onCheckedChange={(c) => handleSimChange(sim, c as boolean)}
                            />
                            <Label htmlFor={sim} className="font-normal cursor-pointer">{sim}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-medium">Sertifikat/Pelatihan (Opsional)</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setCertificates([...certificates, { name: "", publisher: "", year: "" }])}>
                          <Plus className="w-4 h-4 mr-2" /> Tambah Sertifikat
                        </Button>
                      </div>
                      {certificates.map((cert, idx) => (
                        <div key={idx} className="grid md:grid-cols-12 gap-4 items-start bg-muted/20 p-4 rounded-lg">
                          <div className="md:col-span-5 space-y-2">
                            <Label>Nama Sertifikat</Label>
                            <Input value={cert.name} onChange={(e) => {
                              const newCerts = [...certificates]; newCerts[idx].name = e.target.value; setCertificates(newCerts);
                            }} placeholder="Cth: K3 Umum" />
                          </div>
                          <div className="md:col-span-4 space-y-2">
                            <Label>Penyelenggara</Label>
                            <Input value={cert.publisher} onChange={(e) => {
                              const newCerts = [...certificates]; newCerts[idx].publisher = e.target.value; setCertificates(newCerts);
                            }} placeholder="Cth: Kemnaker RI" />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label>Tahun</Label>
                            <Input placeholder="YYYY" value={cert.year} onChange={(e) => {
                              const newCerts = [...certificates]; newCerts[idx].year = e.target.value; setCertificates(newCerts);
                            }} />
                          </div>
                          {certificates.length > 1 && (
                            <div className="md:col-span-1 flex justify-end pt-8">
                              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                const newCerts = [...certificates]; newCerts.splice(idx, 1); setCertificates(newCerts);
                              }}>
                                <Trash2 className="w-4 h-4"/>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-base font-medium">Prestasi (Opsional)</Label>
                      <Textarea 
                        rows={3} 
                        value={achievements} 
                        onChange={(e) => setAchievements(e.target.value)}
                        placeholder="Sebutkan penghargaan atau prestasi yang relevan..."
                      />
                    </div>
                  </section>

                  {/* --- BERKAS --- */}
                  <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
                      5. Upload Berkas
                    </h3>
                    <div className="space-y-2">
                      <Label>Curriculum Vitae (CV) <span className="text-destructive">*</span></Label>
                      <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors">
                        <UploadCloud className="h-8 w-8 text-muted-foreground mb-4" />
                        <Input
                          id="cvFile"
                          type="file"
                          accept=".pdf,application/pdf"
                          className="max-w-sm mb-2"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCvFile(e.target.files[0]);
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Maksimal 5MB. Format yang didukung: PDF.
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="pt-6 border-t flex justify-end">
                    <Button type="submit" size="lg" className="w-full md:w-auto px-8" disabled={submitting}>
                      {submitting ? "Mengirim Aplikasi..." : "Kirim Aplikasi Lamaran"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
