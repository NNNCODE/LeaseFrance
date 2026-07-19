import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Building2, CalendarClock, MapPin, Pencil, Ruler, ShieldCheck, Trash2, UserCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getDpeRule } from '@/lib/propertyDiagnostics'
import { PROPERTY_TYPES } from './propertyPageUtils'

export default function PropertyCard({
  property, diagnostics, ownerLabel, onEdit, onDiagnostics, onDelete,
}: {
  property: Property
  diagnostics: PropertyDiagnostics | null
  ownerLabel: string
  onEdit: () => void
  onDiagnostics: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const TypeIcon = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.icon ?? Building2
  const typeLabelKey = PROPERTY_TYPES.find((pt) => pt.value === property.type)?.labelKey
  const dpeRule = getDpeRule(diagnostics, new Date().toISOString().slice(0, 10))
  const dpeBadgeVariant =
    dpeRule.severity === 'blocked'
      ? 'danger'
      : dpeRule.severity === 'warning' || dpeRule.severity === 'missing'
        ? 'warning'
        : 'success'

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      }}
    >
      <Card className="group hover:border-primary/40 transition-colors duration-200">
        <CardContent className="pt-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                <TypeIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-textPrimary truncate">{property.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  <Badge variant="muted" className="text-[10px]">{typeLabelKey ? t(typeLabelKey) : property.type}</Badge>
                  <Badge variant={dpeBadgeVariant} className="text-[10px]">
                    {diagnostics?.dpe_class ? t('properties.diagnostics.dpeBadge', { value: diagnostics.dpe_class }) : t('properties.diagnostics.missingBadge')}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onDiagnostics}
                title={t('properties.diagnostics.action')}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-textMuted hover:text-primary transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-surfaceHigh text-textMuted hover:text-textPrimary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-textMuted hover:text-danger transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-0" />
              <span>{property.zip} {property.city}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-textMuted">
              <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('properties.ownerDefaultLabel', { owner: ownerLabel })}</span>
            </div>
            {property.area_m2 && (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <Ruler className="w-3.5 h-3.5 shrink-0" />
                <span>{property.area_m2} m²</span>
              </div>
            )}
            {diagnostics?.dpe_expires_at ? (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                <span>{t('properties.diagnostics.dpeExpires', { date: diagnostics.dpe_expires_at })}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
