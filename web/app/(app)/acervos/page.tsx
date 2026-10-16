import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, FolderOpen, Library, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { collectionStatus } from "@/lib/collection-status";
import { formatDay } from "@/lib/format";
import { collectionKindLabel } from "@/lib/labels";
import { db } from "@/lib/server/db";
import { can } from "@/lib/server/permissions";
import { listCollections } from "@/lib/server/repos/collections";
import { requireAdmin } from "@/lib/server/session";

export const metadata: Metadata = { title: "Acervos e eventos" };

export default async function AcervosPage() {
  const ctx = await requireAdmin();
  const items = await listCollections(db, ctx);
  const canCreate = can(ctx.role, { collection: ["create"] });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Acervos e eventos"
        description="Acervos permanentes guardam fotos ao longo do tempo. Eventos têm data para abrir e encerrar."
        actions={
          canCreate && (
            <Button href="/acervos/novo" icon={<Plus size={16} aria-hidden />}>
              Novo
            </Button>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} aria-hidden />}
          title="Nenhum acervo ainda"
          description="Crie um acervo permanente para as fotos do dia a dia ou um evento para uma data específica."
          action={canCreate && <Button href="/acervos/novo">Criar o primeiro</Button>}
        />
      ) : (
        <Card className="divide-y divide-nf-line">
          {items.map((c) => {
            const status = collectionStatus(c);
            const Icon = c.kind === "event" ? CalendarDays : Library;
            return (
              <Link
                key={c.id}
                href={`/acervos/${c.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-nf-sunken/60 sm:px-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-nf bg-nf-sunken text-nf-muted">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-nf-text">{c.name}</span>
                  <span className="block truncate text-sm text-nf-muted">
                    {c.kind === "event" ? `${formatDay(c.startsAt)} a ${formatDay(c.endsAt)}` : collectionKindLabel(c.kind)}
                  </span>
                </span>
                <Badge tone={status.tone} className="hidden sm:inline-flex">
                  {status.label}
                </Badge>
                <ChevronRight size={18} className="text-nf-subtle" aria-hidden />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
