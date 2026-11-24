import { useTranslation } from 'react-i18next'
import { Building2, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { StatusBadge } from '@/components/common/IntegrationBadge'

/** Sélecteur de pharmacie — prévu pour les comptes multi-officines. */
export function PharmacySwitcher() {
  const { t } = useTranslation()
  const { pharmacies, current, selectPharmacy, pharmaciesStatus } = useWorkspace()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 min-w-0 max-w-[15rem] justify-between gap-2 px-3 sm:max-w-xs" aria-label={t('pharmacy.switch')}>
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="text-primary" />
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium">
                {current?.name ?? (pharmaciesStatus === 'loading' ? t('common.loading') : t('pharmacy.none'))}
              </span>
            </span>
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t('pharmacy.selector')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current?.id} onValueChange={selectPharmacy}>
          {pharmacies.map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              <span className="min-w-0">
                <span className="block truncate">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.city}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {pharmacies.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">{t('pharmacy.none')}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="justify-between">
          <span className="flex items-center gap-2">
            <Plus /> {t('pharmacy.add')}
          </span>
          <StatusBadge status="to_connect" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
