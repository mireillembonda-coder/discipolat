import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, Languages, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { SUPPORTED_LOCALES } from '@/lib/config'

function initials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('')
}

export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { mode, exitDemo } = useWorkspace()
  const { locale, setLocale } = usePreferences()

  const displayName =
    mode === 'demo' ? t('mode.demo') : ((user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? '')

  const leave = async () => {
    if (mode === 'demo') exitDemo()
    else await signOut()
    navigate('/connexion', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('common.account')}>
          <Avatar>
            <AvatarFallback>{initials(displayName || 'PP')}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-foreground">
          <span className="block truncate text-sm font-medium">{displayName}</span>
          {mode === 'live' && user?.email && <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Languages className="h-3.5 w-3.5" /> {t('common.language')}
        </DropdownMenuLabel>
        {SUPPORTED_LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLocale(l.code)} className="justify-between">
            {l.label}
            {locale === l.code && <Check className="text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={leave}>
          <LogOut /> {mode === 'demo' ? t('mode.exitDemo') : t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
