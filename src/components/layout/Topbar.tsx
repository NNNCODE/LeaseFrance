import { Bell, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WindowControls from './WindowControls'

export default function Topbar() {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 drag shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20">
          <Home className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-textPrimary">LeaseFrance</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">Espace proprietaire</p>
        </div>
      </div>

      <div className="flex items-center gap-2 no-drag">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />
        <WindowControls />
      </div>
    </header>
  )
}
