import type { TFunction } from 'i18next'
import { FileText, Info, Receipt, ScrollText, ShieldCheck, TrendingUp } from 'lucide-react'

export function getDocumentStatusMeta(t: TFunction): Record<
  string,
  { label: string; variant: 'muted' | 'default' | 'success' | 'warning' }
> {
  return {
    generated: { label: t('documents.status.generated'), variant: 'muted' },
    sent: { label: t('documents.status.sent'), variant: 'success' },
    archived: { label: t('documents.status.archived'), variant: 'warning' },
  }
}

export function getDocumentMeta(type: string, t: TFunction) {
  switch (type) {
    case 'recu':
      return { label: t('documents.type.recu'), variant: 'warning' as const, icon: Receipt, iconClass: 'text-accent', iconBg: 'bg-accent/10' }
    case 'etat_des_lieux_entree':
      return { label: t('documents.type.etat_des_lieux_entree'), variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'etat_des_lieux_sortie':
      return { label: t('documents.type.etat_des_lieux_sortie'), variant: 'warning' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'regularisation_charges':
      return { label: t('documents.type.regularisation_charges'), variant: 'default' as const, icon: ScrollText, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'relance_amiable':
      return { label: t('documents.type.relance_amiable'), variant: 'default' as const, icon: Info, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'mise_en_demeure':
      return { label: t('documents.type.mise_en_demeure'), variant: 'danger' as const, icon: Info, iconClass: 'text-danger', iconBg: 'bg-danger/10' }
    case 'proposition_echeancier':
      return { label: t('documents.type.proposition_echeancier'), variant: 'success' as const, icon: Info, iconClass: 'text-success', iconBg: 'bg-success/10' }
    case 'avis_revision_loyer':
      return { label: t('documents.type.avis_revision_loyer'), variant: 'default' as const, icon: TrendingUp, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'recu_depot_garantie':
      return { label: t('documents.type.recu_depot_garantie'), variant: 'default' as const, icon: ShieldCheck, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    case 'solde_depot_garantie':
      return { label: t('documents.type.solde_depot_garantie'), variant: 'warning' as const, icon: ShieldCheck, iconClass: 'text-warning', iconBg: 'bg-warning/10' }
    case 'contrat_location_meublee':
      return { label: t('documents.type.contrat_location_meublee'), variant: 'default' as const, icon: ScrollText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
    default:
      return { label: t('documents.type.quittance'), variant: 'muted' as const, icon: FileText, iconClass: 'text-primary', iconBg: 'bg-primary/10' }
  }
}

export function getDocumentTypeFilters(t: TFunction): Array<{ value: string; label: string }> {
  return [
    { value: '', label: t('documents.allTypes') },
    { value: 'quittance', label: t('documents.type.quittance') },
    { value: 'recu', label: t('documents.type.recu') },
    { value: 'avis_revision_loyer', label: t('documents.type.avis_revision_loyer') },
    { value: 'contrat_location_meublee', label: t('documents.type.contrat_location_meublee') },
    { value: 'recu_depot_garantie', label: t('documents.type.recu_depot_garantie') },
    { value: 'solde_depot_garantie', label: t('documents.type.solde_depot_garantie') },
    { value: 'relance_amiable', label: t('documents.type.relance_amiable') },
    { value: 'mise_en_demeure', label: t('documents.type.mise_en_demeure') },
    { value: 'etat_des_lieux_entree', label: t('documents.type.etat_des_lieux_entree') },
    { value: 'etat_des_lieux_sortie', label: t('documents.type.etat_des_lieux_sortie') },
    { value: 'regularisation_charges', label: t('documents.type.regularisation_charges') },
  ]
}

export function normalizeDocumentSearch(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
