const DEFAULT_FORM_HOST = 'form.chitraparatama.com'

export function getFormHost() {
  return (process.env.FORM_ROOT_DOMAIN?.trim().toLowerCase() || DEFAULT_FORM_HOST).replace(
    /^https?:\/\//,
    '',
  ).replace(/\/$/, '')
}

export function isFormHost(host: string | null | undefined) {
  if (!host) return false
  const normalizedHost = host.trim().toLowerCase().split(',')[0]?.split(':')[0]
  if (!normalizedHost) return false

  const configuredHost = getFormHost().split(':')[0]
  return (
    normalizedHost === configuredHost ||
    normalizedHost === 'form.localhost' ||
    normalizedHost.startsWith('form.localhost')
  )
}

export function getFormBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.host
    const protocol = window.location.protocol
    if (isFormHost(host)) {
      return `${protocol}//${host}`
    }
    if (host.includes('localhost')) {
      return `${protocol}//form.localhost:3000`
    }
    return 'https://form.chitraparatama.com'
  }

  if (process.env.NODE_ENV === 'production') {
    return `https://${getFormHost()}`
  }
  return 'http://form.localhost:3000'
}
