import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'
import { NAV } from './nav'

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col bg-navy text-navy-foreground">
      <div className="flex h-16 items-center px-5">
        <Logo inverted />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Navigation principale">
        {NAV.map((group) => (
          <div key={group.labelKey} className="mt-5 first:mt-2">
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-navy-muted/80">{t(group.labelKey)}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-white/10 text-white' : 'text-navy-muted hover:bg-white/5 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-emerald-300')} />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] leading-relaxed text-navy-muted/80">{t('brand.tagline')}</div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarContent />
    </aside>
  )
}
