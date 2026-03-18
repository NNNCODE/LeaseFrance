/**
 * Dev launcher: removes ELECTRON_RUN_AS_NODE (set by VSCode/Claude Code)
 * before starting electron-vite, otherwise Electron runs as plain Node.js.
 */
import { spawn } from 'child_process'

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn('electron-vite', ['dev'], {
  env,
  stdio: 'inherit',
  shell: true,
})

child.on('exit', (code) => process.exit(code ?? 0))
