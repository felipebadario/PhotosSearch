import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { InviteForm } from "@/components/settings/InviteForm";
import { cancelInvitationAction, removeMemberAction, updateMemberRoleAction } from "@/lib/actions/organization";
import { formatDay } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { listMembers, listPendingInvitations } from "@/lib/server/repos/members";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Membros" };

export default async function MembrosPage() {
  const ctx = await requireAdmin();
  const manage = can(ctx.role, { member: ["update"] });
  const [members, invites] = await Promise.all([
    listMembers(db, ctx),
    manage ? listPendingInvitations(db, ctx) : Promise.resolve([]),
  ]);

  return (
    <div className="grid max-w-3xl gap-6">
      <Card className="divide-y divide-nf-line">
        {members.map((m) => {
          const self = m.userId === ctx.userId;
          const editable = manage && !self && m.role !== "owner";
          return (
            <div key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-nf-text">
                    {m.name} {self && <span className="text-nf-muted">(você)</span>}
                  </p>
                  <p className="truncate text-sm text-nf-muted">{m.email}</p>
                </div>
              </div>
              {editable ? (
                <div className="flex items-center gap-2">
                  <form action={updateMemberRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="memberId" value={m.id} />
                    <Select name="role" defaultValue={m.role} aria-label={`Papel de ${m.name}`} className="h-9 w-44 text-sm">
                      <option value="member">Editor</option>
                      <option value="admin">Administrador</option>
                    </Select>
                    <SubmitButton variant="secondary" size="sm" pendingLabel="...">Salvar</SubmitButton>
                  </form>
                  <form action={removeMemberAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <SubmitButton variant="danger" size="sm" pendingLabel="...">Remover</SubmitButton>
                  </form>
                </div>
              ) : (
                <Badge>{roleLabel(m.role)}</Badge>
              )}
            </div>
          );
        })}
      </Card>

      {manage && (
        <Card className="p-6">
          <h2 className="font-semibold text-nf-text">Convidar alguém</h2>
          <p className="mb-4 mt-1 text-sm text-nf-muted">
            Editores cuidam de acervos e fotos. Administradores também gerenciam membros. O convite vale por 7 dias.
          </p>
          <InviteForm />
        </Card>
      )}

      {invites.length > 0 && (
        <Card className="divide-y divide-nf-line">
          <h2 className="px-5 py-4 font-semibold text-nf-text">Convites pendentes</h2>
          {invites.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-nf-text">{i.email}</p>
                <p className="text-nf-muted">{roleLabel(i.role ?? "member")} · vence em {formatDay(i.expiresAt)}</p>
              </div>
              <form action={cancelInvitationAction}>
                <input type="hidden" name="invitationId" value={i.id} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="...">Cancelar</SubmitButton>
              </form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
