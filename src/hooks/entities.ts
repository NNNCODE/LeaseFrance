import { useApiQuery, type ApiQuery } from './useApiQuery'

// One hook per entity list that more than one page loads the same way.
// Single-page reads (documents, fiscal expenses, ...) stay local to their
// page until a second consumer appears.

export function useProperties(): ApiQuery<Property[]> {
  return useApiQuery(() => window.api.properties.getAll(), { initial: [] })
}

export function useTenants(): ApiQuery<Tenant[]> {
  return useApiQuery(() => window.api.tenants.getAll(), { initial: [] })
}

export function useLeases(): ApiQuery<Lease[]> {
  return useApiQuery(() => window.api.leases.getAll(), { initial: [] })
}

export function usePayments(): ApiQuery<Payment[]> {
  return useApiQuery(() => window.api.payments.getAll(), { initial: [] })
}

export function useInspections(): ApiQuery<Inspection[]> {
  return useApiQuery(() => window.api.inspections.getAll(), { initial: [] })
}

export function useAttachments(): ApiQuery<Attachment[]> {
  return useApiQuery(() => window.api.attachments.getAll(), { initial: [] })
}

export function useIrlIndices(): ApiQuery<IrlIndex[]> {
  return useApiQuery(() => window.api.irl.getAll(), { initial: [] })
}
