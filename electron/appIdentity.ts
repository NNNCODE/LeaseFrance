import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'fs'
import { join, resolve } from 'path'

const PRODUCT_NAME = 'Baillio'
const LEGACY_USER_DATA_DIRS = ['LeaseFrance', 'lease-france']
const EPHEMERAL_LOCK_ENTRIES = new Set(['SingletonCookie', 'SingletonLock'])
const USER_DATA_DIR_ENVS = ['BAILLIO_USER_DATA_DIR', 'RENTFLOW_USER_DATA_DIR'] as const

function userDataOverridePath(): string | null {
  for (const key of USER_DATA_DIR_ENVS) {
    const value = process.env[key]?.trim()
    if (value) return resolve(value)
  }
  return null
}

function desiredUserDataPath(): string {
  return join(app.getPath('appData'), PRODUCT_NAME)
}

function moveIfMissing(sourcePath: string, targetPath: string): void {
  if (!existsSync(sourcePath) || existsSync(targetPath)) return
  renameSync(sourcePath, targetPath)
}

function removeDirectoryIfEmpty(dirPath: string): void {
  if (!existsSync(dirPath)) return
  if (readdirSync(dirPath).length > 0) return
  rmSync(dirPath, { recursive: true, force: true })
}

function mergeLegacyUserDataDirectory(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir) || sourceDir === targetDir) return

  mkdirSync(targetDir, { recursive: true })
  for (const entryName of readdirSync(sourceDir)) {
    if (EPHEMERAL_LOCK_ENTRIES.has(entryName)) continue
    moveIfMissing(join(sourceDir, entryName), join(targetDir, entryName))
  }
  removeDirectoryIfEmpty(sourceDir)
}

export function configureUserDataPath(): string {
  const overrideDir = userDataOverridePath()
  const targetDir = overrideDir ?? desiredUserDataPath()

  if (!overrideDir && !existsSync(targetDir)) {
    for (const legacyName of LEGACY_USER_DATA_DIRS) {
      const legacyDir = join(app.getPath('appData'), legacyName)
      if (!existsSync(legacyDir)) continue
      renameSync(legacyDir, targetDir)
      break
    }
  }

  mkdirSync(targetDir, { recursive: true })
  if (!overrideDir) {
    for (const legacyName of LEGACY_USER_DATA_DIRS) {
      mergeLegacyUserDataDirectory(join(app.getPath('appData'), legacyName), targetDir)
    }
  }

  app.setName(PRODUCT_NAME)
  app.setPath('userData', targetDir)
  return targetDir
}
