import { NextResponse } from 'next/server'
import {
  getMinePermitSiteConfig,
  getAllMinePermitSiteConfigs,
  getMinePermitSiteOptions,
  saveMinePermitSiteConfig,
  sendSiteMinePermitExpiryReminder,
} from '@/lib/mine-permit-reminder'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const siteIdParam = url.searchParams.get('siteId')
    const options = await getMinePermitSiteOptions()

    const allConfigs = await getAllMinePermitSiteConfigs()

    if (siteIdParam) {
      const siteId = parseInt(siteIdParam, 10)
      const config = await getMinePermitSiteConfig(siteId)
      return NextResponse.json({
        config,
        configs: allConfigs,
        sites: options.sites,
        employees: options.employees,
      })
    }
    return NextResponse.json({
      configs: allConfigs,
      sites: options.sites,
      employees: options.employees,
    })
  } catch (error: any) {
    console.error('Error fetching mine permit reminder config:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    let body: any
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const formData = await req.formData()
      const siteIdStr = formData.get('siteId')?.toString()
      const siteId = siteIdStr ? parseInt(siteIdStr, 10) : undefined
      const intervalDays = parseInt(formData.get('intervalDays')?.toString() ?? '1', 10)
      const reminderDays = parseInt(formData.get('reminderDays')?.toString() ?? '30', 10)
      const isActive = formData.get('isActive') === 'true'
      const additionalCcEmails = formData.get('additionalCcEmails')?.toString() ?? formData.get('additionalRecipients')?.toString() ?? ''
      const action = formData.get('action')?.toString()

      let recipientEmployeeIds: number[] | undefined
      let ccEmployeeIds: number[] | undefined
      let recipientEmails: string[] | undefined
      let ccEmails: string[] | undefined

      if (formData.has('recipientEmployeeIds')) {
        try {
          recipientEmployeeIds = JSON.parse(formData.get('recipientEmployeeIds')?.toString() || '[]')
        } catch {}
      }
      if (formData.has('ccEmployeeIds')) {
        try {
          ccEmployeeIds = JSON.parse(formData.get('ccEmployeeIds')?.toString() || '[]')
        } catch {}
      }
      if (formData.has('recipientEmails')) {
        try {
          recipientEmails = JSON.parse(formData.get('recipientEmails')?.toString() || '[]')
        } catch {}
      }
      if (formData.has('ccEmails')) {
        try {
          ccEmails = JSON.parse(formData.get('ccEmails')?.toString() || '[]')
        } catch {}
      }

      body = {
        action,
        siteId,
        intervalDays,
        reminderDays,
        recipientEmployeeIds,
        recipientEmails,
        ccEmployeeIds,
        ccEmails,
        additionalCcEmails,
        isActive,
      }
    }

    if (!body.siteId) {
      return NextResponse.json({ error: 'siteId wajib diisi.' }, { status: 400 })
    }

    // Save configuration whenever setting fields are present
    const hasConfigFields =
      body.intervalDays !== undefined ||
      body.reminderDays !== undefined ||
      body.recipientEmails !== undefined ||
      body.recipientEmployeeIds !== undefined ||
      body.ccEmails !== undefined ||
      body.ccEmployeeIds !== undefined ||
      body.additionalCcEmails !== undefined ||
      body.isActive !== undefined

    if (hasConfigFields) {
      await saveMinePermitSiteConfig({
        siteId: body.siteId,
        intervalDays: body.intervalDays ?? 1,
        reminderDays: body.reminderDays ?? 30,
        recipientEmployeeIds: body.recipientEmployeeIds,
        recipientEmails: body.recipientEmails,
        ccEmployeeIds: body.ccEmployeeIds,
        ccEmails: body.ccEmails,
        additionalCcEmails: body.additionalCcEmails ?? '',
        isActive: body.isActive ?? true,
      })
    }

    // Handle manual test send action
    if (body.action === 'test' || body.action === 'sendNow') {
      const testResult = await sendSiteMinePermitExpiryReminder(body.siteId, true)
      return NextResponse.json({ success: true, testResult })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving mine permit reminder config:', error)
    return NextResponse.json({ error: error?.message || 'Gagal memproses konfigurasi.' }, { status: 500 })
  }
}
