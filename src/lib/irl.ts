/**
 * IRL — Indice de Référence des Loyers (INSEE)
 *
 * Révision annuelle du loyer selon la loi française :
 *   nouveau_loyer = ancien_loyer × (IRL_nouveau / IRL_référence)
 *
 * - La révision a lieu à la date anniversaire du bail
 * - Le trimestre de référence est celui inscrit dans le bail
 * - Le nouvel IRL est celui du même trimestre, publié l'année en cours (ou la plus récente disponible)
 * - Ne s'applique PAS aux baux mobilité
 */

export interface RevisionResult {
  /** Loyer actuel HC */
  oldRent: number
  /** Nouveau loyer calculé */
  newRent: number
  /** Différence */
  difference: number
  /** Pourcentage d'augmentation */
  percentChange: number
  /** IRL de référence (inscrit dans le bail) */
  referenceIrl: number
  /** Nouvel IRL utilisé */
  newIrl: number
  /** Trimestre de référence (ex: "2023-T2") */
  referenceLabel: string
  /** Trimestre du nouvel IRL (ex: "2025-T2") */
  newLabel: string
}

/**
 * Calcule la révision IRL du loyer
 */
export function calculateRevision(
  currentRent: number,
  referenceIrlValue: number,
  newIrlValue: number,
  referenceQuarter: string,
  newQuarterLabel: string,
): RevisionResult {
  const newRent = Math.round((currentRent * (newIrlValue / referenceIrlValue)) * 100) / 100
  const difference = Math.round((newRent - currentRent) * 100) / 100
  const percentChange = Math.round(((newIrlValue / referenceIrlValue - 1) * 100) * 100) / 100

  return {
    oldRent: currentRent,
    newRent,
    difference,
    percentChange,
    referenceIrl: referenceIrlValue,
    newIrl: newIrlValue,
    referenceLabel: referenceQuarter,
    newLabel: newQuarterLabel,
  }
}

/**
 * Vérifie si un bail est éligible à la révision IRL
 * - Type vide ou meublé (pas mobilité)
 * - A un IRL de référence défini
 * - Date anniversaire passée ou imminente (dans les 30 jours)
 */
export function isRevisionEligible(
  leaseType: string,
  startDate: string,
  irlReferenceIndex: number | null,
  irlReferenceQuarter: string | null,
): boolean {
  if (leaseType === 'mobilite') return false
  if (!irlReferenceIndex || !irlReferenceQuarter) return false

  return true
}

/**
 * Vérifie si la date anniversaire du bail est dans les N prochains jours
 */
export function isAnniversaryWithinDays(startDate: string, days: number): boolean {
  const start = new Date(startDate)
  const now = new Date()

  // Date anniversaire cette année
  const anniversary = new Date(now.getFullYear(), start.getMonth(), start.getDate())

  // Si l'anniversaire est déjà passé cette année, on regarde l'année prochaine
  if (anniversary < now) {
    const daysSince = Math.floor((now.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24))
    // Si c'était il y a moins de 30 jours, c'est encore pertinent
    return daysSince <= days
  }

  const daysUntil = Math.floor((anniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil <= days
}

/**
 * Retourne la date anniversaire pertinente pour les rappels:
 * - cette annee si elle arrive bientot
 * - ou celle qui vient de passer si elle est encore recente
 * - sinon la prochaine
 */
export function getRelevantAnniversaryDate(startDate: string, now = new Date()): Date {
  const start = new Date(startDate)
  const anniversaryThisYear = new Date(now.getFullYear(), start.getMonth(), start.getDate())

  if (anniversaryThisYear < now) {
    return anniversaryThisYear
  }

  return anniversaryThisYear
}

/**
 * Parse un trimestre au format "2024-T2" → { year: 2024, quarter: 2 }
 */
export function parseQuarter(q: string): { year: number; quarter: number } | null {
  const match = q.match(/^(\d{4})-T(\d)$/)
  if (!match) return null
  return { year: parseInt(match[1]), quarter: parseInt(match[2]) }
}

/**
 * Formate un trimestre : { year: 2024, quarter: 2 } → "2024-T2"
 */
export function formatQuarter(year: number, quarter: number): string {
  return `${year}-T${quarter}`
}

/**
 * Labels lisibles pour les trimestres
 */
export const QUARTER_LABELS: Record<number, string> = {
  1: '1er trimestre',
  2: '2e trimestre',
  3: '3e trimestre',
  4: '4e trimestre',
}
