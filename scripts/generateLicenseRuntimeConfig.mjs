import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const buildDir = join(rootDir, 'build')
const outputPath = join(buildDir, 'license-runtime.json')

function readEnv(name) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

const licenseApiUrl = readEnv('BAILLIO_LICENSE_API_URL') ?? readEnv('RENTFLOW_LICENSE_API_URL')

if (licenseApiUrl) {
  const parsed = new URL(licenseApiUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`BAILLIO_LICENSE_API_URL must use http or https. Received: ${licenseApiUrl}`)
  }
}

const payload = licenseApiUrl
  ? {
      enabled: true,
      baseUrl: licenseApiUrl,
    }
  : {
      enabled: false,
      baseUrl: null,
    }

mkdirSync(buildDir, { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

if (licenseApiUrl) {
  console.log(`[license] Configured ${licenseApiUrl}`)
} else {
  console.log('[license] Disabled. Set BAILLIO_LICENSE_API_URL to enable packaged activation.')
}
