import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'fs'
import { join } from 'path'

const PRODUCT_NAME = 'Baillio'
const LEGACY_USER_DATA_DIRS = ['LeaseFrance']
const EPHEMERAL_LOCK_ENTRIES = new Set(['SingletonCookie', 'SingletonLock'])

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
  const targetDir = desiredUserDataPath()

  if (!existsSync(targetDir)) {
    for (const legacyName of LEGACY_USER_DATA_DIRS) {
      const legacyDir = join(app.getPath('appData'), legacyName)
      if (!existsSync(legacyDir)) continue
      renameSync(legacyDir, targetDir)
      break
    }
  }

  mkdirSync(targetDir, { recursive: true })
  for (const legacyName of LEGACY_USER_DATA_DIRS) {
    mergeLegacyUserDataDirectory(join(app.getPath('appData'), legacyName), targetDir)
  }

  app.setName(PRODUCT_NAME)
  app.setPath('userData', targetDir)
  return targetDir
}
