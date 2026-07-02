export const DPE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export const PROPERTY_DIAGNOSTIC_SLOTS = [
  { key: 'dpe', labelKey: 'properties.diagnostics.slots.dpe' },
  { key: 'erp', labelKey: 'properties.diagnostics.slots.erp' },
  { key: 'lead', labelKey: 'properties.diagnostics.slots.lead' },
  { key: 'gas', labelKey: 'properties.diagnostics.slots.gas' },
  { key: 'electricity', labelKey: 'properties.diagnostics.slots.electricity' },
  { key: 'noise', labelKey: 'properties.diagnostics.slots.noise' },
  { key: 'asbestos', labelKey: 'properties.diagnostics.slots.asbestos' },
] as const

export type DpeRuleSeverity = 'none' | 'missing' | 'warning' | 'blocked'

export interface DpeRuleResult {
  severity: DpeRuleSeverity
  code: 'missing_dpe' | 'g_blocked' | 'f_deadline' | 'e_deadline' | 'ok'
  restrictionDate: string | null
  dpeClass: DpeClass | null
}

const DPE_RESTRICTION_DATES: Partial<Record<DpeClass, string>> = {
  // Service-Public rental restriction schedule for energy-inefficient homes.
  // Source: https://www.service-public.fr/particuliers/vosdroits/F16096
  G: '2025-01-01',
  F: '2028-01-01',
  E: '2034-01-01',
}

export function getDpeRule(
  diagnostics: Pick<PropertyDiagnostics, 'dpe_class'> | null | undefined,
  referenceDate: string,
): DpeRuleResult {
  const dpeClass = diagnostics?.dpe_class ?? null
  if (!dpeClass) {
    return {
      severity: 'missing',
      code: 'missing_dpe',
      restrictionDate: null,
      dpeClass: null,
    }
  }

  const restrictionDate = DPE_RESTRICTION_DATES[dpeClass] ?? null
  if (!restrictionDate) {
    return {
      severity: 'none',
      code: 'ok',
      restrictionDate: null,
      dpeClass,
    }
  }

  if (referenceDate >= restrictionDate) {
    return {
      severity: 'blocked',
      code: dpeClass === 'G' ? 'g_blocked' : dpeClass === 'F' ? 'f_deadline' : 'e_deadline',
      restrictionDate,
      dpeClass,
    }
  }

  return {
    severity: 'warning',
    code: dpeClass === 'G' ? 'g_blocked' : dpeClass === 'F' ? 'f_deadline' : 'e_deadline',
    restrictionDate,
    dpeClass,
  }
}

export function addYears(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString().slice(0, 10)
}

export function inferDpeExpiry(performedAt: string | null | undefined): string | null {
  if (!performedAt) return null

  if (performedAt >= '2018-01-01' && performedAt <= '2021-06-30') {
    return '2025-01-01'
  }

  return addYears(performedAt, 10) || null
}

export function daysUntilIso(date: string, now = new Date()): number {
  const target = new Date(`${date}T00:00:00`)
  const current = new Date(now)
  current.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}
