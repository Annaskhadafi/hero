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

    if (siteIdParam) {
      const siteId = parseInt(siteIdParam, 10)
      const config = await getMinePermitSiteConfig(siteId)
      return NextResponse.json({
        config,
        sites: options.sites,
        employees: options.employees,
      })
    }

    const allConfigs = await getAllMinePermitSiteConfigs()
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

      let recipientEmployeeIds: number[] = []
      let ccEmployeeIds: number[] = []
      try {
        recipientEmployeeIds = JSON.parse(formData.get('recipientEmployeeIds')?.toString() || '[]')
      } catch {}
      try {
        ccEmployeeIds = JSON.parse(formData.get('ccEmployeeIds')?.toString() || '[]')
      } catch {}

      body = {
        action,
        siteId,
        intervalDays,
        reminderDays,
        recipientEmployeeIds,
        ccEmployeeIds,
        additionalCcEmails,
        isActive,
      }
    }

    // Handle manual test send action
    if (body.action === 'test' || body.action === 'sendNow') {
      if (!body.siteId) {
        return NextResponse.json({ error: 'siteId wajib ditentukan untuk test kirim.' }, { status: 400 })
      }
      const testResult = await sendSiteMinePermitExpiryReminder(body.siteId, true)
      return NextResponse.json({ success: true, testResult })
    }

    if (!body.siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    await saveMinePermitSiteConfig({
      siteId: body.siteId,
      intervalDays: body.intervalDays ?? 1,
      reminderDays: body.reminderDays ?? 30,
      recipientEmployeeIds: body.recipientEmployeeIds ?? [],
      ccEmployeeIds: body.ccEmployeeIds ?? [],
      additionalCcEmails: body.additionalCcEmails ?? '',
      isActive: body.isActive ?? true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving mine permit reminder config:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update config' }, { status: 500 })
  }
}
