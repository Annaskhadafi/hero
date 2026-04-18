"use client";

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<EmailLogRow | null>(null);

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();

    return logs.filter((log) => {
      const haystack = [
        log.toEmail,
        log.ccEmail ?? "",
        log.subject,
        log.templateName ?? "",
        log.templateCode ?? "",
        log.employeeName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !query || haystack.includes(query);
      const matchesStatus = status === "all" || log.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, logs, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Cari penerima, judul email, atau nama karyawan..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="sent">Terkirim</SelectItem>
            <SelectItem value="pending">Menunggu</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Jenis Pesan</TableHead>
              <TableHead>Judul Email</TableHead>
              <TableHead>Dikirim Oleh</TableHead>
              <TableHead>Waktu Kirim</TableHead>
              <TableHead>Lihat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id}>
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
                  <Button variant="outline" size="sm" onClick={() => setSelected(log)}>
                    <Eye className="size-4" />
                    Lihat
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Pratinjau Email</DialogTitle>
            <DialogDescription>
              Lihat isi email dan informasi pengiriman kepada penerima.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-3 rounded-xl border p-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Penerima</p>
                  <p className="font-mono">{selected.toEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CC</p>
                  <p className="font-mono">{selected.ccEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengirim</p>
                  <p className="font-mono">{selected.fromEmail ?? "—"}</p>
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

              <Tabs defaultValue={selected.htmlContent ? "html" : "text"} className="min-h-[420px]">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="html">Tampilan Email</TabsTrigger>
                  <TabsTrigger value="text">Isi Teks</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="h-[420px]">
                  <div className="h-full overflow-hidden rounded-xl border bg-white">
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
                <TabsContent value="text" className="h-[420px]">
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
