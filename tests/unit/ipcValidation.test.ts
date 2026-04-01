import { describe, expect, it } from 'vitest'
import { validateInvokeArgs } from '../../src/shared/ipcValidation'

describe('validateInvokeArgs', () => {
  it('strips backup settings fields that renderer must not control', () => {
    const [patch] = validateInvokeArgs('backup:updateSettings', [{
      autoEnabled: true,
      lastBackupAt: '2026-04-01T00:00:00.000Z',
      lastBackupPath: 'C:\\secret\\backup.lfbackup',
    }])

    expect(patch).toEqual({ autoEnabled: true })
  })

  it('rejects invalid attachment entity types', () => {
    expect(() => validateInvokeArgs('attachments:upload', ['document', 1, null])).toThrow(/attachments:upload/)
  })

  it('accepts optional trailing IPC arguments', () => {
    const [password] = validateInvokeArgs('backup:create', [])
    expect(password).toBeUndefined()
  })

  it('normalizes lease contract detail payloads before they reach the main process', () => {
    const [, details] = validateInvokeArgs('leases:updateContractDetails', [
      7,
      {
        landlordType: 'personne_morale',
        otherParts: ['balcon', 42],
        annexDiagnostics: false,
      },
      '2026-04-01 12:00:00',
    ])

    expect(details).toMatchObject({
      landlordType: 'personne_morale',
      annexDiagnostics: false,
      otherParts: ['balcon'],
    })
  })
})
