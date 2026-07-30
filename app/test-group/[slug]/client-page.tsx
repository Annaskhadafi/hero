"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerTestGroup } from "@/app/actions/test-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InAppBrowserGuard } from "@/components/candidate/InAppBrowserGuard";

export default function ClientPage({ group, items }: { group: any; items: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState("");

  const scheduledAt = searchParams.get("scheduledAt");
  const scheduledEndAt = searchParams.get("scheduledEndAt");

  const scheduleStart = scheduledAt ? new Date(scheduledAt) : null;
  const scheduleEnd = scheduledEndAt ? new Date(scheduledEndAt) : null;

  useEffect(() => {
    if (!scheduleStart) return;
    const tick = () => {
      const now = new Date();
      const diff = scheduleStart.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (days > 0) setCountdown(`${days}h ${hours}j ${minutes}m ${seconds}d`);
      else setCountdown(`${hours}j ${minutes}m ${seconds}d`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [scheduleStart]);

  const isBeforeSchedule = scheduleStart && new Date() < scheduleStart;
  const isAfterEnd = scheduleEnd && new Date() > scheduleEnd;

  const handleStartTest = async () => {
    setLoading(true);
    try {
      const result = await registerTestGroup(group.id);
      if (result.success && result.redirectUrl) {
        toast.success("Mempersiapkan tes...");
        window.location.href = result.redirectUrl;
      } else {
        toast.error(result.error || "Gagal mendaftar tes.");
        setLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4">
        <InAppBrowserGuard />
      </div>
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-2xl font-bold text-primary">{group.name}</CardTitle>
          <CardDescription className="text-base">{group.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isAfterEnd ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm font-medium text-destructive">Periode tes telah berakhir.</p>
              <p className="text-xs text-muted-foreground mt-1">{scheduleEnd?.toLocaleString("id-ID")}</p>
            </div>
          ) : isBeforeSchedule && scheduleStart ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-sm font-medium text-amber-700">Tes akan dimulai dalam:</p>
              <p className="text-3xl font-bold text-amber-700 mt-1 tracking-tight">{countdown}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {scheduleStart.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {" — "}
                {scheduleStart.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                {scheduleEnd ? ` s/d ${scheduleEnd.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
          ) : null}

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2">Rangkaian Tes:</h3>
            <ul className="text-sm space-y-2">
              {items.map((item, index) => (
                <li key={item.id} className="flex justify-between items-center">
                  <span>{index + 1}. {item.test.title}</span>
                  <span className="text-muted-foreground text-xs">{item.test.timeLimitMinutes} Menit</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleStartTest}
            className="w-full mt-2 h-11"
            disabled={loading || !!isBeforeSchedule || !!isAfterEnd}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan Tes...
              </>
            ) : isBeforeSchedule ? (
              "Tes Belum Tersedia"
            ) : isAfterEnd ? (
              "Tes Sudah Berakhir"
            ) : (
              "Mulai Tes Sekarang"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
