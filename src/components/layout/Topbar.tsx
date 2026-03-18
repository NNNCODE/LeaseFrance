import { Minus, Square, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Topbar() {
  const handleMinimize = () => window.api?.window.minimize()
  const handleMaximize = () => window.api?.window.maximize()
  const handleClose    = () => window.api?.window.close()

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background drag shrink-0">
      {/* Left: breadcrumb placeholder */}
      <div className="no-drag" />

      {/* Right: actions + window controls */}
      <div className="flex items-center gap-2 no-drag">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-md text-textMuted hover:bg-surfaceHigh hover:text-textPrimary transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded-md text-textMuted hover:bg-surfaceHigh hover:text-textPrimary transition-colors"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-textMuted hover:bg-danger/20 hover:text-danger transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}
