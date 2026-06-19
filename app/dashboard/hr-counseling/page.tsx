import { getHrSessions } from "@/app/actions/hr-counseling";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default async function HrCounselingDashboard() {
  const sessions = await getHrSessions();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard HR Counseling</h1>
        <p className="text-muted-foreground">Kelola sesi konsultasi dari karyawan.</p>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-semibold">Belum Ada Sesi</h3>
              <p className="text-muted-foreground">Anda belum menerima permintaan curhat dari karyawan.</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:bg-accent/50 transition-colors">
              <Link href={`/dashboard/hr-counseling/${session.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{session.userName} - {session.category}</h3>
                    <p className="text-sm text-muted-foreground">
                      Dibuat pada: {new Date(session.createdAt).toLocaleDateString()} • Diperbarui: {new Date(session.updatedAt).toLocaleDateString()}
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
