import { z } from 'zod'

export interface LicenseRuntimeConfig {
  enabled: boolean
  baseUrl: string | null
}

const runtimeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  baseUrl: z.string().trim().min(1).nullable().optional(),
})

function validateLicenseBaseUrl(baseUrl: string): string {
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new Error(`Invalid license API base URL: ${baseUrl}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`License API base URL must use http or https: ${baseUrl}`)
  }

  return parsed.toString().replace(/\/+$/, '')
}

function buildEnabledConfig(baseUrl: string): LicenseRuntimeConfig {
  return {
    enabled: true,
    baseUrl: validateLicenseBaseUrl(baseUrl),
  }
}

export function disabledLicenseRuntimeConfig(): LicenseRuntimeConfig {
  return {
    enabled: false,
    baseUrl: null,
  }
}

export function parseLicenseRuntimeConfigFile(raw: string): LicenseRuntimeConfig {
  const parsedJson = JSON.parse(raw) as unknown
  const parsed = runtimeConfigSchema.parse(parsedJson)

  if (parsed.enabled === false || !parsed.baseUrl) {
    return disabledLicenseRuntimeConfig()
  }

  return buildEnabledConfig(parsed.baseUrl)
}

export function resolveLicenseRuntimeConfig({
  envUrl,
  fileContents,
}: {
  envUrl?: string | null
  fileContents?: string | null
}): LicenseRuntimeConfig {
  const normalizedEnvUrl = envUrl?.trim() || null

  if (normalizedEnvUrl) {
    return buildEnabledConfig(normalizedEnvUrl)
  }

  if (!fileContents) {
    return disabledLicenseRuntimeConfig()
  }

  return parseLicenseRuntimeConfigFile(fileContents)
}
