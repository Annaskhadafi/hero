'use client'

import * as React from 'react'
import { Bell, CheckCircle2, Copy, Edit, Eye, PenLine, Plus, Printer, Settings, Trash2 } from 'lucide-react'

import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JsaFormDialog } from './jsa-form-dialog'
import { JsaPrintPreview } from './jsa-print-preview'
import { deleteJsa, getJsaById, saveJsaSettings, type JsaSettings } from '@/app/dashboard/hse/jsa/actions'
import { toast } from 'sonner'


interface JsaWorkspaceProps {
  jsaList: any[]
  settings: JsaSettings
}

export function JsaWorkspace({ jsaList, settings }: JsaWorkspaceProps) {
  const [formOpen, setFormOpen] = React.useState(false)
  const [printOpen, setPrintOpen] = React.useState(false)
  const [selectedJsa, setSelectedJsa] = React.useState<any>(null)
  const [isLoadingJsa, setIsLoadingJsa] = React.useState(false)
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  const [settingsForm, setSettingsForm] = React.useState<JsaSettings>(settings)
  const router = useRouter()

  const publicJsaPath = '/jsa'

  const handleCopyPublicLink = async () => {
    const link = `${window.location.origin}${publicJsaPath}`

    try {
      await navigator.clipboard.writeText(link)
      toast.success('Public link JSA berhasil dicopy')
    } catch (err) {
      toast.error('Gagal copy public link JSA')
    }
  }

  const handleCreate = () => {
    setSelectedJsa(null)
    setFormOpen(true)
  }

  const handleEdit = async (id: string) => {
    try {
      setIsLoadingJsa(true)
      const data = await getJsaById(id)
      setSelectedJsa(data)
      setFormOpen(true)
    } catch (err) {
      toast.error('Gagal mengambil data JSA')
    } finally {
      setIsLoadingJsa(false)
    }
  }

  const handlePrint = (id: string) => {
    window.open(`/print/jsa/${id}`, '_blank')
  }

  const handlePreview = async (id: string) => {
    try {
      setIsLoadingJsa(true)
      const data = await getJsaById(id)
      setSelectedJsa(data)
      setPrintOpen(true)
    } catch (err) {
      toast.error('Gagal mengambil data JSA')
    } finally {
      setIsLoadingJsa(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus JSA ini?')) {
      try {
        await deleteJsa(id)
        toast.success('JSA berhasil dihapus')
        router.refresh()
      } catch (err) {
        toast.error('Gagal menghapus JSA')
      }
    }
  }

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true)
      await saveJsaSettings(settingsForm)
      toast.success('Setting JSA berhasil disimpan')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan setting JSA')
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <>
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="data">Data JSA</TabsTrigger>
          <TabsTrigger value="notifikasi">Notifikasi</TabsTrigger>
          <TabsTrigger value="approval">Approval</TabsTrigger>
          <TabsTrigger value="ttd-online">TTD Online</TabsTrigger>
          <TabsTrigger value="setting">Setting</TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <MinimalTableShell
            label="JSA"
            title="Daftar JSA"
            description="Kelola formulir Job Safety Analysis"
            searchPlaceholder="Cari JSA..."
            primaryAction={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleCopyPublicLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Public Link
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Buat JSA
                </Button>
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. JSA</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>No. Peralatan</TableHead>
                  <TableHead>Tingkat Resiko</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jsaList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Belum ada data JSA
                    </TableCell>
                  </TableRow>
                ) : (
                  jsaList.map((jsa) => (
                    <TableRow key={jsa.id}>
                      <TableCell className="font-medium">{jsa.jsaNumber || '-'}</TableCell>
                      <TableCell>{new Date(jsa.createdAt).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={jsa.jobDescription}>
                        {jsa.jobDescription}
                      </TableCell>
                      <TableCell>{jsa.equipmentNumber}</TableCell>
                      <TableCell>
                        {jsa.riskLevel === 'H' ? (
                          <Badge variant="destructive">Tinggi</Badge>
                        ) : jsa.riskLevel === 'M' ? (
                          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Menengah</Badge>
                        ) : (
                          <Badge variant="secondary">Rendah</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(jsa.id)} disabled={isLoadingJsa} title="Preview JSA">
                            <Eye className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(jsa.id)} disabled={isLoadingJsa} title="Cetak JSA Baru">
                            <Printer className="w-4 h-4 text-slate-700" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(jsa.id)} disabled={isLoadingJsa} title="Edit JSA">
                            <Edit className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(jsa.id)} className="text-red-500 hover:text-red-600" disabled={isLoadingJsa} title="Hapus JSA">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </TabsContent>

        <TabsContent value="notifikasi">
          <JsaInfoPanel icon={Bell} title="Notifikasi HSE" description="Daftar event notifikasi JSA untuk tim HSE." items={["Form JSA baru masuk dari public link", "JSA menunggu approval", "JSA selesai ditandatangani"]} />
        </TabsContent>

        <TabsContent value="approval">
          <JsaInfoPanel icon={CheckCircle2} title="Approval JSA" description="Antrian approval JSA akan ditampilkan di sini." items={["Review risiko pekerjaan", "Approve / reject JSA", "Catatan revisi untuk pelaksana"]} />
        </TabsContent>

        <TabsContent value="ttd-online">
          <JsaInfoPanel icon={PenLine} title="TTD Online" description="Status tanda tangan online untuk JSA." items={["TTD pelaksana", "TTD HSE default", "Riwayat waktu tanda tangan"]} />
        </TabsContent>

        <TabsContent value="setting">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Setting JSA HSE</CardTitle>
                  <CardDescription>Pilih penerima notifikasi dan default TTD HSE. Penyimpanan permanen bisa disambungkan ke DB setting berikutnya.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Penerima Notifikasi</Label>
                <Textarea
                  rows={5}
                  placeholder="Isi nama/email HSE, pisahkan dengan koma"
                  value={settingsForm.notificationRecipients}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, notificationRecipients: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Contoh: hse@company.com, supervisor.hse@company.com</p>
              </div>
              <div className="space-y-2">
                <Label>Default TTD HSE</Label>
                <Input
                  placeholder="Nama penanggung jawab HSE"
                  value={settingsForm.defaultSignerName}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, defaultSignerName: event.target.value }))}
                />
                <Input
                  placeholder="Jabatan"
                  value={settingsForm.defaultSignerTitle}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, defaultSignerTitle: event.target.value }))}
                />
                <Input
                  placeholder="Email"
                  value={settingsForm.defaultSignerEmail}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, defaultSignerEmail: event.target.value }))}
                />
              </div>
              <div className="lg:col-span-2 flex justify-end">
                <Button type="button" onClick={handleSaveSettings} disabled={isSavingSettings}>
                  Simpan Setting
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <JsaFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        initialData={selectedJsa} 
        id={selectedJsa?.id} 
      />

      <JsaPrintPreview 
        open={printOpen} 
        onOpenChange={setPrintOpen} 
        data={selectedJsa} 
      />
    </>
  )
}

function JsaInfoPanel({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  items: string[]
}) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
