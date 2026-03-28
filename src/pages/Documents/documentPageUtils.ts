import { FileText, Info, Receipt, ScrollText, ShieldCheck, TrendingUp } from 'lucide-react'

export const DOC_STATUS_META: Record<
  string,
  { label: string; variant: 'muted' | 'default' | 'success' | 'warning' }
> = {
  generated: { label: 'Genere', variant: 'muted' },
  sent: { label: 'Envoye', variant: 'success' },
  archived: { label: 'Archive', variant: 'warning' },
}

export function getDocumentMeta(type: string) {
  switch (type) {
    case 'recu':
      return { label: 'Recu', variant: 'warning' as const, icon: Receipt, iconClass: 'text-accent', iconBg: 'bg-accent/10' }
    case 'etat_des_lieux_entree':
      return { label: "Etat des lieux d'entree", variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'etat_des_lieux_sortie':
      return { label: 'Etat des lieux de sortie', variant: 'warning' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'regularisation_charges':
      return { label: 'Regularisation des charges', variant: 'default' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'relance_amiable':
      return { label: 'Relance amiable', variant: 'default' as const, icon: Info, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'mise_en_demeure':
      return { label: 'Mise en demeure', variant: 'danger' as const, icon: Info, iconClass: 'text-danger', iconBg: 'bg-danger/10' }
    case 'proposition_echeancier':
      return { label: 'Echeancier', variant: 'success' as const, icon: Info, iconClass: 'text-success', iconBg: 'bg-success/10' }
    case 'avis_revision_loyer':
      return { label: 'Avis de revision', variant: 'default' as const, icon: TrendingUp, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'recu_depot_garantie':
      return { label: 'Recu de depot', variant: 'default' as const, icon: ShieldCheck, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'solde_depot_garantie':
      return { label: 'Solde de depot', variant: 'warning' as const, icon: ShieldCheck, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'contrat_location_meublee':
      return { label: 'Contrat meuble', variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    default:
      return { label: 'Quittance', variant: 'muted' as const, icon: FileText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
  }
}

export const DOC_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous les types' },
  { value: 'quittance', label: 'Quittance' },
  { value: 'recu', label: 'Recu' },
  { value: 'avis_revision_loyer', label: 'Avis de revision' },
  { value: 'contrat_location_meublee', label: 'Contrat meuble' },
  { value: 'recu_depot_garantie', label: 'Recu de depot' },
  { value: 'solde_depot_garantie', label: 'Solde de depot' },
  { value: 'relance_amiable', label: 'Relance amiable' },
  { value: 'mise_en_demeure', label: 'Mise en demeure' },
  { value: 'etat_des_lieux_entree', label: "Etat des lieux d'entree" },
  { value: 'etat_des_lieux_sortie', label: 'Etat des lieux de sortie' },
  { value: 'regularisation_charges', label: 'Regularisation' },
]

export function normalizeDocumentSearch(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
