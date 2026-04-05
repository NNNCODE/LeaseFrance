/**
 * Production build:
 * 1. electron-vite build (compile + minify)
 * 2. obfuscate main & preload JS
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: 'inherit', shell: true })
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)))
  })
}

console.log('\n📦 Building with electron-vite...\n')
await run('node', [join(__dirname, 'generateAutoUpdateConfig.mjs')])
await run('node', [join(__dirname, 'generateLicenseRuntimeConfig.mjs')])
await run('electron-vite', ['build'])

console.log('\n🔒 Obfuscating output...\n')
await run('node', [join(__dirname, 'obfuscate.mjs')])

console.log('\n✅ Build complete.\n')
