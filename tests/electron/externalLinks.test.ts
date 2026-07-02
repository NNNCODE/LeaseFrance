import { describe, expect, it } from 'vitest'
import { isAllowedExternalUrl } from '../../electron/security/externalLinks'

describe('isAllowedExternalUrl', () => {
  it('allows explicit safe external protocols', () => {
    expect(isAllowedExternalUrl('https://example.com/help')).toBe(true)
    expect(isAllowedExternalUrl('https://example.com/help?tab=docs#top')).toBe(true)
    expect(isAllowedExternalUrl('mailto:support@example.com')).toBe(true)
  })

  it('rejects protocols that can escape the browser safety boundary', () => {
    expect(isAllowedExternalUrl('http://example.com')).toBe(false)
    expect(isAllowedExternalUrl('file:///C:/Users/dell/secrets.txt')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isAllowedExternalUrl('vscode://file/C:/project')).toBe(false)
    expect(isAllowedExternalUrl('ms-settings:privacy')).toBe(false)
  })

  it('rejects malformed, padded, or misleading URLs', () => {
    expect(isAllowedExternalUrl('')).toBe(false)
    expect(isAllowedExternalUrl(' https://example.com')).toBe(false)
    expect(isAllowedExternalUrl('https://example.com ')).toBe(false)
    expect(isAllowedExternalUrl('/relative/path')).toBe(false)
    expect(isAllowedExternalUrl('https://user:pass@example.com')).toBe(false)
    expect(isAllowedExternalUrl('mailto:')).toBe(false)
  })
})
