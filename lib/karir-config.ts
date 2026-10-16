const DEFAULT_KARIR_HOST = 'karir.chitraparatama.com'

export function getKarirHost() {
  return (process.env.KARIR_ROOT_DOMAIN?.trim().toLowerCase() || DEFAULT_KARIR_HOST).replace(
    /^https?:\/\//,
    '',
  ).replace(/\/$/, '')
}

export function isKarirHost(host: string | null | undefined) {
  if (!host) return false
  const normalizedHost = host.trim().toLowerCase().split(',')[0]?.split(':')[0]
  if (!normalizedHost) return false

  const configuredHost = getKarirHost().split(':')[0]
  return (
    normalizedHost === configuredHost ||
    normalizedHost === 'karir.localhost' ||
    normalizedHost.startsWith('karir.localhost') ||
    normalizedHost === 'career.localhost' ||
    normalizedHost.startsWith('career.localhost') ||
    normalizedHost === 'careers.localhost' ||
    normalizedHost.startsWith('careers.localhost')
  )
}

export function getKarirBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    const protocol = window.location.protocol
    if (isKarirHost(host)) {
      return `${protocol}//${host}`
    }
    if (host.includes('localhost')) {
      const port = window.location.port ? `:${window.location.port}` : ''
      return `${protocol}//karir.localhost${port}`
    }
    return `https://${getKarirHost()}`
  }

  if (process.env.NODE_ENV === 'production') {
    return `https://${getKarirHost()}`
  }
  return 'http://karir.localhost:3000'
}

export function getKarirJobUrl(jobId: number | string) {
  const baseUrl = getKarirBaseUrl()
  return `${baseUrl}/${jobId}`
}
