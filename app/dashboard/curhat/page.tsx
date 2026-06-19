import { getMySessions, getHrPersonnel, createSession } from "@/app/actions/hr-counseling";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { redirect } from "next/navigation";

export default async function CurhatPage() {
  const sessions = await getMySessions();
  const hrList = await getHrPersonnel();

  async function handleCreateSession(formData: FormData) {
    "use server";
    const hrId = parseInt(formData.get("hrId") as string);
    const category = formData.get("category") as string;
    
    if (!hrId || !category) return;
    
    const session = await createSession(hrId, category);
    if (session) {
      redirect(`/dashboard/curhat/${session.id}`);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Curhat Dengan HR</h1>
          <p className="text-muted-foreground">Konsultasi pribadi dan aman dengan tim HR.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Mulai Sesi Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mulai Sesi Curhat Baru</DialogTitle>
            </DialogHeader>
            <form action={handleCreateSession}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="hrId">Pilih HR</Label>
                  <Select name="hrId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih HR..." />
                    </SelectTrigger>
                    <SelectContent>
                      {hrList.map((hr) => (
                        <SelectItem key={hr.id} value={hr.id.toString()}>
                          {hr.name} ({hr.jobTitle})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Karir">Karir</SelectItem>
                      <SelectItem value="Masalah Pribadi">Masalah Pribadi</SelectItem>
                      <SelectItem value="Konflik Pekerjaan">Konflik Pekerjaan</SelectItem>
                      <SelectItem value="Pelecehan/Kekerasan">Pelecehan/Kekerasan</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Mulai Chat</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">Belum Ada Sesi</h3>
              <p className="text-muted-foreground">Mulai sesi baru untuk berkonsultasi dengan HR.</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:bg-accent/50 transition-colors">
              <Link href={`/dashboard/curhat/${session.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{session.category}</h3>
                    <p className="text-sm text-muted-foreground">
                      HR: {session.hrName} • Diperbarui: {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={session.status === "open" ? "default" : "secondary"}>
                    {session.status === "open" ? "Aktif" : "Selesai"}
                  </Badge>
                </CardContent>
              </Link>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
