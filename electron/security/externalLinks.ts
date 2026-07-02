const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:'])

export function isAllowedExternalUrl(rawUrl: string): boolean {
  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl || trimmedUrl !== rawUrl) return false

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }

  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return false

  if (parsed.protocol === 'https:') {
    return Boolean(parsed.hostname) && !parsed.username && !parsed.password
  }

  if (parsed.protocol === 'mailto:') {
    return parsed.pathname.trim().length > 0
  }

  return false
}
