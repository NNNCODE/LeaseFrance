import { Plus, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LeaseEmptyStateProps {
  onAdd: () => void
}

export default function LeaseEmptyState({ onAdd }: LeaseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
        <ScrollText className="h-8 w-8 text-warning" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun bail enregistre</p>
        <p className="mt-1 text-sm text-textMuted">
          Creez un bail pour associer un bien a un locataire.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Nouveau bail
      </Button>
    </div>
  )
}
