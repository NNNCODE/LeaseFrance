import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WindowControlsProps {
  className?: string
}

export default function WindowControls({ className }: WindowControlsProps) {
  const handleMinimize = () => window.api?.window.minimize()
  const handleMaximize = () => window.api?.window.maximize()
  const handleClose = () => window.api?.window.close()

  return (
    <div className={cn('flex items-center gap-1 no-drag', className)}>
      <button
        type="button"
        title="Reduire"
        onClick={handleMinimize}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-surface/80 text-textMuted transition-colors hover:border-border hover:bg-surfaceHigh hover:text-textPrimary"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Agrandir"
        onClick={handleMaximize}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-surface/80 text-textMuted transition-colors hover:border-border hover:bg-surfaceHigh hover:text-textPrimary"
      >
        <Square className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Fermer"
        onClick={handleClose}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-danger/20 bg-surface/80 text-textMuted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
