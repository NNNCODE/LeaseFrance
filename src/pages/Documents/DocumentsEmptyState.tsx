import { ScrollText } from 'lucide-react'

export default function DocumentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <ScrollText className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucune source de document</p>
        <p className="mt-1 text-sm text-textMuted">
          Les modeles deviennent disponibles des qu'un paiement est marque paye, qu'un bail meuble est
          actif, qu'un bail peut etre revise ou qu'un depot de garantie est encaisse ou restitue.
        </p>
      </div>
    </div>
  )
}
