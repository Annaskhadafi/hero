"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmailLogRow = {
  id: number;
  deliveryChannel: string;
  toEmail: string;
  ccEmail: string | null;
  fromEmail: string | null;
  templateName: string | null;
  templateCode: string | null;
  subject: string;
  status: string;
  errorMessage: string | null;
  htmlContent: string | null;
  textContent: string | null;
  sentAt: Date | null;
  createdAt: Date;
  employeeName: string | null;
};

function getStatusLabel(value: string) {
  const labels: Record<string, string> = {
    sent: "Terkirim",
    pending: "Menunggu",
    failed: "Gagal",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

export function EmailDeliveryLogTable({ logs }: { logs: EmailLogRow[] }) {
  const [selected, setSelected] = useState<EmailLogRow | null>(null);

  return (
    <div className="space-y-4">
      <MinimalTableShell
        label="email log"
        fileName="email-delivery-log"
        searchPlaceholder="Cari penerima, judul email, atau nama karyawan..."
        filters={
          <TableMultiFilter
            label="status"
            filterKey="status"
            options={[
              { value: "sent", label: "Terkirim" },
              { value: "pending", label: "Menunggu" },
              { value: "failed", label: "Gagal" },
            ]}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Jenis Pesan</TableHead>
              <TableHead>Judul Email</TableHead>
              <TableHead>Dikirim Oleh</TableHead>
              <TableHead>Waktu Kirim</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                data-date-value={(log.sentAt ?? log.createdAt).toISOString()}
                data-filter-status={log.status}
              >
                <TableCell>
                  <Badge
                    variant={log.status === "failed" ? "destructive" : log.status === "sent" ? "default" : "outline"}
                    className="rounded-full"
                  >
                    {getStatusLabel(log.status)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.toEmail}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.templateName ?? "Email langsung"}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {log.subject}
                </TableCell>
                <TableCell className="text-sm">{log.employeeName ?? "Sistem"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {(log.sentAt ?? log.createdAt).toLocaleString("id-ID")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-primary hover:bg-surface-container-low"
                    onClick={() => setSelected(log)}
                    aria-label={`Lihat email ${log.subject}`}
                    title={`Lihat email ${log.subject}`}
                  >
                    <Eye className="size-4" />
                    <span className="sr-only">Lihat detail email</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Pratinjau Email</DialogTitle>
            <DialogDescription>
              Lihat isi email dan informasi pengiriman kepada penerima.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid min-h-0 gap-4 px-6 pb-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3 rounded-xl border p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Penerima</p>
                  <p className="break-all font-mono">{selected.toEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CC</p>
                  <p className="break-all font-mono">{selected.ccEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengirim</p>
                  <p className="break-all font-mono">{selected.fromEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jenis Pesan</p>
                  <p>{selected.templateName ?? "Email langsung"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Judul Email</p>
                  <p>{selected.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant={selected.status === "failed" ? "destructive" : selected.status === "sent" ? "default" : "outline"}
                    className="rounded-full"
                  >
                    {getStatusLabel(selected.status)}
                  </Badge>
                  {selected.errorMessage ? (
                    <p className="mt-2 text-xs text-red-600">{selected.errorMessage}</p>
                  ) : null}
                </div>
              </div>

              <Tabs
                defaultValue={selected.htmlContent ? "html" : "text"}
                className="min-w-0"
              >
                <TabsList className="grid w-full grid-cols-2 sm:w-fit">
                  <TabsTrigger value="html">Tampilan Email</TabsTrigger>
                  <TabsTrigger value="text">Isi Teks</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-4 h-[min(65vh,560px)] min-w-0">
                  <div className="h-full min-w-0 overflow-hidden rounded-xl border bg-white">
                    {selected.htmlContent ? (
                      <iframe
                        srcDoc={selected.htmlContent}
                        title="Pratinjau email"
                        className="h-full w-full"
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Tampilan email tidak tersedia.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="text" className="mt-4 h-[min(65vh,560px)] min-w-0">
                  <div className="h-full overflow-auto rounded-xl border p-4">
                    <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                      {selected.textContent ?? "Isi teks tidak tersedia."}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
