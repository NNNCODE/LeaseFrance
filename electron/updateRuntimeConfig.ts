import { z } from 'zod'

export interface AutoUpdateRuntimeConfig {
  enabled: boolean
  url: string | null
  channel: string | null
}

const runtimeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().trim().min(1).nullable().optional(),
  channel: z.string().trim().min(1).nullable().optional(),
})

function validateUpdateUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid auto-update URL: ${url}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Auto-update URL must use http or https: ${url}`)
  }

  return url
}

function buildEnabledConfig(url: string, channel?: string | null): AutoUpdateRuntimeConfig {
  return {
    enabled: true,
    url: validateUpdateUrl(url),
    channel: channel ?? 'latest',
  }
}

export function disabledAutoUpdateConfig(): AutoUpdateRuntimeConfig {
  return {
    enabled: false,
    url: null,
    channel: null,
  }
}

export function parseAutoUpdateConfigFile(raw: string): AutoUpdateRuntimeConfig {
  const parsedJson = JSON.parse(raw) as unknown
  const parsed = runtimeConfigSchema.parse(parsedJson)

  if (parsed.enabled === false || !parsed.url) {
    return disabledAutoUpdateConfig()
  }

  return buildEnabledConfig(parsed.url, parsed.channel)
}

export function resolveAutoUpdateRuntimeConfig({
  envUrl,
  envChannel,
  fileContents,
}: {
  envUrl?: string | null
  envChannel?: string | null
  fileContents?: string | null
}): AutoUpdateRuntimeConfig {
  const normalizedEnvUrl = envUrl?.trim() || null
  const normalizedEnvChannel = envChannel?.trim() || null

  if (normalizedEnvUrl) {
    return buildEnabledConfig(normalizedEnvUrl, normalizedEnvChannel)
  }

  if (!fileContents) {
    return disabledAutoUpdateConfig()
  }

  return parseAutoUpdateConfigFile(fileContents)
}
