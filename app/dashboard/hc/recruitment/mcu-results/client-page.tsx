"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { IconStethoscope, IconCheck, IconX, IconFileText, IconArrowLeft, IconFilter } from "@tabler/icons-react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { RecruitmentTabBar } from "@/components/hc/recruitment-tab-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";
import { recordMcuResult, uploadMcuResultFile } from "@/app/actions/mcu";

interface McuRecord {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string | null;
  klinikName: string;
  klinikEmail: string;
  paketMcu: string;
  scheduledDate: string;
  status: string;
  resultNotes: string;
  resultFileUrl: string;
  resultDate: string | null;
  resultBy: string;
}

export function RecruitmentMcuResultsClientPage({ records }: { records: McuRecord[] }) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    record: McuRecord | null;
    result: "Fit" | "Unfit";
    notes: string;
    file: File | null;
    resultBy: string;
  }>({ open: false, record: null, result: "Fit", notes: "", file: null, resultBy: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = filterStatus === "all" || r.status === filterStatus;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.candidateName.toLowerCase().includes(q) ||
        r.klinikName.toLowerCase().includes(q) ||
        (r.jobTitle ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [records, filterStatus, search]);

  const pendingCount = records.filter((r) => r.status === "Scheduled").length;
  const fitCount = records.filter((r) => r.status === "Fit").length;
  const unfitCount = records.filter((r) => r.status === "Unfit").length;

  const handleSubmit = async () => {
    if (!resultDialog.record) return;
    setIsSubmitting(true);
    try {
      let fileUrl = "";
      if (resultDialog.file) {
        const bytes = await resultDialog.file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        fileUrl = await uploadMcuResultFile(resultDialog.record.id, base64, resultDialog.file.name);
      }
      await recordMcuResult(resultDialog.record.id, {
        result: resultDialog.result,
        notes: resultDialog.notes,
        resultBy: resultDialog.resultBy,
        resultFileUrl: fileUrl || undefined,
      });
      toast.success(`MCU marked as ${resultDialog.result}.`);
      setResultDialog({ open: false, record: null, result: "Fit", notes: "", file: null, resultBy: "" });
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to record MCU result.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPageShell
      eyebrow="M7 • Recruitment"
      title="MCU Result Recording"
      description="Central workspace to record Medical Check Up results and trigger decision gates."
      badge={`${pendingCount} pending`}
      actions={
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/dashboard/hc/recruitment">
            <IconArrowLeft className="w-4 h-4" />
            Back to Recruitment
          </Link>
        </Button>
      }
    >
      <RecruitmentTabBar />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <IconStethoscope className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <IconCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fit</p>
              <p className="text-xl font-bold">{fitCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <IconX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unfit</p>
              <p className="text-xl font-bold">{unfitCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate, clinic, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Fit">Fit</SelectItem>
                <SelectItem value="Unfit">Unfit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No MCU records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/dashboard/hc/recruitment/candidates/${r.candidateId}`} className="font-medium hover:underline">
                          {r.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.jobTitle || "-"}</TableCell>
                      <TableCell className="text-sm">{r.klinikName}</TableCell>
                      <TableCell className="text-sm">{r.paketMcu}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.scheduledDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "Scheduled" ? "default" : r.status === "Fit" ? "secondary" : "destructive"}
                          className={r.status === "Fit" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "Scheduled" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8"
                              onClick={() =>
                                setResultDialog({ open: true, record: r, result: "Fit", notes: "", file: null, resultBy: "" })
                              }
                            >
                              <IconCheck className="w-3.5 h-3.5 mr-1" /> Fit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                              onClick={() =>
                                setResultDialog({ open: true, record: r, result: "Unfit", notes: "", file: null, resultBy: "" })
                              }
                            >
                              <IconX className="w-3.5 h-3.5 mr-1" /> Unfit
                            </Button>
                          </div>
                        ) : (
                          <div className="text-right space-y-0.5">
                            {r.resultDate && (
                              <p className="text-xs text-muted-foreground">{format(new Date(r.resultDate), "dd MMM yyyy")}</p>
                            )}
                            {r.resultBy && <p className="text-xs text-muted-foreground">by {r.resultBy}</p>}
                            {r.resultFileUrl && (
                              <a
                                href={r.resultFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                              >
                                <IconFileText className="w-3 h-3" /> File
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog
        open={resultDialog.open}
        onOpenChange={(open) => {
          if (!open) setResultDialog({ open: false, record: null, result: "Fit", notes: "", file: null, resultBy: "" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record MCU Result — {resultDialog.result}</DialogTitle>
            <DialogDescription>
              {resultDialog.record?.candidateName} — {resultDialog.record?.jobTitle || "Unknown Position"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Recorded By</Label>
              <Input
                placeholder="Your name"
                value={resultDialog.resultBy}
                onChange={(e) => setResultDialog((prev) => ({ ...prev, resultBy: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder={resultDialog.result === "Fit" ? "Optional notes..." : "Reason for unfit result..."}
                value={resultDialog.notes}
                onChange={(e) => setResultDialog((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Result File (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setResultDialog((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResultDialog({ open: false, record: null, result: "Fit", notes: "", file: null, resultBy: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={resultDialog.result === "Unfit" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isSubmitting ? "Saving..." : `Confirm ${resultDialog.result}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
