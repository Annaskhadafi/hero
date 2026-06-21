'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, UserCog, Ban, CheckCircle, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { bulkUserActionsAction } from '@/app/dashboard/admin-actions'

export function SecurityUserBulkActions({
  selectedIds,
  onClearSelection,
  roleOptions,
  sections,
  sites,
}: {
  selectedIds: number[]
  onClearSelection: () => void
  roleOptions: Array<{ id: number; name: string }>
  sections: Array<{ id: number; name: string }>
  sites: Array<{ id: number; name: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
    roleId?: number
    sectionId?: number
    sectionName?: string
    siteId?: number
    siteName?: string
  }>({ open: false, action: '', title: '', description: '' })

  async function handleBulkAction(
    action: string,
    extras?: { roleId?: number; sectionId?: number; sectionName?: string; siteId?: number; siteName?: string }
  ) {
    const formData = new FormData()
    formData.append('action', action)
    formData.append('employeeIds', JSON.stringify(selectedIds))
    if (extras?.roleId) formData.append('roleId', extras.roleId.toString())
    if (extras?.sectionId) formData.append('sectionId', extras.sectionId.toString())
    if (extras?.sectionName) formData.append('sectionName', extras.sectionName)
    if (extras?.siteId) formData.append('siteId', extras.siteId.toString())
    if (extras?.siteName) formData.append('siteName', extras.siteName)

    const result = await bulkUserActionsAction(formData)

    if (result.status === 'success') {
      onClearSelection()
      startTransition(() => router.refresh())
    }

    setConfirmDialog({ open: false, action: '', title: '', description: '' })
  }

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-primary/10 flex items-center gap-2 rounded-xl px-4 py-2">
        <span className="text-sm font-medium">{selectedIds.length} user dipilih</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              Bulk Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  action: 'activate',
                  title: 'Aktifkan Users',
                  description: `Aktifkan ${selectedIds.length} user yang dipilih?`,
                })
              }
            >
              <CheckCircle className="mr-2 size-4" />
              Aktifkan
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  action: 'ban',
                  title: 'Nonaktifkan Users',
                  description: `Nonaktifkan ${selectedIds.length} user yang dipilih?`,
                })
              }
            >
              <Ban className="mr-2 size-4" />
              Nonaktifkan
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Building2 className="mr-2 size-4" />
                Ubah Section
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {sections.map((section) => (
                    <DropdownMenuItem
                      key={section.id}
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          action: 'change-section',
                          title: 'Ubah Section Users',
                          description: `Ubah section ${selectedIds.length} user ke "${section.name}"?`,
                          sectionId: section.id,
                          sectionName: section.name,
                        })
                      }
                    >
                      {section.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MapPin className="mr-2 size-4" />
                Ubah Lokasi Site
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {sites.map((site) => (
                    <DropdownMenuItem
                      key={site.id}
                      onClick={() =>
                        setConfirmDialog({
                          open: true,
                          action: 'change-site',
                          title: 'Ubah Lokasi Site Users',
                          description: `Ubah lokasi site ${selectedIds.length} user ke "${site.name}"?`,
                          siteId: site.id,
                          siteName: site.name,
                        })
                      }
                    >
                      {site.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {roleOptions.map((role) => (
              <DropdownMenuItem
                key={role.id}
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    action: 'change-role',
                    title: 'Ubah Role Users',
                    description: `Ubah ${selectedIds.length} user ke role ${role.name}? User perlu login ulang.`,
                    roleId: role.id,
                  })
                }
              >
                <UserCog className="mr-2 size-4" />
                Role: {role.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  action: 'delete',
                  title: 'Hapus Users',
                  description: `Hapus ${selectedIds.length} user yang dipilih? Aksi ini tidak bisa dibatalkan.`,
                })
              }
              className="text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleBulkAction(confirmDialog.action, {
                  roleId: confirmDialog.roleId,
                  sectionId: confirmDialog.sectionId,
                  sectionName: confirmDialog.sectionName,
                  siteId: confirmDialog.siteId,
                  siteName: confirmDialog.siteName,
                })
              }
            >
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
