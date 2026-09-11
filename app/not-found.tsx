import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 - Halaman Tidak Ditemukan | HERO",
  description: "Halaman yang Anda cari tidak dapat ditemukan.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Visual Icon */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
          <FileQuestion className="size-10" />
        </div>

        {/* Status Code & Heading */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-surface-container-high text-muted-foreground mb-3">
          Error 404
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          Halaman Tidak Ditemukan
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan. Silakan periksa kembali alamat URL.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild variant="default" size="dense" className="w-full sm:w-auto gap-2">
            <Link href="/dashboard">
              <Home className="size-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>

        {/* Footer info */}
        <p className="mt-10 text-xs text-muted-foreground/60">
          HERO — Hub for Employee Reporting & Operations
        </p>
      </div>
    </div>
  );
}
