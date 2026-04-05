import { describe, expect, it } from 'vitest'
import {
  disabledLicenseRuntimeConfig,
  parseLicenseRuntimeConfigFile,
  resolveLicenseRuntimeConfig,
} from '../../electron/licenseRuntimeConfig'

describe('license runtime config', () => {
  it('returns a disabled config when no source is provided', () => {
    expect(resolveLicenseRuntimeConfig({})).toEqual(disabledLicenseRuntimeConfig())
  })

  it('prefers environment values over the packaged config file', () => {
    expect(resolveLicenseRuntimeConfig({
      envUrl: 'https://licenses.example.com',
      fileContents: JSON.stringify({
        enabled: true,
        baseUrl: 'https://ignored.example.com',
      }),
    })).toEqual({
      enabled: true,
      baseUrl: 'https://licenses.example.com',
    })
  })

  it('disables the runtime when the config file omits the base URL', () => {
    expect(parseLicenseRuntimeConfigFile(JSON.stringify({
      enabled: true,
      baseUrl: null,
    }))).toEqual(disabledLicenseRuntimeConfig())
  })

  it('rejects malformed license API URLs', () => {
    expect(() => parseLicenseRuntimeConfigFile(JSON.stringify({
      enabled: true,
      baseUrl: 'ftp://licenses.example.com',
    }))).toThrow(/License API base URL must use http or https/)
  })
})
