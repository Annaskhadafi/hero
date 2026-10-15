import fs from 'fs'
import path from 'path'

describe('P7. GA - ATK Workflow & Integration Tests', () => {
  it('registers ATK database schema in db/schema/atk.ts and exports in db/schema/index.ts', () => {
    const schemaFile = fs.readFileSync(path.join(process.cwd(), 'db/schema/atk.ts'), 'utf8')
    expect(schemaFile).toContain('heroMasterAtk')
    expect(schemaFile).toContain('heroAtkRequests')
    expect(schemaFile).toContain('heroAtkRequestItems')
    expect(schemaFile).toContain('hero_master_atk')
    expect(schemaFile).toContain('hero_atk_requests')
    expect(schemaFile).toContain('hero_atk_request_items')

    const indexFile = fs.readFileSync(path.join(process.cwd(), 'db/schema/index.ts'), 'utf8')
    expect(indexFile).toContain("export * from './atk'")
  })

  it('defines server actions for ATK CRUD, approval workflow, and metrics in app/actions/atk.ts', () => {
    const actionsFile = fs.readFileSync(path.join(process.cwd(), 'app/actions/atk.ts'), 'utf8')
    expect(actionsFile).toContain('getMasterAtkList')
    expect(actionsFile).toContain('createMasterAtkItem')
    expect(actionsFile).toContain('updateMasterAtkItem')
    expect(actionsFile).toContain('deleteMasterAtkItem')
    expect(actionsFile).toContain('toggleMasterAtkStatus')
    expect(actionsFile).toContain('getAtkRequests')
    expect(actionsFile).toContain('getAtkRequestById')
    expect(actionsFile).toContain('createAtkRequest')
    expect(actionsFile).toContain('updateAtkRequestStatus')
    expect(actionsFile).toContain('deleteAtkRequest')
    expect(actionsFile).toContain('getAtkDashboardMetrics')
    expect(actionsFile).toContain('notifyWorkflowBellRecipients')
  })

  it('configures desktop sidebar navigation under HRGA -> General Affairs (GA)', () => {
    const sidebarMode = fs.readFileSync(path.join(process.cwd(), 'lib/sidebar-mode.ts'), 'utf8')
    expect(sidebarMode).toContain('url.startsWith("/dashboard/ga/atk")')
    expect(sidebarMode).toContain('General Affairs (GA)')
  })

  it('configures mobile access and services for GA - ATK', () => {
    const mobileAccess = fs.readFileSync(path.join(process.cwd(), 'lib/mobile-access.ts'), 'utf8')
    expect(mobileAccess).toContain("'/mobile/atk'")
    expect(mobileAccess).toContain("'/mobile/atk/new'")
    expect(mobileAccess).toContain("{ desktop: '/dashboard/ga/atk', mobile: '/mobile/atk' }")

    const mobileServices = fs.readFileSync(
      path.join(process.cwd(), 'components/mobile/mobile-dashboard-services.tsx'),
      'utf8'
    )
    expect(mobileServices).toContain("title: 'Pengajuan ATK (Alat Tulis)'")
    expect(mobileServices).toContain("href: '/mobile/atk'")
  })

  it('implements standard print preview A4 dialog with .pdf-wrapper and sm:max-w-7xl', () => {
    const printDialog = fs.readFileSync(
      path.join(process.cwd(), 'components/atk/atk-print-document-dialog.tsx'),
      'utf8'
    )
    expect(printDialog).toContain('pdf-wrapper')
    expect(printDialog).toContain('sm:max-w-7xl')
    expect(printDialog).toContain('@media print')
    expect(printDialog).toContain('size: A4 portrait')
    expect(printDialog).toContain('SURAT PERMINTAAN & BUKTI SERAH TERIMA ALAT TULIS KANTOR')
  })

  it('implements TanStack Virtualization in Desktop ATK dashboard client', () => {
    const dashboardClient = fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/ga/atk/atk-dashboard-client.tsx'),
      'utf8'
    )
    expect(dashboardClient).toContain('useVirtualizer')
    expect(dashboardClient).toContain('parentRef')
    expect(dashboardClient).toContain('virtualizer.getVirtualItems()')
    expect(dashboardClient).toContain('before > 0')
    expect(dashboardClient).toContain('after > 0')
  })

  it('implements Mobile ATK hub and detail with recipient handover confirmation', () => {
    const mobileDetail = fs.readFileSync(
      path.join(process.cwd(), 'app/mobile/atk/[id]/mobile-atk-detail-client.tsx'),
      'utf8'
    )
    expect(mobileDetail).toContain('Konfirmasi Barang Telah Diterima')
    expect(mobileDetail).toContain('recipientSignatureUrl')
    expect(mobileDetail).toContain('handleConfirmHandover')
  })
})
