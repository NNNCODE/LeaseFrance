import * as inspectionsDb from '../db/queries/inspections'
import * as leasesDb from '../db/queries/leases'
import * as manualRemindersDb from '../db/queries/manualReminders'
import * as paymentsDb from '../db/queries/payments'
import * as propertiesDb from '../db/queries/properties'
import * as tenantsDb from '../db/queries/tenants'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

export type SearchCategory = 'properties' | 'tenants' | 'leases' | 'payments' | 'reminders' | 'inspections'
export type SearchFilterKey = 'all' | SearchCategory

export interface SearchResult {
  id: string
  category: SearchCategory
  title: string
  subtitle: string
  route: string
  badge?: string
  badgeColor?: string
}

interface SearchDataset {
  properties?: propertiesDb.Property[]
  tenants?: tenantsDb.Tenant[]
  leases?: leasesDb.Lease[]
  payments?: paymentsDb.Payment[]
  reminders?: manualRemindersDb.ManualReminder[]
  inspections?: inspectionsDb.Inspection[]
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matchesQuery(text: string, query: string): boolean {
  const normalizedText = normalize(text)
  const parts = normalize(query).split(/\s+/).filter(Boolean)
  return parts.every((part) => normalizedText.includes(part))
}

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function buildSearchResults(dataset: SearchDataset, query: string, filter: SearchFilterKey): SearchResult[] {
  const trimmedQuery = query.trim()
  const results: SearchResult[] = []

  if (filter === 'all' || filter === 'properties') {
    for (const property of dataset.properties ?? []) {
      const haystack = `${property.name} ${property.address} ${property.city} ${property.zip} ${property.type}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `prop-${property.id}`,
        category: 'properties',
        title: property.name,
        subtitle: `${property.address}, ${property.city}`,
        route: '/properties',
        badge: property.type,
      })
    }
  }

  if (filter === 'all' || filter === 'tenants') {
    for (const tenant of dataset.tenants ?? []) {
      const haystack = `${tenant.first_name} ${tenant.last_name} ${tenant.email ?? ''} ${tenant.phone ?? ''} ${tenant.property_name ?? ''}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `ten-${tenant.id}`,
        category: 'tenants',
        title: `${tenant.first_name} ${tenant.last_name}`,
        subtitle: tenant.property_name ?? 'Aucun bail actif',
        route: '/tenants',
      })
    }
  }

  if (filter === 'all' || filter === 'leases') {
    for (const lease of dataset.leases ?? []) {
      const typeLabel = lease.type === 'vide' ? 'Vide' : lease.type === 'meuble' ? 'Meuble' : 'Mobilite'
      const haystack = `${lease.tenant_first_name} ${lease.tenant_last_name} ${lease.property_name} ${lease.type} ${lease.status}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `lea-${lease.id}`,
        category: 'leases',
        title: `${lease.tenant_first_name} ${lease.tenant_last_name} · ${lease.property_name}`,
        subtitle: `${typeLabel} · ${formatCurrency(lease.rent_amount + lease.charges_amount)}/mois`,
        route: '/leases',
        badge: lease.status === 'active' ? 'Actif' : lease.status === 'ended' ? 'Termine' : 'Resilie',
        badgeColor: lease.status === 'active' ? 'success' : 'muted',
      })
    }
  }

  if (filter === 'all' || filter === 'payments') {
    for (const payment of dataset.payments ?? []) {
      const period = `${MONTHS_SHORT[payment.period_month - 1]} ${payment.period_year}`
      const haystack = `${payment.tenant_first_name} ${payment.tenant_last_name} ${payment.property_name} ${period} ${payment.status} ${payment.period_year}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `pay-${payment.id}`,
        category: 'payments',
        title: `${payment.tenant_first_name} ${payment.tenant_last_name} · ${period}`,
        subtitle: `${payment.property_name} · ${formatCurrency(payment.rent_amount + payment.charges_amount)}`,
        route: '/payments',
        badge: payment.status === 'paid' ? 'Paye' : payment.status === 'late' ? 'En retard' : 'En attente',
        badgeColor: payment.status === 'paid' ? 'success' : payment.status === 'late' ? 'danger' : 'warning',
      })
    }
  }

  if (filter === 'all' || filter === 'reminders') {
    for (const reminder of dataset.reminders ?? []) {
      const haystack = `${reminder.title} ${reminder.category} ${reminder.property_name ?? ''} ${reminder.tenant_first_name ?? ''} ${reminder.tenant_last_name ?? ''}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `rem-${reminder.id}`,
        category: 'reminders',
        title: reminder.title,
        subtitle: `${reminder.due_date}${reminder.property_name ? ` · ${reminder.property_name}` : ''}`,
        route: '/reminders',
        badge: reminder.status === 'pending' ? 'En attente' : 'Fait',
        badgeColor: reminder.status === 'pending' ? 'warning' : 'success',
      })
    }
  }

  if (filter === 'all' || filter === 'inspections') {
    for (const inspection of dataset.inspections ?? []) {
      const kindLabel = inspection.kind === 'entry' ? 'Entree' : 'Sortie'
      const haystack = `${inspection.tenant_first_name} ${inspection.tenant_last_name} ${inspection.property_name} ${kindLabel} ${inspection.inspection_date}`
      if (trimmedQuery && !matchesQuery(haystack, trimmedQuery)) continue

      results.push({
        id: `ins-${inspection.id}`,
        category: 'inspections',
        title: `${inspection.tenant_first_name} ${inspection.tenant_last_name} · ${kindLabel}`,
        subtitle: `${inspection.property_name} · ${inspection.inspection_date}`,
        route: '/inspections',
        badge: kindLabel,
      })
    }
  }

  if (!trimmedQuery && filter === 'all') {
    return results.slice(0, 20)
  }

  return results.slice(0, 50)
}

export function querySearch(query: string, filter: SearchFilterKey): SearchResult[] {
  const dataset: SearchDataset = {}

  if (filter === 'all' || filter === 'properties') {
    dataset.properties = propertiesDb.getAll()
  }
  if (filter === 'all' || filter === 'tenants') {
    dataset.tenants = tenantsDb.getAll()
  }
  if (filter === 'all' || filter === 'leases') {
    dataset.leases = leasesDb.getAll()
  }
  if (filter === 'all' || filter === 'payments') {
    dataset.payments = paymentsDb.getAll()
  }
  if (filter === 'all' || filter === 'reminders') {
    dataset.reminders = manualRemindersDb.getAll()
  }
  if (filter === 'all' || filter === 'inspections') {
    dataset.inspections = inspectionsDb.getAll()
  }

  return buildSearchResults(dataset, query, filter)
}
