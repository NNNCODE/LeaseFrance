import { CreditCard } from 'lucide-react'

export default function PaymentEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <CreditCard className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">Aucun paiement enregistre</p>
        <p className="mt-1 text-sm text-textMuted">
          Creez d'abord un bail actif, puis enregistrez les paiements mensuels.
        </p>
      </div>
    </div>
  )
}
