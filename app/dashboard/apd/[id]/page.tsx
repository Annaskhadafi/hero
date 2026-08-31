import { notFound } from "next/navigation";
import { fetchApdRequestById } from "@/lib/apd-data";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/dashboard/apd">
              <ArrowLeft className="size-4" />
              Kembali
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild className="gap-2">
            <Link href={`/print/apd/${id}`} target="_blank">
              <Printer className="size-4" />
              Cetak PDF
            </Link>
          </Button>
        </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Approval</CardTitle>
          </CardHeader>
          <CardContent>
            {request.approvalHistory && request.approvalHistory.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {request.approvalHistory.map((step, index) => (
                  <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-secondary text-secondary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {step.status === "approved" && (
                        <div className="size-2.5 rounded-full bg-green-500" />
                      )}
                      {step.status === "rejected" && (
                        <div className="size-2.5 rounded-full bg-destructive" />
                      )}
                      {step.status === "pending" && (
                        <div className="size-2.5 rounded-full bg-yellow-500 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-lg border bg-card shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="font-semibold text-foreground">{step.approverName || "Approver"}</div>
                        <time className="text-xs text-muted-foreground">
                          {(step as any).resolvedAt ? new Date((step as any).resolvedAt).toLocaleString("id-ID") : "Menunggu"}
                        </time>
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        Status: <strong className={step.status === 'approved' ? 'text-green-600' : step.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>{step.status}</strong>
                      </div>
                      {step.decisionNote && (
                        <div className="mt-2 text-sm italic text-muted-foreground border-l-2 pl-2">
                          "{step.decisionNote}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada rute approval yang berjalan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
