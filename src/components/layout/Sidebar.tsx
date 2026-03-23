import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  FolderOpen,
  Settings,
  Home,
  Lock,
  UserCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/properties', icon: Building2,       label: 'Biens'           },
  { to: '/tenants',    icon: Users,           label: 'Locataires'      },
  { to: '/leases',     icon: FileText,        label: 'Baux'            },
  { to: '/payments',   icon: CreditCard,      label: 'Paiements'       },
  { to: '/documents',  icon: FolderOpen,      label: 'Documents'       },
]

const bottomItems = [
  { to: '/profile',  icon: UserCircle2, label: 'Propri\u00e9taire' },
  { to: '/settings', icon: Settings,    label: 'Param\u00e8tres' },
]

export default function Sidebar() {
  const { lock } = useAuthStore()

  return (
    <aside className="flex flex-col w-60 h-full bg-surface border-r border-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border drag">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 no-drag">
          <Home className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-textPrimary text-sm tracking-wide no-drag">
          LeaseFrance
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 p-3 border-t border-border">
        {bottomItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        {/* Verrouiller */}
        <motion.button
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          onClick={lock}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-textMuted hover:bg-surfaceHigh hover:text-danger transition-colors w-full"
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Verrouiller</span>
        </motion.button>
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
        <motion.div
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            isActive
              ? 'bg-primary/15 text-primary'
              : 'text-textMuted hover:bg-surfaceHigh hover:text-textPrimary'
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </motion.div>
      )}
    </NavLink>
  )
}
