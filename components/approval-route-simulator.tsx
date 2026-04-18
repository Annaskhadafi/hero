"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { simulateApprovalRouteAction } from "@/app/dashboard/master-data/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EmployeeOption = {
  id: number;
  name: string;
  jobTitle: string;
};

type SimulatedRoute = {
  matrixId: number | null;
  matrixName: string | null;
  structureId: number | null;
  structureName: string | null;
  transactionType: string;
  warnings: string[];
  steps: Array<{
    stepOrder: number;
    label: string;
    approverName: string;
    approverEmployeeId: number | null;
    approverNodeId: number | null;
    approvalMatrixStepId: number | null;
    resolutionSource: string;
    canDelegate: boolean;
    slaHours: number;
    nodeLabel: string | null;
    fallbackLabel: string | null;
    escalationLabel: string | null;
  }>;
};

type SimulationState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  route: SimulatedRoute | null;
};

type Props = {
  employees: EmployeeOption[];
};

const PRIORITY_OPTIONS = ["normal", "safety", "emergency"];

export function ApprovalRouteSimulator({ employees }: Props) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id.toString() ?? "0");
  const [activityType, setActivityType] = useState("Daily Activity");
  const [priority, setPriority] = useState("normal");
  const [overtimeMinutes, setOvertimeMinutes] = useState("0");
  const [state, setState] = useState<SimulationState>({
    status: "idle",
    message: "Pilih parameter lalu jalankan simulasi.",
    route: null,
  });

  const selectedEmployee =
    employees.find((employee) => employee.id.toString() === employeeId) ?? null;

  const runSimulation = async (event: React.FormEvent) => {
    event.preventDefault();

    if (employeeId === "0") {
      toast.error("Pilih employee untuk simulasi.");
      return;
    }

    setState({
      status: "loading",
      message: "Sedang menghitung route approval...",
      route: null,
    });

    const form = new FormData();
    form.append("employeeId", employeeId);
    form.append("activityType", activityType);
    form.append("priority", priority);
    form.append("overtimeMinutes", overtimeMinutes);

    const result = await simulateApprovalRouteAction(form);

    if (result.status === "success") {
      setState({
        status: "success",
        message: result.message,
        route: (result.route ?? null) as SimulatedRoute | null,
      });
      return;
    }

    setState({
      status: "error",
      message: result.message,
      route: null,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">
            Simulasi Jalur Approval
          </CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Cek pemeriksa yang akan menerima pengajuan sebelum alur dipakai tim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={runSimulation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="simulation-employee">Karyawan</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="simulation-employee">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} {employee.jobTitle ? `- ${employee.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulation-activity">Jenis aktivitas</Label>
              <Input
                id="simulation-activity"
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
                placeholder="Mis. Daily Activity, Overtime Recap, HSE Patrol"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulation-priority">Prioritas</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="simulation-priority">
                  <SelectValue placeholder="Pilih prioritas" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulation-overtime">Overtime (menit)</Label>
              <Input
                id="simulation-overtime"
                type="number"
                min={0}
                max={1440}
                value={overtimeMinutes}
                onChange={(event) => setOvertimeMinutes(event.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-[#1d4ed8] hover:bg-[#1e40af]">
              {state.status === "loading" ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menjalankan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Jalankan Simulasi
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[1.6rem] bg-surface-container-lowest shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Pratinjau Jalur Approval</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Hasil simulasi pemeriksa, pengganti, eskalasi, dan posisi yang belum terisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={state.status === "error" ? "bg-[#fef2f2]" : "bg-[#eff6ff]"}>
            <AlertDescription className={state.status === "error" ? "text-[#b91c1c]" : "text-[#1e40af]"}>
              {state.message}
            </AlertDescription>
          </Alert>

          {selectedEmployee ? (
            <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4 text-sm text-muted-foreground">
              Simulasi untuk <span className="font-medium text-[#1e293b]">{selectedEmployee.name}</span>
              {" "}({selectedEmployee.jobTitle || "Tanpa jabatan"}) dengan aktivitas{" "}
              <span className="font-medium text-[#1e293b]">{activityType}</span>.
            </div>
          ) : null}

          {state.route ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard label="Alur approval" value={state.route.matrixName ?? "Alur standar"} />
                <SummaryCard label="Template Struktur" value={state.route.structureName ?? "Tanpa template"} />
                <SummaryCard label="Transaksi" value={state.route.transactionType} />
              </div>

              {state.route.warnings.length > 0 ? (
                <Alert className="bg-[#fffbeb]">
                  <AlertDescription className="text-[#92400e]">
                    {state.route.warnings.join(" ")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-3">
                {state.route.steps.map((step) => (
                  <div key={`${step.stepOrder}-${step.approvalMatrixStepId ?? "snapshot"}`} className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-[#eff6ff] text-[#1d4ed8]">
                        Tahap {step.stepOrder}
                      </Badge>
                      <span className="font-medium text-[#1e293b]">{step.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          step.approverEmployeeId == null
                            ? "bg-[#fef2f2] text-[#b91c1c]"
                            : "bg-[#ecfdf5] text-[#047857]"
                        }
                      >
                        {step.approverEmployeeId == null ? "Belum terisi" : "Siap"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-[#475569]">
                      <p>
                        <span className="font-medium text-[#334155]">Pemeriksa:</span>{" "}
                        {step.approverName}
                      </p>
                      <p>
                        <span className="font-medium text-[#334155]">Posisi:</span>{" "}
                        {step.nodeLabel ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium text-[#334155]">Pengganti:</span>{" "}
                        {step.fallbackLabel ?? "-"} |{" "}
                        <span className="font-medium text-[#334155]">Eskalasi:</span>{" "}
                        {step.escalationLabel ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium text-[#334155]">Batas waktu:</span> {step.slaHours} jam |{" "}
                        <span className="font-medium text-[#334155]">Bisa didelegasikan:</span>{" "}
                        {step.canDelegate ? "Ya" : "Tidak"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-[1.2rem] bg-surface-container-low p-10 text-center text-sm text-muted-foreground">
              Jalankan simulasi untuk melihat jalur approval, pemeriksa akhir, pengganti, dan catatan penting.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] bg-surface-container-low px-4 py-4">
      <p className="text-sm text-[#64748b]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#1e293b]">{value}</p>
    </div>
  );
}
