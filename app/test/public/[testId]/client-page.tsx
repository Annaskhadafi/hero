"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerForPublicTest } from "@/app/actions/candidate-tests";
import { toast } from "sonner";

export function PublicTestRegistrationClient({ test }: { test: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: ""
  });

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      toast.error("Nama dan Nomor Telepon wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const accessKey = await registerForPublicTest(test.id, formData);
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
        <CardContent className="pt-6">
          <form onSubmit={handleStartTest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input
                id="fullName"
                placeholder="Masukkan nama lengkap Anda"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon / WhatsApp <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                placeholder="Contoh: 08123456789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Opsional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <Button type="submit" className="h-11 w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Menyiapkan Test..." : "Mulai Test"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p className="mb-1">Durasi: <span className="font-medium text-foreground">{test.timeLimitMinutes} Menit</span></p>
        <p>Pastikan koneksi internet stabil sebelum mulai.</p>
      </div>
    </div>
  );
}
