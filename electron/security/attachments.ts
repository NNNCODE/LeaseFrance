import { readFileSync } from 'fs'
import { basename, extname } from 'path'

type AttachmentKind = 'pdf' | 'png' | 'jpg' | 'webp' | 'gif' | 'bmp' | 'tiff'

const ATTACHMENT_TYPE_BY_EXTENSION: Record<string, { kind: AttachmentKind; mimeType: string }> = {
  '.pdf': { kind: 'pdf', mimeType: 'application/pdf' },
  '.png': { kind: 'png', mimeType: 'image/png' },
  '.jpg': { kind: 'jpg', mimeType: 'image/jpeg' },
  '.jpeg': { kind: 'jpg', mimeType: 'image/jpeg' },
  '.webp': { kind: 'webp', mimeType: 'image/webp' },
  '.gif': { kind: 'gif', mimeType: 'image/gif' },
  '.bmp': { kind: 'bmp', mimeType: 'image/bmp' },
  '.tiff': { kind: 'tiff', mimeType: 'image/tiff' },
}

export const ATTACHMENT_DIALOG_EXTENSIONS = Object.keys(ATTACHMENT_TYPE_BY_EXTENSION).map((extension) => extension.slice(1))

function hasSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value)
}

export function detectAttachmentKind(bytes: Uint8Array): AttachmentKind | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') return 'pdf'
  if (bytes.length >= 8 && hasSignature(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'png'
  if (bytes.length >= 3 && hasSignature(bytes, [0xFF, 0xD8, 0xFF])) return 'jpg'
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return 'webp'
  }
  if (
    bytes.length >= 6
    && (String.fromCharCode(...bytes.subarray(0, 6)) === 'GIF87a' || String.fromCharCode(...bytes.subarray(0, 6)) === 'GIF89a')
  ) {
    return 'gif'
  }
  if (bytes.length >= 2 && String.fromCharCode(...bytes.subarray(0, 2)) === 'BM') return 'bmp'
  if (
    bytes.length >= 4
    && (
      hasSignature(bytes, [0x49, 0x49, 0x2A, 0x00])
      || hasSignature(bytes, [0x4D, 0x4D, 0x00, 0x2A])
    )
  ) {
    return 'tiff'
  }
  return null
}

export function getValidatedAttachmentMetadata(fileName: string, bytes: Uint8Array): { extension: string; mimeType: string } {
  const extension = extname(fileName).toLowerCase()
  const expected = ATTACHMENT_TYPE_BY_EXTENSION[extension]
  if (!expected) {
    throw new Error(`Type de fichier non autorise pour "${fileName}".`)
  }

  const actual = detectAttachmentKind(bytes)
  if (!actual) {
    throw new Error(`Impossible de verifier le type reel du fichier "${fileName}".`)
  }
  if (actual !== expected.kind) {
    throw new Error(`Le contenu du fichier "${fileName}" ne correspond pas a son extension.`)
  }

  return {
    extension,
    mimeType: expected.mimeType,
  }
}

export function validateAttachmentFileSelection(filePath: string): { extension: string; mimeType: string; fileName: string } {
  const fileName = basename(filePath)
  const bytes = readFileSync(filePath)
  const metadata = getValidatedAttachmentMetadata(fileName, bytes)
  return {
    fileName,
    ...metadata,
  }
}
