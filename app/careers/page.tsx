import { getRecruitments } from "@/app/actions/recruitment";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Caveat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";

const handwriting = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

export const metadata = {
  title: "Karir - PT Chitra Paratama",
  description: "Informasi lowongan kerja resmi PT Chitra Paratama.",
};

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  let jobs: any[] = [];
  try {
    jobs = await getRecruitments({ isPublic: true });
  } catch (err) {
    console.error("Failed to fetch recruitments:", err);
  }

  const activeJobs = jobs.filter((job) => {
    if (!job.endDate) return true;
    const end = new Date(job.endDate);
    end.setHours(23, 59, 59, 999);
    return new Date() <= end;
  });

  const departments = new Set(activeJobs.map((job) => job.department).filter(Boolean));
  const totalPositions = activeJobs.reduce((total, job) => total + (Number(job.totalRequested) || 0), 0);

  return (
    <main className="min-h-[100dvh] bg-[#f4f8ff] text-slate-950">
      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-br from-white via-[#f4f8ff] to-[#e6f0ff]">
        <div className="pointer-events-none absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex min-h-32 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-64 w-64 items-center justify-center">
                <Image
                  src="/cp_logo-removebg-preview.png"
                  alt="PT Chitra Paratama"
                  width={512}
                  height={512}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div>
                <div className="text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">PT Chitra Paratama</div>
                <div className={`${handwriting.className} text-3xl leading-none text-blue-700 sm:text-4xl`}>Career Portal</div>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <a
                href="https://www.chitraparatama.co.id/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                Website Chitra
              </a>
              <a
                href="#open-roles"
                className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                Lihat Lowongan
              </a>
            </div>
          </nav>

          <div className="grid items-center gap-10 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
            <div>
              <div className={`${handwriting.className} mb-3 text-3xl text-blue-700 sm:text-4xl`}>
                Build your future with purpose
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
                Karier profesional bersama PT Chitra Paratama.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Temukan posisi yang sesuai dengan pengalaman dan kompetensi Anda. Seluruh proses rekrutmen dilakukan melalui kanal resmi perusahaan.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#open-roles"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-700 px-6 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
                >
                  Lihat Posisi
                  <IconArrowRight className="h-4 w-4" stroke={2} />
                </a>
                <a
                  href="mailto:info@chitraparatama.co.id"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-blue-200 bg-white px-6 text-sm font-semibold text-blue-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Hubungi Kami
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-xl shadow-blue-900/10">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-blue-700 to-sky-600 p-6 text-white">
                <div className="text-sm font-semibold text-blue-100">Ringkasan Lowongan</div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Lowongan", value: activeJobs.length },
                    { label: "Posisi", value: totalPositions || activeJobs.length },
                    { label: "Departemen", value: departments.size || "-" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                      <div className="text-2xl font-extrabold tracking-tight">{item.value}</div>
                      <div className="mt-1 text-[11px] text-blue-100">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  { icon: IconShieldCheck, title: "Proses resmi", body: "Lamaran diproses oleh Human Capital." },
                  { icon: IconUsers, title: "Lingkungan profesional", body: "Kolaborasi lintas fungsi dan area operasional." },
                  { icon: IconBriefcase, title: "Kesempatan berkembang", body: "Peran disesuaikan dengan kebutuhan perusahaan." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon className="h-5 w-5" stroke={1.8} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-950">{item.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{item.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="open-roles" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className={`${handwriting.className} text-2xl text-blue-700`}>Open positions</div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">Lowongan Tersedia</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Pilih posisi yang sesuai, baca detail persyaratan, lalu kirim lamaran melalui formulir resmi.
            </p>
          </div>
          <div className="w-fit rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm">
            {activeJobs.length} lowongan aktif
          </div>
        </div>

        {activeJobs.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <IconBriefcase className="h-7 w-7" stroke={1.7} />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-slate-950">Belum ada lowongan tersedia</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Silakan kunjungi halaman ini secara berkala untuk informasi lowongan terbaru.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeJobs.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.id}`}
                className="group rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold leading-tight tracking-[-0.02em] text-slate-950 group-hover:text-blue-800">
                      {job.jobTitle}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <IconBuildingSkyscraper className="h-4 w-4 text-blue-600" stroke={1.7} />
                        {job.department || "Department"}{job.section ? ` - ${job.section}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <IconMapPin className="h-4 w-4 text-blue-600" stroke={1.7} />
                        {job.location || "Indonesia"}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <IconArrowRight className="h-5 w-5" stroke={1.8} />
                  </div>
                </div>

                {(job.jobDescription || job.requirements) && (
                  <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">
                    {job.jobDescription || job.requirements}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-800">
                    {job.totalRequested || 1} posisi
                  </span>
                  {job.endDate ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                      <IconClock className="h-3.5 w-3.5" stroke={1.8} />
                      Tutup {format(new Date(job.endDate), "dd MMM yyyy", { locale: id })}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Terbuka sampai terpenuhi</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-blue-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:px-10">
          <div>
            <div className={`${handwriting.className} text-2xl text-blue-700`}>Official information</div>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.035em] text-slate-950">Informasi Resmi</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Gunakan kontak resmi berikut untuk kebutuhan komunikasi perusahaan dan proses rekrutmen.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="font-bold text-slate-950">Head Office</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Gedung TMT 1 5 Th Floor, Suite 502<br />
                Jl. Cilandak KKO No.1 Jakarta 12560 Indonesia
              </p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="font-bold text-slate-950">Branch Office</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Jl. AMD Rt 46 No.69 Graha Indah,<br />
                Balikpapan Kalimantan Timur
              </p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-950">
                <IconPhone className="h-4 w-4 text-blue-700" stroke={1.8} />
                Telepon
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <div>(021) 29976661</div>
                <div>(0542) 7588101</div>
              </div>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-slate-950">
                <IconMail className="h-4 w-4 text-blue-700" stroke={1.8} />
                Email
              </div>
              <a className="mt-3 block text-sm font-semibold text-blue-800 hover:underline" href="mailto:info@chitraparatama.co.id">
                info@chitraparatama.co.id
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#f4f8ff] px-5 py-8 text-center text-sm text-slate-500 sm:px-8">
        <p className="font-semibold text-slate-700">PT Chitra Paratama - Human Capital Division</p>
        <p className="mt-2">Informasi lowongan kerja resmi PT Chitra Paratama.</p>
      </footer>
    </main>
  );
}
