'use client'

import * as React from 'react'
import { Plus, Printer, Edit, Trash2, Eye } from 'lucide-react'

import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { JsaFormDialog } from './jsa-form-dialog'
import { JsaPrintPreview } from './jsa-print-preview'
import { deleteJsa, getJsaById } from '@/app/dashboard/hse/jsa/actions'
import { toast } from 'sonner'


interface JsaWorkspaceProps {
  jsaList: any[]
}

export function JsaWorkspace({ jsaList }: JsaWorkspaceProps) {
  const [search, setSearch] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [printOpen, setPrintOpen] = React.useState(false)
  const [selectedJsa, setSelectedJsa] = React.useState<any>(null)
  const [isLoadingJsa, setIsLoadingJsa] = React.useState(false)
  const router = useRouter()

  const filteredJsaList = React.useMemo(() => {
    return jsaList.filter(jsa => 
      (jsa.jsaNumber?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (jsa.jobDescription?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (jsa.equipmentNumber?.toLowerCase() || '').includes(search.toLowerCase())
    )
  }, [jsaList, search])

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

  return (
    <>
      <MinimalTableShell
        title="Daftar JSA"
        description="Kelola formulir Job Safety Analysis"
        searchPlaceholder="Cari JSA..."
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Buat JSA
          </Button>
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
            {filteredJsaList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Belum ada data JSA
                </TableCell>
              </TableRow>
            ) : (
              filteredJsaList.map((jsa) => (
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
