import { describe, expect, it } from 'vitest'
import { detectAttachmentKind, getValidatedAttachmentMetadata } from '../../electron/security/attachments'

describe('attachment validation', () => {
  it('detects allowed file signatures', () => {
    expect(detectAttachmentKind(Buffer.from('%PDF-1.7'))).toBe('pdf')
    expect(detectAttachmentKind(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('jpg')
    expect(detectAttachmentKind(Buffer.from([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D,
    ]))).toBe('mp4')
  })

  it('accepts matching extensions and signatures', () => {
    expect(getValidatedAttachmentMetadata('lease.pdf', Buffer.from('%PDF-1.7'))).toEqual({
      extension: '.pdf',
      mimeType: 'application/pdf',
    })
    expect(getValidatedAttachmentMetadata('move-in.mp4', Buffer.from([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D,
    ]))).toEqual({
      extension: '.mp4',
      mimeType: 'video/mp4',
    })
  })

  it('rejects extension and content mismatches', () => {
    expect(() => getValidatedAttachmentMetadata('lease.pdf', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]))).toThrow(
      /ne correspond pas a son extension/,
    )
  })

  it('rejects unsupported extensions', () => {
    expect(() => getValidatedAttachmentMetadata('lease.exe', Buffer.from('MZ'))).toThrow(/non autorise/)
  })
})
