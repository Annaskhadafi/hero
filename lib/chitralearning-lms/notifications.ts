import nodemailer from 'nodemailer'

export async function sendLmsNotification({
  to,
  subject,
  message
}: {
  to: string,
  subject: string,
  message: string
}) {
  console.log(`[LMS Notification] Sending to: ${to} | Subject: ${subject}`)
  console.log(`[LMS Notification] Message: ${message}`)

  // Using Nodemailer with test credentials or falling back to environment variables
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    // If no credentials, we skip sending actual email and just log it
    if (!process.env.SMTP_USER) {
      console.log('[LMS Notification] SMTP credentials not set, skipping real email dispatch.')
      return
    }

    await transporter.sendMail({
      from: '"ChitraLearning LMS" <lms@chitralearning.com>',
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">${subject}</h2>
          <p style="color: #475569; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Pesan ini dikirim secara otomatis oleh sistem ChitraLearning LMS.</p>
        </div>
      `
    })
    console.log('[LMS Notification] Email sent successfully.')
  } catch (error) {
    console.error('[LMS Notification] Error sending email:', error)
  }
}
