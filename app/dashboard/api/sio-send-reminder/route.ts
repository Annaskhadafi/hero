import { getEmailSmtpSettingsData } from '@/lib/hero-admin'
import { sendEmailViaSmtp } from '@/lib/email-delivery'

export async function POST(request: Request) {
  try {
    const { employeeName, certName, certType, expiryDate, toEmail, ccEmail } = await request.json()
    if (!toEmail) return Response.json({ status: 'error', message: 'Email penerima (Kepada) wajib diisi.' })

    let daysLeft = 0
    if (expiryDate) {
      const expiry = new Date(expiryDate)
      if (!isNaN(expiry.getTime())) {
        daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000)
      }
    }

    const smtpSettings = await getEmailSmtpSettingsData()
    if (!smtpSettings?.isActive || !smtpSettings.host) {
      return Response.json({ status: 'error', message: 'SMTP email belum dikonfigurasi atau tidak aktif.' })
    }

    const smtpConfig = {
      host: smtpSettings.host,
      port: smtpSettings.port,
      encryption: smtpSettings.encryption as 'tls' | 'ssl' | 'none',
      username: smtpSettings.username,
      passwordSecret: smtpSettings.passwordSecret,
      fromEmail: smtpSettings.fromEmail,
      fromName: smtpSettings.fromName,
      replyToEmail: smtpSettings.replyToEmail,
      timeoutSeconds: smtpSettings.timeoutSeconds,
    }

    const subject = `[Reminder] Sertifikasi ${certType} akan expired — ${employeeName}`
    const text = `Yth. Section Head,\n\nSertifikasi berikut akan segera berakhir:\n\nKaryawan: ${employeeName}\nSertifikat: ${certName}\nTipe: ${certType}\nMasa Berlaku: ${expiryDate || '-'}\nSisa Hari: ${daysLeft} hari\n\nHarap segera mengambil tindakan perpanjangan.\n\nEmail dikirim otomatis oleh HERO.`
    const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#92400e;">Peringatan Expiry Sertifikasi</h2>
  <p>Yth. Section Head,</p>
  <p>Berikut sertifikasi yang akan segera berakhir:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Karyawan</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sertifikat</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Tipe</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Masa Berlaku</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sisa Hari</th>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;">${employeeName}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${certName}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${certType}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${expiryDate || '-'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:${daysLeft <= 0 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#16a34a'};">${daysLeft} hari</td>
    </tr>
  </table>
  <p style="color:#64748b;font-size:12px;">Harap segera mengambil tindakan perpanjangan atau penggantian.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
  <p style="color:#94a3b8;font-size:11px;">Email ini dikirim otomatis oleh sistem HERO.</p>
</div>`

    await sendEmailViaSmtp(smtpConfig, { to: toEmail, subject, html, text })

    const ccList = ccEmail ? ccEmail.split(',').map((e: string) => e.trim()).filter(Boolean) : []
    for (const cc of ccList) {
      try {
        await sendEmailViaSmtp(smtpConfig, { to: cc, subject: `CC: ${subject}`, html, text })
      } catch {}
    }

    return Response.json({
      status: 'success',
      message: `Reminder terkirim ke ${toEmail}${ccList.length > 0 ? ` + ${ccList.length} CC` : ''}. Sisa hari: ${daysLeft} hr`,
      daysLeft,
    })
  } catch (err) {
    return Response.json({ status: 'error', message: err instanceof Error ? err.message : 'Gagal kirim email.' })
  }
}
