"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { registerForPublicTest } from "@/app/actions/candidate-tests";
import { toast } from "sonner";

export function PublicTestRegistrationClient({ test }: { test: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartTest = async () => {
    setIsSubmitting(true);
    try {
      const accessKey = await registerForPublicTest(test.id);
      toast.success("Test siap dimulai");
      router.push(`/test/${accessKey}`);
    } catch (error: any) {
      toast.error(error.message || "Gagal memulai test");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 flex flex-col items-center justify-center">
      <Card className="max-w-md w-full border shadow-sm">
        <CardHeader className="text-center pb-6 border-b bg-muted/10">
          <CardTitle className="text-2xl">{test.title}</CardTitle>
          <CardDescription className="mt-2">{test.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Link public langsung masuk ke test.</p>
            <p>Tidak perlu mengisi nama, email, atau nomor telepon.</p>
          </div>
          <Button className="h-11 w-full" disabled={isSubmitting} onClick={handleStartTest}>
            {isSubmitting ? "Menyiapkan Test..." : "Mulai Test"}
          </Button>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mb-1">Durasi: <span className="font-medium text-foreground">{test.timeLimitMinutes} Menit</span></p>
        <p>Pastikan koneksi internet stabil sebelum mulai.</p>
      </div>
    </div>
  );
}
