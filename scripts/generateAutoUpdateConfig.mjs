import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const buildDir = join(rootDir, 'build')
const outputPath = join(buildDir, 'auto-update.json')

function readEnv(name) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

const updateUrl = readEnv('BAILLIO_UPDATE_URL') ?? readEnv('RENTFLOW_UPDATE_URL')
const updateChannel = readEnv('BAILLIO_UPDATE_CHANNEL') ?? readEnv('RENTFLOW_UPDATE_CHANNEL') ?? 'latest'

if (updateUrl) {
  const parsed = new URL(updateUrl)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`BAILLIO_UPDATE_URL must use http or https. Received: ${updateUrl}`)
  }
}

const payload = updateUrl
  ? {
      enabled: true,
      provider: 'generic',
      url: updateUrl,
      channel: updateChannel,
    }
  : {
      enabled: false,
      provider: 'generic',
      url: null,
      channel: null,
    }

mkdirSync(buildDir, { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

if (updateUrl) {
  console.log(`[auto-update] Configured ${updateUrl} (${updateChannel})`)
} else {
  console.log('[auto-update] Disabled. Set BAILLIO_UPDATE_URL to enable packaged updates.')
}
