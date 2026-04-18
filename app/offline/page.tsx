import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#134e4a_0%,#052e2b_35%,#020617_100%)] px-4 py-10">
      <Card className="w-full max-w-xl rounded-[1.8rem] border-white/10 bg-white/95 shadow-[0_30px_90px_rgba(2,6,23,0.35)]">
        <CardHeader className="space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900">
            <WifiOff className="size-7" />
          </div>
          <div>
            <CardTitle className="text-2xl">Mode offline aktif</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6">
              HERO belum bisa menjangkau server. Begitu koneksi kembali stabil, Anda bisa lanjut
              membuka dashboard, approval, dan Daily Activity seperti biasa.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Halaman ini disediakan oleh PWA agar aplikasi tetap terasa native saat perangkat
            kehilangan jaringan di lapangan.
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-2xl">
              <Link href="/dashboard/activity-hub/my-day">Coba buka Daily Activity</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/dashboard">Kembali ke dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
