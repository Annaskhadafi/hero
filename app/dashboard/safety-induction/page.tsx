import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileText, Eye, Users, Calendar, Building2 } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function SafetyInductionDashboard() {
  const inductions = await db
    .select()
    .from(heroSafetyInductions)
    .orderBy(desc(heroSafetyInductions.createdAt))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const totalHariIni = inductions.filter(i => i.createdAt >= today).length
  const totalBulanIni = inductions.filter(i => i.createdAt.getMonth() === today.getMonth() && i.createdAt.getFullYear() === today.getFullYear()).length
  
  const uniqueCompanies = new Set(inductions.map(i => i.companyOrigin)).size

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Safety Induction Dashboard</h1>
          <p className="text-muted-foreground">
            Ringkasan data tamu dan karyawan yang telah mengisi form Safety Induction.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengunjung Hari Ini</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHariIni}</div>
            <p className="text-xs text-muted-foreground">Total form diisi hari ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulan Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBulanIni}</div>
            <p className="text-xs text-muted-foreground">Total form diisi bulan ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instansi / Perusahaan</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCompanies}</div>
            <p className="text-xs text-muted-foreground">Jumlah instansi berbeda</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Safety Induction</CardTitle>
          <CardDescription>Menampilkan {inductions.length} data terbaru.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Masuk</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Instansi / Perusahaan</TableHead>
                  <TableHead>No. Telepon</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inductions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Belum ada data.
                    </TableCell>
                  </TableRow>
                ) : (
                  inductions.map((induction) => (
                    <TableRow key={induction.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {induction.createdAt.toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>{induction.fullName}</TableCell>
                      <TableCell>{induction.companyOrigin}</TableCell>
                      <TableCell>{induction.phoneNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={induction.purpose}>
                        {induction.purpose}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-primary" />
                                Detail Safety Induction
                              </DialogTitle>
                              <DialogDescription>
                                Disetujui pada {induction.agreedAt.toLocaleString('id-ID')}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold text-sm text-right text-muted-foreground">Nama</span>
                                <span className="col-span-3 text-sm font-medium">{induction.fullName}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold text-sm text-right text-muted-foreground">Instansi</span>
                                <span className="col-span-3 text-sm font-medium">{induction.companyOrigin}</span>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <span className="font-semibold text-sm text-right text-muted-foreground">Telepon</span>
                                <span className="col-span-3 text-sm font-medium">{induction.phoneNumber}</span>
                              </div>
                              <div className="grid grid-cols-4 items-start gap-4">
                                <span className="font-semibold text-sm text-right text-muted-foreground pt-1">Tujuan</span>
                                <div className="col-span-3 text-sm bg-slate-50 p-3 rounded-md border">
                                  {induction.purpose}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-start gap-4 mt-4 border-t pt-4">
                                <span className="font-semibold text-sm text-right text-muted-foreground pt-2">Tanda Tangan</span>
                                <div className="col-span-3">
                                  {induction.signatureUrl ? (
                                    <div className="border rounded-md p-2 bg-white inline-block">
                                      <Image 
                                        src={induction.signatureUrl} 
                                        alt="Signature" 
                                        width={200} 
                                        height={100}
                                        className="object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-sm text-red-500 italic">Tidak ada tanda tangan</span>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Dengan tanda tangan ini, yang bersangkutan menyatakan telah membaca dan akan mematuhi seluruh peraturan K3L PT. Chitra Paratama.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
