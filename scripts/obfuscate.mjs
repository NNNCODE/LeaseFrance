/**
 * Post-build obfuscation script.
 * Runs after `electron-vite build` to obfuscate the main process JS.
 * The renderer bundle (Vite) is already minified by default.
 */
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const targets = [
  join(root, 'out', 'main'),
  join(root, 'out', 'preload'),
]

const options = {
  compact: true,
  controlFlowFlattening: false,      // évite les crashs Electron
  deadCodeInjection: false,
  debugProtection: true,             // bloque le débogueur
  debugProtectionInterval: 4000,
  disableConsoleOutput: true,        // supprime console.log en prod
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,               // résiste à la reformatage
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
}

let count = 0
for (const dir of targets) {
  let files
  try { files = readdirSync(dir) } catch { continue }

  for (const file of files) {
    if (extname(file) !== '.js') continue
    const filePath = join(dir, file)
    const code = readFileSync(filePath, 'utf8')
    const obfuscated = JavaScriptObfuscator.obfuscate(code, options).getObfuscatedCode()
    writeFileSync(filePath, obfuscated)
    count++
    console.log(`✓ Obfuscated: ${file}`)
  }
}

console.log(`\nDone — ${count} file(s) obfuscated.`)
