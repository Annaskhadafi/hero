import { buildCerSubmittedEmailHtml, SendCerSubmittedEmailParams } from '@/lib/cer-email'

describe('CER Email Job Title Notification', () => {
  const baseParams: SendCerSubmittedEmailParams = {
    approverEmail: 'approver@chitraparatama.co.id',
    approverName: 'Bambang Sudibyo',
    cerNumber: 'CER/CP/BPN/11/2026/001',
    subject: 'Pengadaan Server Rack Unit',
    applicantName: 'Mochamad Annas Khadafi',
    siteName: 'BALIKPAPAN',
    departmentName: 'CENTRAL SERVICES',
    totalEstimatedPrice: '50000000',
    approvalStep: 'Tahap 1',
  }

  it('renders "Job Title: <jobTitle>" when approverJobTitle is provided', () => {
    const html = buildCerSubmittedEmailHtml(
      {
        ...baseParams,
        approverJobTitle: 'Department Head Central Services',
      },
      'https://hero.chitraparatama.com/dashboard/approval'
    )

    expect(html).toContain('Job Title: <strong style="color:#2563eb">Department Head Central Services</strong>')
    expect(html).not.toContain('Tahap Persetujuan:')
  })

  it('falls back to approvalStep under "Job Title:" if approverJobTitle is missing or null', () => {
    const html = buildCerSubmittedEmailHtml(
      {
        ...baseParams,
        approverJobTitle: null,
        approvalStep: 'Atasan Langsung',
      },
      'https://hero.chitraparatama.com/dashboard/approval'
    )

    expect(html).toContain('Job Title: <strong style="color:#2563eb">Atasan Langsung</strong>')
    expect(html).not.toContain('Tahap Persetujuan:')
  })

  it('includes CC and co-approval note when approverJobTitle mentions Director', () => {
    const html = buildCerSubmittedEmailHtml(
      {
        ...baseParams,
        approverJobTitle: 'President Director',
      },
      'https://hero.chitraparatama.com/dashboard/approval'
    )

    expect(html).toContain('Job Title: <strong style="color:#2563eb">President Director</strong>')
    expect(html).toContain('CC &amp; Co-Approval: Freshya Ochtovita (Board Secretary)')
  })
})
