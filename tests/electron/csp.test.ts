import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '../../electron/security/csp'

describe('buildContentSecurityPolicy', () => {
  it('allows wasm PDF generation in production without enabling generic eval', () => {
    const csp = buildContentSecurityPolicy(false)

    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval';")
    expect(csp).toContain("frame-src 'self' blob:;")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toContain("ws://localhost:*")
  })

  it('keeps development allowances while permitting wasm', () => {
    const csp = buildContentSecurityPolicy(true)

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';")
    expect(csp).toContain("connect-src 'self' ws://localhost:* http://localhost:*;")
  })
})
