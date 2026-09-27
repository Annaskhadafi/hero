const DEFAULT_MAESTRO_HOST = 'maestro.chitraparatama.com'

export function getMaestroHost() {
  return (process.env.MAESTRO_ROOT_DOMAIN?.trim().toLowerCase() || DEFAULT_MAESTRO_HOST).replace(
    /^https?:\/\//,
    '',
  ).replace(/\/$/, '')
}

export function isMaestroHost(host: string | null | undefined) {
  if (!host) return false
  const normalizedHost = host.trim().toLowerCase().split(',')[0]?.split(':')[0]
  if (!normalizedHost) return false

  const configuredHost = getMaestroHost().split(':')[0]
  return normalizedHost === configuredHost || normalizedHost === 'maestro.localhost'
}
