import { useTranslation } from 'react-i18next'
import { Bell, Search } from 'lucide-react'
import BrandMark from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import WindowControls from './WindowControls'

export default function Topbar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { t } = useTranslation()
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 drag shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8">
          <BrandMark className="w-7 h-7" idPrefix="bmt" />
        </div>
        <div>
          <p className="text-sm font-semibold text-textPrimary">Baillio</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-textMuted">{t('topbar.ownerSpace')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 no-drag">
        <Button variant="ghost" size="icon" onClick={onSearchClick} title={t('topbar.searchTooltip')}>
          <Search className="w-4 h-4" />
        </Button>

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
