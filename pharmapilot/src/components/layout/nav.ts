import {
  Bell,
  Bot,
  Boxes,
  CreditCard,
  FileBarChart2,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  TrendingUp,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
}
export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    labelKey: 'nav.groups.steering',
    items: [
      { to: '/', labelKey: 'nav.overview', icon: LayoutDashboard },
      { to: '/ventes', labelKey: 'nav.sales', icon: TrendingUp },
      { to: '/stocks', labelKey: 'nav.stock', icon: Boxes },
      { to: '/commandes', labelKey: 'nav.orders', icon: ShoppingCart },
      { to: '/alertes', labelKey: 'nav.alerts', icon: Bell },
      { to: '/rapports', labelKey: 'nav.reports', icon: FileBarChart2 },
      { to: '/assistant', labelKey: 'nav.assistant', icon: Bot },
    ],
  },
  {
    labelKey: 'nav.groups.data',
    items: [{ to: '/importation', labelKey: 'nav.import', icon: Upload }],
  },
  {
    labelKey: 'nav.groups.admin',
    items: [
      { to: '/utilisateurs', labelKey: 'nav.users', icon: Users },
      { to: '/parametres', labelKey: 'nav.settings', icon: Settings },
      { to: '/abonnement', labelKey: 'nav.subscription', icon: CreditCard },
    ],
  },
]
