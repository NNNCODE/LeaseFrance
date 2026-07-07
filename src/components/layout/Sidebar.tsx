import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  CalendarClock,
  FileSpreadsheet,
  FolderOpen,
  ScrollText,
  Settings,
  Lock,
  UserCircle2,
  Search,
} from 'lucide-react'
import BrandMark from '@/components/BrandMark'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, labelKey: 'nav.dashboard'    },
  { to: '/properties', icon: Building2,       labelKey: 'nav.properties'   },
  { to: '/tenants',    icon: Users,           labelKey: 'nav.tenants'      },
  { to: '/leases',     icon: FileText,        labelKey: 'nav.leases'       },
  { to: '/payments',   icon: CreditCard,      labelKey: 'nav.payments'     },
  { to: '/fiscal',     icon: FileSpreadsheet, labelKey: 'nav.fiscal'       },
  { to: '/reminders',  icon: CalendarClock,   labelKey: 'nav.reminders'    },
  { to: '/inspections',icon: ScrollText,      labelKey: 'nav.inspections'  },
  { to: '/documents',  icon: FolderOpen,      labelKey: 'nav.documents'    },
]

const bottomItems = [
  { to: '/profile',  icon: UserCircle2, labelKey: 'nav.profile'  },
  { to: '/settings', icon: Settings,    labelKey: 'nav.settings' },
]

export default function Sidebar({ onSearchClick }: { onSearchClick?: () => void }) {
  const { t } = useTranslation()
  const { lock } = useAuthStore()

  return (
    <aside className="flex flex-col w-60 h-full bg-surface border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border drag">
        <div className="flex items-center justify-center w-8 h-8 no-drag">
          <BrandMark className="w-7 h-7" idPrefix="bms" />
        </div>
        <span className="font-semibold text-textPrimary text-sm tracking-wide no-drag">
          Baillio
        </span>
      </div>

      {/* Search trigger */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border border-border bg-surfaceHigh/50 text-textMuted hover:text-textPrimary hover:border-primary/30 hover:bg-surfaceHigh transition-all text-sm"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs">{t('common.search')}</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={t(item.labelKey)} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 p-3 border-t border-border">
        {bottomItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={t(item.labelKey)} />
        ))}
        <button
          onClick={lock}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted hover:bg-surfaceHigh hover:text-danger hover:translate-x-0.5 transition-all w-full"
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>{t('nav.lock')}</span>
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: React.ElementType
  label: string
}) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            isActive
              ? 'bg-primary/15 text-primary'
              : 'text-textMuted hover:bg-surfaceHigh hover:text-textPrimary hover:translate-x-0.5 transition-all'
          )}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
          )}
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </div>
      )}
    </NavLink>
  )
}
