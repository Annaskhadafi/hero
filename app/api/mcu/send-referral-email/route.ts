import { NextRequest, NextResponse } from 'next/server'
import { getEmailSmtpSettingsData } from '@/lib/hero-admin'
import { sendEmailViaSmtp } from '@/lib/email-delivery'
import { getHcEmailTemplateByType } from '@/app/actions/hc-email-templates'
import { renderHcTemplate } from '@/lib/hc-email-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clinicName,
      clinicEmail,
      clinicCity,
      employeeName,
      employeeSn,
      employeeSection,
      paketMcu,
      letterNumber,
      letterDate,
      signatoryName,
      signatoryTitle,
      htmlContent,
    } = body

    if (!clinicEmail) {
      return NextResponse.json({ success: false, error: 'Email klinik wajib diisi.' }, { status: 400 })
    }

    const smtpSettings = await getEmailSmtpSettingsData()
    if (!smtpSettings.host || !smtpSettings.fromEmail) {
      return NextResponse.json({ success: false, error: 'SMTP belum dikonfigurasi.' }, { status: 500 })
    }

    const clinicTmpl = await getHcEmailTemplateByType('mcu_pengantar')
    let subject: string
    let html: string
    let text: string

    if (clinicTmpl) {
      const vars = {
        candidateName: employeeName,
        jobTitle: employeeSection || '-',
        companyName: 'PT Chitra Paratama',
        date: letterDate || new Date().toLocaleDateString('id-ID'),
        time: '',
        location: `${clinicName}${clinicCity ? ', ' + clinicCity : ''}`,
        clinicName: clinicName || '',
        clinicAddress: '',
        clinicCity: clinicCity || '',
        paket: paketMcu || '',
        interviewer: '',
        testLink: '',
        duration: '',
      }
      const rendered = renderHcTemplate(clinicTmpl, vars)
      subject = rendered.subject
      html = rendered.html || rendered.body
      text = rendered.text
    } else {
      subject = `Surat Pengantar MCU - ${employeeName}`
      html = MCU_REFERRAL_FALLBACK_HTML({
        clinicName,
        clinicCity,
        employeeName,
        employeeSn,
        employeeSection,
        paketMcu,
        letterNumber,
        letterDate,
        signatoryName,
        signatoryTitle,
      })
      text = html.replace(/<[^>]*>/g, '')
    }

    await sendEmailViaSmtp(smtpSettings, {
      to: clinicEmail,
      subject,
      html,
      text,
      format: 'html',
      templateName: 'MCU Referral',
      templateCode: 'mcu_pengantar',
    })

    return NextResponse.json({ success: true, message: 'Email berhasil dikirim.' })
  } catch (error) {
    console.error('Error sending MCU referral email:', error)
    const message = error instanceof Error ? error.message : 'Gagal mengirim email.'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function MCU_REFERRAL_FALLBACK_HTML(vars: {
  clinicName: string
  clinicCity: string
  employeeName: string
  employeeSn: string
  employeeSection: string
  paketMcu: string
  letterNumber: string
  letterDate: string
  signatoryName: string
  signatoryTitle: string
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Surat Pengantar Medical Check Up</h2>
      <p>Kepada Yth.</p>
      <p style="font-weight: bold;">${vars.clinicName}</p>
      <p>${vars.clinicCity}</p>
      <br/>
      <p>Dengan Hormat,</p>
      <p>Kami memberitahukan bahwa nama dibawah ini adalah karyawan dari kami:</p>
      <table style="margin-left: 20px;">
        <tr><td style="padding: 4px 8px;">Nama</td><td>:</td><td style="font-weight: bold;">${vars.employeeName}</td></tr>
        <tr><td style="padding: 4px 8px;">SN</td><td>:</td><td>${vars.employeeSn}</td></tr>
        <tr><td style="padding: 4px 8px;">Section</td><td>:</td><td>${vars.employeeSection}</td></tr>
        <tr><td style="padding: 4px 8px;">Paket MCU</td><td>:</td><td>${vars.paketMcu}</td></tr>
      </table>
      <br/>
      <p>Kami mohon bantuannya untuk melakukan <strong>Medical Check Up</strong> atas nama pasien diatas.</p>
      <p>Demikian surat pengantar ini dibuat dengan sebenar-benarnya.</p>
      <br/>
      <p>Hormat Kami,</p>
      <br/><br/>
      <p style="font-weight: bold; text-decoration: underline;">${vars.signatoryName}</p>
      <p>${vars.signatoryTitle}</p>
    </div>
  `
}
