import { notFound } from "next/navigation";
import { fetchApdRequestById } from "@/lib/apd-data";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export default async function ApdRequestDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return notFound();

  const request = await fetchApdRequestById(id);
  if (!request) return notFound();

  return (
    <AdminPageShell
      eyebrow="Preview Permintaan"
      title={`Permintaan APD: ${request.requestNumber}`}
      description={`Diajukan oleh ${request.employeeName} pada ${request.requestDate?.toLocaleDateString("id-ID")}`}
      actions={
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/dashboard/apd">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6 pt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Pemohon</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Nama Karyawan</p>
              <p className="font-medium">{request.employeeName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">NIK / SN</p>
              <p className="font-medium">{request.employeeSn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Departemen</p>
              <p className="font-medium">{request.departmentName ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lokasi Kerja</p>
              <p className="font-medium">{request.siteName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Permintaan</p>
              <div className="mt-1">
                <AdminStatusBadge value={request.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detail Item APD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {request.items.map((item, index) => (
                <div key={item.id} className="rounded-lg border p-4 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold">{item.itemType}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-muted-foreground">Jenis Permintaan:</p>
                      <p className="capitalize">{item.requestType}</p>
                      
                      <p className="text-muted-foreground">Jumlah:</p>
                      <p>{item.quantity}</p>
                      
                      <p className="text-muted-foreground">Keterangan:</p>
                      <p>{item.notes || "-"}</p>
                    </div>
                  </div>
                  
                  {item.photoUrl && (
                    <div className="w-full md:w-32 h-32 relative rounded-md overflow-hidden border">
                      <Image 
                        src={item.photoUrl} 
                        alt={`Foto ${item.itemType}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Catatan Tambahan</p>
              <p className="font-medium">{request.notes || "-"}</p>
            </div>
            
            {request.signatureUrl && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tanda Tangan Digital Pemohon</p>
                <div className="w-48 h-24 relative rounded-md overflow-hidden border bg-white">
                  <Image 
                    src={request.signatureUrl} 
                    alt="Tanda Tangan"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
