import { describe, expect, it } from 'vitest'
import { parseAutoUpdateConfigFile, resolveAutoUpdateRuntimeConfig } from '../../electron/updateRuntimeConfig'

describe('update runtime config', () => {
  it('returns a disabled config when no source is provided', () => {
    expect(resolveAutoUpdateRuntimeConfig({})).toEqual({
      enabled: false,
      url: null,
      channel: null,
    })
  })

  it('prefers environment values over the packaged config file', () => {
    expect(resolveAutoUpdateRuntimeConfig({
      envUrl: 'https://updates.example.com/releases',
      envChannel: 'beta',
      fileContents: JSON.stringify({
        enabled: true,
        url: 'https://ignored.example.com/releases',
        channel: 'latest',
      }),
    })).toEqual({
      enabled: true,
      url: 'https://updates.example.com/releases',
      channel: 'beta',
    })
  })

  it('defaults the update channel to latest when omitted', () => {
    expect(parseAutoUpdateConfigFile(JSON.stringify({
      enabled: true,
      url: 'https://updates.example.com/releases',
    }))).toEqual({
      enabled: true,
      url: 'https://updates.example.com/releases',
      channel: 'latest',
    })
  })

  it('rejects malformed update URLs', () => {
    expect(() => parseAutoUpdateConfigFile(JSON.stringify({
      enabled: true,
      url: 'ftp://updates.example.com/releases',
    }))).toThrow(/Auto-update URL must use http or https/)
  })
})
