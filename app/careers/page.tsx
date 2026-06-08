import { getRecruitments } from "@/app/actions/recruitment";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, MapPin, Building, Users, Clock } from "lucide-react";

export const metadata = {
  title: "Karir - PT Chitra Paratama",
  description: "Lowongan kerja terbaru di PT Chitra Paratama",
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

  return (
    <div className="min-h-screen bg-muted/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Bergabung dengan Tim Kami
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            PT Chitra Paratama selalu mencari talenta terbaik untuk berkembang bersama. 
            Lihat lowongan yang tersedia dan kirimkan lamaran Anda.
          </p>
        </div>

        {/* Job List */}
        <div className="space-y-4">
          {activeJobs.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-lg border border-dashed">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-muted-foreground">
                Belum ada lowongan yang tersedia
              </h2>
              <p className="text-muted-foreground mt-2">
                Silakan kembali lagi nanti untuk melihat update lowongan terbaru.
              </p>
            </div>
          ) : (
            activeJobs.map((job) => (
              <div
                key={job.id}
                className="bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {job.jobTitle}
                      </h2>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {job.department}
                          {job.section && ` · ${job.section}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location || "Indonesia"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {job.totalRequested} posisi
                        </span>
                      </div>
                    </div>

                    {job.endDate && (
                      <div className="flex items-center gap-1 text-sm text-destructive">
                        <Clock className="w-4 h-4" />
                        Ditutup pada{" "}
                        {format(new Date(job.endDate), "dd MMMM yyyy", { locale: id })}
                      </div>
                    )}

                    {(job.jobDescription || job.requirements) && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {job.jobDescription || job.requirements}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <Link
                      href={`/careers/${job.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Lihat Detail
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>PT Chitra Paratama · Human Capital Division</p>
          <p className="mt-1">
            Jika mengalami kendala, silakan hubungi kami melalui email atau telepon.
          </p>
        </div>
      </div>
    </div>
  );
}
