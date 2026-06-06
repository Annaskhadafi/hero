"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { registerTestGroup } from "@/app/actions/test-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ClientPage({ group, items }: { group: any; items: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartTest = async () => {
    setLoading(true);
    try {
      const result = await registerTestGroup(group.id);
      if (result.success && result.redirectUrl) {
        toast.success("Mempersiapkan tes...");
        router.push(result.redirectUrl);
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
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center space-y-2 pb-6">
          <CardTitle className="text-2xl font-bold text-primary">{group.name}</CardTitle>
          <CardDescription className="text-base">{group.description}</CardDescription>
        </CardHeader>
        <CardContent>
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

          <Button onClick={handleStartTest} className="w-full mt-2 h-11" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mempersiapkan Tes...
              </>
            ) : (
              "Mulai Tes Sekarang"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
