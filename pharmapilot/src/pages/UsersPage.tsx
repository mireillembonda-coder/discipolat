import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { DataView } from '@/components/common/states'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { usePharmacyData } from '@/hooks/usePharmacyData'
import type { UserRole } from '@/data/types'

const ROLES: UserRole[] = ['owner', 'pharmacist', 'technician', 'viewer']

export default function UsersPage() {
  const { t } = useTranslation()
  const { current } = useWorkspace()
  const users = usePharmacyData((r, id) => r.listUsers(id))

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle', { name: current?.name ?? '' })}
        badge={<DemoBadge />}
        actions={
          <>
            <Button disabled>
              <UserPlus /> {t('users.invite')}
            </Button>
            <IntegrationBadge id="users_invites" />
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DataView state={users}>
          {(list) => (
            <Card>
              <CardContent className="px-0 py-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('users.name')}</TableHead>
                      <TableHead>{t('users.role')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {u.fullName
                                  .split(' ')
                                  .slice(-2)
                                  .map((s) => s[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{u.fullName}</p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{t(`users.roles.${u.role}`)}</TableCell>
                        <TableCell>
                          <Badge variant={u.status === 'active' ? 'success' : 'info'}>{t(`users.statuses.${u.status}`)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </DataView>
        <Card>
          <CardHeader>
            <CardTitle>{t('users.rolesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {ROLES.map((r) => (
                <li key={r}>
                  <p className="text-sm font-medium">{t(`users.roles.${r}`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`users.rolesDesc.${r}`)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
