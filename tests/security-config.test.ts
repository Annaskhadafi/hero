import nextConfig from '../next.config'
import fs from 'fs'
import path from 'path'

describe('Security Hardening & Pentest Remediation', () => {
  it('disables poweredByHeader in next.config.ts', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('configures mandatory security headers in next.config.ts', async () => {
    expect(nextConfig.headers).toBeDefined()
    if (nextConfig.headers) {
      const headersList = await nextConfig.headers()
      const globalHeadersRule = headersList.find((h) => h.source === '/:path*')
      expect(globalHeadersRule).toBeDefined()

      const headerKeys = (globalHeadersRule?.headers || []).map((h) => h.key)
      expect(headerKeys).toContain('Strict-Transport-Security')
      expect(headerKeys).toContain('X-Content-Type-Options')
      expect(headerKeys).toContain('Referrer-Policy')
      expect(headerKeys).toContain('X-Frame-Options')
      expect(headerKeys).toContain('Content-Security-Policy')
      expect(headerKeys).toContain('Permissions-Policy')

      const hsts = globalHeadersRule?.headers.find((h) => h.key === 'Strict-Transport-Security')
      expect(hsts?.value).toContain('max-age=63072000')
      expect(hsts?.value).toContain('includeSubDomains')

      const nosniff = globalHeadersRule?.headers.find((h) => h.key === 'X-Content-Type-Options')
      expect(nosniff?.value).toBe('nosniff')

      const referrer = globalHeadersRule?.headers.find((h) => h.key === 'Referrer-Policy')
      expect(referrer?.value).toBe('strict-origin-when-cross-origin')
    }
  })

  it('has public/.well-known/security.txt complying with RFC 9116', () => {
    const securityTxtPath = path.join(process.cwd(), 'public', '.well-known', 'security.txt')
    expect(fs.existsSync(securityTxtPath)).toBe(true)
    const content = fs.readFileSync(securityTxtPath, 'utf8')
    expect(content).toContain('Contact: mailto:')
    expect(content).toContain('Expires:')
  })
})
