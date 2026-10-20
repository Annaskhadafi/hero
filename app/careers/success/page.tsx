import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { headers } from "next/headers";
import { isKarirHost } from "@/lib/karir-config";

export const dynamic = "force-dynamic";

export default async function CareerSuccessPage() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const isKarir = isKarirHost(host);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="mx-auto max-w-md text-center space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="text-3xl font-bold tracking-tight">Lamaran Berhasil Dikirim!</h1>
        <p className="text-muted-foreground">
          Terima kasih telah melamar. Berkas lamaran dan CV Anda telah kami terima. Tim Human Capital kami akan meninjau berkas Anda dan menghubungi jika profil Anda sesuai dengan kualifikasi yang dibutuhkan.
        </p>
        <Button asChild className="mt-8 bg-blue-700 hover:bg-blue-800">
          <Link href={isKarir ? "/" : "/careers"}>Kembali ke Daftar Lowongan</Link>
        </Button>
      </div>
    </div>
  );
}
