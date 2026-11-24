import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryView } from "@/components/common/QueryView";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useSourceQuery } from "@/hooks/useSourceQuery";
import { formatDate } from "@/lib/format";

export function UsersPage() {
  const { t } = useTranslation();
  const { state, reload } = useSourceQuery((s, ph) => s.getTeam(ph.id));
  return (
    <>
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={
          <>
            <ToConnectBadge hint={t("users.inviteHint")} />
            <Button disabled>
              <UserPlus /> {t("users.invite")}
            </Button>
          </>
        }
      />
      <QueryView state={state} reload={reload}>
        {(team) => (
          <Card>
            <CardContent className="px-2 py-2 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("users.name")}</TableHead>
                    <TableHead>{t("users.role")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("users.lastSeen")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {m.name
                                .split(" ")
                                .slice(0, 2)
                                .map((s) => s[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{m.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === "owner" ? "default" : "secondary"}>{t(`users.roles.${m.role}`)}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{m.lastSeen ? formatDate(m.lastSeen) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </QueryView>
    </>
  );
}
