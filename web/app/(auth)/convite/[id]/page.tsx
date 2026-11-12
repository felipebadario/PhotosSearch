import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/Button";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";
import { db } from "@/lib/server/db";
import { invitation, organization } from "@/lib/server/db/schema";
import { getSession } from "@/lib/server/session";
import { roleLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Convite" };

export default async function ConvitePage({ params }: PageProps<"/convite/[id]">) {
  const { id } = await params;
  const [invite] = await db
    .select({
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, id))
    .limit(1);

  const valid = invite && invite.status === "pending" && invite.expiresAt > new Date();
  if (!valid) {
    return (
      <>
        <h1 className="text-2xl font-semibold text-nf-text">Convite indisponível</h1>
        <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">
          Este convite já foi usado, foi cancelado ou expirou. Peça um novo a quem administra a organização.
        </p>
        <Button href="/entrar" variant="secondary">Ir para o login</Button>
      </>
    );
  }

  const session = await getSession();
  const sameEmail = session?.user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <>
      <h1 className="text-2xl font-semibold text-nf-text">Entrar em {invite.organizationName}</h1>
      <p className="mb-8 mt-1.5 text-[15px] text-nf-muted">
        Convite para {invite.email}, como {roleLabel(invite.role ?? "member").toLowerCase()}.
      </p>
      {!session && (
        <div className="space-y-3">
          <Button href={`/criar-conta?convite=${id}`} className="w-full">Criar conta e aceitar</Button>
          <Button href={`/entrar?next=/convite/${id}`} variant="secondary" className="w-full">Já tenho conta</Button>
        </div>
      )}
      {session && sameEmail && <AcceptInvitationForm invitationId={id} />}
      {session && !sameEmail && (
        <p className="rounded-nf bg-nf-warning-soft px-3.5 py-3 text-sm text-nf-text">
          Você entrou como {session.user.email}. Para aceitar, entre com {invite.email}.
        </p>
      )}
    </>
  );
}
